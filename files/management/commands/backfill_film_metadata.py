"""
回填道场影片元数据到 Media。

把表格(道场影片记录清单)导出的 JSON 里的字段——首发时间/首发地/总指导/主演主创/导演/
剪辑制作者/取景地/片号——按「标题里的片号(Z20/G49/F1…)」匹配到已上传的历史影片并写回，
使 MediaCMS 媒体信息页与社区清单都能显示。

默认 dry-run(只预览)，加 --apply 才写入；默认只填空字段，加 --overwrite 才覆盖非空。

  python manage.py backfill_film_metadata --json /path/film-metadata-backfill.json
  python manage.py backfill_film_metadata --json /path/film-metadata-backfill.json --apply
"""
import datetime
import json
import re

from django.core.management.base import BaseCommand

from files.models import Media

ZERO_WIDTH = dict.fromkeys(
    map(ord, "​‌‍‎‏‪‫‬‭‮⁠﻿­"), None
)
CODE_RE = re.compile(r"^([FCGZJ])\s*0*(\d+)")
TEXT_FIELDS = ["premiere_location", "chief_instructor", "cast", "director", "editor", "filming_location"]

# 预告/官宣类记录无片号、且影院标题含《》和编号前缀，子串启发式匹配不到。
# 显式别名：表格 raw_name -> 影院标题里能唯一定位该片的子串。
# (突破鬼打墙预告 / 60游学记预告 未上传影院，故意不在此表，保持未匹配。)
TITLE_ALIASES = {
    "千年寻密预告": "千年寻密》预告片",
    "千年寻密预告-静怡去寺庙版本": "静怡",
    "大唐绝密预告": "大唐绝密》预告片",
    "首映礼预告": "大唐绝密首映礼",
    "无法剽窃的专利是智慧预告": "无法剽窃的专利是智慧》预告",
    "来世之密预告": "来世之密》预告",
    "螃蟹出逃记预告": "螃蟹出逃记》预告片",
    "集福十五载下集预告": "集福十五载》（下）预告",
    "周年之变预告": "周年之变》预告",
    "锦梓官宣宣传片": "锦梓官宣",
}


def clean(s):
    return (s or "").translate(ZERO_WIDTH).strip()


def parse_code(title):
    m = CODE_RE.match(clean(title))
    return f"{m.group(1)}{int(m.group(2))}" if m else ""


class Command(BaseCommand):
    help = "回填道场影片元数据(片号/首发时间/首发地/总指导/主演/导演/剪辑/取景地)到 Media。默认 dry-run。"

    def add_arguments(self, parser):
        parser.add_argument("--json", required=True, help="film-metadata-backfill.json 路径")
        parser.add_argument("--apply", action="store_true", help="真正写入(默认只预览 dry-run)")
        parser.add_argument("--overwrite", action="store_true", help="覆盖已有非空值(默认只填空字段)")

    def handle(self, *args, **opts):
        with open(opts["json"], encoding="utf-8") as f:
            records = json.load(f)

        videos = list(Media.objects.all())
        by_code = {}
        for m in videos:
            c = parse_code(m.title)
            if c:
                by_code.setdefault(c, []).append(m)

        apply, overwrite = opts["apply"], opts["overwrite"]
        matched = updated = unmatched = 0
        lines = []

        for rec in records:
            code = rec.get("film_code") or ""
            raw = clean(rec.get("raw_name", ""))
            target = None
            if code and by_code.get(code):
                target = by_code[code][0]
            elif raw in TITLE_ALIASES:
                cands = [m for m in videos if TITLE_ALIASES[raw] in clean(m.title)]
                if cands:
                    target = cands[0]
            else:
                core = re.sub(r"^[FCGZJ]\s*0*\d+\s*", "", raw)
                core = re.sub(r"[／/（(《].*$", "", core).strip()
                if len(core) >= 2:
                    cands = [m for m in videos if core in clean(m.title)]
                    if cands:
                        target = cands[0]
            if not target:
                unmatched += 1
                lines.append(f"  ✗ 未匹配: {code or '—'} {rec.get('raw_name')}")
                continue

            matched += 1
            changes = {}
            if code and (overwrite or not clean(target.film_code)) and clean(target.film_code) != code:
                changes["film_code"] = code
            pdate = rec.get("premiere_date")
            if pdate and (overwrite or not target.premiere_date):
                try:
                    d = datetime.date.fromisoformat(pdate)
                    if target.premiere_date != d:
                        changes["premiere_date"] = d
                except ValueError:
                    pass
            for fld in TEXT_FIELDS:
                val = rec.get(fld)
                if fld == "cast" and val:
                    val = re.sub(r"\s+", " ", val).strip()
                if not val:
                    continue
                cur = getattr(target, fld) or ""
                if (not cur or overwrite) and str(cur) != str(val):
                    changes[fld] = val

            if not changes:
                continue
            lines.append(f"  ✓ {code or rec.get('raw_name')} (token={target.friendly_token}): {sorted(changes)}")
            if apply:
                Media.objects.filter(pk=target.pk).update(**changes)
                updated += 1

        self.stdout.write("\n".join(lines[:300]))
        will = sum(1 for ln in lines if ln.strip().startswith("✓"))
        self.stdout.write(self.style.SUCCESS(
            f"\n匹配 {matched} / 未匹配 {unmatched} / {'已写入' if apply else '待写入(dry-run)'} {updated if apply else will}"
        ))
        if not apply:
            self.stdout.write(self.style.WARNING("dry-run：加 --apply 才会写入。"))
