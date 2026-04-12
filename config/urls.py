from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    # Incluimos las URLs de la app 'gestion' en la raíz de la web
    path('', include('gestion.urls')), 
]