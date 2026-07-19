from django.contrib import admin
from django.utils.safestring import mark_safe

from .models import (
    Category,
    Comment,
    EncodeProfile,
    Encoding,
    HomeBanner,
    Language,
    Media,
    Subtitle,
    Tag,
)


DEFAULT_BANNER_DARK = "/static/images/lotus-brand/welcome-hero.webp"
DEFAULT_BANNER_LIGHT = "/static/images/lotus-brand/welcome-hero-paper-chatgpt-v2.webp"


class HomeBannerAdmin(admin.ModelAdmin):
    """首页横幅配置：只允许一条记录（单例）。

    预览区始终显示当前生效的图（上传图或内置默认图），
    并用内联 JS 把「取景位置」输入和「更换图片」文件框实时联动到预览。
    """

    list_display = ["__str__", "banner_dark", "dark_position", "banner_light", "light_position"]
    readonly_fields = ["dark_preview", "light_preview"]
    fieldsets = (
        (
            "暗色主题横幅",
            {"fields": ("dark_preview", "banner_dark", "dark_position")},
        ),
        (
            "亮色主题横幅",
            {"fields": ("light_preview", "banner_light", "light_position")},
        ),
    )

    def has_add_permission(self, request):
        return not HomeBanner.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return True

    def _preview_html(self, obj, field, default_url, position, position_input_id, file_input_id, preview_id):
        image = getattr(obj, field, None) if obj else None
        url = image.url if image else default_url
        source = "已上传自定义图" if image else "内置默认图"
        return mark_safe(
            """
            <div>
              <div id="{pid}" style="width:min(640px,100%);height:180px;border-radius:8px;border:1px solid #ccc;
                   background-image:url('{url}');background-size:cover;background-repeat:no-repeat;
                   background-position:center {pos}%;"></div>
              <p style="margin:6px 0 0;color:#666;">当前生效：{source}。拖动/修改下方「取景位置」数值，预览会实时更新；选择新图片后预览也会即时换图。</p>
              <script>
              (function() {{
                function bind() {{
                  var box = document.getElementById('{pid}');
                  var posInput = document.getElementById('{pos_id}');
                  var fileInput = document.getElementById('{file_id}');
                  if (!box || !posInput) return;
                  posInput.addEventListener('input', function() {{
                    var v = Math.max(0, Math.min(100, parseInt(posInput.value || '0', 10)));
                    box.style.backgroundPosition = 'center ' + v + '%';
                  }});
                  if (fileInput) {{
                    fileInput.addEventListener('change', function() {{
                      if (fileInput.files && fileInput.files[0]) {{
                        var reader = new FileReader();
                        reader.onload = function(e) {{
                          box.style.backgroundImage = "url('" + e.target.result + "')";
                        }};
                        reader.readAsDataURL(fileInput.files[0]);
                      }}
                    }});
                  }}
                }}
                if (document.readyState === 'loading') {{
                  document.addEventListener('DOMContentLoaded', bind);
                }} else {{
                  bind();
                }}
              }})();
              </script>
            </div>
            """.format(
                pid=preview_id,
                url=url,
                pos=position,
                source=source,
                pos_id=position_input_id,
                file_id=file_input_id,
            )
        )

    def dark_preview(self, obj):
        return self._preview_html(
            obj, "banner_dark", DEFAULT_BANNER_DARK, obj.dark_position if obj else 46, "id_dark_position", "id_banner_dark", "dark-banner-preview"
        )

    dark_preview.short_description = "暗色横幅预览"

    def light_preview(self, obj):
        return self._preview_html(
            obj, "banner_light", DEFAULT_BANNER_LIGHT, obj.light_position if obj else 76, "id_light_position", "id_banner_light", "light-banner-preview"
        )

    light_preview.short_description = "亮色横幅预览"


class CommentAdmin(admin.ModelAdmin):
    search_fields = ["text"]
    list_display = ["text", "add_date", "user", "media", "is_featured"]
    list_filter = ["is_featured"]
    list_editable = ["is_featured"]
    ordering = ("-add_date",)
    readonly_fields = ("user", "media", "parent")


class MediaAdmin(admin.ModelAdmin):
    search_fields = ["title"]
    list_display = [
        "title",
        "user",
        "add_date",
        "media_type",
        "duration",
        "state",
        "is_reviewed",
        "encoding_status",
        "featured",
        "get_comments_count",
    ]
    list_filter = ["state", "is_reviewed", "encoding_status", "featured", "category"]
    ordering = ("-add_date",)
    readonly_fields = ("user", "tags", "category", "channel")

    def get_comments_count(self, obj):
        return obj.comments.count()

    @admin.action(description="Generate missing encoding(s)", permissions=["change"])
    def generate_missing_encodings(modeladmin, request, queryset):
        for m in queryset:
            m.encode(force=False)

    actions = [generate_missing_encodings]
    get_comments_count.short_description = "Comments count"


class CategoryAdmin(admin.ModelAdmin):
    search_fields = ["title"]
    list_display = ["title", "user", "add_date", "is_global", "media_count"]
    list_filter = ["is_global"]
    ordering = ("-add_date",)
    readonly_fields = ("user", "media_count")


class TagAdmin(admin.ModelAdmin):
    search_fields = ["title"]
    list_display = ["title", "user", "media_count"]
    readonly_fields = ("user", "media_count")


class EncodeProfileAdmin(admin.ModelAdmin):
    list_display = ("name", "extension", "resolution", "codec", "description", "active")
    list_filter = ["extension", "resolution", "codec", "active"]
    search_fields = ["name", "extension", "resolution", "codec", "description"]
    list_per_page = 100
    fields = ("name", "extension", "resolution", "codec", "description", "active")


class LanguageAdmin(admin.ModelAdmin):
    pass


class SubtitleAdmin(admin.ModelAdmin):
    pass


class EncodingAdmin(admin.ModelAdmin):
    list_display = ["get_title", "chunk", "profile", "progress", "status", "has_file"]
    list_filter = ["chunk", "profile", "status"]

    def get_title(self, obj):
        return str(obj)

    get_title.short_description = "Encoding"

    def has_file(self, obj):
        return obj.media_encoding_url is not None

    has_file.short_description = "Has file"


admin.site.register(EncodeProfile, EncodeProfileAdmin)
admin.site.register(HomeBanner, HomeBannerAdmin)
admin.site.register(Comment, CommentAdmin)
admin.site.register(Media, MediaAdmin)
admin.site.register(Encoding, EncodingAdmin)
admin.site.register(Category, CategoryAdmin)
admin.site.register(Tag, TagAdmin)
admin.site.register(Subtitle, SubtitleAdmin)
admin.site.register(Language, LanguageAdmin)
