from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('files', '0007_media_film_list_category'),
    ]

    operations = [
        migrations.AddField(
            model_name='media',
            name='film_list_pinned',
            field=models.BooleanField(
                default=False, db_index=True,
                help_text='影片清单置顶（勾选则在所属小类表中置于首位，如频道介绍片）',
            ),
        ),
    ]
