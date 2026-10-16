
import { disegnaTabella } from '../core/table.js';
import { escapeHtml } from '../core/ui.js';
import { giornoIt, SCADENZA, eBactoSense, tonoScadenza } from './config.js';
import { stato, strumentiDelContratto, flussiDi, contattiDi, promemoriaAperti, cartucceDi, modelloPerId } from './stato.js';
import { nomeContatto } from './contatti.js';
import { rigaFlussi } from './flussi.js';
import { cellaPersona } from './persone.js';

const NIENTE = '<span class="niente">—</span>';

function testoTagliato(valore) {
    return valore ? `<span title="${escapeHtml(valore)}">${escapeHtml(valore)}</span>` : NIENTE;
}

function nomeConCartella(nome, link, cosa, conCopia = true) {
    if (!link) {
        return {
            html: `<span class="link-mancante" title="Manca il link alla cartella ${cosa} su Google Drive: si mette dalla matita del contratto"><span class="material-symbols-outlined">link_off</span>${escapeHtml(nome)}</span>`,
            classes: ['bg-error', 'cella-pulsa']
        };
    }
    return '<span class="cartella-cella">'
        + `<a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer" class="btn-link-pill pastiglia-cartella" title="Apri la cartella ${cosa} su Google Drive">`
        + `<span class="material-symbols-outlined">folder_open</span><span class="testo-pastiglia">${escapeHtml(nome)}</span></a>`
        + (conCopia ? `<button type="button" class="action-btn copia-link" data-action="copia" data-testo="${escapeHtml(link)}" title="Copia il link"><span class="material-symbols-outlined">content_copy</span></button>` : '')
        + '</span>';
}

function cellaContatti(riga, ctx) {
    const contatti = contattiDi(riga.id);
    if (!contatti.length) {
        return ctx.puoAnagrafica
            ? '<button type="button" class="cella-aggiungi" data-action="contatti" title="Aggiungi i contatti del cliente"><span class="material-symbols-outlined">person_add</span>Aggiungi</button>'
            : NIENTE;
    }
    const altri = contatti.length > 1 ? `<span class="contatti-altri">+${contatti.length - 1}</span>` : '';
    return `<button type="button" class="cella-contatti" data-action="contatti" title="I contatti del cliente: scrivi, copia, modifica">`
        + `<span class="material-symbols-outlined">contacts</span><span class="contatti-nome">${escapeHtml(nomeContatto(contatti[0]))}</span>${altri}</button>`;
}

function dataMancante(riga, quale) {
    if (riga.stato !== 'attivo') return NIENTE;
    return {
        html: `<span class="link-mancante" title="Manca la data di ${quale}: si mette dalla matita del contratto"><span class="material-symbols-outlined">event_busy</span>Da inserire</span>`,
        classes: ['bg-error', 'cella-pulsa']
    };
}

function cellaConclusione(v, riga, ctx) {
    if (!v) return dataMancante(riga, 'conclusione');
    const data = escapeHtml(giornoIt(v));
    const rinnovo = riga.rinnovo_automatico
        ? '<span class="material-symbols-outlined segno-rinnovo" title="Rinnovo automatico">autorenew</span>'
        : '';
    if (riga.scadenza === 'grigio') {
        const come = riga.stato === 'rinnovato' ? 'Rinnovato' : 'Chiuso';
        const riapri = riga.stato === 'chiuso' && ctx.puoAnagrafica
            ? '<button type="button" class="link-azione" data-action="riapri-contratto" title="Il contratto torna attivo">Riapri</button>'
            : '';
        return `<span class="data-con-segno"><span class="scadenza-tag grigio">${come}</span>${data}${riapri}</span>`;
    }
    if (riga.scadenza === 'verde') return `<span class="data-con-segno">${data}${rinnovo}</span>`;
    const titolo = (SCADENZA[riga.scadenza] || {}).etichetta || '';
    const pillola = `<span class="scadenza-tag ${escapeHtml(riga.scadenza)}" title="${titolo}">${data}</span>`;
    const domanda = riga.scadenza === 'rosso' && ctx.puoAnagrafica
        ? '<button type="button" class="btn-rinnovo" data-action="rinnovo" title="Il contratto è scaduto: è stato rinnovato?">Rinnovo?</button>'
        : '';
    return `<span class="data-con-segno">${pillola}${rinnovo}${domanda}</span>`;
}

