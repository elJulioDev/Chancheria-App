import os
import json
import requests
from django.shortcuts import render
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required

from gestion.models import Carpeta, CategoriaBrowser

# ── Configuración Segura ─────────────────────────────────────────
# Obtenemos la URL base de forma segura desde las variables de entorno
PROVEEDOR_API_URL = os.environ.get('PROVEEDOR_API_URL', '')
_BASE  = f"{PROVEEDOR_API_URL}/api/v2"
_THUMB = "big"
_PER   = 24

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    )
}


@login_required(login_url="gestion:login")
def video_browser_view(request):
    carpetas = Carpeta.objects.filter(usuario=request.user).order_by("orden", "nombre")
    carpetas_json = json.dumps([{"id": c.id, "nombre": c.nombre} for c in carpetas])
    return render(request, "gestion/video_browser.html", {
        "carpetas":      carpetas,
        "carpetas_json": carpetas_json,
    })


@login_required(login_url="gestion:login")
def categorias_proxy(request):
    """
    GET /api/videos/categorias/
    Devuelve la lista de categorías almacenadas en la BD.
    """
    cats = (
        CategoriaBrowser.objects
        .filter(activa=True)
        .order_by("orden", "nombre")
        .values("id", "nombre", "tag", "conteo")
    )
    return JsonResponse({"ok": True, "categorias": list(cats)})


@login_required(login_url="gestion:login")
def video_search_proxy(request):
    """
    GET /api/videos/search/?q=TAG&page=1&order=latest
    """
    query    = request.GET.get("q", "").strip()
    page     = request.GET.get("page", "1")
    per_page = request.GET.get("per_page", str(_PER))
    order    = request.GET.get("order", "latest")

    if not query:
        return JsonResponse({"ok": False, "error": "q requerido"}, status=400)
        
    # Protección: Si la variable de entorno no está configurada, evitamos la petición mal formada
    if not PROVEEDOR_API_URL:
        return JsonResponse({"ok": False, "error": "API no configurada en el servidor"}, status=500)

    try:
        r = requests.get(
            f"{_BASE}/video/search/",
            params={
                "query":     query,
                "per_page":  per_page,
                "page":      page,
                "thumbsize": _THUMB,
                "format":    "json",
                "order":     order,
                "gay":       1,
                "lq":        1,
            },
            headers=_HEADERS,
            timeout=15,
        )
        r.raise_for_status()
        data = r.json()

        videos = []
        for v in data.get("videos", []):
            videos.append({
                "id":       v.get("id", ""),
                "title":    v.get("title", ""),
                "thumb":    v.get("default_thumb", {}).get("src", ""),
                "duration": v.get("length_min", ""),
                "views":    v.get("views", ""),
                "url":      v.get("url", ""),
            })

        return JsonResponse({
            "ok":     True,
            "total":  data.get("total_count", 0),
            "pages":  data.get("total_pages", 1),
            "count":  data.get("count", 0),
            "page":   int(page),
            "videos": videos,
        })

    except requests.RequestException as e:
        return JsonResponse({"ok": False, "error": str(e)}, status=502)
    except Exception:
        return JsonResponse({"ok": False, "error": "Error inesperado"}, status=500)