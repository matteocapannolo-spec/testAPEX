
import { escapeHtml } from '../core/ui.js';
import { cellaLinkOAvviso } from '../core/table.js';
import { TIPI_DOCUMENTO, dataIt } from './config.js';


export function sezione(key, label, controllo) {
    const completo = typeof controllo === 'function'
        ? controllo
        : (riga) => controllo.every(c => {
            const x = riga[c];
            return x !== null && x !== undefined && x !== '';
        });

    return {
        key,
        label,
        classes: ['col-sezione'],
        title: 'Verde: tutti i campi del gruppo sono compilati. Rosso: ne manca almeno uno',
        render: (v, riga, ctx, derivati) => {
            const pieno = completo(riga, derivati || {});
            return '<div class="status-icon"><span class="material-symbols-outlined stato-'
                + (pieno ? 'ok">check_circle' : 'ko">cancel') + '</span></div>';
        }
    };
}

export function testo(key, label, extra = {}) {
    return { key, label, ...extra };
}

export function data(key, label) {
    return { key, label, classes: ['col-data'], render: v => escapeHtml(dataIt(v)) };
}

export function siNo(key, label) {
    return {
        key, label, classes: ['col-stretta'],
        render: v => v === true ? 'Sì' : v === false ? 'No' : '<span class="niente">—</span>'
    };
}

export function numero(key, label, formatta = v => escapeHtml(String(v))) {
    return {
        key, label, classes: ['col-numero'],
        render: v => (v === null || v === undefined || v === '') ? '<span class="niente">—</span>' : formatta(v)
    };
}

export function pillola(key, label, etichette, prefisso, extra = {}) {
    return {
        key, label, ...extra,
        render: v => {
            if (!v) return '<span class="niente">—</span>';
            const testoV = etichette[v] || v;
            return `<span class="pill ${prefisso}-${escapeHtml(v)}">${escapeHtml(testoV)}</span>`;
        }
    };
}

export function colonnaDocumento(tipo) {
    return {
        key: 'doc_' + tipo,
        label: TIPI_DOCUMENTO[tipo],
        classes: ['col-doc'],
        render: (v, riga, c, d) => {
            const doc = (d.documentiPerTipo || {})[tipo];
            if (!doc || !doc.url) {
                return { html: '<span class="pulse-warning">⚠️</span>', classes: ['bg-error'] };
            }
            return cellaLinkOAvviso(doc.url, '<span class="material-symbols-outlined">description</span>', doc.nome || TIPI_DOCUMENTO[tipo]);
        }
    };
}

export function link(key, label) {
    return {
        key, label, classes: ['col-stretta'],
        render: v => v ? cellaLinkOAvviso(v, '<span class="material-symbols-outlined">open_in_new</span>', label)
                       : '<span class="niente">—</span>'
    };
}
