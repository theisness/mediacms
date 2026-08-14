"""莲花导航 SSO（users/lotus_sso.py）单测。

覆盖：开关关掉 404 / 发起 302+nonce 入缓存 / 验签失败 403 / 重放 nonce 403 /
打开重定向防护 / 按邮箱挂老号（不改名字段）/ 新邮箱建号（密码不可用）。
"""

import base64
import hashlib
import hmac
from urllib.parse import parse_qs, urlparse

from django.core.cache import cache
from django.test import Client, TestCase, override_settings

from .models import User

SECRET = "test-secret"
IDP = "https://index.test/sso/mediacms"

SETTINGS = dict(
    LOTUS_SSO_ENABLED=True,
    LOTUS_SSO_SECRET=SECRET,
    LOTUS_SSO_IDP_URL=IDP,
    LOTUS_SSO_NONCE_TTL=600,
)


def sign(message: str) -> str:
    return hmac.new(SECRET.encode(), message.encode(), hashlib.sha256).hexdigest()


def b64url(s: str) -> str:
    return base64.urlsafe_b64encode(s.encode()).decode().rstrip("=")


def make_callback_params(nonce="n1", email="a@b.com", username="念晨", name="念晨"):
    payload = "\n".join(
        [
            f"nonce={nonce}",
            f"email={email}",
            "external_id=0123456789abcdef01234567",
            f"username={username}",
            f"name={name}",
            "require_activation=false",
        ]
    )
    sso = b64url(payload)
    return {"sso": sso, "sig": sign(sso)}


@override_settings(**SETTINGS)
class LotusSsoTest(TestCase):
    def setUp(self):
        cache.clear()
        self.c = Client()

    def _start(self, next_url="/view?m=abc"):
        resp = self.c.get(f"/accounts/lotus-sso/?next={next_url}")
        self.assertEqual(resp.status_code, 302)
        q = parse_qs(urlparse(resp.url).query)
        self.assertTrue(resp.url.startswith(IDP))
        return q["nonce"][0], q["return"][0], q["sig"][0]

    def test_start_redirects_and_stores_nonce(self):
        nonce, return_url, sig = self._start()
        self.assertEqual(sig, sign(f"nonce={nonce}&return={return_url}"))
        self.assertIsNotNone(cache.get(f"lotus_sso_nonce:{nonce}"))

    def test_start_rejects_open_redirect_next(self):
        self._start(next_url="/")  # 先清 nonce 干扰
        resp = self.c.get("/accounts/lotus-sso/?next=//evil.com/x")
        self.assertEqual(resp.status_code, 302)
        q = parse_qs(urlparse(resp.url).query)
        self.assertEqual(cache.get(f"lotus_sso_nonce:{q['nonce'][0]}"), "/")

    def test_callback_bad_sig_403(self):
        nonce, _, _ = self._start()
        params = make_callback_params(nonce=nonce)
        params["sig"] = "0" * 64
        resp = self.c.get("/accounts/lotus-sso/callback/", params)
        self.assertEqual(resp.status_code, 403)

    def test_callback_replay_nonce_403(self):
        nonce, _, _ = self._start()
        params = make_callback_params(nonce=nonce)
        self.assertEqual(self.c.get("/accounts/lotus-sso/callback/", params).status_code, 302)
        # 第二次重放：nonce 已删
        self.assertEqual(self.c.get("/accounts/lotus-sso/callback/", params).status_code, 403)

    def test_callback_unknown_nonce_403(self):
        params = make_callback_params(nonce="never-issued")
        self.assertEqual(self.c.get("/accounts/lotus-sso/callback/", params).status_code, 403)

    def test_login_existing_user_by_email_keeps_fields(self):
        user = User.objects.create_user(username="老名字", email="old@b.com")
        user.is_staff = True
        user.save()
        nonce, _, _ = self._start()
        params = make_callback_params(nonce=nonce, email="OLD@b.com", username="想改名", name="想改显示名")
        resp = self.c.get("/accounts/lotus-sso/callback/", params)
        self.assertEqual(resp.status_code, 302)
        self.assertEqual(resp.url, "/view?m=abc")
        user.refresh_from_db()
        self.assertEqual(user.username, "老名字")  # 绝不改名
        self.assertTrue(user.is_staff)
        self.assertEqual(User.objects.filter(email__iexact="old@b.com").count(), 1)  # 没建二号
        self.assertEqual(str(self.c.session["_auth_user_id"]), str(user.pk))

    def test_create_new_user_with_unusable_password(self):
        nonce, _, _ = self._start()
        params = make_callback_params(nonce=nonce, email="new@b.com", username="新人甲")
        resp = self.c.get("/accounts/lotus-sso/callback/", params)
        self.assertEqual(resp.status_code, 302)
        user = User.objects.get(email="new@b.com")
        self.assertEqual(user.username, "新人甲")
        self.assertFalse(user.has_usable_password())
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
        from allauth.account.models import EmailAddress

        self.assertTrue(EmailAddress.objects.get(user=user).verified)

    def test_username_collision_gets_suffix(self):
        User.objects.create_user(username="新人甲", email="x@b.com")
        nonce, _, _ = self._start()
        params = make_callback_params(nonce=nonce, email="new2@b.com", username="新人甲")
        self.c.get("/accounts/lotus-sso/callback/", params)
        self.assertTrue(User.objects.filter(username="新人甲1").exists())


@override_settings(LOTUS_SSO_ENABLED=False)
class LotusSsoDisabledTest(TestCase):
    def test_404_when_disabled(self):
        c = Client()
        self.assertEqual(c.get("/accounts/lotus-sso/").status_code, 404)
        self.assertEqual(c.get("/accounts/lotus-sso/callback/").status_code, 404)
