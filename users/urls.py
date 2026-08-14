from django.urls import path, re_path

from . import lotus_sso, views

urlpatterns = [
    # 莲花导航 SSO（HMAC 跳转）；LOTUS_SSO_ENABLED=False 时视图内 404
    path("accounts/lotus-sso/", lotus_sso.lotus_sso_start, name="lotus_sso_start"),
    path("accounts/lotus-sso/callback/", lotus_sso.lotus_sso_callback, name="lotus_sso_callback"),
    re_path(r"^user/(?P<username>[\w@._-]*)$", views.view_user, name="get_user"),
    re_path(r"^user/(?P<username>[\w@._-]*)/$", views.view_user, name="get_user"),
    re_path(
        r"^user/(?P<username>[\w@.]*)/media$",
        views.view_user_media,
        name="get_user_media",
    ),
    re_path(
        r"^user/(?P<username>[\w@.]*)/playlists$",
        views.view_user_playlists,
        name="get_user_playlists",
    ),
    re_path(
        r"^user/(?P<username>[\w@.]*)/about$",
        views.view_user_about,
        name="get_user_about",
    ),
    re_path(r"^user/(?P<username>[\w@.]*)/edit$", views.edit_user, name="edit_user"),
    re_path(r"^channel/(?P<friendly_token>[\w]*)$", views.view_channel, name="view_channel"),
    re_path(
        r"^channel/(?P<friendly_token>[\w]*)/edit$",
        views.edit_channel,
        name="edit_channel",
    ),
    # API VIEWS
    path('api/v1/whoami', views.UserWhoami.as_view(), name='user-whoami'),
    path('api/v1/user/token', views.UserToken.as_view(), name='user-token'),
    path('api/v1/login', views.LoginView.as_view(), name='user-login'),
    re_path(r"^api/v1/users$", views.UserList.as_view(), name="api_users"),
    re_path(r"^api/v1/users/$", views.UserList.as_view()),
    re_path(
        r"^api/v1/users/(?P<username>[\w@._-]*)$",
        views.UserDetail.as_view(),
        name="api_get_user",
    ),
    re_path(
        r"^api/v1/users/(?P<username>[\w@._-]*)/contact",
        views.contact_user,
        name="api_contact_user",
    ),
]
