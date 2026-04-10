/**
 * marcadores.js — Gestión / Intranet
 * Requiere: CSRF token en el DOM, clases del template redesignado.
 */

'use strict';

// ── Utilidades ──────────────────────────────────────────────
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const csrf = () => $('[name=csrfmiddlewaretoken]').value;

/** Normaliza una URL: añade https:// si falta protocolo */
function normalizeUrl(raw) {
    const s = raw.trim();
    if (!s) return '';
    if (/^https?:\/\//i.test(s)) return s;
    if (s.startsWith('//')) return 'https:' + s;
    return 'https://' + s;
}

/** POST con FormData, devuelve JSON */
async function apiPost(url, data = {}) {
    const fd = new FormData();
    Object.entries(data).forEach(([k, v]) => fd.append(k, v));
    const r = await fetch(url, {
        method: 'POST',
        headers: { 'X-CSRFToken': csrf() },
        body: fd,
    });
    return r.json();
}

// ── Toast ───────────────────────────────────────────────────
function showToast(msg, type = 'success') {
    const container = $('#toast-container');
    const toast = document.createElement('div');
    toast.className = `toast is-${type}`;

    const icon = type === 'success'
        ? `<svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"/></svg>`
        : `<svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M4.47.22A.749.749 0 0 1 5 0h6c.199 0 .389.079.53.22l4.25 4.25c.141.14.22.331.22.53v6a.749.749 0 0 1-.22.53l-4.25 4.25A.749.749 0 0 1 11 16H5a.749.749 0 0 1-.53-.22L.22 11.53A.749.749 0 0 1 0 11V5c0-.199.079-.389.22-.53Zm.84 1.28L1.5 5.31v5.38l3.81 3.81h5.38l3.81-3.81V5.31L10.69 1.5ZM8 4a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"/></svg>`;

    toast.innerHTML = icon + msg;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toast-out 0.25s ease forwards';
        setTimeout(() => toast.remove(), 250);
    }, 2400);
}

// ── Modals ──────────────────────────────────────────────────
function openModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('is-open');
    // Focus primer input
    setTimeout(() => {
        const first = el.querySelector('input, select');
        if (first) first.focus();
    }, 80);
}

function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('is-open');
}

// Cerrar con botones [data-close-modal]
document.addEventListener('click', e => {
    const btn = e.target.closest('[data-close-modal]');
    if (btn) closeModal(btn.dataset.closeModal);

    // Cerrar al hacer clic en el backdrop
    if (e.target.classList.contains('modal-backdrop')) {
        e.target.classList.remove('is-open');
    }
});

// Cerrar con Escape
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        $$('.modal-backdrop.is-open').forEach(m => m.classList.remove('is-open'));
    }
    // Atajo ⌘K / Ctrl+K para buscar
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const s = $('#search-input');
        if (s) { s.focus(); s.select(); }
    }
});

// ── Abrir modals ────────────────────────────────────────────
$('#btn-add-marcador')?.addEventListener('click', () => {
    $('#bm-titulo').value = '';
    $('#bm-url').value = '';
    openModal('modal-marcador');
});

$('#btn-add-carpeta')?.addEventListener('click', () => {
    $('#folder-nombre').value = '';
    openModal('modal-carpeta');
});

// Botón vacío (primer acceso)
$('#btn-empty-add')?.addEventListener('click', () => {
    $('#folder-nombre').value = '';
    openModal('modal-carpeta');
});

// ── Guardar marcador ────────────────────────────────────────
$('#btn-save-marcador')?.addEventListener('click', async () => {
    const titulo  = $('#bm-titulo').value.trim();
    const rawUrl  = $('#bm-url').value.trim();
    const carpeta = $('#bm-carpeta').value;

    if (!titulo) { showToast('El título es requerido', 'error'); return; }
    if (!rawUrl)  { showToast('La URL es requerida', 'error');   return; }
    if (!carpeta) { showToast('Selecciona una carpeta', 'error'); return; }

    const url = normalizeUrl(rawUrl);

    const btn = $('#btn-save-marcador');
    btn.disabled = true;

    try {
        const r = await apiPost('/marcadores/crear/', { titulo, url, carpeta });
        if (r.ok) {
            showToast('Marcador guardado');
            closeModal('modal-marcador');
            location.reload();
        } else {
            showToast(r.error || 'Error al guardar', 'error');
        }
    } catch {
        showToast('Error de red', 'error');
    } finally {
        btn.disabled = false;
    }
});

