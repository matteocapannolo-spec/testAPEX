
import { escapeHtml } from '../core/ui.js';
import { pulisciHtml, testoPiano, cellaConLink } from './testo.js';
import { STATI, dataOraIt } from './config.js';

function testoDi(b) {
    const c = b.contenuto || {};
    if (b.tipo === 'testo') return testoPiano(c.html);
    if (b.tipo === 'link') return [c.url, c.descrizione].join(' ');
    if (b.tipo === 'tabella') return [testoPiano(c.prima), ...(c.colonne || []), ...(c.righe || []).flat(), testoPiano(c.dopo)].join(' ');
    return '';
}

function corrisponde(b, percorso, ricerca) {
    const pagliaio = [...percorso.flatMap(v => [v.numero, v.titolo]), b.numero, b.titolo, testoDi(b)]
        .join(' ').toLowerCase();
    return pagliaio.includes(ricerca);
}

export function filtra(albero, criteri) {
    const ricerca = (criteri.ricerca || '').toLowerCase().trim();
    const attivo = ricerca || criteri.stato;
    const passa = (b, percorso) => (!criteri.stato || b.stato === criteri.stato)
        && (!ricerca || corrisponde(b, percorso, ricerca));

    return albero
        .filter(c => !criteri.capitolo || c.id === criteri.capitolo)
        .map(c => ({
            ...c,
            sezioni: c.sezioni
                .map(s => ({ ...s, blocchi: s.blocchi.filter(b => passa(b, [c, s])) }))
                .filter(s => !attivo || s.blocchi.length)
        }))
        .filter(c => !attivo || c.sezioni.length);
}

export function contaBlocchi(albero) {
    return albero.reduce((n, c) => n + c.sezioni.reduce((m, s) => m + s.blocchi.length, 0), 0);
}

export function pillolaStato(stato) {
    if (!stato) return '';
    const chiave = String(stato).replace(/[^a-z_]/g, '');
    return `<span class="pill stato-pill stato-pill-${chiave}">${escapeHtml(STATI[stato] || stato)}</span>`;
}

function corpoTesto(c) {
    return `<div class="blocco-testo">${pulisciHtml(c.html)}</div>`;
}

function corpoLink(b, c) {
    const url = String(c.url || '');
    const testo = b.titolo || url;
    return `<div class="blocco-link">`
        + (b.numero ? `<span class="numero blocco-link-numero">${escapeHtml(b.numero)}</span>` : '')
        + `<a class="btn-link-pill" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(url)}">`
        + `<span class="material-symbols-outlined">open_in_new</span>${escapeHtml(testo)}</a>`
        + pillolaStato(b.stato)
        + (c.descrizione ? `<span class="blocco-link-descrizione">${escapeHtml(c.descrizione)}</span>` : '')
        + '</div>';
}

function corpoTabella(c) {
    const colonne = c.colonne || [];
    const righe = c.righe || [];
    const testa = colonne.map(col => `<th>${escapeHtml(col)}</th>`).join('');
    const corpo = righe.map(r =>
        '<tr>' + colonne.map((_, i) => `<td>${cellaConLink(r[i])}</td>`).join('') + '</tr>').join('');
    const vuota = righe.length ? '' : `<tr><td class="tabella-vuota-cella" colspan="${colonne.length || 1}">Nessuna riga: si compila dal pannello.</td></tr>`;
    return testoAccanto(c.prima, 'prima')
        + `<table class="tabella-documento"><thead><tr>${testa}</tr></thead><tbody>${corpo}${vuota}</tbody></table>`
        + testoAccanto(c.dopo, 'dopo');
}

function testoAccanto(html, dove) {
    if (!testoPiano(html).trim()) return '';
    return `<div class="blocco-testo blocco-testo-${dove}">${pulisciHtml(html)}</div>`;
}

function corpo(b) {
    const c = b.contenuto || {};
    if (b.tipo === 'link') return corpoLink(b, c);
    if (b.tipo === 'tabella') return corpoTabella(c);
    return corpoTesto(c);
}

