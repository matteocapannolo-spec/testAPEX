
import { escapeHtml } from './ui.js';

function applicaLarghezza(elemento, colonna) {
    if (!colonna.width) return;
    elemento.style.minWidth = colonna.width + 'px';
    elemento.style.maxWidth = colonna.width + 'px';
    elemento.style.boxSizing = 'border-box';
}

function classiColonna(colonna, scostamentiSticky, bordoDestro, sezioni) {
    const classi = [...(colonna.classes || [])];

    const gruppo = Object.entries(sezioni).find(([, s]) =>
        s.motherCols.includes(colonna.key) || s.childCols.includes(colonna.key));
    if (gruppo) classi.push('gruppo-' + gruppo[0]);

    const eMadre = gruppo && gruppo[1].motherCols.includes(colonna.key);
    if (eMadre) classi.push('mother-col');

    let sinistra = null;
    if (colonna.key in scostamentiSticky) {
        classi.push('sticky-col');
        sinistra = scostamentiSticky[colonna.key];
    }

    if (bordoDestro.has(colonna.key)) classi.push('section-border-right');

    return { classi, sinistra };
}

export function colonneVisibili(colonne, sezioni, ctx) {
    const visibili = [];
    const bordoDestro = new Set();
    const pulsanti = {};

    for (const colonna of colonne) {
        if (colonna.hidden && colonna.hidden(ctx)) continue;

        let idSezione = null, eMadre = false, eFiglia = false;
        for (const [id, sezione] of Object.entries(sezioni)) {
            if (sezione.motherCols.includes(colonna.key)) { eMadre = true; idSezione = id; break; }
            if (sezione.childCols.includes(colonna.key)) { eFiglia = true; idSezione = id; break; }
        }

        if (!idSezione) {
            visibili.push(colonna);
            continue;
        }

        const sezione = sezioni[idSezione];
        if (eMadre) {
            visibili.push(colonna);
            if (colonna.key === sezione.motherCols[sezione.motherCols.length - 1]) {
                pulsanti[colonna.key] = idSezione;
                if (!sezione.isExpanded) bordoDestro.add(colonna.key);
            }
        } else if (eFiglia && sezione.isExpanded) {
            visibili.push(colonna);
            if (colonna.key === sezione.childCols[sezione.childCols.length - 1]) bordoDestro.add(colonna.key);
        }
    }

    return { visibili, bordoDestro, pulsanti };
}

export function scostamentiSticky(colonne) {
    const scostamenti = {};
    let somma = 0;
    for (const colonna of colonne) {
        if (!colonna.sticky) continue;
        scostamenti[colonna.key] = somma;
        somma += colonna.width || 0;
    }
    return scostamenti;
}

export function raggruppaRighe(righe, campo) {
    const spans = new Array(righe.length).fill(1);
    const assorbite = new Array(righe.length).fill(false);
    if (!campo) return { spans, assorbite };

    const chiave = r => (r[campo] || '').toString().trim().toLowerCase();

    for (let i = 0; i < righe.length; i++) {
        if (assorbite[i]) continue;
        const corrente = chiave(righe[i]);
        if (corrente === '') continue;
        let quante = 1;
        for (let j = i + 1; j < righe.length; j++) {
            if (chiave(righe[j]) !== corrente) break;
            quante++;
            assorbite[j] = true;
        }
        spans[i] = quante;
    }

    return { spans, assorbite };
}

function disegnaIntestazione(thead, visibili, scostamenti, bordoDestro, pulsanti, sezioni, conRiempimento) {
    const tr = document.createElement('tr');

    for (const colonna of visibili) {
        const th = document.createElement('th');
        const { classi, sinistra } = classiColonna(colonna, scostamenti, bordoDestro, sezioni);
        if (classi.length) th.classList.add(...classi);
        if (sinistra !== null) th.style.left = sinistra + 'px';
        applicaLarghezza(th, colonna);
        if (colonna.title) th.title = colonna.title;

        let contenuto = colonna.header
            ? colonna.header(colonna)
            : `<span class="th-label">${escapeHtml(colonna.label !== undefined ? colonna.label : colonna.key)}</span>`;

        const idSezione = pulsanti[colonna.key];
        if (idSezione) {
            const aperta = sezioni[idSezione].isExpanded;
            const icona = aperta ? 'keyboard_double_arrow_left' : 'keyboard_double_arrow_right';
            const titolo = aperta ? 'Comprimi sezione' : 'Espandi sezione';
            contenuto = `<div class="th-content-wrapper">${contenuto}` +
                `<button type="button" class="toggle-section-btn" data-action="sezione" data-sezione="${escapeHtml(idSezione)}" title="${titolo}">` +
                `<span class="material-symbols-outlined">${icona}</span></button></div>`;
        }

        th.innerHTML = contenuto;
        tr.appendChild(th);
    }

    if (conRiempimento) tr.appendChild(riempimento('th'));
    thead.appendChild(tr);
}

