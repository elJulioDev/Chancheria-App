import os
import json
import requests
import re
from django.shortcuts import render
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from bs4 import BeautifulSoup
from gestion.models import Carpeta, CategoriaBrowser

PROVEEDOR_URL_BASE = os.environ.get('PROVEEDOR_API_URL', 'https://dominio-secreto.com')

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
    Parsea la web oficial en lugar de la API para obtener los mismos resultados,
    incluyendo los filtros de ordenamiento exactos.
    """
    query    = request.GET.get("q", "").strip()
    page     = request.GET.get("page", "1")
    order    = request.GET.get("order", "latest")

    if not query:
        return JsonResponse({"ok": False, "error": "q requerido"}, status=400)

    try:
        tokens = [t.strip() for t in re.split(r'[ ,]+', query) if t.strip()]
        valid_tags = set(CategoriaBrowser.objects.values_list('tag', flat=True))
        is_category_search = len(tokens) > 0 and all(t in valid_tags for t in tokens)

        mapa_orden = {
            "latest": "",
            "top-weekly": "top-weekly",
            "top-monthly": "top-monthly",
            "most-viewed": "most-viewed",
            "top-rated": "top-rated",
            "longest": "longest",
            "shortest": "shortest"
        }
        
        order_slug = mapa_orden.get(order, "")

        if is_category_search:
            path = f"/cat/{'/'.join(tokens)}/"
        else:
            search_slug = "-".join(tokens)
            path = f"/search/{search_slug}/"
            
        if order_slug:
            path += f"{order_slug}/"
            
        if str(page) != "1":
            path += f"{page}/"

        url = f"{PROVEEDOR_URL_BASE}{path}"

        r = requests.get(url, headers=_HEADERS, timeout=15)
        r.raise_for_status()

        soup = BeautifulSoup(r.text, 'html.parser')
        videos = []
        
        for div in soup.find_all("div", class_="mb"):
            a_tag = div.find("a")
            if not a_tag: 
                continue
                
            video_url = a_tag.get("href", "")
            if video_url.startswith("/"):
                video_url = f"{PROVEEDOR_URL_BASE}{video_url}"
                
            parts = [p for p in a_tag.get("href", "").split("/") if p]
            vid_id = ""
            if len(parts) >= 2 and parts[1].isdigit():
                vid_id = parts[1]
            else:
                vid_id = div.get("id", "").replace("vid", "")
                
            if not vid_id: 
                continue
                
            img_tag = div.find("img")
            if not img_tag: 
                continue
                
            title = img_tag.get("title") or img_tag.get("alt") or "Sin título"
            thumb = img_tag.get("data-src") or img_tag.get("src") or ""
            
            tim_span = div.find("span", class_="mbtim")
            duration = tim_span.text.strip() if tim_span else ""
            
            vi_span = div.find("span", class_="mbvi")
            views = vi_span.text.strip() if vi_span else ""
            
            videos.append({
                "id":       vid_id,
                "title":    title.strip(),
                "thumb":    thumb,
                "duration": duration,
                "views":    views,
                "url":      video_url,
            })

        return JsonResponse({
            "ok":     True,
            "total":  10000, 
            "pages":  1000,  
            "count":  len(videos),
            "page":   int(page),
            "videos": videos,
        })

    except requests.RequestException as e:
        return JsonResponse({"ok": False, "error": f"Error de red: {str(e)}"}, status=502)
    except Exception as e:
        return JsonResponse({"ok": False, "error": f"Error procesando HTML: {str(e)}"}, status=500)