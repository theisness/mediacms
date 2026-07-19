from django.db import migrations, models

import files.models


class Migration(migrations.Migration):
    dependencies = [
        ("files", "0009_comment_is_featured"),
    ]

    operations = [
        migrations.CreateModel(
            name="HomeBanner",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "banner_dark",
                    models.ImageField(
                        blank=True,
                        help_text="深靛/玄夜主题使用的横幅图，留空用内置莲池夜景",
                        upload_to=files.models.home_banner_file_path,
                        verbose_name="暗色主题横幅图",
                    ),
                ),
                (
                    "banner_light",
                    models.ImageField(
                        blank=True,
                        help_text="宣纸白主题使用的横幅图，留空用内置晨光莲池",
                        upload_to=files.models.home_banner_file_path,
                        verbose_name="亮色主题横幅图",
                    ),
                ),
                (
                    "dark_position",
                    models.PositiveSmallIntegerField(
                        default=46,
                        help_text="纵向取景百分比 0-100：0 显示图片顶部，100 显示底部",
                        verbose_name="暗色图取景位置",
                    ),
                ),
                (
                    "light_position",
                    models.PositiveSmallIntegerField(
                        default=76,
                        help_text="纵向取景百分比 0-100：0 显示图片顶部，100 显示底部",
                        verbose_name="亮色图取景位置",
                    ),
                ),
            ],
            options={
                "verbose_name": "首页横幅",
                "verbose_name_plural": "首页横幅",
            },
        ),
    ]
