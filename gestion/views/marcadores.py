from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.db.models import Count
from ..models import Carpeta, Marcador


@login_required(login_url='gestion:login')
def marcadores_view(request):
    carpetas = Carpeta.objects.filter(usuario=request.user).annotate(total=Count('marcadores'))
    marcadores = Marcador.objects.filter(usuario=request.user).select_related('carpeta')
    return render(request, 'gestion/marcadores.html', {
        'carpetas': carpetas,
        'marcadores': marcadores,
        'total': marcadores.count(),
    })


@login_required(login_url='gestion:login')
@require_POST
def crear_carpeta(request):
    nombre = (request.POST.get('nombre') or '').strip()
    if not nombre:
        return JsonResponse({'ok': False, 'error': 'Nombre requerido'}, status=400)
    if Carpeta.objects.filter(usuario=request.user, nombre__iexact=nombre).exists():
        return JsonResponse({'ok': False, 'error': 'Ya existe'}, status=400)
    c = Carpeta.objects.create(usuario=request.user, nombre=nombre)
    return JsonResponse({'ok': True, 'id': c.id, 'nombre': c.nombre})


@login_required(login_url='gestion:login')
@require_POST
def crear_marcador(request):
    titulo = (request.POST.get('titulo') or '').strip()
    url = (request.POST.get('url') or '').strip()
    carpeta_id = request.POST.get('carpeta')
    if not (titulo and url and carpeta_id):
        return JsonResponse({'ok': False, 'error': 'Datos incompletos'}, status=400)
    carpeta = get_object_or_404(Carpeta, id=carpeta_id, usuario=request.user)
    m = Marcador.objects.create(usuario=request.user, carpeta=carpeta, titulo=titulo, url=url)
    return JsonResponse({
        'ok': True, 'id': m.id, 'titulo': m.titulo, 'url': m.url,
        'icono': m.icono, 'carpeta_id': carpeta.id,
    })


@login_required(login_url='gestion:login')
@require_POST
def editar_marcador(request, pk):
    m = get_object_or_404(Marcador, pk=pk, usuario=request.user)
    titulo = (request.POST.get('titulo') or '').strip()
    url    = (request.POST.get('url') or '').strip()
    carpeta_id = request.POST.get('carpeta')
    if not (titulo and url and carpeta_id):
        return JsonResponse({'ok': False, 'error': 'Datos incompletos'}, status=400)
    carpeta = get_object_or_404(Carpeta, id=carpeta_id, usuario=request.user)
    m.titulo  = titulo
    m.url     = url
    m.carpeta = carpeta
    # Re-resolver icono si cambió la URL
    url_anterior = Marcador.objects.filter(pk=pk).values_list('url', flat=True).first()
    if url != url_anterior:
        m.icono = ''          # fuerza re-resolución en save()
    m.save()
    return JsonResponse({'ok': True, 'titulo': m.titulo, 'carpeta_id': carpeta.id, 'icono': m.icono})


@login_required(login_url='gestion:login')
@require_POST
def eliminar_carpeta(request, pk):
    c = get_object_or_404(Carpeta, pk=pk, usuario=request.user)
    c.delete()
    return JsonResponse({'ok': True})


@login_required(login_url='gestion:login')
@require_POST
def eliminar_marcador(request, pk):
    m = get_object_or_404(Marcador, pk=pk, usuario=request.user)
    m.delete()
    return JsonResponse({'ok': True})


@login_required(login_url='gestion:login')
@require_POST
def mover_marcador(request, pk):
    m = get_object_or_404(Marcador, pk=pk, usuario=request.user)
    carpeta_id = request.POST.get('carpeta')
    carpeta = get_object_or_404(Carpeta, pk=carpeta_id, usuario=request.user)
    m.carpeta = carpeta
    m.save()
    return JsonResponse({'ok': True})