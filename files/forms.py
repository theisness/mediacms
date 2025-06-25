from django import forms

from .methods import get_next_state, is_mediacms_editor
from .models import Media, Subtitle


class MultipleSelect(forms.CheckboxSelectMultiple):
    input_type = "checkbox"


class MediaForm(forms.ModelForm):
    new_tags = forms.CharField(label="Tags", help_text="a comma separated list of new tags.", required=False)

    class Meta:
        model = Media
        fields = (
            "title",
            "category",
            "new_tags",
            "add_date",
            "uploaded_poster",
            "description",
            "state",
            "enable_comments",
            "featured",
            "thumbnail_time",
            "reported_times",
            "is_reviewed",
            "allow_download",
        )
        widgets = {
            "tags": MultipleSelect(),
        }

    def __init__(self, user, *args, **kwargs):
        self.user = user
        super(MediaForm, self).__init__(*args, **kwargs)
        if self.instance.media_type != "video":
            self.fields.pop("thumbnail_time")
        if not is_mediacms_editor(user):
            self.fields.pop("featured")
            self.fields.pop("reported_times")
            self.fields.pop("is_reviewed")
        self.fields["new_tags"].initial = ", ".join([tag.title for tag in self.instance.tags.all()])
        self.fields['title'].label = '媒体标题'
        self.fields['title'].help_text = ''
        self.fields['description'].label = '描述'
        self.fields['category'].label = '类别'
        self.fields['category'].help_text = '可以选择一个或多个类别。'
        self.fields['new_tags'].label = '标签'
        self.fields['new_tags'].help_text = '用英文的逗号分割标签。'
        self.fields['add_date'].label = '添加日期'
        self.fields['uploaded_poster'].label = '已上传的封面'
        self.fields['uploaded_poster'].help_text = ''
        self.fields['state'].label = '是否公开'
        self.fields['state'].help_text = ''
        self.fields['enable_comments'].label = '允许评论'
        self.fields['enable_comments'].help_text = ''
        self.fields['featured'].label = '是否精选'
        self.fields['featured'].help_text = ''
        self.fields['thumbnail_time'].label = '缩略图时间点'
        self.fields['thumbnail_time'].help_text = '视频使用的缩略图所在时间点。'
        self.fields['reported_times'].label = '举报次数'
        self.fields['reported_times'].help_text = ''
        self.fields['is_reviewed'].label = '是否已审核'
        self.fields['is_reviewed'].help_text = ''
        self.fields['allow_download'].label = '允许下载'
        self.fields['allow_download'].help_text = ''



    def clean_uploaded_poster(self):
        image = self.cleaned_data.get("uploaded_poster", False)
        if image:
            if image.size > 5 * 1024 * 1024:
                raise forms.ValidationError("文件过大 ( > 5MB )")
            return image

    def save(self, *args, **kwargs):
        data = self.cleaned_data
        state = data.get("state")
        if state != self.initial["state"]:
            self.instance.state = get_next_state(self.user, self.initial["state"], self.instance.state)

        media = super(MediaForm, self).save(*args, **kwargs)
        return media


class SubtitleForm(forms.ModelForm):
    class Meta:
        model = Subtitle
        fields = ["language", "subtitle_file"]

    def __init__(self, media_item, *args, **kwargs):
        super(SubtitleForm, self).__init__(*args, **kwargs)
        self.instance.media = media_item
        self.fields["subtitle_file"].help_text = "SubRip (.srt) and WebVTT (.vtt) are supported file formats."
        self.fields["subtitle_file"].label = "Subtitle or Closed Caption File"

    def save(self, *args, **kwargs):
        self.instance.user = self.instance.media.user
        media = super(SubtitleForm, self).save(*args, **kwargs)
        return media


class EditSubtitleForm(forms.Form):
    subtitle = forms.CharField(widget=forms.Textarea, required=True)

    def __init__(self, subtitle, *args, **kwargs):
        super(EditSubtitleForm, self).__init__(*args, **kwargs)
        self.fields["subtitle"].initial = subtitle.subtitle_file.read().decode("utf-8")


class ContactForm(forms.Form):
    from_email = forms.EmailField(required=True)
    name = forms.CharField(required=False)
    message = forms.CharField(widget=forms.Textarea, required=True)

    def __init__(self, user, *args, **kwargs):
        super(ContactForm, self).__init__(*args, **kwargs)
        self.fields["name"].label = "您的姓名："
        self.fields["from_email"].label = "您的邮箱："
        self.fields["message"].label = "请填写您的意见并提交："
        self.user = user
        if user.is_authenticated:
            self.fields.pop("name")
            self.fields.pop("from_email")
