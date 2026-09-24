
import { disegnaTabella, cellaLinkOAvviso } from '../core/table.js';
import { escapeHtml } from '../core/ui.js';
import { dataIt, dataOraIt, dominioDi, CONTATTI, PARTI_CONTATTO, CAMPI_CONTATTO } from './config.js';

const NIENTE = '<span class="niente">—</span>';

export function pillolaCategoria(categoria) {
    return `<span class="pill cat-${categoria.tinta}">${escapeHtml(categoria.nome)}</span>`;
}

function azioni(v, riga, ctx) {
    if (!ctx.puoScrivere) return '';
    return '<div class="cell-actions">'
        + '<button type="button" class="action-btn" data-action="modifica-prodotto" title="Modifica">'
        + '<span class="material-symbols-outlined">edit</span></button>'
        + '<button type="button" class="action-btn" data-action="elimina-prodotto" title="Elimina">'
        + '<span class="material-symbols-outlined">delete</span></button>'
        + '</div>';
}

function testoTagliato(valore) {
    return valore ? `<span title="${escapeHtml(valore)}">${escapeHtml(valore)}</span>` : NIENTE;
}

function nota(valore) {
    return valore
        ? `<span class="nota" title="${escapeHtml(valore)}">${escapeHtml(valore)}</span>`
        : NIENTE;
}

const ICONA_PARTE = { nome: 'person', tel: 'call', email: 'mail' };

function contatto(n) {
    return {
        key: `contatto${n}`, label: `Contatto ${n}`, width: 210, classes: ['col-contatto'],
        render: (v, riga) => {
            const righe = PARTI_CONTATTO
                .map(parte => [parte, riga[`contatto${n}_${parte}`]])
                .filter(([, testo]) => testo)
                .map(([parte, testo]) =>
                    `<span class="contatto-riga contatto-${parte}" title="${escapeHtml(testo)}">`
                    + `<span class="material-symbols-outlined">${ICONA_PARTE[parte]}</span>`
                    + `<span class="contatto-testo">${escapeHtml(testo)}</span></span>`);
            return righe.length ? `<div class="contatto">${righe.join('')}</div>` : NIENTE;
        }
    };
}

export const COLONNE = [
    {
        key: 'nome', label: 'Nome Prodotto', width: 290, sticky: true, classes: ['col-testo'],
        render: v => testoTagliato(v),
        actions: azioni
    },
    {
        key: 'categorie', label: 'Categorie', width: 250, classes: ['col-categorie'],
        render: (v, riga, ctx) => {
            const pillole = (riga.categorie || [])
                .map(id => ctx.categorie.get(id))
                .filter(Boolean)
                .map(pillolaCategoria);
            return pillole.length ? `<div class="pillole">${pillole.join('')}</div>` : NIENTE;
        }
    },
    { key: 'azienda', label: 'Azienda', width: 180, classes: ['col-testo'], render: v => testoTagliato(v) },
    {
        key: 'url', label: 'Link', width: 190, classes: ['col-link'],
        render: v => v
            ? cellaLinkOAvviso(
                v,
                `<span class="material-symbols-outlined">open_in_new</span><span class="link-dominio">${escapeHtml(dominioDi(v))}</span>`,
                v
            )
            : NIENTE
    },
    ...CONTATTI.map(contatto),
    { key: 'note', label: 'Note', width: 400, classes: ['col-nota'], render: v => nota(v) },
    {
        key: 'updated_at', label: 'Aggiornato il', width: 120,
        title: "Quando e' stato inserito, oppure modificato l'ultima volta",
        render: v => v ? `<span title="${escapeHtml(dataOraIt(v))}">${escapeHtml(dataIt(v))}</span>` : NIENTE
    },
    {
        key: 'updated_by', label: 'Modificato da', width: 160, classes: ['col-testo'],
        render: (v, riga, ctx) => testoTagliato(ctx.nomi[v] || '')
    }
];

function testoCercabile(p, ctx) {
    const categorie = (p.categorie || []).map(id => (ctx.categorie.get(id) || {}).nome || '');
    const contatti = CAMPI_CONTATTO.map(c => p[c]);
    return [p.nome, p.url, p.note, p.azienda, ...contatti, ctx.nomi[p.updated_by], ...categorie]
        .join(' ').toLowerCase();
}

export function filtra(prodotti, criteri, ctx) {
    const ago = criteri.ricerca.toLowerCase();
    return prodotti.filter(p => {
        if (ago && !testoCercabile(p, ctx).includes(ago)) return false;
        if (criteri.categoria && !(p.categorie || []).includes(criteri.categoria)) return false;
        return true;
    });
}

export function ordina(righe) {
    return righe.slice().sort((a, b) =>
        String(a.nome || '').localeCompare(String(b.nome || ''), 'it', { sensitivity: 'base' }));
}

export function disegna({ thead, tbody, righe, ctx }) {
    disegnaTabella({
        thead,
        tbody,
        colonne: COLONNE,
        righe,
        indiceDi: riga => riga.id,
        ctx,
        riempimento: true
    });
}

export function riempiFiltroCategorie(select, categorie) {
    const scelta = select.value;
    select.innerHTML = '<option value="">Tutte le categorie</option>'
        + categorie.map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.nome)}</option>`).join('');
    select.value = categorie.some(c => c.id === scelta) ? scelta : '';
    return select.value;
}
