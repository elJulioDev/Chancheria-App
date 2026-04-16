/* ════════════════════════════════════════════════════════════
   video_browser.js — Categorías desde BD privada
   ════════════════════════════════════════════════════════════ */
'use strict';

const $ = id => document.getElementById(id);

// ── Refs ──────────────────────────────────────────────────────
const searchInput     = $('vb-search');
const clearBtn        = $('vb-clear');
const sortSelect      = $('vb-sort');
const grid            = $('vb-grid');
const spinner         = $('vb-spinner');
const emptyState      = $('vb-empty');
const errorState      = $('vb-error');
const errorMsg        = $('vb-error-msg');
const pagination      = $('vb-pagination');
const prevBtn         = $('vb-prev');
const nextBtn         = $('vb-next');
const pageInfo        = $('vb-page-info');
const toastContainer  = $('toast-container');

const sidebarEl       = $('vb-sidebar');
const sidebarToggle   = $('vb-sidebar-toggle');
const toggleCount     = $('toggle-count');
const overlay         = $('vb-overlay');
const catFilter       = $('vb-cat-filter');
const sidebarClearBtn = $('vb-sidebar-clear-btn');
const catLoading      = $('vb-cat-loading');
const catList         = $('vb-cat-list');

const activeBar       = $('vb-active-bar');
const activePills     = $('vb-active-pills');
const clearAllBtn     = $('vb-clear-all');

const addBackdrop     = $('add-modal-backdrop');
const addClose        = $('add-modal-close');
const addCancel       = $('add-modal-cancel');
const addConfirm      = $('add-modal-confirm');
const amTitulo        = $('am-titulo');
const amUrl           = $('am-url');
const amCarpeta       = $('am-carpeta');

// ── Estado ────────────────────────────────────────────────────
let activeTags    = new Set();
let currentQuery  = '';
let currentPage   = 1;
let totalPages    = 1;
let debounceTimer = null;
const PER_PAGE    = 24;

const ICON_PLUS  = `<svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2z"/></svg>`;
const ICON_CHECK = `<svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z"/></svg>`;

// ── Mobile ────────────────────────────────────────────────────
const isMobile = () => window.innerWidth <= 900;
let sidebarOpen = false;

function openSidebar()  { sidebarEl.classList.add('is-open'); overlay.classList.add('is-visible'); sidebarOpen = true; }
function closeSidebar() { sidebarEl.classList.remove('is-open'); overlay.classList.remove('is-visible'); sidebarOpen = false; }

sidebarToggle.addEventListener('click', () => {
    if (isMobile()) {
        sidebarOpen ? closeSidebar() : openSidebar();
    } else {
        sidebarEl.classList.toggle('is-collapsed');
    }
    sidebarToggle.classList.toggle('is-active', !sidebarEl.classList.contains('is-collapsed'));
});
overlay.addEventListener('click', closeSidebar);
window.addEventListener('resize', () => { if (!isMobile()) closeSidebar(); updateActiveBarOffset(); });

// ── Offset dinámico ───────────────────────────────────────────
function updateActiveBarOffset() {
    const h = activeBar.classList.contains('is-hidden') ? 0 : activeBar.offsetHeight;
    document.documentElement.style.setProperty('--active-bar-h', h + 'px');
}

// ── Cargar categorías desde endpoint privado ──────────────────
async function loadCategorias() {
    try {
        const res  = await fetch(VB_CONFIG.categoriasUrl);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || 'Error');

        renderSidebar(data.categorias);
    } catch (err) {
        catLoading.innerHTML = `<span style="color:var(--red);font-size:12px;">Error al cargar categorías</span>`;
    }
}

function renderSidebar(categorias) {
    catLoading.style.display = 'none';
    catList.innerHTML = categorias.map(c => `
        <li class="vb-cat-item" data-tag="${escHtml(c.tag)}" data-label="${escHtml(c.nombre)}">
            <button class="vb-cat-add" tabindex="-1" aria-hidden="true">${ICON_PLUS}</button>
            <span class="vb-cat-name">${escHtml(c.nombre)}</span>
            <span class="vb-cat-count">${Number(c.conteo).toLocaleString('es-CL')}</span>
        </li>
    `).join('');
    catList.style.display = '';
}

// ── Active tags ───────────────────────────────────────────────
function renderActiveTags() {
    const count = activeTags.size;

    activePills.innerHTML = '';
    activeTags.forEach(tag => {
        const pill = document.createElement('span');
        pill.className = 'vb-active-pill';
        pill.innerHTML = `${escHtml(tag)}<button title="Quitar" data-remove="${escHtml(tag)}">
            <svg width="8" height="8" viewBox="0 0 16 16" fill="currentColor"><path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06z"/></svg>
        </button>`;
        activePills.appendChild(pill);
    });

    activeBar.classList.toggle('is-hidden', count === 0);
    sidebarClearBtn.classList.toggle('is-visible', count > 0);
    toggleCount.textContent = count;
    sidebarToggle.classList.toggle('has-active', count > 0);

    document.querySelectorAll('.vb-cat-item').forEach(item => {
        const active = activeTags.has(item.dataset.tag);
        item.classList.toggle('is-active', active);
        const btn = item.querySelector('.vb-cat-add');
        if (btn) btn.innerHTML = active ? ICON_CHECK : ICON_PLUS;
    });

    setTimeout(updateActiveBarOffset, 50);
}

