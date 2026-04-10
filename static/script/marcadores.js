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

/* ── Modal ───────────────────────────────────────────────── */
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

/* ── Tabs del modal ──────────────────────────────────────── */
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

/* ── Guardar ─────────────────────────────────────────────── */
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

/* ── Eliminar (delegado) ─────────────────────────────────── */
document.addEventListener('click', async e => {
    const delBm     = e.target.closest('[data-del-bm]');
    const delFolder = e.target.closest('[data-del-folder]');

    if (delBm) {
        if (!confirm('¿Eliminar este marcador?')) return;
        const r = await post(`/marcadores/${delBm.dataset.delBm}/eliminar/`, {});
        if (r.ok) { toast('Marcador eliminado'); location.reload(); }
        else toast('Error al eliminar', 'error');
    }

    if (delFolder) {
        if (!confirm('¿Eliminar esta carpeta y todos sus marcadores?')) return;
        const r = await post(`/marcadores/carpeta/${delFolder.dataset.delFolder}/eliminar/`, {});
        if (r.ok) { toast('Carpeta eliminada'); location.reload(); }
        else toast('Error al eliminar', 'error');
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

    // Ocultar secciones vacías al buscar
    $$('.bm-section').forEach(s => {
        const visible = [...s.querySelectorAll('.bm-card')].some(c => !c.classList.contains('is-hidden'));
        s.classList.toggle('is-hidden', q && !visible);
    });
});

/* ── Atajo de teclado: ⌘K / Ctrl+K ──────────────────────── */
document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        $('#search-input').focus();
    }
});