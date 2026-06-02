# -*- coding: utf-8 -*-
"""把「道场影片记录清单」从数据库导出并推送/更新到 Discourse 清单帖。

  python manage.py push_filmlist            # 构建并 PUT 覆盖配置好的楼层
  python manage.py push_filmlist --preview  # 只打印 markdown，不推送
  python manage.py push_filmlist --force    # 即使内容未变也强制 PUT

配置见 settings：FILMLIST_DISCOURSE_URL / _API_KEY / _API_USERNAME / FILMLIST_POST_IDS
/ FILMLIST_SITE_BASE（真实值放 local_settings.py，不进 repo）。
"""
from django.core.management.base import BaseCommand

from files.filmlist_export import build_filmlist_posts, push_filmlist_posts


class Command(BaseCommand):
    help = "导出道场影片清单并推送到 Discourse 清单帖"

    def add_arguments(self, parser):
        parser.add_argument("--preview", action="store_true", help="只打印 markdown，不推送")
        parser.add_argument("--force", action="store_true", help="即使内容未变也强制 PUT")

    def handle(self, *args, **opts):
        posts = build_filmlist_posts()
        if opts["preview"]:
            for i, p in enumerate(posts, 1):
                self.stdout.write(f"\n========== 楼 {i} ==========")
                self.stdout.write(p)
            return
        results = push_filmlist_posts(posts, skip_unchanged=not opts["force"])
        for pid, status in results:
            self.stdout.write(f"post {pid}: {status}")
