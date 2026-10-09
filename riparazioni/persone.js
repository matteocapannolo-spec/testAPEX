
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

export function cellaPersona(persona, nomeDiRiserva = '') {
    const nome = (persona && persona.nome) || nomeDiRiserva;
    if (!nome) return '<span class="niente">—</span>';
    return `<span class="persona-cella" title="${escapeHtml(nome)}">${volto(persona)}`
        + `<span class="persona-nome">${escapeHtml(nome)}</span></span>`;
}
