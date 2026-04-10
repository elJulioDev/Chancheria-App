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

/* ── Helpers abre/cierra backdrop ───────────────────────── */
function openBackdrop(id)  { document.getElementById(id).classList.add('is-open'); }
function closeBackdrop(id) { document.getElementById(id).classList.remove('is-open'); }

function bindClose(backdropId, ...btnIds) {
    const bd = document.getElementById(backdropId);
    btnIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', () => closeBackdrop(backdropId));
    });
    bd.addEventListener('click', e => { if (e.target === bd) closeBackdrop(backdropId); });
}

/* ── Modal Añadir ────────────────────────────────────────── */
function openModal() { openBackdrop('modal-backdrop'); }
function closeModal() {
    closeBackdrop('modal-backdrop');
    $('#bm-titulo').value = '';
    $('#bm-url').value = '';
    $('#folder-nombre').value = '';
}

$('#add-btn').addEventListener('click', openModal);
$('#modal-close').addEventListener('click', closeModal);
$('#modal-cancel').addEventListener('click', closeModal);
$('#modal-backdrop').addEventListener('click', e => { if (e.target === $('#modal-backdrop')) closeModal(); });

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

/* ══════════════════════════════════════════════════════════
   Modal Editar marcador
   ══════════════════════════════════════════════════════════ */
function openEditModal(btn) {
    $('#edit-id').value      = btn.dataset.editBm;
    $('#edit-titulo').value  = btn.dataset.titulo;
    $('#edit-url').value     = btn.dataset.url;
    $('#edit-carpeta').value = btn.dataset.carpeta;
    openBackdrop('edit-backdrop');
    setTimeout(() => $('#edit-titulo').focus(), 80);
}
function closeEditModal() { closeBackdrop('edit-backdrop'); }

bindClose('edit-backdrop', 'edit-close', 'edit-cancel');

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

/* ══════════════════════════════════════════════════════════
   Modal Confirmar eliminar marcador
   ══════════════════════════════════════════════════════════ */
function openDelBmModal(id, titulo) {
    $('#del-bm-id').value         = id;
    $('#del-bm-nombre').textContent = titulo;
    openBackdrop('del-bm-backdrop');
}
function closeDelBmModal() { closeBackdrop('del-bm-backdrop'); }

bindClose('del-bm-backdrop', 'del-bm-close', 'del-bm-cancel');

$('#del-bm-confirm').addEventListener('click', async () => {
    const id = $('#del-bm-id').value;
    const btn = $('#del-bm-confirm');
    btn.disabled = true;
    const r = await post(`/marcadores/${id}/eliminar/`, {});
    btn.disabled = false;
    if (r.ok) { toast('Marcador eliminado'); location.reload(); }
    else { toast('Error al eliminar', 'error'); closeDelBmModal(); }
});

/* ══════════════════════════════════════════════════════════
   Modal Editar carpeta
   ══════════════════════════════════════════════════════════ */
function openEditFolderModal(id, nombre) {
    $('#edit-folder-id').value     = id;
    $('#edit-folder-nombre').value = nombre;
    openBackdrop('edit-folder-backdrop');
    setTimeout(() => $('#edit-folder-nombre').focus(), 80);
}
function closeEditFolderModal() { closeBackdrop('edit-folder-backdrop'); }

bindClose('edit-folder-backdrop', 'edit-folder-close', 'edit-folder-cancel');

$('#edit-folder-save').addEventListener('click', async () => {
    const id     = $('#edit-folder-id').value;
    const nombre = $('#edit-folder-nombre').value.trim();
    if (!nombre) return toast('Nombre requerido', 'error');
    const btn = $('#edit-folder-save');
    btn.disabled = true;
    const r = await post(`/marcadores/carpeta/${id}/editar/`, { nombre });
    btn.disabled = false;
    if (r.ok) { toast('Carpeta renombrada'); location.reload(); }
    else toast(r.error || 'Error al guardar', 'error');
});

/* ══════════════════════════════════════════════════════════
   Modal Confirmar eliminar carpeta
   ══════════════════════════════════════════════════════════ */
function openDelFolderModal(id, nombre) {
    $('#del-folder-id').value          = id;
    $('#del-folder-nombre').textContent = nombre;
    openBackdrop('del-folder-backdrop');
}
function closeDelFolderModal() { closeBackdrop('del-folder-backdrop'); }

bindClose('del-folder-backdrop', 'del-folder-close', 'del-folder-cancel');

$('#del-folder-confirm').addEventListener('click', async () => {
    const id  = $('#del-folder-id').value;
    const btn = $('#del-folder-confirm');
    btn.disabled = true;
    const r = await post(`/marcadores/carpeta/${id}/eliminar/`, {});
    btn.disabled = false;
    if (r.ok) { toast('Carpeta eliminada'); location.reload(); }
    else { toast('Error al eliminar', 'error'); closeDelFolderModal(); }
});

/* ══════════════════════════════════════════════════════════
   Delegado: editar + eliminar (marcadores y carpetas)
   ══════════════════════════════════════════════════════════ */
