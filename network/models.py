from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    followed_users = models.ManyToManyField('User', blank=True, related_name='following_users')
    liked_posts = models.ManyToManyField('Post', blank=True, related_name='users_liked')


# 'Posts' table
class Post(models.Model):
    text = models.CharField(max_length=140)
    datetime = models.DateTimeField(auto_now=True)
    user = models.ForeignKey('User', on_delete=models.CASCADE, related_name='posts')

    def serialize(self):
        return {
            "id": self.id,
            "text": self.text,
            "user_id": self.user.id,
            "username": self.user.username,
            "datetime": self.datetime.strftime("%b %d %Y, %I:%M %p"),
            "like_count": self.users_liked.count()
        }

    def __str__(self):
        return f"{self.user} says: {self.text}"
