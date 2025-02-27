from django import forms

class NewPostForm(forms.Form):
    post_text = forms.CharField(max_length=140, label="")