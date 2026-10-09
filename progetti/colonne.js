
import { escapeHtml } from '../core/ui.js';
import { volto } from './persone.js';
import { sezione, testo, data, siNo, numero, pillola, colonnaDocumento, link } from './fabbriche.js';
import {
    STATI, FASI, STATI_DDT, TIPI_ATTESI, STATI_FATTURA,
    BUSINESS_UNIT, SEZIONI, DOCS_NEL_GRUPPO, ORDINI_CODICE, dataIt, euro
} from './config.js';

const compilato = x => x !== null && x !== undefined && x !== '';

const COMPLETO = {
    anagrafica: (riga) => SEZIONI.anagrafica.childCols.every(c => compilato(riga[c])),

    progettuale: (riga) => SEZIONI.progettuale.childCols
        .filter(c => c !== 'mano_opera').every(c => compilato(riga[c])),

    fatturato: (riga, d) => (d.tappe || []).length > 0,

    service: (riga) => {
        if (riga.service_attivo === null || riga.service_attivo === undefined) return false;
        if (!riga.service_attivo) return true;
        return Boolean(riga.service_inizio && riga.service_fine);
    },

    documentale: (riga, d) => DOCS_NEL_GRUPPO.every(t => {
        const doc = (d.documentiPerTipo || {})[t];
        return Boolean(doc && doc.url);
    })
};


const GIORNI_LEGGERO = 7;

export function statoDi(riga, d) {
    if (riga.status === 'annullato') {
        return { chiave: 'cancellato', etichetta: 'Progetto cancellato', led: 'led-grigio' };
    }

    if (riga.fase === 'completato') {
        const lacunoso = (d.documentiMancanti || []).length > 0
            || Object.values(COMPLETO).some(regola => !regola(riga, d));
        return lacunoso
            ? { chiave: 'completato_lacunoso', etichetta: 'Completato ma lacunoso', led: 'led-viola' }
            : { chiave: 'completato', etichetta: 'Completato', led: 'led-verde' };
    }

    const giorni = d.ritardoGiorni || 0;
    if (giorni > GIORNI_LEGGERO) return { chiave: 'in_ritardo', etichetta: 'In ritardo', led: 'led-rosso' };
    if (giorni > 0) return { chiave: 'leggero_ritardo', etichetta: 'In leggero ritardo', led: 'led-giallo' };
    return { chiave: 'in_corso', etichetta: 'In corso', led: 'led-blu' };
}

function ledStato() {
    return {
        key: 'status',
        label: '',
        classes: ['col-icon'],
        sticky: true,
        width: 50,
        render: (v, riga, ctx, d) => {
            const s = statoDi(riga, d || {});
            return `<div class="led-dot ${s.led}" title="${escapeHtml(s.etichetta)}"></div>`;
        }
    };
}

function intestazioneCodice(etichetta, posizione) {
    const ora = ORDINI_CODICE[posizione] || ORDINI_CODICE[0];
    const dopo = ORDINI_CODICE[(posizione + 1) % ORDINI_CODICE.length];

    const icona = !ora.anno ? 'swap_vert' : ora.anno === 'desc' ? 'arrow_downward' : 'arrow_upward';
    const titolo = ora.breve + ' — premi per: ' + dopo.breve;

    return '<div class="th-content-wrapper">'
        + '<span class="th-label">' + escapeHtml(etichetta) + '</span>'
        + '<button type="button" class="ordina-btn' + (ora.anno ? ' attivo' : '')
        + '" data-action="ordina-codice" title="' + escapeHtml(titolo) + '">'
        + '<span class="material-symbols-outlined">' + icona + '</span></button>'
        + '</div>';
}


