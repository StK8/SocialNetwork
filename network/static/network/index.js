// global variable to prevent automatic scroll to the top during pagination button click - see 'load posts' function
let scroll = false;

document.addEventListener('DOMContentLoaded', function() {

    load_posts();

    // if new post form exists
    if (document.querySelector('#new-post-view')){
        document.querySelector('#new-post-view').removeAttribute("hidden");
    }

    // add event handler to the form only if it exists
    if (document.querySelector('#new-post-form')) {
        // send a new post
        document.querySelector('#new-post-form').onsubmit = send_post;
    }
})

function hide_user_view() {
    if (document.querySelector('#user-view')) {
        document.querySelector('#user-view').setAttribute("hidden", "hidden");
    }
}

function hide_new_post_view() {
    if (document.querySelector('#new-post-view')) {
        document.querySelector('#new-post-view').setAttribute("hidden", "hidden");
    }
}

function unhide_new_post_view() {
    if (document.querySelector('#new-post-view')) {
        document.querySelector('#new-post-view').removeAttribute("hidden");
    }
}

async function load_posts(user_id=-1, page=1, user_profile=false, hide_new_p_view=false) {

    // hide/unhide new post view
    if (hide_new_p_view == true) {
        hide_new_post_view();
    } else {
        unhide_new_post_view();
    }

    // if loading posts not in user profile - hide user view
    if (user_profile == false) {
        hide_user_view();
    }
    document.querySelector('#all-posts-view').innerHTML= "";
    const h3 = document.createElement('h3');
    // loading user posts in their profile
    if (user_profile == true) {
        response = await fetch(`users/${user_id}?page=${page}`);
        posts = await response.json();
    } else if (user_id == -1) {     // if user is not specified - load all existing posts
        response = await fetch(`load_all_posts?page=${page}`);
        posts = await response.json();
        h3.innerHTML = 'All posts';
        document.querySelector('#all-posts-view').append(h3);
    } else {     // if user is specified - load posts of users that are followed by this user
        response = await fetch(`load_posts/${user_id}?page=${page}`);
        posts = await response.json();
        h3.innerHTML = 'Followed users\' posts';
        document.querySelector('#all-posts-view').append(h3);
        hide_new_post_view();
    }

    data = posts['data'];

    // get id of the logged in user
    current_user_id = await fetch('current_user_id');
    current_user_id = await current_user_id.json();
    current_user_id = current_user_id['current_user_id'];

    // if user is logged in - get the list of the posts they liked
    if (current_user_id != -1) {
        response = await fetch('like/-1');
        response = await response.json();
        liked_posts_id = response['liked_posts_id'];
    }

    // posts is not an Array but HTML collection that doesn't have forEach method, so need to convert first
    Array.from(data).forEach((post) => {
    post_id = post['id'];
    const post_div =document.createElement('div');

    // add username to the post div if this is not user profile
    if (user_profile == false) {
        const p = document.createElement('p');
        p.classList.add('p-username');
        const a_username = document.createElement('a');
        a_username.classList.add('a-username');
        a_username.addEventListener('click', () => {load_user(post.user_id);});
        a_username.setAttribute('href', '#');
        a_username.innerHTML = post.username;
        p.append(a_username);

        // create hidden textarea form which appears when user clicks 'Edit' button
        const post_form = document.createElement('form');
        const post_textarea = document.createElement('textarea');
        const post_submit = document.createElement('input');
        post_form.classList.add('post-form');
        post_textarea.setAttribute('name', 'post-textarea');
        post_submit.setAttribute('type', 'button');
        post_submit.setAttribute('value', 'Save');
        post_form.append(post_textarea);
        post_form.append(post_submit);
        post_form.setAttribute('hidden', 'hidden');
        post_div.append(post_form);

        if (current_user_id == post.user_id) {
            const a_edit = document.createElement('a');
            a_edit.classList.add('post-edit');
            a_edit.innerHTML = 'Edit';
            p.append(' | ');
            p.append(a_edit);
            a_edit.addEventListener('click', function(e) {edit_post(e.target);});
            post_submit.addEventListener('click', function(e) {save_edited_post(post.id, post_textarea.value, e.target)});
        }

        post_div.append(p);
    }

    // add text to the post div
    const post_text_p = document.createElement('p');
    post_text_p.classList.add('post-text');
    post_text_p.innerHTML = post.text;
    post_div.append(post_text_p);

    // add timestamp to the post div
    const post_datetime_p = document.createElement('p');
    post_datetime_p.classList.add('post-timestamp');
    post_datetime_p.innerHTML = post.datetime;
    post_div.append(post_datetime_p);

    // number of post's likes
    const post_like_count = document.createElement('p');
    post_like_count.classList.add('post-like-count');
    post_like_count.innerHTML = "Likes: " + post.like_count;
    post_div.append(post_like_count);

    // if logged in user is not the author of the post - show 'like/unlike' button
    if (current_user_id != -1 && current_user_id != post.user_id) {
        const a_like = document.createElement('a');
        a_like.classList.add('post-like');
        // parent element of 'a' tag - div of the whole post
        //const post_like_count = post_div.querySelector('.post-like-count');
        post_like_count.append(a_like);

        if (liked_posts_id.includes(post_id)) {
            a_like.innerHTML = ' | Unlike';
        }
        else {
            a_like.innerHTML = ' | Like';
        }
        //post_div.append(a_like);
        a_like.addEventListener('click', function(e) {
            fetch(`like/${post.id}`, {
            method: 'PUT'
            })
            .then(response => response.json())
            .then(result => {
                if (result['like']) {
                    // once the Like/Unlike button is clicked - update text of the button to the opposite and change
                    // number of likes without reloading the page
                    a_like.innerHTML = 'Unlike';
                    post_like_count.innerHTML = "Likes: " + result['like_count'] + " | ";
                    post_like_count.append(a_like);
                } else {
                    a_like.innerHTML = 'Like';
                    post_like_count.innerHTML = "Likes: " + result['like_count'] + " | " ;
                    post_like_count.append(a_like);
                }
            })

        });
    }

    document.querySelector('#all-posts-view').append(post_div);

    });

    // pagination user interface
    const page_nav = document.createElement('nav');
    document.querySelector('#all-posts-view').append(page_nav);
    const page_ul = document.createElement('ul');
    page_ul.classList.add('pagination');
    page_nav.append(page_ul);
    if (posts['page']['has_previous']) {
        const page_li = document.createElement('li');
        page_li.classList.add('page-item');
        page_li.setAttribute("id", 'page-li-previous');
        const page_a = document.createElement('a');
        page_a.classList.add('page-link');
        page_a.innerHTML = 'Previous';
        page_li.append(page_a);
        page_ul.append(page_li);
        page_li.onclick = (e) => {
            load_posts(user_id=user_id, page=posts['page']['current']-1, user_profile);
            // if 'load_posts' function was called by clicking the pagination button, then need to scroll down
            scroll = true;
        };
    }

    if (posts['page']['has_next']) {
        const page_li = document.createElement('li');
        page_li.classList.add('page-item');
        page_li.setAttribute("id", 'page-li-next');
        const page_a = document.createElement('a');
        page_a.classList.add('page-link');
        page_a.innerHTML = 'Next';
        page_li.append(page_a);
        page_ul.append(page_li);
        page_li.onclick = (e) => {
            load_posts(user_id=user_id, page=posts['page']['current']+1, user_profile);
            // if 'load_posts' function was called by clicking the pagination button, then need to scroll down
            scroll = true;
        };
    }
    // if 'load_posts' function was called by clicking the pagination button, then need to scroll down and reset the variable
    if (scroll == true) {
        window.scrollTo(0, document.body.scrollHeight);
        scroll = false;
    }
}

