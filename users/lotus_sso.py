"""莲花导航 SSO（HMAC 跳转，仿 DiscourseConnect）。

方案文档：docs/2026-08-14-lotus-nav-sso.md §5.2。
协议两侧共用一串 LOTUS_SSO_SECRET（导航侧 config.sso.mediacmsSecret）：
- 发起：nonce 入 cache，302 到导航 /sso/mediacms?nonce&return&sig，
  sig = HMAC_SHA256("nonce={nonce}&return={return}", secret)（hex）。
- 回调：sso = base64url(payload)，payload 是 "\n" 连接的 k=v 行；
  sig = HMAC_SHA256(sso, secret)（hex）。验签 + 一次性 nonce 后按邮箱登录 / 建号。

开关：settings.LOTUS_SSO_ENABLED=False 时两个 URL 直接 404（回滚只需改 local_settings）。
"""

import base64
import hashlib
import hmac
import logging
import re
import secrets
from urllib.parse import quote

from django.conf import settings
from django.contrib.auth import login
from django.core.cache import cache
from django.http import Http404, HttpResponseForbidden, HttpResponseRedirect
from django.views.decorators.http import require_GET

from .models import User

logger = logging.getLogger(__name__)

NONCE_CACHE_PREFIX = "lotus_sso_nonce:"


def _enabled():
    return (
        getattr(settings, "LOTUS_SSO_ENABLED", False)
        and getattr(settings, "LOTUS_SSO_SECRET", "")
        and getattr(settings, "LOTUS_SSO_IDP_URL", "")
    )


def _hmac_hex(message: str) -> str:
    return hmac.new(settings.LOTUS_SSO_SECRET.encode(), message.encode(), digestmod=hashlib.sha256).hexdigest()


def _b64url_decode(s: str) -> str:
    pad = "=" * (-len(s) % 4)
    return base64.urlsafe_b64decode(s + pad).decode()


def _safe_next(raw: str) -> str:
    """next 只许站内相对路径，防打开重定向。"""
    if raw and raw.startswith("/") and not raw.startswith("//") and "http" not in raw:
        return raw
    return "/"


def _clean_username(base: str, email: str) -> str:
    """按 users/validators.py 的 ^\\w+$ Unicode 规则清洗，撞名加数字后缀。

    不在 ORM 层强制 ACCOUNT_USERNAME_MIN_LENGTH（那是 allauth 表单层约束），
    否则 3 字中文名会被硬加尾巴；SSO 建号不走表单。
    """
    base = (base or "").strip()
    if not re.match(r"^\w+$", base, re.UNICODE):
        base = (email.split("@")[0] if email else "").strip()
    if not re.match(r"^\w+$", base or "", re.UNICODE):
        base = "lotus"
    candidate, i = base, 0
    while User.objects.filter(username=candidate).exists():
        i += 1
        candidate = f"{base}{i}"
    return candidate


@require_GET
def lotus_sso_start(request):
    """GET /accounts/lotus-sso/?next=/... → 302 导航桥页。"""
    if not _enabled():
        raise Http404

    next_url = _safe_next(request.GET.get("next", "/"))
    nonce = secrets.token_hex(32)
    cache.set(f"{NONCE_CACHE_PREFIX}{nonce}", next_url, timeout=settings.LOTUS_SSO_NONCE_TTL)

    return_url = request.build_absolute_uri("/accounts/lotus-sso/callback/")
    sig = _hmac_hex(f"nonce={nonce}&return={return_url}")
    target = f"{settings.LOTUS_SSO_IDP_URL}?nonce={nonce}&return={quote(return_url, safe='')}&sig={sig}"
    return HttpResponseRedirect(target)


@require_GET
def lotus_sso_callback(request):
    """GET /accounts/lotus-sso/callback/?sso=…&sig=… → 登录 → 302 next。"""
    if not _enabled():
        raise Http404

    sso = request.GET.get("sso", "")
    sig = request.GET.get("sig", "")
    if not sso or not sig or not hmac.compare_digest(_hmac_hex(sso), sig):
        logger.warning("lotus_sso: 验签失败")
        return HttpResponseForbidden("SSO 验签失败")

    try:
        payload = _b64url_decode(sso)
        fields = dict(line.split("=", 1) for line in payload.split("\n") if "=" in line)
    except Exception:
        logger.warning("lotus_sso: payload 解不开")
        return HttpResponseForbidden("SSO 数据不完整")

    nonce = fields.get("nonce", "")
    cache_key = f"{NONCE_CACHE_PREFIX}{nonce}"
    next_url = cache.get(cache_key)
    if not nonce or next_url is None:
        logger.warning("lotus_sso: nonce 不存在/已用/过期")
        return HttpResponseForbidden("SSO 已过期，请重新从导航进入")
    cache.delete(cache_key)  # 一次性

    email = (fields.get("email") or "").strip().lower()
    if not email:
        logger.warning("lotus_sso: payload 缺 email")
        return HttpResponseForbidden("SSO 数据不完整")

    users = list(User.objects.filter(email__iexact=email).order_by("date_joined"))
    if users:
        if len(users) > 1:
            logger.error("lotus_sso: 邮箱 %s 命中 %d 个用户，取最早，需人工清理", email, len(users))
        user = users[0]
    else:
        username = _clean_username(fields.get("username", ""), email)
        user = User.objects.create_user(username=username, email=email)
        user.set_unusable_password()
        if fields.get("name"):
            user.name = fields["name"]
        user.save()
        # allauth 邮箱标已验证，避免再弹验证
        try:
            from allauth.account.models import EmailAddress

            EmailAddress.objects.create(user=user, email=email, verified=True, primary=True)
        except Exception:
            logger.exception("lotus_sso: EmailAddress 落库失败 email=%s", email)
        logger.info("lotus_sso: 建新号 %s <%s>", user.username, email)

    # 不改 username / name / is_staff / is_superuser / is_manager / is_editor
    login(request, user, backend="django.contrib.auth.backends.ModelBackend")
    return HttpResponseRedirect(next_url)
