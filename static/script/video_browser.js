/* ════════════════════════════════════════════════════════════
   video_browser.js — Buscador de videos interno
   Consume /api/videos/search/ (proxy Django → proveedor)
   ════════════════════════════════════════════════════════════ */

'use strict';

// ── Refs DOM ─────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const searchInput   = $('vb-search');
const clearBtn      = $('vb-clear');
const sortSelect    = $('vb-sort');
const grid          = $('vb-grid');
const spinner       = $('vb-spinner');
const emptyState    = $('vb-empty');
const errorState    = $('vb-error');
const errorMsg      = $('vb-error-msg');
const pagination    = $('vb-pagination');
const prevBtn       = $('vb-prev');
const nextBtn       = $('vb-next');
const pageInfo      = $('vb-page-info');
const toastContainer = $('toast-container');

// Modal
const addBackdrop   = $('add-modal-backdrop');
const addClose      = $('add-modal-close');
const addCancel     = $('add-modal-cancel');
const addConfirm    = $('add-modal-confirm');
const amTitulo      = $('am-titulo');
const amUrl         = $('am-url');
const amCarpeta     = $('am-carpeta');

// ── Estado ───────────────────────────────────────────────────
let currentQuery = '';
let currentPage  = 1;
let totalResults = 0;
let activeTag    = null;
let debounceTimer = null;
const PER_PAGE = 24;

// ── Helpers visuales ─────────────────────────────────────────
function show(el)  { el.style.display = ''; }
function hide(el)  { el.style.display = 'none'; }
function flex(el)  { el.style.display = 'flex'; }

function setView(state) {
    // state: 'empty' | 'spinner' | 'grid' | 'error'
    hide(emptyState);
    hide(spinner);
    hide(grid);
    hide(errorState);
    hide(pagination);
    if (state === 'empty')   show(emptyState);
    if (state === 'spinner') show(spinner);
    if (state === 'grid')    { show(grid); }
    if (state === 'error')   show(errorState);
}

// ── Toast ─────────────────────────────────────────────────────
function toast(msg, type = 'success') {
    const t = document.createElement('div');
    t.className = `toast is-${type}`;
    t.textContent = msg;
    toastContainer.appendChild(t);
    setTimeout(() => {
        t.style.animation = 'toast-out 0.3s forwards';
        t.addEventListener('animationend', () => t.remove());
    }, 3000);
}

// ── Fetch videos ─────────────────────────────────────────────
async function fetchVideos(query, page = 1) {
    if (!query.trim()) { setView('empty'); return; }

    setView('spinner');
    currentQuery = query;
    currentPage  = page;

    const params = new URLSearchParams({
        q:        query,
        page:     page,
        per_page: PER_PAGE,
        order:    sortSelect.value,
    });

    try {
        const res  = await fetch(`${VB_CONFIG.searchUrl}?${params}`);
        const data = await res.json();

        if (!data.ok) throw new Error(data.error || 'Error desconocido');

        totalResults = parseInt(data.total) || 0;
        renderGrid(data.videos || []);
        renderPagination(page, data.count);

    } catch (err) {
        errorMsg.textContent = err.message || 'Error al conectar';
        setView('error');
    }
}

// ── Render grid ──────────────────────────────────────────────
function formatViews(n) {
    const num = parseInt(n) || 0;
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
    if (num >= 1_000)     return (num / 1_000).toFixed(0) + 'k';
    return num.toString();
}

function renderGrid(videos) {
    if (!videos.length) {
        grid.innerHTML = '';
        setView('empty');
        emptyState.querySelector('p').textContent = 'Sin resultados para esta búsqueda';
        return;
    }

    grid.innerHTML = videos.map(v => `
        <div class="vb-card" data-id="${esc(v.id)}" data-title="${esc(v.title)}" data-url="${esc(v.url)}">
            <div class="vb-card-thumb">
                <img src="${esc(v.thumb)}" alt="${esc(v.title)}" loading="lazy">
                <span class="vb-card-duration">${esc(v.duration)}</span>
                <div class="vb-card-overlay">
                    <button class="vb-overlay-btn is-play js-play" title="Ver video">
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0zm4.879-2.773 4.264 2.559a.25.25 0 0 1 0 .428l-4.264 2.559A.25.25 0 0 1 6 10.559V5.442a.25.25 0 0 1 .379-.215z"/>
                        </svg>
                        Ver
                    </button>
                    <button class="vb-overlay-btn is-save js-save" title="Guardar marcador">
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2z"/>
                        </svg>
                        Guardar
                    </button>
                </div>
            </div>
            <div class="vb-card-body">
                <p class="vb-card-title">${esc(v.title)}</p>
                <div class="vb-card-meta">
                    <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 2a5.53 5.53 0 0 0-3.594 1.342c-.766.66-1.321 1.52-1.464 2.383C1.266 6.095 0 7.555 0 9.318 0 11.366 1.708 13 3.781 13h8.906C14.502 13 16 11.57 16 9.773c0-1.636-1.242-2.969-2.834-3.194C12.923 4.546 10.711 2 8 2z"/>
                    </svg>
                    <span>${formatViews(v.views)} vistas</span>
                </div>
            </div>
        </div>
    `).join('');

    setView('grid');
}

