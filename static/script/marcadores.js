/* marcadores.js */
const csrf = document.querySelector('[name=csrfmiddlewaretoken]').value;
const $  = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

/* ── Toast ───────────────────────────────────────────────── */
function toast(msg, tipo = 'success') {
    const container = $('#toast-container');
    const el = document.createElement('div');
    el.className = `toast is-${tipo}`;
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => {
        el.style.animation = 'toast-out 0.25s forwards';
        el.addEventListener('animationend', () => el.remove());
    }, 2200);
}

/* ── Fetch helper ────────────────────────────────────────── */
async function post(url, data) {
    const fd = new FormData();
    Object.entries(data).forEach(([k, v]) => fd.append(k, v));
    const r = await fetch(url, {
        method: 'POST',
        headers: { 'X-CSRFToken': csrf },
        body: fd,
    });
    return r.json();
}

/* ── Modal Añadir ────────────────────────────────────────── */
const backdrop = $('#modal-backdrop');

function openModal() { backdrop.classList.add('is-open'); }
function closeModal() {
    backdrop.classList.remove('is-open');
    $('#bm-titulo').value = '';
    $('#bm-url').value = '';
    $('#folder-nombre').value = '';
}

$('#add-btn').addEventListener('click', openModal);
$('#modal-close').addEventListener('click', closeModal);
$('#modal-cancel').addEventListener('click', closeModal);
backdrop.addEventListener('click', e => { if (e.target === backdrop) closeModal(); });

/* ── Tabs del modal Añadir ───────────────────────────────── */
$$('[data-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
        $$('[data-tab]').forEach(t => t.classList.remove('is-active'));
        tab.classList.add('is-active');
        const isFolder = tab.dataset.tab === 'folder';
        $('#content-bm').style.display     = isFolder ? 'none' : 'block';
        $('#content-folder').style.display = isFolder ? 'block' : 'none';
        $('#modal-title').textContent = isFolder ? 'Nueva carpeta' : 'Nuevo marcador';
    });
});

/* ── Guardar (Añadir) ────────────────────────────────────── */
$('#modal-save').addEventListener('click', async () => {
    const isFolder = $('#tab-folder').classList.contains('is-active');

    if (isFolder) {
        const nombre = $('#folder-nombre').value.trim();
        if (!nombre) return toast('Nombre requerido', 'error');
        const r = await post('/marcadores/carpeta/crear/', { nombre });
        if (r.ok) { toast('Carpeta creada'); location.reload(); }
        else toast(r.error || 'Error', 'error');
    } else {
        const titulo  = $('#bm-titulo').value.trim();
        const url     = $('#bm-url').value.trim();
        const carpeta = $('#bm-carpeta').value;
        if (!titulo || !url || !carpeta) return toast('Datos incompletos', 'error');
        const r = await post('/marcadores/crear/', { titulo, url, carpeta });
        if (r.ok) { toast('Marcador guardado'); location.reload(); }
        else toast(r.error || 'Error', 'error');
    }
});

/* ── Modal Editar ────────────────────────────────────────── */
const editBackdrop = $('#edit-backdrop');

function openEditModal(btn) {
    $('#edit-id').value       = btn.dataset.editBm;
    $('#edit-titulo').value   = btn.dataset.titulo;
    $('#edit-url').value      = btn.dataset.url;
    $('#edit-carpeta').value  = btn.dataset.carpeta;
    editBackdrop.classList.add('is-open');
    setTimeout(() => $('#edit-titulo').focus(), 80);
}

function closeEditModal() {
    editBackdrop.classList.remove('is-open');
}

$('#edit-close').addEventListener('click', closeEditModal);
$('#edit-cancel').addEventListener('click', closeEditModal);
editBackdrop.addEventListener('click', e => { if (e.target === editBackdrop) closeEditModal(); });

$('#edit-save').addEventListener('click', async () => {
    const id      = $('#edit-id').value;
    const titulo  = $('#edit-titulo').value.trim();
    const url     = $('#edit-url').value.trim();
    const carpeta = $('#edit-carpeta').value;
    if (!titulo || !url || !carpeta) return toast('Datos incompletos', 'error');
    const r = await post(`/marcadores/${id}/editar/`, { titulo, url, carpeta });
    if (r.ok) { toast('Marcador actualizado'); location.reload(); }
    else toast(r.error || 'Error al guardar', 'error');
});

/* ── Delegado: editar + eliminar (modo normal) ───────────── */
document.addEventListener('click', async e => {
    // Ignorar en modo selección
    if (document.body.classList.contains('select-mode')) return;

    /* ── Editar ── */
    const editBtn = e.target.closest('[data-edit-bm]');
    if (editBtn) {
        e.preventDefault();
        e.stopPropagation();
        openEditModal(editBtn);
        return;
    }

    /* ── Eliminar marcador ── */
    const delBm = e.target.closest('[data-del-bm]');
    if (delBm) {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm('¿Eliminar este marcador?')) return;
        const r = await post(`/marcadores/${delBm.dataset.delBm}/eliminar/`, {});
        if (r.ok) { toast('Marcador eliminado'); location.reload(); }
        else toast('Error al eliminar', 'error');
        return;
    }

    /* ── Eliminar carpeta ── */
    const delFolder = e.target.closest('[data-del-folder]');
    if (delFolder) {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm('¿Eliminar esta carpeta y todos sus marcadores?')) return;
        const r = await post(`/marcadores/carpeta/${delFolder.dataset.delFolder}/eliminar/`, {});
        if (r.ok) { toast('Carpeta eliminada'); location.reload(); }
        else toast('Error al eliminar', 'error');
        return;
    }
});

