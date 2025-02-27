
from django.urls import path

from . import views

urlpatterns = [
    path("", views.index, name="index"),
    path("login", views.login_view, name="login"),
    path("logout", views.logout_view, name="logout"),
    path("register", views.register, name="register"),

    # API routes
    path("send_post", views.send_post, name="send_post"),
    path("load_all_posts", views.load_all_posts, name="load_all_posts"),
    path("load_posts/<str:user_id>", views.load_followed_users_posts, name="load_followed_users_posts"),
    path("save/<str:post_id>", views.save_post, name="save_post"),
    path("users/<str:user_id>", views.load_user, name="load_user"),
    path("follow/<str:user_id>", views.follow_user, name="follow_user"),
    path("current_user_id", views.get_current_user_id, name="current_user_id"),
    path("like/<str:post_id>", views.like_post, name="like_post")
]
