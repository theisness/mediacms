from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('files', '0005_media_cast_media_chief_instructor_media_director_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='media',
            name='is_in_film_list',
            field=models.BooleanField(
                default=True, db_index=True,
                help_text='是否加入影片清单（在道场影片记录清单/社区清单中展示；老照片、沙滩车等非道场资产应取消勾选）',
            ),
        ),
    ]
