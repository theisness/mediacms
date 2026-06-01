import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('files', '0006_media_is_in_film_list'),
    ]

    operations = [
        migrations.CreateModel(
            name='FilmListCategory',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(help_text='小类名，如 法义 / 真人电影', max_length=50, unique=True)),
                ('major', models.CharField(db_index=True, help_text='大类名，如 视频 / 预告 / 电影', max_length=50)),
                ('major_order', models.IntegerField(default=0, help_text='大类排序（楼层顺序）')),
                ('order', models.IntegerField(default=0, help_text='小类在大类内的排序')),
            ],
            options={
                'verbose_name': '影片清单分类',
                'verbose_name_plural': '影片清单分类',
                'ordering': ['major_order', 'order'],
            },
        ),
        migrations.AddField(
            model_name='media',
            name='film_list_category',
            field=models.ForeignKey(
                blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                related_name='media', to='files.filmlistcategory',
                help_text='影片清单分类（大类/小类见 FilmListCategory 表，由数据维护，不写死在代码）',
            ),
        ),
    ]