function send_post() {
    const post_text = document.querySelector('#id_post_text').value;

    if (!post_text) {
        console.log('Form is empty!');
    } else {
        fetch('send_post', {
        method:'POST',
        body: JSON.stringify({
            post_text: post_text
        })
    })
    .then(response => response.json())
    .then(result => {
        // clear div contents before loading posts to avoid posts duplicating
        document.querySelector('#all-posts-view').innerHTML = '';
        load_posts();
        // clear form field after submit
        document.querySelector('#id_post_text').value = '';
    });
    return false;
    }
}

async function load_user(user_id) {
    response = await fetch(`users/${user_id}`);
    body = await response.json();
    hide_new_post_view();
    document.querySelector('#user-view').removeAttribute("hidden");
    document.querySelector('#user-view').innerHTML = '';
    document.querySelector('#all-posts-view').innerHTML = '';

    // add username
    const username_h3 =document.createElement('h3');
    username_h3.innerHTML = body['username'] + " profile";
    document.querySelector('#user-view').append(username_h3);

    // add number of followers
    const followers_p = document.createElement('p');
    followers_p.setAttribute('id', 'followers_p');
    followers_p.innerHTML = "Followers:" + body['followers'];
    document.querySelector('#user-view').append(followers_p);

    // add number of followed users
    const followed_users_p = document.createElement('p');
    followed_users_p.setAttribute('id', 'followed_users_p');
    followed_users_p.innerHTML = "Following users:" + body['followed_users'];
    document.querySelector('#user-view').append(followed_users_p);

    // if user is logged in and checking somebody else's profile - show 'follow' button
    if (body['follow_btn']) {
        const follow_button = document.createElement('button');
        follow_button.setAttribute("id", "follow-btn");
        if (body['follow'] == false) {
            follow_button.innerHTML = "Follow";
        } else if (body['follow'] == true) {
            follow_button.innerHTML = "Unfollow";
        }
        follow_button.addEventListener('click', () => {follow_user(user_id, body['followers']);});
        document.querySelector('#user-view').append(follow_button);
    }
    const posts_h5 =document.createElement('h5');
    posts_h5.innerHTML = body['username'] + " posts";
    document.querySelector('#user-view').append(posts_h5);

    load_posts(user_id=user_id, page=1, user_profile=true, hide_new_p_view=true);
}