function riempimento(tag) {
    const cella = document.createElement(tag);
    cella.className = 'col-riempimento';
    return cella;
}

function disegnaCella(colonna, riga, indice, ctx, derivati, tinta) {
    const td = document.createElement('td');
    td.setAttribute('data-col', colonna.key);

    const valore = riga[colonna.key] || '';
    let html, classiCella = [];

    if (colonna.render) {
        const esito = colonna.render(valore, riga, ctx, derivati);
        if (esito && typeof esito === 'object') {
            html = esito.html || '';
            classiCella = esito.classes || [];
        } else {
            html = esito || '';
        }
    } else {
        html = escapeHtml(valore);
    }

    if (classiCella.length) td.classList.add(...classiCella);

    if (tinta) {
        const qualita = tinta(colonna, riga, ctx, derivati);
        if (qualita) td.classList.add('qualita-' + qualita);
    }

    const azioni = colonna.actions ? colonna.actions(valore, riga, ctx, derivati) : '';
    td.innerHTML = `<div class="cell-content">${html}</div>${azioni}`;
    return td;
}

export function disegnaTabella({ thead, tbody, colonne, sezioni = {}, righe, raggruppaPer = null, indiceDi = null, ctx = {}, perRiga = null, tinta = null, riempimento: conRiempimento = false }) {
    thead.innerHTML = '';
    tbody.innerHTML = '';

    const { visibili, bordoDestro, pulsanti } = colonneVisibili(colonne, sezioni, ctx);
    const scostamenti = scostamentiSticky(visibili);

    disegnaIntestazione(thead, visibili, scostamenti, bordoDestro, pulsanti, sezioni, conRiempimento);

    const { spans, assorbite } = raggruppaRighe(righe, raggruppaPer);

    righe.forEach((riga, i) => {
        const tr = document.createElement('tr');
        const indice = indiceDi ? indiceDi(riga) : i;
        tr.setAttribute('data-index', indice);

        const derivati = perRiga ? perRiga(riga, ctx) : {};

        for (const colonna of visibili) {
            if (colonna.key === raggruppaPer && assorbite[i]) continue;

            const td = disegnaCella(colonna, riga, indice, ctx, derivati, tinta);
            const { classi, sinistra } = classiColonna(colonna, scostamenti, bordoDestro, sezioni);
            if (classi.length) td.classList.add(...classi);
            if (sinistra !== null) td.style.left = sinistra + 'px';
            applicaLarghezza(td, colonna);
            if (colonna.key === raggruppaPer && spans[i] > 1) td.rowSpan = spans[i];

            tr.appendChild(td);
        }

        if (conRiempimento) tr.appendChild(riempimento('td'));
        tbody.appendChild(tr);
    });
}

const INDIRIZZO_VERO = /^https?:\/\//i;

export function cellaLinkOAvviso(valore, contenuto, titolo) {
    const testo = (valore || '').toString().trim();
    if (!INDIRIZZO_VERO.test(testo)) {
        return { html: '<span class="pulse-warning">⚠️</span>', classes: ['bg-error'] };
    }
    const attributoTitolo = titolo ? ` title="${escapeHtml(titolo)}"` : '';
    return { html: `<a href="${escapeHtml(testo)}" target="_blank" rel="noopener noreferrer"${attributoTitolo} class="btn-link-pill">${contenuto}</a>` };
}

export function cellaPillole(valore, mappaColori, coloreDefault, classePillola) {
    const testo = (valore || '').toString().trim();
    if (!testo) return '';
    return testo.split(',').map(voce => {
        const nome = voce.trim();
        const colore = mappaColori[nome] || coloreDefault;
        return `<span class="pill ${classePillola}" style="background-color: ${colore.bg}; color: ${colore.text};">${escapeHtml(nome)}</span>`;
    }).join('');
}
