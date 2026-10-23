
import { escapeHtml } from '../core/ui.js';

function fotoSicura(indirizzo) {
    const s = String(indirizzo || '').trim();
    if (!s) return null;

    if (s.charAt(0) === '/' && s.charAt(1) === '/') return null;

    if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return /^https:/i.test(s) ? s : null;
    return s;
}

export function volto(persona) {
    const nome = escapeHtml((persona && persona.nome) || '');
    const foto = fotoSicura(persona && persona.avatar);
    if (!foto) return `<span class="avatar-mini" title="${nome}"><span class="material-symbols-outlined">person</span></span>`;
    return `<img class="avatar-mini" src="${escapeHtml(foto)}" alt="" title="${nome}" referrerpolicy="no-referrer">`;
}

export function iniziali(nome) {
    return String(nome || '').split(' ').map(p => p.charAt(0)).join('').slice(0, 2).toUpperCase();
}
