from django.urls import path, include

urlpatterns = [
    # Incluimos las URLs de la app 'gestion' en la raíz de la web
    path('', include('gestion.urls')), 
]