activePills.addEventListener('click', e => {
    const btn = e.target.closest('[data-remove]');
    if (!btn) return;
    activeTags.delete(btn.dataset.remove);
    renderActiveTags();
    runSearch();
});

const clearAll = () => { activeTags.clear(); renderActiveTags(); setView('empty'); emptyState.querySelector('p').textContent = 'Selecciona una categoría del menú'; };
clearAllBtn.addEventListener('click', clearAll);
sidebarClearBtn.addEventListener('click', clearAll);

// ── Click en categoría ────────────────────────────────────────
document.addEventListener('click', e => {
    const item = e.target.closest('.vb-cat-item');
    if (!item) return;
    const tag = item.dataset.tag;
    activeTags.has(tag) ? activeTags.delete(tag) : activeTags.add(tag);
    renderActiveTags();
    searchInput.value = '';
    clearBtn.style.display = 'none';
    currentQuery = '';
    runSearch();
    if (isMobile()) closeSidebar();
});

// ── Filtro sidebar ────────────────────────────────────────────
catFilter.addEventListener('input', () => {
    const q = catFilter.value.toLowerCase().trim();
    document.querySelectorAll('.vb-cat-item').forEach(item => {
        item.style.display = (!q || (item.dataset.label || '').toLowerCase().includes(q)) ? '' : 'none';
    });
});

// ── Búsqueda libre ────────────────────────────────────────────
searchInput.addEventListener('input', () => {
    const val = searchInput.value.trim();
    clearBtn.style.display = val ? '' : 'none';
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        currentQuery = val;
        if (val) fetchVideos(val, 1);
        else if (activeTags.size > 0) runSearch();
        else setView('empty');
    }, 420);
});

clearBtn.addEventListener('click', () => {
    searchInput.value = ''; clearBtn.style.display = 'none'; currentQuery = '';
    if (activeTags.size > 0) runSearch();
    else { setView('empty'); emptyState.querySelector('p').textContent = 'Selecciona una categoría del menú'; }
});

sortSelect.addEventListener('change', () => { const q = buildQuery(); if (q) fetchVideos(q, 1); });

// ── Query ─────────────────────────────────────────────────────
function buildQuery() {
    if (currentQuery) return currentQuery;
    return [...activeTags].join(' ');
}

function runSearch() {
    const q = buildQuery();
    if (q) fetchVideos(q, 1);
    else setView('empty');
}

// ── Fetch videos ──────────────────────────────────────────────
async function fetchVideos(query, page = 1) {
    if (!query.trim()) { setView('empty'); return; }
    setView('spinner');
    currentPage = page;
    if (page > 1) $('vb-main').scrollTop = 0;

    try {
        const params = new URLSearchParams({ q: query, page, per_page: PER_PAGE, order: sortSelect.value });
        const res  = await fetch(`${VB_CONFIG.searchUrl}?${params}`);
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || 'Error');
        totalPages = data.pages || Math.ceil((data.total || 0) / PER_PAGE) || 1;
        renderGrid(data.videos || []);
        renderPagination(page, data.count);
    } catch (err) {
        errorMsg.textContent = err.message || 'Error al conectar';
        setView('error');
    }
}