// Enter en input de marcador
$('#bm-url')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') $('#btn-save-marcador')?.click();
});

// ── Guardar carpeta ─────────────────────────────────────────
$('#btn-save-carpeta')?.addEventListener('click', async () => {
    const nombre = $('#folder-nombre').value.trim();
    if (!nombre) { showToast('El nombre es requerido', 'error'); return; }

    const btn = $('#btn-save-carpeta');
    btn.disabled = true;

    try {
        const r = await apiPost('/marcadores/carpeta/crear/', { nombre });
        if (r.ok) {
            showToast('Carpeta creada');
            closeModal('modal-carpeta');
            location.reload();
        } else {
            showToast(r.error || 'Error al crear', 'error');
        }
    } catch {
        showToast('Error de red', 'error');
    } finally {
        btn.disabled = false;
    }
});

$('#folder-nombre')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') $('#btn-save-carpeta')?.click();
});

// ── Eliminar ────────────────────────────────────────────────
document.addEventListener('click', async e => {
    // Eliminar marcador
    const delBm = e.target.closest('[data-del-bm]');
    if (delBm) {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm('¿Eliminar este marcador?')) return;
        try {
            const r = await apiPost(`/marcadores/${delBm.dataset.delBm}/eliminar/`, {});
            if (r.ok) { showToast('Marcador eliminado'); location.reload(); }
            else showToast(r.error || 'Error', 'error');
        } catch { showToast('Error de red', 'error'); }
        return;
    }

    // Eliminar carpeta
    const delFolder = e.target.closest('[data-del-folder]');
    if (delFolder) {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm('¿Eliminar carpeta y todos sus marcadores?')) return;
        try {
            const r = await apiPost(`/marcadores/carpeta/${delFolder.dataset.delFolder}/eliminar/`, {});
            if (r.ok) { showToast('Carpeta eliminada'); location.reload(); }
            else showToast(r.error || 'Error', 'error');
        } catch { showToast('Error de red', 'error'); }
    }
});

// ── Filtro sidebar ──────────────────────────────────────────
$$('.sidebar-item[data-folder]').forEach(item => {
    item.addEventListener('click', e => {
        if (e.target.closest('[data-del-folder]')) return;

        $$('.sidebar-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        const folder = item.dataset.folder;
        $$('.bm-section').forEach(s => {
            s.classList.toggle('is-hidden', folder !== 'all' && s.dataset.section !== folder);
        });
    });
});

// ── Toggle sidebar ──────────────────────────────────────────
$('#sidebar-toggle')?.addEventListener('click', () => {
    $('#sidebar')?.classList.toggle('is-collapsed');
});

// ── Búsqueda ────────────────────────────────────────────────
$('#search-input')?.addEventListener('input', e => {
    const q = e.target.value.toLowerCase().trim();
    let any = false;

    $$('.bm-card').forEach(card => {
        const title = card.dataset.title || '';
        const match = !q || title.includes(q);
        card.classList.toggle('is-hidden', !match);
        if (match) any = true;
    });

    // Ocultar secciones vacías durante búsqueda
    $$('.bm-section').forEach(s => {
        if (!q) {
            s.classList.remove('is-hidden');
            return;
        }
        const visible = s.querySelectorAll('.bm-card:not(.is-hidden)').length > 0;
        s.classList.toggle('is-hidden', !visible);
    });

    const noResults = $('#no-results');
    if (noResults) noResults.style.display = (q && !any) ? 'flex' : 'none';
});