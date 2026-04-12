"""
Uso:
    python manage.py refetch_icons              # solo marcadores sin icono
    python manage.py refetch_icons --all        # todos los marcadores
    python manage.py refetch_icons --url https://www.ejemplo.com/video/XYZ/  # uno específico
"""
from django.core.management.base import BaseCommand
from gestion.models import Marcador


class Command(BaseCommand):
    help = 'Re-resuelve el icono/miniatura de los marcadores'

    def add_arguments(self, parser):
        parser.add_argument('--all',  action='store_true', help='Reprocesar todos')
        parser.add_argument('--url',  type=str,            help='URL específica a probar')

    def handle(self, *args, **options):
        if options['url']:
            # Modo diagnóstico: muestra qué devolvería el resolver
            from urllib.parse import urlparse
            url = options['url']
            dominio = urlparse(url).netloc
            try:
                from gestion.icono_providers import resolver_icono_externo
                resultado = resolver_icono_externo(url, dominio)
                if resultado:
                    self.stdout.write(self.style.SUCCESS(f'Miniatura: {resultado}'))
                else:
                    self.stdout.write(self.style.WARNING('Sin resultado — usaría favicon de Google'))
            except ImportError as e:
                self.stdout.write(self.style.ERROR(f'icono_providers.py no encontrado: {e}'))
            return

        qs = Marcador.objects.all() if options['all'] else Marcador.objects.filter(icono='')
        total = qs.count()
        self.stdout.write(f'Procesando {total} marcadores…')

        ok = fail = skip = 0
        for m in qs:
            nuevo = m._resolver_icono()
            if nuevo and nuevo != m.icono:
                m.icono = nuevo
                Marcador.objects.filter(pk=m.pk).update(icono=nuevo)
                self.stdout.write(f'  ✓ [{m.pk}] {m.titulo[:50]}')
                ok += 1
            elif not nuevo:
                skip += 1
            else:
                skip += 1

        self.stdout.write(self.style.SUCCESS(
            f'\nListo: {ok} actualizados, {skip} sin cambio, {fail} errores'
        ))