// ── Grid ──────────────────────────────────────────────────────
function formatViews(n) {
    const num = parseInt(n) || 0;
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
    if (num >= 1_000)     return (num / 1_000).toFixed(0) + 'k';
    return num.toString();
}
function escHtml(s) {
    return String(s ?? '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function renderGrid(videos) {
    if (!videos.length) { grid.innerHTML = ''; setView('empty'); emptyState.querySelector('p').textContent = 'Sin resultados'; return; }
    grid.innerHTML = videos.map(v => `
        <div class="vb-card" data-id="${escHtml(v.id)}" data-title="${escHtml(v.title)}" data-url="${escHtml(v.url)}">
            <div class="vb-card-thumb">
                <img src="${escHtml(v.thumb)}" alt="${escHtml(v.title)}" loading="lazy">
                <span class="vb-card-duration">${escHtml(v.duration)}</span>
                <div class="vb-card-overlay">
                    <button class="vb-overlay-btn js-play">
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0zm4.879-2.773 4.264 2.559a.25.25 0 0 1 0 .428l-4.264 2.559A.25.25 0 0 1 6 10.559V5.442a.25.25 0 0 1 .379-.215z"/></svg>
                        Ver
                    </button>
                    <button class="vb-overlay-btn is-save js-save">
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2z"/></svg>
                        Guardar
                    </button>
                </div>
            </div>
            <div class="vb-card-body">
                <p class="vb-card-title">${escHtml(v.title)}</p>
                <div class="vb-card-meta">
                    <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor"><path d="M8 2a5.53 5.53 0 0 0-3.594 1.342c-.766.66-1.321 1.52-1.464 2.383C1.266 6.095 0 7.555 0 9.318 0 11.366 1.708 13 3.781 13h8.906C14.502 13 16 11.57 16 9.773c0-1.636-1.242-2.969-2.834-3.194C12.923 4.546 10.711 2 8 2z"/></svg>
                    <span>${formatViews(v.views)} vistas</span>
                </div>
            </div>
        </div>
    `).join('');
    setView('grid');
}
function setView(s) {
    [emptyState, spinner, grid, errorState, pagination].forEach(el => el.style.display = 'none');
    if (s === 'empty')   emptyState.style.display  = '';
    if (s === 'spinner') spinner.style.display      = '';
    if (s === 'grid')    grid.style.display         = '';
    if (s === 'error')   errorState.style.display   = '';
}

// ── Paginación ────────────────────────────────────────────────
function renderPagination(page, count) {
    if (totalPages <= 1 && count < PER_PAGE) { pagination.style.display = 'none'; return; }
    pageInfo.textContent = `Pág. ${page} / ${totalPages}`;
    prevBtn.disabled = page <= 1;
    nextBtn.disabled = page >= totalPages;
    pagination.style.display = '';
}
prevBtn.addEventListener('click', () => { if (currentPage > 1) fetchVideos(buildQuery(), currentPage - 1); });
nextBtn.addEventListener('click', () => { if (currentPage < totalPages) fetchVideos(buildQuery(), currentPage + 1); });

// ── Delegado cards ────────────────────────────────────────────
document.addEventListener('click', e => {
    const card = e.target.closest('.vb-card');
    if (!card) return;
    const { id, url, title } = card.dataset;
    if (e.target.closest('.js-save')) { e.stopPropagation(); openAddModal(title, url); return; }
    if (e.target.closest('.js-play') || e.target.closest('.vb-card-thumb')) { e.preventDefault(); if (id) window.location.href = `/video/${id}/`; }
});

// ── Modal ─────────────────────────────────────────────────────
function openAddModal(title, url) {
    amTitulo.value = title; amUrl.value = url;
    if (VB_CONFIG.carpetas?.length) {
        amCarpeta.innerHTML = '<option value="" disabled selected>Selecciona una carpeta…</option>';
        VB_CONFIG.carpetas.forEach(c => { const o = document.createElement('option'); o.value = c.id; o.textContent = c.nombre; amCarpeta.appendChild(o); });
    }
    addBackdrop.classList.add('is-open');
    setTimeout(() => amTitulo.select(), 80);
}
function closeAddModal() { addBackdrop.classList.remove('is-open'); }
addClose.addEventListener('click', closeAddModal);
addCancel.addEventListener('click', closeAddModal);
addBackdrop.addEventListener('click', e => { if (e.target === addBackdrop) closeAddModal(); });
addConfirm.addEventListener('click', async () => {
    const titulo = amTitulo.value.trim(), url = amUrl.value.trim(), carpeta = amCarpeta.value;
    if (!titulo || !url) { toast('Completa título y URL', 'error'); return; }
    if (!carpeta)        { toast('Selecciona una carpeta', 'error'); return; }
    addConfirm.disabled = true; addConfirm.textContent = 'Guardando…';
    try {
        const res  = await fetch(VB_CONFIG.addUrl, { method: 'POST', headers: { 'X-CSRFToken': VB_CONFIG.csrfToken, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ titulo, url, carpeta }) });
        const data = await res.json();
        if (data.ok) { toast('Marcador guardado ✓', 'success'); closeAddModal(); }
        else toast(data.error || 'Error al guardar', 'error');
    } catch { toast('Error de red', 'error'); }
    finally { addConfirm.disabled = false; addConfirm.textContent = 'Guardar'; }
});

// ── Toast ─────────────────────────────────────────────────────
function toast(msg, type = 'success') {
    const t = document.createElement('div');
    t.className = `toast is-${type}`; t.textContent = msg;
    toastContainer.appendChild(t);
    setTimeout(() => { t.style.animation = 'toast-out 0.3s forwards'; t.addEventListener('animationend', () => t.remove()); }, 3000);
}

// ── Teclado ───────────────────────────────────────────────────
document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); searchInput.focus(); searchInput.select(); }
    if (e.key === 'Escape') {
        if (addBackdrop.classList.contains('is-open')) closeAddModal();
        else if (isMobile() && sidebarOpen) closeSidebar();
    }
});

// ── Init ──────────────────────────────────────────────────────
loadCategorias();
renderActiveTags();
updateActiveBarOffset();