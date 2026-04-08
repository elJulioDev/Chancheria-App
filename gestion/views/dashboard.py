from django.shortcuts import render
from django.contrib.auth.decorators import login_required, user_passes_test


def is_admin(user):
    return user.is_staff or user.is_superuser


@login_required(login_url='gestion:login')
@user_passes_test(is_admin, login_url='gestion:login')
def index_view(request):
    return render(request, 'gestion/index.html')