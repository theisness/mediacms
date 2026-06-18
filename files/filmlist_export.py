# -*- coding: utf-8 -*-
"""莲花影院「道场影片记录清单」→ Discourse 的服务端导出器。

从数据库(Media + FilmListCategory)直接构建 4 个楼层的 markdown，并(可选)推送/更新到
blog.ssbx.site 的清单帖。分类(大类/小类/顺序)全部读自 FilmListCategory，不写死在代码。
配置(密钥/楼层 post id/站点地址)放 local_settings.py，不进 repo。

与本地工具 ~/ssbx/bin/filmlist-mediacms-to-discourse 的输出保持一致。
"""
import datetime
import json
import re
import subprocess

from django.conf import settings

# 去掉标题/字段里夹带的零宽字符
ZERO_WIDTH = dict.fromkeys(
    [0x200B, 0x200C, 0x200D, 0x200E, 0x200F, 0x202A, 0x202B, 0x202C,
     0x202D, 0x202E, 0x2060, 0xFEFF, 0x00AD],
    None,
)


def clean(s):
    return (s or "").translate(ZERO_WIDTH).strip()


# 表格列：按大类区分(列布局是展示模板，分类名/顺序仍读自 FilmListCategory 数据)
COLS = {
    "视频": [("名称", "name"), ("首发地", "premiere_location"), ("首发时间", "premiere_date"),
             ("时长", "dur"), ("总指导", "chief_instructor"), ("主创/主演", "cast"),
             ("剪辑制作者", "editor"), ("取景地", "filming_location")],
    "预告": [("名称", "name"), ("首发地", "premiere_location"), ("首发时间", "premiere_date"),
             ("时长", "dur"), ("剪辑制作者", "editor")],
    "电影": [("名称", "name"), ("首发地", "premiere_location"), ("首发时间", "premiere_date"),
             ("时长", "dur"), ("总指导", "chief_instructor"), ("主演", "cast"), ("导演", "director"),
             ("剪辑制作者", "editor"), ("取景地", "filming_location")],
}
DEFAULT_COLS = COLS["视频"]

CODE_RE = re.compile(r"^([FCGZJ])\s*0*(\d+)")
CN_NUM = "一二三四五六七八九十"

# 东八区（北京时间 / CST），footer 时间戳与「年度更新」年份都用它
CST = datetime.timezone(datetime.timedelta(hours=8))


def now_cst():
    return datetime.datetime.now(CST)


def fmt_dur(sec):
    try:
        sec = int(round(float(sec or 0)))
    except (TypeError, ValueError):
        return ""
    if sec <= 0:
        return ""
    h, m, s = sec // 3600, (sec % 3600) // 60, sec % 60
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m}:{s:02d}"


def clean_name(title):
    t = clean(title)
    t = re.sub(r"\.(mp4|mov|avi|mkv|m4v)$", "", t, flags=re.I)
    t = re.sub(r"\s*\d{6,8}\s*[一-鿿]{0,4}\s*$", "", t)  # 结尾日期(+节气)
    return t.strip(" -—·") or clean(title)


def sortkey(f):
    # 置顶的片排在所属小类表最前（pin=0），其余 pin=1；组内沿用原排序（片号优先，否则按首发时间）。
    pin = 0 if f.get("pinned") else 1
    m = CODE_RE.match(f["name"])
    if m:
        return (pin, 0, m.group(1), int(m.group(2)))
    return (pin, 1, f.get("premiere_date") or "", 0)


def cell(v):
    return (clean(str(v)) if v is not None else "").replace("|", "/").replace("\n", " ") or ""


def rowcell(f, key):
    # 名称列渲染成指向影院播放页的 markdown 链接；其余列原样。
    if key == "name":
        nm = cell(f.get("name"))
        u = f.get("url")
        return f"[{nm}]({u})" if (nm and u) else nm
    return cell(f.get(key))


