
import { escapeHtml } from '../core/ui.js';
import * as api from './api.js';
import { stato } from './stato.js';

export const NUOVO_LUOGO = '__nuovo';

export function riempiLuoghi(select, scelta) {
    select.innerHTML = '<option value="">Non indicato</option>'
        + stato.luoghi.map(l => `<option value="${escapeHtml(l.id)}">${escapeHtml(l.nome)}</option>`).join('')
        + `<option value="${NUOVO_LUOGO}">+ Nuovo luogo…</option>`;
    select.value = scelta || '';
    mostraCampoNuovo(select);
}

export function mostraCampoNuovo(select) {
    const campo = select.nextElementSibling;
    if (!campo) return;
    campo.hidden = select.value !== NUOVO_LUOGO;
    if (!campo.hidden) campo.focus();
}

export async function luogoScelto(select) {
    if (select.value !== NUOVO_LUOGO) return select.value || null;
    const nome = select.nextElementSibling.value.trim();
    if (!nome) return null;
    const esistente = stato.luoghi.find(l => l.nome.trim().toLowerCase() === nome.toLowerCase());
    if (esistente) return esistente.id;
    const id = await api.creaLuogo(nome);
    stato.luoghi.push({ id, nome });
    return id;
}