function cellaCartucce(v, riga, ctx) {
    const cartucce = cartucceDi(riga.id);
    if (!cartucce.length) {
        const bacto = strumentiDelContratto(riga.id).some(s => eBactoSense(modelloPerId(s.modello_id)));
        return bacto && ctx.puoAnagrafica
            ? '<button type="button" class="cella-aggiungi" data-action="cartucce" title="Aggiungi le cartucce dei BactoSense"><span class="material-symbols-outlined">water_drop</span>Aggiungi</button>'
            : NIENTE;
    }
    const inScadenza = cartucce.filter(c => ['vicina', 'passata'].includes(tonoScadenza(c.refill_scadenza, 30))).length;
    const titolo = inScadenza ? `${inScadenza} refill in scadenza o scaduti` : 'Le cartucce del contratto';
    return `<button type="button" class="pill pill-numero${inScadenza ? ' con-promemoria' : ''}" data-action="cartucce" title="${titolo}">${cartucce.length} ${cartucce.length === 1 ? 'cartuccia' : 'cartucce'}</button>`;
}

function cellaStrumenti(v, riga) {
    const promemoria = strumentiDelContratto(riga.id).reduce((n, s) => n + promemoriaAperti(s.id).length, 0);
    const puntina = promemoria ? '<span class="material-symbols-outlined puntina">push_pin</span>' : '';
    const titolo = promemoria
        ? `${promemoria === 1 ? 'Un promemoria aperto' : `${promemoria} promemoria aperti`} sugli strumenti`
        : 'Gli strumenti del contratto, con la loro scheda';
    return `<button type="button" class="pill pill-numero${promemoria ? ' con-promemoria' : ''}" data-action="strumenti" title="${titolo}">${puntina}${escapeHtml(v)} strum.</button>`;
}

function azioniContratto(v, riga, ctx) {
    const pulsanti = [];
    if (ctx.puoAnagrafica && (riga.scadenza === 'giallo' || riga.scadenza === 'arancione')) {
        pulsanti.push('<button type="button" class="action-btn" data-action="rinnovo" title="Rinnova il contratto"><span class="material-symbols-outlined">autorenew</span></button>');
    }
    if (riga.link_drive) {
        pulsanti.push(`<button type="button" class="action-btn" data-action="copia" data-testo="${escapeHtml(riga.link_drive)}" title="Copia il link del contratto"><span class="material-symbols-outlined">content_copy</span></button>`);
    }
    if (ctx.puoAnagrafica) {
        pulsanti.push('<button type="button" class="action-btn" data-action="modifica-contratto" title="Modifica il contratto"><span class="material-symbols-outlined">edit</span></button>');
    }
    if (ctx.admin) {
        pulsanti.push('<button type="button" class="action-btn" data-action="elimina-contratto" title="Elimina il contratto"><span class="material-symbols-outlined">delete</span></button>');
    }
    return pulsanti.length ? `<div class="cell-actions">${pulsanti.join('')}</div>` : '';
}

export const COLONNE = [
    {
        key: 'apri', label: '', width: 48, sticky: true, classes: ['col-apri'],
        render: (v, riga) => {
            const aperto = stato.aperti.has(riga.id) || stato.criteri.soloAperti;
            return `<button type="button" class="toggle-section-btn" data-action="apri-contratto" title="${aperto ? 'Chiudi i flussi' : 'Mostra i flussi'}">`
                + `<span class="material-symbols-outlined">${aperto ? 'expand_less' : 'expand_more'}</span></button>`;
        }
    },
    {
        key: 'led', label: '', width: 52, sticky: true, classes: ['col-led'],
        render: (v, riga) => `<span class="led-dot led-${escapeHtml(v)}" title="${escapeHtml(riga.led_motivo || 'Tutto in ordine')}"></span>`
    },
    { key: 'cliente_nome', label: 'Cliente', width: 200, sticky: true, classes: ['col-testo', 'col-cliente'], render: v => testoTagliato(v) },
    { key: 'pratica_nome', label: 'Pratica', width: 190, classes: ['col-cartella'], render: (v, riga) => nomeConCartella(v, riga.pratica_link, 'della pratica') },
    { key: 'nome', label: 'Contratto', width: 210, classes: ['col-cartella'], render: (v, riga) => nomeConCartella(v, riga.link_drive, 'del contratto', false), actions: azioniContratto },
    { key: 'data_sottoscrizione', label: 'Sottoscrizione', width: 125, render: (v, riga) => v ? giornoIt(v) : dataMancante(riga, 'sottoscrizione') },
    { key: 'data_conclusione', label: 'Conclusione', width: 190, render: cellaConclusione },
    {
        key: 'codici', label: 'Codici', width: 170, classes: ['col-codici'],
        render: v => v ? `<span class="codici" title="${escapeHtml(v)}">${escapeHtml(v)}</span>` : NIENTE
    },
    {
        key: 'responsabile_id', label: 'Responsabile Commerciale', width: 200, classes: ['col-persona'],
        render: (v, riga, ctx) => cellaPersona(ctx.persone[v], v ? 'Persona non più presente' : '')
    },
    { key: 'contatti', label: 'Contatti', width: 180, classes: ['col-contatti'], render: (v, riga, ctx) => cellaContatti(riga, ctx) },
    {
        key: 'sintesi', label: 'Sintesi Contratto', width: 340, classes: ['col-nota'],
        render: v => v ? `<span class="nota" title="${escapeHtml(v)}">${escapeHtml(v)}</span>` : NIENTE
    },
    {
        key: 'n_strumenti', label: 'Strumenti', width: 120,
        render: cellaStrumenti
    },
    { key: 'n_cartucce', label: 'Cartucce', width: 120, render: cellaCartucce },
    {
        key: 'n_flussi_aperti', label: 'Flussi Aperti', width: 115,
        render: (v, riga) => {
            if (!v) return NIENTE;
            const fermo = riga.giorni_fermo_max > 14 ? ' fermo' : '';
            return `<span class="pill pill-numero${fermo}" title="Il flusso piu' fermo non si muove da ${escapeHtml(riga.giorni_fermo_max)} giorni">${escapeHtml(v)}</span>`;
        }
    }
];


