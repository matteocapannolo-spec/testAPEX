
import { escapeHtml } from '../core/ui.js';
import { disegnaTabella } from '../core/table.js';
import { STATI, STATI_NORMA, TIPI } from './config.js';

export const el = id => document.getElementById(id);

export function tabella(nome, colonne, righe, { ctx = {}, vuota = 'Niente da mostrare.' } = {}) {
    disegnaTabella({
        thead: el(nome + '-testa'), tbody: el(nome + '-corpo'),
        colonne, righe, ctx, indiceDi: r => r.id ?? r.user_id ?? ''
    });
    el(nome + '-vuoto').hidden = righe.length > 0;
    el(nome + '-vuoto').textContent = righe.length ? '' : vuota;
}

export function pastigliaStato(chiave) {
    const s = STATI[chiave] || { etichetta: chiave, classe: 'st-grigio' };
    return `<span class="pill pill-stato ${s.classe}">${escapeHtml(s.etichetta)}</span>`;
}

export function ledNorma(chiave) {
    const s = STATI_NORMA[chiave] || STATI_NORMA.mai_fatto;
    return `<span class="norma-stato"><span class="led-dot ${s.led}"></span>${escapeHtml(s.etichetta)}</span>`;
}

export function tipoIt(tipo) {
    return TIPI[tipo] || tipo || '';
}

export function linkPastiglia(url, testo, icona = 'open_in_new') {
    if (!/^https?:\/\//i.test(String(url || ''))) return '';
    return `<a class="btn-link-pill" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(url)}">` +
        `<span class="material-symbols-outlined">${icona}</span>${testo ? `<span>${escapeHtml(testo)}</span>` : ''}</a>`;
}

export function azioniCella(id, voci) {
    if (!voci.length) return '';
    return `<div class="cell-actions">` + voci.map(([azione, icona, titolo]) =>
        `<button type="button" class="action-btn" data-action="${azione}" data-id="${escapeHtml(id)}" title="${escapeHtml(titolo)}">` +
        `<span class="material-symbols-outlined">${icona}</span></button>`).join('') + `</div>`;
}

export function opzioni(select, voci, { vuota = null } = {}) {
    const prima = select.value;
    select.innerHTML = (vuota !== null ? `<option value="">${escapeHtml(vuota)}</option>` : '') +
        voci.map(([valore, testo]) => `<option value="${escapeHtml(valore)}">${escapeHtml(testo)}</option>`).join('');
    if ([...select.options].some(o => o.value === prima)) select.value = prima;
    return select.value;
}

export function erroreDialogo(id, testo) {
    el(id).textContent = testo || '';
    el(id).hidden = !testo;
}

export function testo(v) {
    return escapeHtml(v ?? '');
}
