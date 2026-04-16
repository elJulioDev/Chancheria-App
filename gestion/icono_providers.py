import os
import re
import json
import base64
import urllib.request
import urllib.parse

# ── Proveedor Oculto ──────────────────────────────────────────────────────────
# Extraemos la URL de la API del entorno para las peticiones HTTP
PROVEEDOR_API_URL = os.environ.get('PROVEEDOR_API_URL', 'https://dominio-secreto.com')

# Usamos EXACTAMENTE la misma cadena Base64 que usaste en tu JavaScript
PATRON_PROVEEDOR_B64 = 'ZXBvcm5lclwuY29tXC8oPzp2aWRlb3xoZC1wb3JufHBvcm4tdmlkZW8pW1wvLV0oW0EtWmEtejAtOV0rKQ=='

# Decodificamos el patrón en tiempo de ejecución de forma segura
_patron_decodificado = base64.b64decode(PATRON_PROVEEDOR_B64).decode('utf-8')
_PROVEEDOR_RE = re.compile(_patron_decodificado, re.I)

def _proveedor_thumb(url: str) -> str | None:
    m = _PROVEEDOR_RE.search(url)
    if not m:
        return None
        
    video_id = m.group(1)
    api_url = (
        f'{PROVEEDOR_API_URL}/api/v2/video/id/'
        f'?id={video_id}&thumbsize=big&format=json'
    )
    
    # Usamos un User-Agent de navegador moderno
    req = urllib.request.Request(api_url, headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    })
    
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode())
            
        if isinstance(data, list):
            return None
            
        if data.get('error'):
            return None
            
        thumb = (data.get('default_thumb') or {}).get('src')
        if thumb:
            return thumb
            
        thumbs = data.get('thumbs') or []
        if thumbs:
            return thumbs[0].get('src')
            
    except Exception:
        pass
        
    return None

# ── Registro de proveedores ───────────────────────────────────────────────────
_PROVIDERS = [
    (_PROVEEDOR_RE, _proveedor_thumb),
]

def resolver_icono_externo(url: str, dominio: str) -> str | None:
    """
    Devuelve la URL de miniatura si el proveedor la soporta,
    o None para que _resolver_icono() use el favicon de Google.
    """
    for pattern, handler in _PROVIDERS:
        if pattern.search(url):
            return handler(url)
    return None