function senzaTitolo(b) {
    return b.tipo !== 'link' && !b.titolo;
}

function testata(b) {
    if (b.tipo === 'link' || !b.titolo) return '';
    return `<div class="blocco-testata"><h4 class="blocco-titolo">${numeroBlocco(b)}${escapeHtml(b.titolo)}</h4>${pillolaStato(b.stato)}</div>`;
}

function numeroBlocco(b) {
    return b.numero ? `<span class="numero">${escapeHtml(b.numero)}</span> ` : '';
}

function pillolePerSezione(s) {
    const stati = [...new Set(s.blocchi.filter(senzaTitolo).map(b => b.stato))];
    return stati.map(pillolaStato).join('');
}

function azioni(b) {
    const id = escapeHtml(b.id);
    return `<div class="blocco-azioni">`
        + `<button type="button" class="action-btn" data-action="sposta-blocco" data-id="${id}" data-direzione="-1" title="Sposta su"><span class="material-symbols-outlined">arrow_upward</span></button>`
        + `<button type="button" class="action-btn" data-action="sposta-blocco" data-id="${id}" data-direzione="1" title="Sposta giù"><span class="material-symbols-outlined">arrow_downward</span></button>`
        + `<button type="button" class="action-btn" data-action="modifica-blocco" data-id="${id}" title="Modifica"><span class="material-symbols-outlined">edit</span></button>`
        + `<button type="button" class="action-btn" data-action="elimina-blocco" data-id="${id}" title="Elimina"><span class="material-symbols-outlined">delete</span></button>`
        + '</div>';
}

function piede(b, ctx) {
    const chi = ctx.nomi[b.updated_by];
    return `<div class="blocco-piede">Modificato il ${escapeHtml(dataOraIt(b.updated_at))}${chi ? ', ' + escapeHtml(chi) : ''}</div>`;
}

function blocco(b, ctx) {
    const classi = `blocco blocco-${escapeHtml(b.tipo)}`;
    return `<div class="${classi}" id="blo-${escapeHtml(b.id)}" data-id="${escapeHtml(b.id)}">`
        + testata(b)
        + `<div class="blocco-corpo">${corpo(b)}</div>`
        + (ctx.puoScrivere ? piede(b, ctx) + azioni(b) : '')
        + '</div>';
}

function sezione(s, ctx) {
    const aggiungi = ctx.puoScrivere
        ? `<button type="button" class="aggiungi-blocco" data-action="nuovo-blocco" data-sezione="${escapeHtml(s.id)}"><span class="material-symbols-outlined">add</span> Aggiungi blocco</button>`
        : '';
    return `<section class="sezione" id="sez-${escapeHtml(s.id)}" data-id="${escapeHtml(s.id)}">`
        + `<h3 class="sezione-titolo"><span class="numero">${escapeHtml(s.numero)}</span> ${escapeHtml(s.titolo)}${pillolePerSezione(s)}</h3>`
        + s.blocchi.map(b => blocco(b, ctx)).join('')
        + aggiungi
        + '</section>';
}

function numeroCapitolo(n) {
    const s = String(n ?? '');
    return /^\d$/.test(s) ? '0' + s : s;
}

function capitolo(c, ctx) {
    return `<section class="capitolo" id="cap-${escapeHtml(c.id)}" data-id="${escapeHtml(c.id)}">`
        + `<header class="capitolo-testata"><span class="capitolo-numero">${escapeHtml(numeroCapitolo(c.numero))}</span>`
        + `<h2 class="capitolo-titolo">${escapeHtml(c.titolo)}</h2></header>`
        + c.sezioni.map(s => sezione(s, ctx)).join('')
        + '</section>';
}

export function disegnaDocumento(contenitore, alberoFiltrato, ctx) {
    contenitore.innerHTML = alberoFiltrato.map(c => capitolo(c, ctx)).join('');
}
