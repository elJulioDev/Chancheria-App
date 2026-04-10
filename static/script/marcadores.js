const csrf = document.querySelector('[name=csrfmiddlewaretoken]').value;
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2000);
}

async function post(url, data) {
    const fd = new FormData();
    Object.entries(data).forEach(([k, v]) => fd.append(k, v));
    const r = await fetch(url, { method: 'POST', headers: { 'X-CSRFToken': csrf }, body: fd });
    return r.json();
}

// Modal
const modal = $('#modal-overlay');
$('#add-btn').onclick = () => modal.classList.add('open');
$('#modal-cancel').onclick = () => modal.classList.remove('open');
modal.onclick = e => { if (e.target === modal) modal.classList.remove('open'); };

$$('.modal-tab').forEach(tab => {
    tab.onclick = () => {
        $$('.modal-tab').forEach(t => t.classList.remove('active'));
        $$('.tab-content').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        $(`[data-content="${tab.dataset.tab}"]`).classList.add('active');
    };
});

$('#modal-save').onclick = async () => {
    const tab = $('.modal-tab.active').dataset.tab;
    if (tab === 'folder') {
        const nombre = $('#folder-nombre').value.trim();
        if (!nombre) return toast('Nombre requerido');
        const r = await post('/marcadores/carpeta/crear/', { nombre });
        if (r.ok) { toast('Carpeta creada'); location.reload(); }
        else toast(r.error);
    } else {
        const titulo = $('#bm-titulo').value.trim();
        const url = $('#bm-url').value.trim();
        const carpeta = $('#bm-carpeta').value;
        if (!titulo || !url || !carpeta) return toast('Datos incompletos');
        const r = await post('/marcadores/crear/', { titulo, url, carpeta });
        if (r.ok) { toast('Guardado'); location.reload(); }
        else toast(r.error);
    }
};

// Eliminar
document.addEventListener('click', async e => {
    const delBm = e.target.closest('[data-del-bm]');
    const delFolder = e.target.closest('[data-del-folder]');
    if (delBm) {
        e.preventDefault(); e.stopPropagation();
        if (!confirm('¿Eliminar marcador?')) return;
        const r = await post(`/marcadores/${delBm.dataset.delBm}/eliminar/`, {});
        if (r.ok) { toast('Eliminado'); location.reload(); }
    }
    if (delFolder) {
        e.preventDefault(); e.stopPropagation();
        if (!confirm('¿Eliminar carpeta y sus marcadores?')) return;
        const r = await post(`/marcadores/carpeta/${delFolder.dataset.delFolder}/eliminar/`, {});
        if (r.ok) { toast('Eliminada'); location.reload(); }
    }
});

// Filtro sidebar
$$('.sidebar-item').forEach(item => {
    item.onclick = e => {
        if (e.target.closest('[data-del-folder]')) return;
        $$('.sidebar-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        const f = item.dataset.folder;
        $$('.category-section').forEach(s => {
            s.classList.toggle('hidden', f !== 'all' && s.dataset.section !== f);
        });
    };
});

// Búsqueda
$('#search-input').oninput = e => {
    const q = e.target.value.toLowerCase();
    let any = false;
    $$('.bookmark-card').forEach(c => {
        const match = c.querySelector('.bookmark-title').textContent.toLowerCase().includes(q);
        c.classList.toggle('hidden', !match);
        if (match) any = true;
    });
    $('#no-results').style.display = (q && !any) ? 'block' : 'none';
};