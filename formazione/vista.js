
import { escapeHtml } from '../core/ui.js';
import { disegnaTabella } from '../core/table.js';
import { STATI, STATI_SIC, APPUNTAMENTI, TIPI, AZIENDE, dataIt } from './config.js';

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

export function dateApp(date) {
    const elenco = (Array.isArray(date) ? date : [date]).filter(Boolean);
    if (!elenco.length) return '';
    const scritte = elenco.map(d => 'il ' + dataIt(d));
    return scritte.length === 1 ? scritte[0] : scritte.slice(0, -1).join(', ') + ' e ' + scritte[scritte.length - 1];
}

export function orarioApp(inizio, fine) {
    const hm = o => {
        const m = /^(\d{1,2}):(\d{2})/.exec(String(o || ''));
        return m ? `${Number(m[1])}:${m[2]}` : '';
    };
    const i = hm(inizio), f = hm(fine);
    if (i && f) return `dalle ${i} alle ${f}`;
    if (i) return `alle ${i}`;
    return f ? `fino alle ${f}` : '';
}

export function quandoApp(s) {
    const date = (Array.isArray(s.date_appuntamento) ? s.date_appuntamento : [s.data_appuntamento]).filter(Boolean);
    const di = (v, i) => (Array.isArray(v) ? v[i] : v);
    const orari = date.map((d, i) => orarioApp(di(s.ora_inizio, i), di(s.ora_fine, i)));
    if (!date.length) return '';
    if (orari.every(o => o === orari[0])) return [dateApp(date), orari[0]].filter(Boolean).join(', ');
    const pezzi = date.map((d, i) => ['il ' + dataIt(d), orari[i]].filter(Boolean).join(' '));
    return pezzi.slice(0, -1).join(', ') + ' e ' + pezzi[pezzi.length - 1];
}

export function iconaAppuntamento(s) {
    const chiave = s.appuntamento;
    const a = APPUNTAMENTI[chiave];
    if (!a) return '';
    const date = s.date_appuntamento || s.data_appuntamento;
    const quante = (Array.isArray(date) ? date : [date]).filter(Boolean).length;
    const quando = quandoApp(s);
    const titolo = a.etichetta + (quando ? ' ' + quando : '');
    return `<span class="icona-app-gruppo" title="${escapeHtml(titolo)}"><span class="material-symbols-outlined icona-app app-${escapeHtml(chiave)}">${a.icona}</span>` +
        (quante > 1 ? `<span class="giornate-app">${quante}</span>` : '') + `</span>`;
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

function fotoSicura(indirizzo) {
    const s = String(indirizzo || '').trim();
    if (!s) return null;
    if (s.charAt(0) === '/' && s.charAt(1) === '/') return null;
    if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return /^https:/i.test(s) ? s : null;
    return s;
}

export function volto(avatar) {
    const foto = fotoSicura(avatar);
    if (!foto) return '<span class="avatar-mini"><span class="material-symbols-outlined">person</span></span>';
    return `<img class="avatar-mini" src="${escapeHtml(foto)}" alt="" referrerpolicy="no-referrer">`;
}

const TONO = { in_scadenza: 'giallo', scaduto: 'rosso', da_fare: 'viola' };

export function tagScadenza(stato, scritta) {
    const tono = TONO[stato];
    if (!tono) return `<span class="scadenza-testo">${escapeHtml(scritta)}</span>`;
    return `<span class="scadenza-tag ${tono}">${escapeHtml(scritta)}</span>`;
}

const GRAVITA = ['scaduto', 'da_fare', 'in_scadenza', 'in_regola'];
const LED_PERSONA = { scaduto: 'led-rosso', da_fare: 'led-viola', in_scadenza: 'led-giallo', in_regola: 'led-verde' };

export function ledPersona(stati) {
    const peggiore = GRAVITA.find(g => stati.includes(g));
    const s = peggiore ? STATI_SIC[peggiore].etichetta : 'Niente di richiesto';
    return `<span class="led-dot ${peggiore ? LED_PERSONA[peggiore] : 'led-grigio'}" title="${escapeHtml(s)}"></span>`;
}

export function nomeObbligo(o) {
    return o ? ((o.emoji ? o.emoji + ' ' : '') + o.nome) : '';
}

const SEPARATORE = { id: 'staim', user_id: 'staim', separatore: true };

export function separaAziende(righe) {
    const i = righe.findIndex(p => p.azienda === 'staim');
    return i < 0 ? righe : [...righe.slice(0, i), SEPARATORE, ...righe.slice(i)];
}

export function conSeparatore(colonne) {
    return colonne.map((c, i) => ({
        ...c,
        render: (v, r, ctx) => r.separatore
            ? { html: i === 0 ? `<strong>${escapeHtml(AZIENDE.staim)}</strong>` : '', classes: ['riga-azienda'] }
            : (c.render ? c.render(v, r, ctx) : escapeHtml(v)),
        actions: c.actions ? (v, r, ctx) => (r.separatore ? '' : c.actions(v, r, ctx)) : undefined
    }));
}
