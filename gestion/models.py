from django.db import models
from django.contrib.auth.models import User


class Carpeta(models.Model):
    nombre = models.CharField(max_length=80)
    usuario = models.ForeignKey(User, on_delete=models.CASCADE, related_name='carpetas')
    orden = models.PositiveIntegerField(default=0)
    creada = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['orden', 'nombre']
        unique_together = ('usuario', 'nombre')

    def __str__(self):
        return self.nombre


class Marcador(models.Model):
    titulo = models.CharField(max_length=120)
    url = models.URLField(max_length=500)
    icono = models.URLField(max_length=500, blank=True)
    carpeta = models.ForeignKey(Carpeta, on_delete=models.CASCADE, related_name='marcadores')
    usuario = models.ForeignKey(User, on_delete=models.CASCADE, related_name='marcadores')
    orden = models.PositiveIntegerField(default=0)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['orden', 'titulo']

    def __str__(self):
        return self.titulo

    def save(self, *args, **kwargs):
        if not self.icono and self.url:
            from urllib.parse import urlparse
            dominio = urlparse(self.url).netloc
            self.icono = f'https://www.google.com/s2/favicons?domain={dominio}&sz=64'
        super().save(*args, **kwargs)