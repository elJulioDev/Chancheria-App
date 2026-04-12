from django.contrib import admin
from .models import Carpeta, Marcador


class OwnedModelAdmin(admin.ModelAdmin):
    """Restringe el admin para que cada usuario solo vea sus propios registros."""

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            # Superusuario ve solo sus propios datos, no los de todos
            return qs.filter(usuario=request.user)
        return qs.filter(usuario=request.user)

    def save_model(self, request, obj, form, change):
        if not change:  # solo al crear
            obj.usuario = request.user
        super().save_model(request, obj, form, change)


@admin.register(Carpeta)
class CarpetaAdmin(OwnedModelAdmin):
    list_display = ('nombre', 'orden', 'creada')
    search_fields = ('nombre',)


@admin.register(Marcador)
class MarcadorAdmin(OwnedModelAdmin):
    list_display = ('titulo', 'url', 'carpeta', 'orden')
    list_filter = ('carpeta',)
    search_fields = ('titulo', 'url')