
import { escapeHtml } from '../core/ui.js';

const CHIAVE = 'apex.marketing.sommarioChiusi';

let documento = null;
let sommario = null;
let chiusi = leggiChiusi();

function leggiChiusi() {
    try {
        return new Set(JSON.parse(localStorage.getItem(CHIAVE) || '[]'));
    } catch {
        return new Set();
    }
}

function salvaChiusi() {
    try {
        localStorage.setItem(CHIAVE, JSON.stringify([...chiusi]));
    } catch {
    }
}

export function montaSommario(elSommario, elDocumento) {
    sommario = elSommario;
    documento = elDocumento;
    let richiesto = false;
    documento.addEventListener('scroll', () => {
        if (richiesto) return;
        richiesto = true;
        requestAnimationFrame(() => { richiesto = false; evidenzia(); });
    });
}

export function freccia(id, haFigli, chiuso, azione) {
    if (!haFigli) return '<span class="freccia-spazio"></span>';
    return `<button type="button" class="freccia-ramo" data-action="${azione}" data-id="${escapeHtml(id)}"`
        + ` aria-expanded="${chiuso ? 'false' : 'true'}" title="${chiuso ? 'Mostra' : 'Nascondi'} le voci sotto">`
        + `<span class="material-symbols-outlined">${chiuso ? 'chevron_right' : 'expand_more'}</span></button>`;
}

function voce(classe, href, numero, titolo) {
    return `<a class="sommario-voce ${classe}" href="#${href}"><span class="numero">${escapeHtml(numero)}</span> ${escapeHtml(titolo)}</a>`;
}

function ramo(s) {
    const figli = s.blocchi.filter(b => b.numero);
    const chiuso = chiusi.has(s.id);
    return `<div class="sommario-ramo${chiuso ? ' chiuso' : ''}">`
        + `<div class="sommario-riga riga-sezione">${freccia(s.id, figli.length, chiuso, 'sommario-ramo')}`
        + voce('voce-sezione', `sez-${escapeHtml(s.id)}`, s.numero, s.titolo) + '</div>'
        + (figli.length ? '<div class="sommario-figli">' + figli.map(b =>
            `<div class="sommario-riga riga-blocco"><span class="freccia-spazio"></span>`
            + voce('voce-blocco', `blo-${escapeHtml(b.id)}`, b.numero, b.titolo) + '</div>').join('') + '</div>' : '')
        + '</div>';
}

let ultimo = [];

export function disegnaSommario(alberoFiltrato) {
    ultimo = alberoFiltrato;
    sommario.innerHTML = alberoFiltrato.map(c => {
        const chiuso = chiusi.has(c.id);
        return `<div class="sommario-capitolo${chiuso ? ' chiuso' : ''}" data-capitolo="${escapeHtml(c.id)}">`
            + `<div class="sommario-riga riga-capitolo">${freccia(c.id, c.sezioni.length, chiuso, 'sommario-ramo')}`
            + voce('voce-capitolo', `cap-${escapeHtml(c.id)}`, `${c.numero}.`, c.titolo) + '</div>'
            + (c.sezioni.length ? '<div class="sommario-figli">' + c.sezioni.map(ramo).join('') + '</div>' : '')
            + '</div>';
    }).join('');
    evidenzia();
}

export function apriChiudiRamo(elemento) {
    const id = elemento.dataset.id;
    if (chiusi.has(id)) chiusi.delete(id);
    else chiusi.add(id);
    salvaChiusi();
    disegnaSommario(ultimo);
}

export function capitoloInVista() {
    if (!documento) return null;
    const soglia = documento.getBoundingClientRect().top + 8;
    for (const c of documento.querySelectorAll('.capitolo')) {
        if (c.getBoundingClientRect().bottom > soglia) return c.dataset.id;
    }
    return null;
}

function evidenzia() {
    const id = capitoloInVista();
    for (const voce of sommario.querySelectorAll('.sommario-capitolo')) {
        voce.classList.toggle('in-vista', voce.dataset.capitolo === id);
    }
}
