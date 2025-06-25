from rest_framework import serializers

from .models import Category, Comment, EncodeProfile, Media, Playlist, Tag

# TODO: put them in a more DRY way


class MediaSerializer(serializers.ModelSerializer):
    # to be used in APIs as show related media
    user = serializers.ReadOnlyField(source="user.username")
    url = serializers.SerializerMethodField()
    api_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    author_profile = serializers.SerializerMethodField()
    author_thumbnail = serializers.SerializerMethodField()
    comments_num = serializers.SerializerMethodField()
    liked = serializers.SerializerMethodField()

    def get_liked(self, obj):
        if self.context["request"].user.is_anonymous:
            return False
        else:
            return obj.mediaactions.filter(user=self.context["request"].user, action="like").exists()

    def get_comments_num(self, obj):
        # 获取当前媒体对象的所有评论
        comments = list(obj.comments.all())
        return len(comments)

    def get_url(self, obj):
        return self.context["request"].build_absolute_uri(obj.get_absolute_url())

    def get_api_url(self, obj):
        return self.context["request"].build_absolute_uri(obj.get_absolute_url(api=True))

    def get_thumbnail_url(self, obj):
        if obj.thumbnail_url:
            return self.context["request"].build_absolute_uri(obj.thumbnail_url)
        else:
            return None

    def get_author_profile(self, obj):
        return self.context["request"].build_absolute_uri(obj.author_profile())

    def get_author_thumbnail(self, obj):
        return self.context["request"].build_absolute_uri(obj.author_thumbnail())

    class Meta:
        model = Media
        read_only_fields = (
            "friendly_token",
            "user",
            "add_date",
            "media_type",
            "state",
            "duration",
            "encoding_status",
            "views",
            "likes",
            "dislikes",
            "reported_times",
            "size",
            "is_reviewed",
            "featured",
            "comments_num", #评论数量
            "liked", #是否已喜欢
        )
        fields = (
            "friendly_token",
            "url",
            "api_url",
            "user",
            "title",
            "description",
            "add_date",
            "views",
            "media_type",
            "state",
            "duration",
            "thumbnail_url",
            "is_reviewed",
            "preview_url",
            "author_name",
            "author_profile",
            "author_thumbnail",
            "encoding_status",
            "views",
            "likes",
            "dislikes",
            "reported_times",
            "featured",
            "user_featured",
            "size",
            "comments_num",
            "liked",
        )


class SingleMediaSerializer(serializers.ModelSerializer):
    user = serializers.ReadOnlyField(source="user.username")
    url = serializers.SerializerMethodField()
    liked = serializers.SerializerMethodField()

    def get_liked(self, obj):
        if self.context["request"].user.is_anonymous:
            return False
        else:
            return obj.mediaactions.filter(user=self.context["request"].user, action="like").exists()
    def get_url(self, obj):
        return self.context["request"].build_absolute_uri(obj.get_absolute_url())

    class Meta:
        model = Media
        read_only_fields = (
            "friendly_token",
            "user",
            "add_date",
            "views",
            "media_type",
            "state",
            "duration",
            "encoding_status",
            "views",
            "likes",
            "dislikes",
            "reported_times",
            "size",
            "video_height",
            "is_reviewed",
            "liked",
        )
        fields = (
            "url",
            "user",
            "title",
            "description",
            "add_date",
            "edit_date",
            "media_type",
            "state",
            "duration",
            "thumbnail_url",
            "poster_url",
            "thumbnail_time",
            "url",
            "sprites_url",
            "preview_url",
            "author_name",
            "author_profile",
            "author_thumbnail",
            "encodings_info",
            "encoding_status",
            "views",
            "likes",
            "dislikes",
            "reported_times",
            "user_featured",
            "original_media_url",
            "size",
            "video_height",
            "enable_comments",
            "categories_info",
            "is_reviewed",
            "edit_url",
            "tags_info",
            "hls_info",
            "license",
            "subtitles_info",
            "ratings_info",
            "add_subtitle_url",
            "allow_download",
            "slideshow_items",
            "liked",
        )


class MediaSearchSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()
    api_url = serializers.SerializerMethodField()

    def get_url(self, obj):
        return self.context["request"].build_absolute_uri(obj.get_absolute_url())

    def get_api_url(self, obj):
        return self.context["request"].build_absolute_uri(obj.get_absolute_url(api=True))

    comments_num = serializers.SerializerMethodField()
    def get_comments_num(self, obj):
        # 获取当前媒体对象的所有评论
        comments = list(obj.comments.all())
        return len(comments)
    class Meta:
        model = Media
        fields = (
            "title",
            "author_name",
            "author_profile",
            "thumbnail_url",
            "add_date",
            "views",
            "description",
            "friendly_token",
            "duration",
            "url",
            "api_url",
            "media_type",
            "preview_url",
            "categories_info",
            "comments_num", #评论数量
        )


class EncodeProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = EncodeProfile
        fields = ("name", "extension", "resolution", "codec", "description")


class CategorySerializer(serializers.ModelSerializer):
    user = serializers.ReadOnlyField(source="user.username")

    class Meta:
        model = Category
        fields = (
            "title",
            "description",
            "is_global",
            "media_count",
            "user",
            "thumbnail_url",
        )


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ("title", "media_count", "thumbnail_url")


class PlaylistSerializer(serializers.ModelSerializer):
    user = serializers.ReadOnlyField(source="user.username")

    class Meta:
        model = Playlist
        read_only_fields = ("add_date", "user")
        fields = ("add_date", "title", "description", "user", "media_count", "url", "api_url", "thumbnail_url")


class PlaylistDetailSerializer(serializers.ModelSerializer):
    user = serializers.ReadOnlyField(source="user.username")

    class Meta:
        model = Playlist
        read_only_fields = ("add_date", "user")
        fields = (
        "title", "add_date", "user_thumbnail_url", "description", "user", "media_count", "url", "thumbnail_url")


class CommentSerializer(serializers.ModelSerializer):
    author_profile = serializers.ReadOnlyField(source="user.get_absolute_url")
    author_name = serializers.ReadOnlyField(source="user.name")
    username = serializers.ReadOnlyField(source="user.username")
    author_thumbnail_url = serializers.ReadOnlyField(source="user.thumbnail_url")
    # 新增 children 字段
    children = serializers.SerializerMethodField()

    likes = serializers.SerializerMethodField()
    liked = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        read_only_fields = ("add_date", "uid")
        fields = (
            "id",
            "add_date",
            "text",
            "parent",
            "author_thumbnail_url",
            "author_profile",
            "author_name",
            "media_url",
            "uid",
            "children",
            "user_id",
            "username",
            "likes", # 点赞数量
            "liked", # 是否已经点赞
        )

    def get_liked(self, obj):
        if self.context["request"].user.is_anonymous:
            return False
        else:
            return obj.commentactions.filter(user=self.context["request"].user, action="like").exists()
    def get_likes(self, obj):
        return obj.commentactions.filter(action="like").count()

    def get_children(self, obj):
        # 获取当前嵌套层级，首次调用为 0
        current_depth = self.context.get("current_depth", 0)
        max_depth = self.context.get("max_depth", 50)  # 默认最多嵌套 50 层

        if current_depth >= max_depth:
            return []

        children = obj.children.all().order_by("add_date")
        context = {**self.context, "current_depth": current_depth + 1}

        return CommentSerializer(children, many=True, context=context).data