function testoCercabile(c, ctx) {
    const strumenti = strumentiDelContratto(c.id);
    const serie = strumenti.flatMap(s => [s.numero_serie, s.sito]);
    const contatti = contattiDi(c.id).flatMap(k => [nomeContatto(k), k.societa, k.email]);
    const flussi = flussiDi(c.id);
    const numeri = flussi.flatMap(f => stato.passi.filter(p => p.flusso_id === f.id).flatMap(p => [p.numero, p.seriale]));
    return [c.cliente_nome, c.pratica_nome, c.nome, c.codici, c.sintesi, ctx.nomi[c.responsabile_id],
        ...contatti, ...serie, ...flussi.map(f => f.titolo), ...numeri].join(' ').toLowerCase();
}

export function filtra(contratti, criteri, ctx) {
    const ago = criteri.ricerca.toLowerCase();
    return contratti.filter(c => {
        if (criteri.soloAperti && !c.n_flussi_aperti) return false;
        if (criteri.responsabile && c.responsabile_id !== criteri.responsabile) return false;
        if (criteri.scadenza ? c.scadenza !== criteri.scadenza : c.scadenza === 'grigio') return false;
        if (ago && !testoCercabile(c, ctx).includes(ago)) return false;
        return true;
    });
}

export function ordina(righe) {
    const confronta = (a, b) => String(a || '').localeCompare(String(b || ''), 'it', { sensitivity: 'base' });
    return righe.slice().sort((a, b) => confronta(a.cliente_nome, b.cliente_nome) || confronta(a.nome, b.nome));
}

export function disegna({ thead, tbody, righe, ctx }) {
    disegnaTabella({ thead, tbody, colonne: COLONNE, righe, indiceDi: r => r.id, ctx, riempimento: true });

    const larghezza = thead.querySelector('tr').children.length;
    for (const tr of [...tbody.querySelectorAll('tr[data-index]')]) {
        const contratto = righe.find(r => r.id === tr.dataset.index);
        const aperto = contratto && (stato.aperti.has(contratto.id) || stato.criteri.soloAperti);
        if (!aperto) continue;
        tr.classList.add('contratto-aperto');
        tr.after(rigaFlussi(contratto, ctx, larghezza));
    }
}

export function riempiFiltroResponsabili(select, ctx) {
    const scelta = select.value;
    const ids = new Set([...stato.contratti.map(c => c.responsabile_id), ...stato.responsabili.map(r => r.user_id)]);
    const voci = [...ids].filter(Boolean)
        .map(id => ({ id, nome: ctx.nomi[id] || 'Persona non più presente' }))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
    select.innerHTML = '<option value="">Tutti</option>'
        + voci.map(v => `<option value="${escapeHtml(v.id)}">${escapeHtml(v.nome)}</option>`).join('');
    select.value = ids.has(scelta) ? scelta : '';
    return select.value;
}

export function riempiFiltroScadenza(select) {
    select.innerHTML = '<option value="">Tutti gli attivi</option>'
        + Object.entries(SCADENZA).map(([k, s]) => `<option value="${k}">${escapeHtml(s.etichetta)}</option>`).join('');
}
