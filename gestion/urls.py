from django.urls import path
from . import views

app_name = 'gestion'

urlpatterns = [
    path('', views.marcadores_view, name='index'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),

    path('marcadores/', views.marcadores_view, name='marcadores'),
    path('marcadores/carpeta/crear/', views.crear_carpeta, name='crear_carpeta'),
    path('marcadores/carpeta/<int:pk>/eliminar/', views.eliminar_carpeta, name='eliminar_carpeta'),
    path('marcadores/crear/', views.crear_marcador, name='crear_marcador'),
    path('marcadores/<int:pk>/eliminar/', views.eliminar_marcador, name='eliminar_marcador'),
    path('marcadores/<int:pk>/mover/', views.mover_marcador, name='mover_marcador'),
]