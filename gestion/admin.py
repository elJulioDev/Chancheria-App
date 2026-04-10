from django.contrib import admin
from .models import Carpeta, Marcador


@admin.register(Carpeta)
class CarpetaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'usuario', 'orden', 'creada')
    list_filter = ('usuario',)
    search_fields = ('nombre',)


@admin.register(Marcador)
class MarcadorAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'url', 'carpeta', 'usuario', 'orden')
    list_filter = ('usuario', 'carpeta')
    search_fields = ('titulo', 'url')