export function colonneDi(ctx) {
    const colonne = [];

    colonne.push(
        testo('priorita', 'Priorità', { sticky: true, width: 90, classes: ['col-priorita'] }),
        ledStato(),
        pillola('fase', 'Fase Progetto', FASI, 'fase', { sticky: true, width: 120 }),
        testo('codice', 'Codice Progetto', {
            sticky: true, width: 130, classes: ['col-codice'],
            header: col => intestazioneCodice(col.label, ctx.ordineCodice || 0),
            render: v => '<button type="button" class="link-codice" data-action="scheda" title="Apri la scheda del progetto">'
                + `<span class="codice-testo">${escapeHtml(v)}</span>`
                + '<span class="material-symbols-outlined">open_in_new</span></button>'
        })
    );

    colonne.push(
        sezione('sez_anagrafica', 'Dati Anagrafici', COMPLETO.anagrafica),
        pillola('business_unit', 'Tipo Business', BUSINESS_UNIT, 'bu', { width: 130 }),
        testo('cliente', 'Cliente', { width: 200, classes: ['col-cliente'] }),
        testo('cliente_finale', 'Cliente Finale', { width: 200 }),
        testo('indirizzo', 'Indirizzo', { classes: ['col-larga'] }),
        testo('citta', 'Città'),
        {
            key: 'pm_user_id',
            label: 'Project Manager',
            width: 256,
            render: (v, riga, c) => {
                if (!v) return '<span class="niente">—</span>';

                const persona = (c.responsabiliPerId || {})[v];
                if (persona) {
                    return '<span class="pm-cella">' + volto(persona)
                        + `<span class="pm-nome">${escapeHtml(persona.nome)}</span></span>`;
                }

                const spiega = 'Questa persona non ha la spunta «PM» sul modulo Progetti: si mette dal pannello Admin';
                return `<span class="pm-cella pm-decaduto" title="${escapeHtml(spiega)}">` + volto(null)
                    + `<span class="pm-nome">${escapeHtml(c.nomiNoti[v] || 'Non ammissibile')}</span></span>`;
            }
        }
    );

    colonne.push(
        sezione('sez_progettuale', 'Gestione Progettuale', COMPLETO.progettuale),
        data('data_opportunita', 'Data Creazione Opportunità'),
        data('data_ordine', 'Data Ordine'),
        numero('qt_ordini', 'Qt. Ordini'),
        siNo('documenti_cliente', 'Documenti forniti dal cliente'),
        testo('descrizione', 'Descrizione', { classes: ['col-larga'] }),
        numero('tempo_consegna_giorni', 'Tempo Consegna', v => escapeHtml(v + ' gg')),
        data('data_koi', 'Data KOI'),
        siNo('consegna_in_piu_parti', 'Consegna in più parti?'),
        data('data_consegna_pronta', 'Data Consegna pronta'),
        data('data_prossima_consegna', 'Data Pianificata per la prossima consegna'),
        pillola('status_ddt', 'Status Ddt(n)', STATI_DDT, 'ddt', { width: 165 }),
        {
            key: 'mano_opera',
            label: "Mano d'opera Esterna - Nome azienda",
            classes: ['col-larga', 'col-calcolata'],
            title: 'Le aziende registrate nella scheda del progetto',
            render: (v, riga) => {
                const nomi = (riga.fornitori || []).map(x => x.azienda).filter(Boolean);
                return nomi.length ? escapeHtml(nomi.join(', ')) : '<span class="niente">—</span>';
            }
        },
        data('data_inizio_installazioni', 'Data Inizio Installazioni'),
        data('data_fine_installazioni', 'Data Fine Installazioni'),
        data('data_collaudo', 'Collaudo'),
        { ...data('scadenza', 'Scadenza'), classes: ['col-data', 'col-calcolata'], title: 'Calcolata: data ordine + tempo di consegna' }
    );

    colonne.push(
        sezione('sez_fatturazione', 'Fatturazione', COMPLETO.fatturato),
        {
            key: 'mod_fatturazione',
            label: 'Mod Fatturazione',
            classes: ['col-calcolata'],
            title: 'Le tappe del piano di fatturazione, in percentuale',
            render: (v, riga, c, d) => {
                if (!d.tappe.length) return '<span class="niente">nessun piano</span>';
                return escapeHtml(d.tappe.map(t => t.percentuale + '%').join(' + '));
            }
        },
        {
            key: 'stato_fatturazione',
            label: 'Status Fatturazione',
            width: 150,
            title: 'Calcolata dalle tappe del piano di fatturazione',
            classes: ['col-calcolata'],
            render: (v, riga, c, d) => {
                if (!d.tappe.length) return '<span class="niente">nessun piano</span>';
                const quota = d.percentualeFatturata;
                const classe = quota >= 100 ? 'pill fatt-completo' : quota > 0 ? 'pill fatt-parziale' : 'pill fatt-zero';
                return `<span class="${classe}">${escapeHtml(String(quota))}%</span>`;
            }
        },
        {
            key: 'prossima_fatturazione',
            label: 'Data Prossima Fatturazione',
            classes: ['col-calcolata'],
            title: 'La prima tappa ancora da fatturare',
            render: (v, riga, c, d) => {
                if (!d.prossimaTappa) return '<span class="niente">—</span>';
                const t = d.prossimaTappa;
                const pronta = d.fatturabili.includes(t);

                const base = riga.ricavo_totale;
                const importo = (base === null || base === undefined)
                    ? ''
                    : ` <span class="importo">${escapeHtml(euro(Number(base) * Number(t.percentuale) / 100))}</span>`;

                const etichetta = `${STATI_FATTURA[t.stato] || t.stato} ${t.percentuale}%`;
                const spiega = pronta ? 'Traguardo raggiunto: fatturabile' : 'In attesa del traguardo che la sblocca';
                return `<span class="pill ${pronta ? 'fatt-pronta' : 'fatt-bloccata'}" title="${spiega}">${escapeHtml(etichetta)}</span>${importo}`;
            }
        }
    );

    colonne.push(
        sezione('sez_service', 'Service', COMPLETO.service),
        siNo('service_attivo', 'Contratto Service'),
        {
            key: 'service_periodo',
            label: 'Intervallo Durata Contratto Service',
            classes: ['col-data', 'col-calcolata'],
            title: 'Le due date registrate nella scheda del progetto',
            render: (v, riga) => {
                if (!riga.service_inizio && !riga.service_fine) return '<span class="niente">—</span>';
                return escapeHtml(dataIt(riga.service_inizio) + ' – ' + dataIt(riga.service_fine));
            }
        },
        siNo('service_rinnovo', 'Rinnovo Service'),
        numero('service_rinnovo_anni', 'Durata Rinnovo')
    );

    colonne.push(
        sezione('sez_docs', 'Docs Drive', COMPLETO.documentale)
    );
    for (const tipo of DOCS_NEL_GRUPPO) colonne.push(colonnaDocumento(tipo));

    colonne.push(
        { ...numero('giorni_effettivi', 'Giorni Effettivi', v => escapeHtml(v + ' gg')), classes: ['col-numero', 'col-calcolata'], title: 'Calcolata: collaudo − ordine' },
        numero('ricavo_totale', 'Ricavo Totale', v => escapeHtml(euro(v))),
        numero('costo_totale', 'Costo Totale', v => escapeHtml(euro(v)))
    );
    for (const tipo of TIPI_ATTESI) {
        if (!DOCS_NEL_GRUPPO.includes(tipo)) colonne.push(colonnaDocumento(tipo));
    }
    colonne.push(link('odoo_url', 'Link Odoo Impostazione Progetto'));

    return conAzioni(colonne, ctx);
}

const CALCOLATE = new Set([
    'scadenza', 'giorni_effettivi', 'stato_fatturazione', 'prossima_fatturazione',
    'mano_opera', 'mod_fatturazione', 'service_periodo', 'sez_anagrafica',
    'status'
]);

function conAzioni(colonne, ctx) {
    if (!ctx.puoScrivere) return colonne;

    return colonne.map(colonna => {
        if (CALCOLATE.has(colonna.key)) return colonna;

        if (colonna.key.startsWith('doc_')) return colonna;

        return {
            ...colonna,
            actions: () => '<div class="azioni-cella">'
                + '<button type="button" class="azione-cella" data-action="modifica" title="Modifica">'
                + '<span class="material-symbols-outlined">edit</span></button></div>'
        };
    });
}

export { BUSINESS_UNIT };
