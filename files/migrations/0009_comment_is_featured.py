# Generated manually for the featured comment flag.

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("files", "0008_media_film_list_pinned"),
    ]

    operations = [
        migrations.AddField(
            model_name="comment",
            name="is_featured",
            field=models.BooleanField(default=False, verbose_name="精选"),
        ),
    ]