function follow_user(user_id, followers) {
    fetch(`follow/${user_id}`)
    .then(response => response.json())
    .then(body => {
        followers = followers
        // if user clicked button to follow, then need to change text to the opposite - 'Unfollow'
        if (body['follow']) {
            document.querySelector('#follow-btn').innerHTML = "Unfollow";
            // send the updated number of followers in json response so that the change is reflected in user profile
            //without the need to reload the whole page
            document.querySelector('#followers_p').innerHTML = "Followers:" + body['num_of_followers'];
        } else {
            document.querySelector('#follow-btn').innerHTML = "Follow";
            // send the updated number of followers in json response so that the change is reflected in user profile
            //without the need to reload the whole page
            document.querySelector('#followers_p').innerHTML = "Followers:" + body['num_of_followers'];
        }
    });
}

// function which is called when user clicks 'Edit' button
function edit_post(html_element) {
    p = html_element.parentNode;
    post_div = p.parentNode;
    post_text_p = post_div.querySelector('.post-text');
    post_form = post_div.querySelector('.post-form');
    post_textarea = post_form.getElementsByTagName('textarea');
    post_text_p.setAttribute("hidden", "hidden");
    post_textarea[0].innerHTML = post_text_p.innerHTML;
    post_form.removeAttribute("hidden");
}


function save_edited_post(post_id, edited_post_text, html_element) {
    fetch(`save/${post_id}`, {
        method: 'PUT',
        body: JSON.stringify({
            edited_post_text: edited_post_text
        })
    })
    .then(() => {
        post_form = html_element.parentNode;
        post_div = post_form.parentNode;
        post_text = post_div.querySelector('.post-text');
        post_form.setAttribute("hidden", "hidden");
        post_text.innerHTML = edited_post_text;
        post_text.removeAttribute("hidden");
    })
}