def site_base():
    return (getattr(settings, "FILMLIST_SITE_BASE", "") or "https://ssbx.site").rstrip("/")


def collect_films():
    """从 DB 读 is_in_film_list 且已归类的影片，转成构建用的 dict 列表。"""
    from .models import Media

    base = site_base()
    qs = (Media.objects
          .filter(is_in_film_list=True, film_list_category__isnull=False)
          .select_related("film_list_category"))
    films = []
    for m in qs:
        c = m.film_list_category
        films.append({
            "name": clean_name(m.title or ""),
            "url": base + m.get_absolute_url(),
            "premiere_location": clean(m.premiere_location),
            "premiere_date": m.premiere_date.isoformat() if m.premiere_date else "",
            "dur": fmt_dur(m.duration),
            "chief_instructor": clean(m.chief_instructor),
            "cast": re.sub(r"\s+", " ", clean(m.cast)),
            "director": clean(m.director),
            "editor": clean(m.editor),
            "filming_location": clean(m.filming_location),
            "major": c.major, "minor": c.title,
            "major_order": c.major_order, "minor_order": c.order,
            "pinned": bool(m.film_list_pinned),
        })
    return films


def annual_block(films, year=None):
    """年度更新：当年(东八区)首发的全部影片，按首发时间(premiere_date)倒序，
    片名(超链接) + 首发时间。year 缺省取东八区当前年份。"""
    if year is None:
        year = now_cst().year
    ys = str(year)
    cur = [f for f in films if (f.get("premiere_date") or "")[:4] == ys]
    cur.sort(key=lambda f: f.get("premiere_date") or "", reverse=True)
    out = [f"## {year} 年度更新（{len(cur)} 部）", "", "| 片名 | 首发时间 |", "|---|---|"]
    for f in cur:
        nm = cell(f.get("name"))
        u = f.get("url")
        link = f"[{nm}]({u})" if (nm and u) else nm
        out.append(f"| {link} | {cell(f.get('premiere_date'))} |")
    out.append("")
    return "\n".join(out)


def build_filmlist_posts(films=None, gen_ts=None):
    """构建 4 个楼层的 markdown（每个大类一楼 + 总合计楼）。films 缺省从 DB 读。

    总合计楼开头追加「{当年} 年度更新」清单（当年东八区首发的全部影片）。
    """
    if films is None:
        films = collect_films()

    # 大类(按 major_order) -> 小类(按 order) -> films
    majors = sorted({(f["major_order"], f["major"]) for f in films})
    posts = []
    grand = []
    for idx, (mo, major) in enumerate(majors):
        mfilms = [f for f in films if f["major"] == major]
        minors = sorted({(f["minor_order"], f["minor"]) for f in mfilms})
        cn = "（%s）" % (CN_NUM[idx] if idx < len(CN_NUM) else str(idx + 1))
        out = [f"## {cn}{major}大类（共 {len(mfilms)} 部）", ""]
        cols = COLS.get(major, DEFAULT_COLS)
        for _, minor in minors:
            rows = sorted([f for f in mfilms if f["minor"] == minor], key=sortkey)
            grand.append((major, mo, minor, len(rows)))
            out.append(f"### {minor}（{len(rows)} 部）")
            out.append("")
            out.append("| 序号 | " + " | ".join(h for h, _ in cols) + " |")
            out.append("|---:|" + "|".join("---" for _ in cols) + "|")
            for i, f in enumerate(rows, 1):
                out.append("| " + str(i) + " | " + " | ".join(rowcell(f, k) for _, k in cols) + " |")
            out.append("")
        posts.append("\n".join(out).rstrip())

    # 总合计楼
    tot = ["## 总合计", "", "| 大类 | 小类 | 数量 | 合计 |", "|---|---|---:|---:|"]
    gtotal = 0
    by_major = {}
    for major, mo, minor, n in grand:
        by_major.setdefault((mo, major), []).append((minor, n))
    for (mo, major), items in sorted(by_major.items()):
        sub = sum(n for _, n in items)
        gtotal += sub
        for j, (minor, n) in enumerate(items):
            tot.append(f"| {major if j == 0 else ''} | {minor} | {n} | {sub if j == 0 else ''} |")
    tot.append(f"| **总计** |  |  | **{gtotal}** |")
    tot.append("")
    ts = gen_ts or now_cst().strftime("%Y-%m-%d %H:%M")
    tot.append(f"<sub>本帖由[莲花影院]({site_base()})实时导出，生成于 {ts}（北京时间 CST）。</sub>")

    # 年度更新清单放在总合计楼开头
    posts.append(annual_block(films) + "\n\n" + "\n".join(tot))
    return posts


