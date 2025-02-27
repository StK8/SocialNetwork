import json

from django.contrib.auth import authenticate, login, logout
from django.db import IntegrityError
from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import render
from django.urls import reverse

from .models import User

from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from .models import Post
from .forms import NewPostForm
from django.core.paginator import Paginator

def index(request):
    return render(request, "network/index.html", {
        "form": NewPostForm()
    })


def login_view(request):
    if request.method == "POST":

        # Attempt to sign user in
        username = request.POST["username"]
        password = request.POST["password"]
        user = authenticate(request, username=username, password=password)

        # Check if authentication successful
        if user is not None:
            login(request, user)
            return HttpResponseRedirect(reverse("index"))
        else:
            return render(request, "network/login.html", {
                "message": "Invalid username and/or password."
            })
    else:
        return render(request, "network/login.html")


def logout_view(request):
    logout(request)
    return HttpResponseRedirect(reverse("index"))


def register(request):
    if request.method == "POST":
        username = request.POST["username"]
        email = request.POST["email"]

        # Ensure password matches confirmation
        password = request.POST["password"]
        confirmation = request.POST["confirmation"]
        if password != confirmation:
            return render(request, "network/register.html", {
                "message": "Passwords must match."
            })

        # Attempt to create new user
        try:
            user = User.objects.create_user(username, email, password)
            user.save()
        except IntegrityError:
            return render(request, "network/register.html", {
                "message": "Username already taken."
            })
        login(request, user)
        return HttpResponseRedirect(reverse("index"))
    else:
        return render(request, "network/register.html")


# load all existing posts
def load_all_posts(request):
    posts = Post.objects.all()
    posts = posts.order_by("-datetime").all()
    page_number = request.GET.get("page", 1)
    paginator = Paginator(posts, 10)
    page_obj = paginator.get_page(page_number)
    data = [post.serialize() for post in page_obj.object_list]
    payload = {
        "page": {
            "current": page_obj.number,
            "has_next": page_obj.has_next(),
            "has_previous": page_obj.has_previous(),
        },
        "num_pages": paginator.num_pages,
        "data": data
    }
    return JsonResponse(payload, safe=False)


# load posts of the users that the current user is following
@login_required
def load_followed_users_posts(request, user_id):
    user = User.objects.get(pk=user_id)
    followed_users = user.followed_users.all()
    posts = Post.objects.filter(user__in=followed_users)
    posts = posts.order_by("-datetime").all()
    page_number = request.GET.get("page", 1)
    paginator = Paginator(posts, 10)
    page_obj = paginator.get_page(page_number)
    data = [post.serialize() for post in page_obj.object_list]
    payload = {
        "page": {
            "current": page_obj.number,
            "has_next": page_obj.has_next(),
            "has_previous": page_obj.has_previous(),
        },
        "num_pages": paginator.num_pages,
        "data": data
    }
    return JsonResponse(payload, safe=False)


@csrf_exempt
@login_required
def send_post(request):

    # Sending a new post should be via POST
    if request.method != "POST":
        return JsonResponse({"error": "POST request required"}, status=400)

    # current user
    user_id = request.user.id
    user = User.objects.get(pk=user_id)

    # post text
    data = json.loads(request.body)
    post_text = data.get("post_text")

    # saving new post in database
    new_post = Post(text=post_text, user=user)
    new_post.save()
    return JsonResponse({"new_post": post_text}, status=201)


def load_user(request, user_id):
    user = User.objects.get(pk=user_id)
    followed_users = user.followed_users.count()
    followers = User.objects.filter(followed_users__pk=user_id).count()
    user_posts = Post.objects.filter(user=user)
    user_posts = user_posts.order_by("-datetime").all()
    # posts' pagination
    page_number = request.GET.get("page", 1)
    paginator = Paginator(user_posts, 10)
    page_obj = paginator.get_page(page_number)
    data = [post.serialize() for post in page_obj.object_list]

    # if user is logged in and user is not viewing their own profile then show 'follow' button
    if (request.user.is_authenticated):
        current_user_id = int(request.user.id)
        if current_user_id != int(user_id):
            follow_btn = True
            current_user = User.objects.get(pk=current_user_id)
            followed_user = User.objects.get(pk=user_id)
            if (followed_user not in current_user.followed_users.all()):
                follow = False
            else:
                follow = True
        # if user is logged in but looking their own profile - do not show follow button
        else:
            follow_btn = False
            follow = None
    # if user is not authenticated - don't show 'follow' button
    else:
        follow_btn = False
        follow = None

    # assembling payload
    payload = {
        "page": {
            "current": page_obj.number,
            "has_next": page_obj.has_next(),
            "has_previous": page_obj.has_previous(),
        },
        "num_pages": paginator.num_pages,
        "username": user.username,
        "followed_users": followed_users,
        "followers": followers,
        "follow_btn": follow_btn,
        "follow": follow,
        "data": data
    }

    return JsonResponse(payload, status=201)

# follow/unfollow user
@login_required
def follow_user(request, user_id):
    current_user_id = int(request.user.id)
    current_user = User.objects.get(pk=current_user_id)
    followed_user = User.objects.get(pk=user_id)
    # if current user is not following this user, then add to the list of followed users
    if (followed_user not in current_user.followed_users.all()):
        current_user.followed_users.add(followed_user)
        num_of_followers = User.objects.filter(followed_users__pk=user_id).count()
        return JsonResponse({'follow': True, 'num_of_followers': num_of_followers})
    # if user to follow is already in the list of followed users of the current user - remove it from this list
    else:
        current_user.followed_users.remove(followed_user)
        num_of_followers = User.objects.filter(followed_users__pk=user_id).count()
        return JsonResponse({'follow': False, 'num_of_followers': num_of_followers})


# like/unlike post
@csrf_exempt
@login_required
def like_post(request, post_id=-1):
    current_user_id = int(request.user.id)
    current_user = User.objects.get(pk=current_user_id)
    if post_id != '-1':
        post = Post.objects.get(pk=post_id)
        post_author = post.user

    # retrieve list of posts that user liked to load the correct status of 'like' button for each post
    if request.method == "GET":
        liked_posts = current_user.liked_posts.all()
        liked_posts_id = [post.id for post in liked_posts]
        return JsonResponse({"liked_posts_id": liked_posts_id})

    # if user click on like/unlike button
    if request.method == "PUT":
        # cannot like/unlike your own post
        if current_user == post_author:
            return JsonResponse({"error": "Cannot like/unlike your own post"}, status=400)

        if post not in current_user.liked_posts.all():
            current_user.liked_posts.add(post)
            like_count = post.users_liked.count()
            return JsonResponse({'like': True, 'like_count': like_count})
        else:
            current_user.liked_posts.remove(post)
            like_count = post.users_liked.count()
            return JsonResponse({'like': False, 'like_count': like_count})


# function that gets id of the logged in user (if there's any)
def get_current_user_id(request):
    if request.user.is_authenticated:
        current_user_id = request.user.id
    else:
        current_user_id = -1
    return JsonResponse({'current_user_id': current_user_id})


# save post after it was edited
@csrf_exempt
def save_post(request, post_id):

    # Sending an updated post should be via PUT
    if request.method != "PUT":
        return JsonResponse({"error": "PUT request required"}, status=400)

    post = Post.objects.get(pk=post_id)

    data =json.loads(request.body)
    if data.get("edited_post_text") is not None:
        post.text =data["edited_post_text"]
        post.save()
    return HttpResponse(status=204)