/* ── Filtro por carpeta ──────────────────────────────────── */
$$('.sidebar-item[data-folder]').forEach(item => {
    item.addEventListener('click', e => {
        if (e.target.closest('.sidebar-item-action')) return;
        $$('.sidebar-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        const folder = item.dataset.folder;
        $$('.bm-section').forEach(s => {
            s.classList.toggle('is-hidden', folder !== 'all' && s.dataset.section !== folder);
        });
    });
});

/* ── Búsqueda ────────────────────────────────────────────── */
$('#search-input').addEventListener('input', e => {
    const q = e.target.value.toLowerCase().trim();
    let any = false;

    $$('.bm-card').forEach(card => {
        const titulo = card.querySelector('.bm-title');
        const match  = !q || (titulo && titulo.textContent.toLowerCase().includes(q));
        card.classList.toggle('is-hidden', !match);
        if (match) any = true;
    });

    $('#no-results').style.display = (q && !any) ? 'flex' : 'none';

    $$('.bm-section').forEach(s => {
        const visible = [...s.querySelectorAll('.bm-card')].some(c => !c.classList.contains('is-hidden'));
        s.classList.toggle('is-hidden', q && !visible);
    });
});

/* ══════════════════════════════════════════════════════════
   MODO SELECCIÓN MÚLTIPLE
   ══════════════════════════════════════════════════════════ */
const selectModeBtn = $('#select-mode-btn');
const bulkBar       = $('#bulk-bar');
const bulkCount     = $('#bulk-count');
const bulkDeleteBtn = $('#bulk-delete-btn');
const bulkCancelBtn = $('#bulk-cancel-btn');
const bulkSelectAll = $('#bulk-select-all');

let selectMode = false;

function getSelectedCards() {
    return [...$$('.bm-card.is-selected')];
}

function getVisibleCards() {
    return [...$$('.bm-card:not(.is-hidden)')];
}

function updateBulkBar() {
    const selected = getSelectedCards();
    const count = selected.length;
    bulkCount.textContent = count === 1 ? '1 seleccionado' : `${count} seleccionados`;
    bulkBar.classList.toggle('is-visible', count > 0);

    // Texto del botón "seleccionar todo"
    const visible = getVisibleCards();
    const allSelected = visible.length > 0 && visible.every(c => c.classList.contains('is-selected'));
    bulkSelectAll.querySelector('span') && (bulkSelectAll.querySelector('span').textContent = allSelected ? 'Deseleccionar todo' : 'Seleccionar todo');
    // Para el caso sin span, actualizar el title
    bulkSelectAll.title = allSelected ? 'Deseleccionar todo' : 'Seleccionar todo';
}

function enterSelectMode() {
    selectMode = true;
    document.body.classList.add('select-mode');
    selectModeBtn.classList.add('is-active');
    selectModeBtn.title = 'Salir de selección';
}

function exitSelectMode() {
    selectMode = false;
    document.body.classList.remove('select-mode');
    selectModeBtn.classList.remove('is-active');
    selectModeBtn.title = 'Selección múltiple';
    // Deseleccionar todo
    $$('.bm-card.is-selected').forEach(c => c.classList.remove('is-selected'));
    bulkBar.classList.remove('is-visible');
}

// Toggle modo selección
selectModeBtn.addEventListener('click', () => {
    selectMode ? exitSelectMode() : enterSelectMode();
});

// Click en card durante modo selección
document.addEventListener('click', e => {
    if (!selectMode) return;
    const card = e.target.closest('.bm-card');
    if (!card) return;
    e.preventDefault();
    e.stopPropagation();
    card.classList.toggle('is-selected');
    updateBulkBar();
});

// Seleccionar todo / deseleccionar todo
bulkSelectAll.addEventListener('click', () => {
    const visible = getVisibleCards();
    const allSelected = visible.every(c => c.classList.contains('is-selected'));
    visible.forEach(c => c.classList.toggle('is-selected', !allSelected));
    updateBulkBar();
});

// Cancelar selección
bulkCancelBtn.addEventListener('click', exitSelectMode);

// Eliminar selección
bulkDeleteBtn.addEventListener('click', async () => {
    const selected = getSelectedCards();
    if (selected.length === 0) return;

    const plural = selected.length === 1 ? 'este marcador' : `estos ${selected.length} marcadores`;
    if (!confirm(`¿Eliminar ${plural}?`)) return;

    bulkDeleteBtn.disabled = true;
    bulkDeleteBtn.textContent = 'Eliminando…';

    let ok = 0;
    let fail = 0;

    for (const card of selected) {
        const id = card.dataset.id;
        try {
            const r = await post(`/marcadores/${id}/eliminar/`, {});
            if (r.ok) ok++;
            else fail++;
        } catch {
            fail++;
        }
    }

    if (fail === 0) {
        toast(`${ok} marcador${ok !== 1 ? 'es' : ''} eliminado${ok !== 1 ? 's' : ''}`, 'success');
    } else {
        toast(`${ok} eliminados, ${fail} con error`, 'error');
    }

    location.reload();
});

/* ── Atajo de teclado: ⌘K / Ctrl+K / Escape ─────────────── */
document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        $('#search-input').focus();
    }
    if (e.key === 'Escape') {
        if (selectMode) {
            exitSelectMode();
        } else {
            closeModal();
            closeEditModal();
        }
    }
    // Ctrl+A en modo selección = seleccionar todo
    if (selectMode && (e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault();
        getVisibleCards().forEach(c => c.classList.add('is-selected'));
        updateBulkBar();
    }
});