# footer 里的「生成于 <时间戳>（北京时间 CST）」——比对「内容是否变化」时要抹掉它，
# 否则每次生成时间戳都变，最后一楼永远被判定为「有变化」而反复 PUT 刷新。
_FOOTER_TS_RE = re.compile(r"(生成于 )[^（]*(（北京时间 CST）)")


def strip_footer_ts(raw):
    """把 footer 的生成时间戳替换成占位符，用于「表格是否真正变化」的比对。
    没有 footer 的楼层（非总合计楼）原样返回，不受影响。"""
    return _FOOTER_TS_RE.sub(r"\1__TS__\2", raw or "")


# ---------------- Discourse 推送 ----------------
def _curl_json(method, url, key, user, data=None):
    # 用 curl：Discourse 的 Api-Username 是中文(念晨)，urllib/requests 强制 latin-1 头会报错。
    args = ["curl", "-sS", "-X", method,
            "-H", f"Api-Key: {key}", "-H", f"Api-Username: {user}"]
    for k, v in (data or {}).items():
        args += ["--data-urlencode", f"{k}={v}"]
    args.append(url)
    out = subprocess.run(args, capture_output=True, text=True, timeout=60)
    if out.returncode != 0:
        raise RuntimeError(f"curl {method} {url} failed: {out.stderr.strip()}")
    return json.loads(out.stdout)


def discourse_config():
    url = (getattr(settings, "FILMLIST_DISCOURSE_URL", "") or "").rstrip("/")
    key = getattr(settings, "FILMLIST_DISCOURSE_API_KEY", "") or ""
    user = getattr(settings, "FILMLIST_DISCOURSE_API_USERNAME", "") or ""
    post_ids = list(getattr(settings, "FILMLIST_POST_IDS", []) or [])
    return url, key, user, post_ids


def push_filmlist_posts(posts, *, skip_unchanged=True):
    """把楼层 PUT 覆盖到配置的 post id（一一对应）。返回 [(post_id, status), ...]。"""
    url, key, user, post_ids = discourse_config()
    if not (url and key and user and post_ids):
        raise RuntimeError("FILMLIST_DISCOURSE_* / FILMLIST_POST_IDS 未配置（应放 local_settings.py）")
    if len(post_ids) != len(posts):
        raise RuntimeError(
            f"FILMLIST_POST_IDS 有 {len(post_ids)} 个，但生成了 {len(posts)} 个楼层，须一一对应"
        )
    results = []
    for pid, raw in zip(post_ids, posts):
        if skip_unchanged:
            try:
                cur = _curl_json("GET", f"{url}/posts/{pid}.json", key, user)
                # 抹掉 footer 时间戳后比对：只有表格内容真正变化才更新（时间戳本身不算变化）。
                if strip_footer_ts(cur.get("raw") or "") == strip_footer_ts(raw):
                    results.append((pid, "unchanged"))
                    continue
            except Exception:
                pass  # 读不到当前内容就直接尝试更新
        r = _curl_json("PUT", f"{url}/posts/{pid}.json", key, user,
                       {"post[raw]": raw, "post[edit_reason]": "filmlist auto-update"})
        results.append((pid, "updated:v%s" % r.get("post", {}).get("version")))
    return results