document.addEventListener('click', async e => {
    if (document.body.classList.contains('select-mode')) return;

    /* ── Editar marcador ── */
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
        openDelBmModal(delBm.dataset.delBm, delBm.dataset.titulo);
        return;
    }

    /* ── Editar carpeta ── */
    const editFolder = e.target.closest('[data-edit-folder]');
    if (editFolder) {
        e.preventDefault();
        e.stopPropagation();
        openEditFolderModal(editFolder.dataset.editFolder, editFolder.dataset.nombre);
        return;
    }

    /* ── Eliminar carpeta ── */
    const delFolder = e.target.closest('[data-del-folder]');
    if (delFolder) {
        e.preventDefault();
        e.stopPropagation();
        const sidebarItem = delFolder.closest('.sidebar-item');
        const nombre = sidebarItem
            ? sidebarItem.querySelector('.sidebar-item-name').textContent.trim()
            : 'esta carpeta';
        openDelFolderModal(delFolder.dataset.delFolder, nombre);
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

// Agrega estas referencias junto a las otras de "bulk"
const bulkMoveBtn    = $('#bulk-move-btn');
const bulkMoveSelect = $('#bulk-move-select');

// Vincula el cierre del modal a los botones correspondientes
bindClose('bulk-move-backdrop', 'bulk-move-close', 'bulk-move-cancel');

// Al hacer clic en "Mover" en la barra bulk
bulkMoveBtn.addEventListener('click', () => {
    const selected = getSelectedCards();
    if (selected.length === 0) return;
    
    $('#bulk-move-count').textContent = selected.length;
    bulkMoveSelect.value = ''; // Resetea el select para evitar envíos por error
    openBackdrop('bulk-move-backdrop');
});

// Confirmar el movimiento
$('#bulk-move-confirm').addEventListener('click', async () => {
    const selected = getSelectedCards();
    const carpetaId = bulkMoveSelect.value;

    if (!carpetaId) return toast('Selecciona una carpeta destino', 'error');

    const btn = $('#bulk-move-confirm');
    btn.disabled = true;
    btn.textContent = 'Moviendo…';

    let ok = 0, fail = 0;
    
    // Aprovechamos tu endpoint existente para mover iterando la selección
    for (const card of selected) {
        try {
            const r = await post(`/marcadores/${card.dataset.id}/mover/`, { carpeta: carpetaId });
            r.ok ? ok++ : fail++;
        } catch { 
            fail++; 
        }
    }

    if (fail === 0) {
        toast(`${ok} marcador(es) movido(s)`, 'success');
    } else {
        toast(`${ok} movidos, ${fail} con error`, 'error');
    }

    location.reload();
});

let selectMode = false;

function getSelectedCards() { return [...$$('.bm-card.is-selected')]; }
function getVisibleCards()  { return [...$$('.bm-card:not(.is-hidden)')]; }

function updateBulkBar() {
    const selected = getSelectedCards();
    const count = selected.length;
    bulkCount.textContent = count === 1 ? '1 seleccionado' : `${count} seleccionados`;
    bulkBar.classList.toggle('is-visible', count > 0);

    const visible = getVisibleCards();
    const allSelected = visible.length > 0 && visible.every(c => c.classList.contains('is-selected'));
    const span = bulkSelectAll.querySelector('span');
    if (span) span.textContent = allSelected ? 'Deseleccionar todo' : 'Seleccionar todo';
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
    $$('.bm-card.is-selected').forEach(c => c.classList.remove('is-selected'));
    bulkBar.classList.remove('is-visible');
}

selectModeBtn.addEventListener('click', () => {
    selectMode ? exitSelectMode() : enterSelectMode();
});

document.addEventListener('click', e => {
    if (!selectMode) return;
    const card = e.target.closest('.bm-card');
    if (!card) return;
    e.preventDefault();
    e.stopPropagation();
    card.classList.toggle('is-selected');
    updateBulkBar();
});

bulkSelectAll.addEventListener('click', () => {
    const visible = getVisibleCards();
    const allSelected = visible.every(c => c.classList.contains('is-selected'));
    visible.forEach(c => c.classList.toggle('is-selected', !allSelected));
    updateBulkBar();
});

bulkCancelBtn.addEventListener('click', exitSelectMode);

bulkDeleteBtn.addEventListener('click', async () => {
    const selected = getSelectedCards();
    if (selected.length === 0) return;

    const plural = selected.length === 1 ? 'este marcador' : `estos ${selected.length} marcadores`;
    if (!confirm(`¿Eliminar ${plural}?`)) return;

    bulkDeleteBtn.disabled = true;
    bulkDeleteBtn.textContent = 'Eliminando…';

    let ok = 0, fail = 0;
    for (const card of selected) {
        try {
            const r = await post(`/marcadores/${card.dataset.id}/eliminar/`, {});
            r.ok ? ok++ : fail++;
        } catch { fail++; }
    }

    if (fail === 0) toast(`${ok} marcador${ok !== 1 ? 'es' : ''} eliminado${ok !== 1 ? 's' : ''}`, 'success');
    else toast(`${ok} eliminados, ${fail} con error`, 'error');

    location.reload();
});

/* ── Atajos de teclado ───────────────────────────────────── */
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
            closeDelBmModal();
            closeEditFolderModal();
            closeDelFolderModal();
        }
    }
    if (selectMode && (e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault();
        getVisibleCards().forEach(c => c.classList.add('is-selected'));
        updateBulkBar();
    }
});