function esc(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// ── Paginación ────────────────────────────────────────────────
function renderPagination(page, count) {
    const totalPages = Math.ceil(totalResults / PER_PAGE);
    if (totalPages <= 1 && count < PER_PAGE) {
        hide(pagination);
        return;
    }
    pageInfo.textContent = `Pág. ${page}${totalPages > 1 ? ' / ' + totalPages : ''}`;
    prevBtn.disabled = page <= 1;
    nextBtn.disabled = count < PER_PAGE;
    show(pagination);
}

prevBtn.addEventListener('click', () => {
    if (currentPage > 1) fetchVideos(currentQuery, currentPage - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
});
nextBtn.addEventListener('click', () => {
    fetchVideos(currentQuery, currentPage + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ── Búsqueda con debounce ─────────────────────────────────────
searchInput.addEventListener('input', () => {
    const val = searchInput.value.trim();
    clearBtn.style.display = val ? '' : 'none';

    // Deseleccionar tag activo si el usuario escribe manualmente
    if (activeTag) {
        document.querySelector(`.vb-tag.is-active`)?.classList.remove('is-active');
        activeTag = null;
    }

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        fetchVideos(val, 1);
    }, 450);
});

clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearBtn.style.display = 'none';
    searchInput.focus();
    if (activeTag) {
        document.querySelector('.vb-tag.is-active')?.classList.remove('is-active');
        activeTag = null;
    }
    setView('empty');
    emptyState.querySelector('p').textContent = 'Selecciona un tag o busca un término';
});

// ── Tags ─────────────────────────────────────────────────────
document.querySelectorAll('.vb-tag').forEach(btn => {
    btn.addEventListener('click', () => {
        const tag = btn.dataset.tag;

        // Toggle: si ya está activo, deseleccionar
        if (activeTag === tag) {
            btn.classList.remove('is-active');
            activeTag = null;
            searchInput.value = '';
            clearBtn.style.display = 'none';
            setView('empty');
            emptyState.querySelector('p').textContent = 'Selecciona un tag o busca un término';
            return;
        }

        document.querySelector('.vb-tag.is-active')?.classList.remove('is-active');
        btn.classList.add('is-active');
        activeTag = tag;
        searchInput.value = tag;
        clearBtn.style.display = '';
        fetchVideos(tag, 1);
    });
});

// ── Sort change ───────────────────────────────────────────────
sortSelect.addEventListener('change', () => {
    if (currentQuery) fetchVideos(currentQuery, 1);
});

// ── Delegado: clicks en cards ─────────────────────────────────
document.addEventListener('click', e => {
    const card = e.target.closest('.vb-card');
    if (!card) return;

    const url   = card.dataset.url;
    const title = card.dataset.title;
    const id    = card.dataset.id;

    // Botón Guardar
    if (e.target.closest('.js-save')) {
        e.stopPropagation();
        openAddModal(title, url);
        return;
    }

    // Botón Ver / click en card → reproductor interno (ruta /video/<id>/)
    if (e.target.closest('.js-play') || e.target.closest('.vb-card-thumb')) {
        e.preventDefault();
        if (id) window.location.href = `/video/${id}/`;
        return;
    }
});

// ── Modal guardar marcador ────────────────────────────────────
async function loadCarpetas() {
    // Carga la lista de carpetas desde la página de marcadores vía API
    try {
        const res  = await fetch(VB_CONFIG.carpetasUrl, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
        // Si la respuesta es HTML, parseamos las opciones del select de carpetas
        // (fallback: no bloqueamos si falla)
        const text = await res.text();
        const parser = new DOMParser();
        const doc  = parser.parseFromString(text, 'text/html');
        const opts = doc.querySelectorAll('select[name="carpeta"] option, select[name="carpeta_id"] option');
        if (opts.length) {
            amCarpeta.innerHTML = '<option value="">Sin carpeta</option>';
            opts.forEach(o => {
                if (o.value) amCarpeta.appendChild(o.cloneNode(true));
            });
        }
    } catch (_) {
        // Silencioso — el select queda con "Sin carpeta"
    }
}

function openAddModal(title, url) {
    amTitulo.value = title;
    amUrl.value    = url;
    addBackdrop.style.display = 'flex';
    loadCarpetas();
    setTimeout(() => amTitulo.select(), 80);
}

function closeAddModal() {
    addBackdrop.style.display = 'none';
}

addClose.addEventListener('click',  closeAddModal);
addCancel.addEventListener('click', closeAddModal);
addBackdrop.addEventListener('click', e => {
    if (e.target === addBackdrop) closeAddModal();
});

addConfirm.addEventListener('click', async () => {
    const titulo  = amTitulo.value.trim();
    const url     = amUrl.value.trim();
    const carpeta = amCarpeta.value;

    if (!titulo || !url) { toast('Completa título y URL', 'error'); return; }

    addConfirm.disabled = true;
    addConfirm.textContent = 'Guardando…';

    try {
        const body = new URLSearchParams({ titulo, url, carpeta });
        const res  = await fetch(VB_CONFIG.addUrl, {
            method:  'POST',
            headers: {
                'X-CSRFToken':    VB_CONFIG.csrfToken,
                'Content-Type':   'application/x-www-form-urlencoded',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body,
        });
        const data = await res.json();
        if (data.ok) {
            toast('Marcador guardado ✓', 'success');
            closeAddModal();
        } else {
            toast(data.error || 'Error al guardar', 'error');
        }
    } catch (err) {
        toast('Error de red', 'error');
    } finally {
        addConfirm.disabled = false;
        addConfirm.textContent = 'Guardar';
    }
});

// ── Atajo de teclado ──────────────────────────────────────────
document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
    }
    if (e.key === 'Escape') {
        if (addBackdrop.style.display !== 'none') closeAddModal();
    }
});

// ── Activar primer tag por defecto al cargar ──────────────────
(function init() {
    const firstTag = document.querySelector('.vb-tag');
    if (firstTag) {
        firstTag.classList.add('is-active');
        activeTag = firstTag.dataset.tag;
        searchInput.value = activeTag;
        clearBtn.style.display = '';
        fetchVideos(activeTag, 1);
    }
})();
