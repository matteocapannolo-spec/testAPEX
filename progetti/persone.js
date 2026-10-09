
import { escapeHtml } from '../core/ui.js';


function fotoSicura(indirizzo) {
    const s = String(indirizzo || '').trim();
    if (!s) return null;

    if (s.charAt(0) === '/' && s.charAt(1) === '/') return null;

    if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return /^https:/i.test(s) ? s : null;
    return s;
}

export function volto(persona) {
    const foto = fotoSicura(persona && persona.avatar);
    if (!foto) return '<span class="avatar-mini"><span class="material-symbols-outlined">person</span></span>';
    return `<img class="avatar-mini" src="${escapeHtml(foto)}" alt="" referrerpolicy="no-referrer">`;
}

export function voceResponsabile(valore, etichetta, { persona = null, icona = null, scelto = false, spento = false, azione }) {
    const faccia = icona
        ? `<span class="avatar-mini"><span class="material-symbols-outlined">${escapeHtml(icona)}</span></span>`
        : volto(persona);

    return `<button type="button" class="voce-responsabile${scelto ? ' scelto' : ''}"`
        + ` data-action="${escapeHtml(azione)}" data-valore="${escapeHtml(valore)}">`
        + faccia
        + `<span class="voce-nome${spento ? ' niente' : ''}">${escapeHtml(etichetta)}</span></button>`;
}
