
export function escapeHtml(v) {
    return String(v ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

export function pillolaRuolo(ruolo, { implicito = false, motivo = '' } = {}) {
    const chiave = String(ruolo ?? '').toLowerCase().replace(/[^a-z0-9_]/g, '');

    const testo = String(ruolo ?? '').replace(/_/g, ' ');

    const classi = 'ruolo-pill r-' + chiave + (implicito ? ' implicito' : '');
    const titolo = motivo ? ` title="${escapeHtml(motivo)}"` : '';
    return `<span class="${classi}"${titolo}>${escapeHtml(testo)}</span>`;
}

let timerToast = null;

export function toast(messaggio) {
    let el = document.getElementById('apex-toast');
    if (!el) {
        el = document.createElement('div');
        el.id = 'apex-toast';
        el.className = 'apex-toast';
        document.body.appendChild(el);
    }
    el.textContent = messaggio;
    el.classList.add('visibile');
    if (timerToast) clearTimeout(timerToast);
    timerToast = setTimeout(() => { el.classList.remove('visibile'); timerToast = null; }, 3000);
}

export function confirmDialog({ title, text, confirmLabel = 'Conferma', danger = false }) {
    return new Promise(resolve => {
        const dlg = document.createElement('dialog');
        dlg.className = 'apex-dialog';
        dlg.innerHTML = `
            <h3>${escapeHtml(title)}</h3>
            <p>${escapeHtml(text)}</p>
            <div class="apex-dialog-actions">
                <button data-scelta="no" class="btn btn-neutro">Annulla</button>
                <button data-scelta="si" class="btn ${danger ? 'btn-pericolo' : 'btn-primario'}">${escapeHtml(confirmLabel)}</button>
            </div>`;
        document.body.appendChild(dlg);

        const chiudi = scelta => {
            dlg.close();
            dlg.remove();
            resolve(scelta);
        };
        dlg.addEventListener('click', ev => {
            const scelta = ev.target.dataset && ev.target.dataset.scelta;
            if (scelta) chiudi(scelta === 'si');
        });
        dlg.addEventListener('cancel', ev => { ev.preventDefault(); chiudi(false); });
        dlg.showModal();
    });
}

export function mountActions(root, handlers) {
    root.addEventListener('click', ev => {
        const el = ev.target.closest('[data-action]');
        if (!el || !root.contains(el)) return;
        const fn = handlers[el.dataset.action];
        if (!fn) return;
        ev.preventDefault();
        fn(el, ev);
    });
}
