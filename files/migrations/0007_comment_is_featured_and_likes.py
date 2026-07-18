# Generated manually for comment featured flag

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('files', '0006_alter_category_title'),
    ]

    operations = [
        migrations.AddField(
            model_name='comment',
            name='is_featured',
            field=models.BooleanField(default=False, verbose_name='精选'),
        ),
    ]
