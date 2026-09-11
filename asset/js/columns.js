
import { cellaLinkOAvviso, cellaPillole } from '../../core/table.js';

const g = nome => window[nome];

const AVVISO = { html: '<span class="pulse-warning">⚠️</span>', classes: ['bg-error'] };
const NON_PREVISTO = '<div class="cella-barrata">/</div>';
const NON_PERTINENTE = '<div class="cella-barrata-leggera">/</div>';

const NON_DISPONIBILE = '<div class="cella-non-disponibile">Non disponibile</div>';

const INDIRIZZO = /^https?:\/\//i;

export function derivatiDiRiga(riga, ctx) {
    const web = g('computeWebPresence')(riga);
    const sezioni = ctx.sezioni || {};

    let docsIncompleto = false;
    (sezioni['sec_3'] ? sezioni['sec_3'].childCols : []).forEach(c => {
        if (c === 'QR CODE ITA') { if (!web.hasIt) docsIncompleto = true; }
        else if (c === 'QR CODE ENG') { if (!web.hasEn) docsIncompleto = true; }
        else if (g('isOriginaleColumn')(c)) { if (!g('originaleCompleto')(riga[c])) docsIncompleto = true; }
        else if (!riga[c] || riga[c].toString().trim() === '') docsIncompleto = true;
    });

    const visualIncompleto = (sezioni['sec_4'] ? sezioni['sec_4'].childCols : []).some(c => {
        const v = (riga[c] || '').toString().trim();
        if (c === 'Serigrafia') return v.toLowerCase() !== 'no' && !INDIRIZZO.test(v);
        return v === '';
    });

    const versione = (riga['Versione Prodotto'] || riga['Nome Prodotto'] || '').toString().trim().replace(/\s+/g, '_');

    return {
        ...web,
        docsIncompleto,
        visualIncompleto,
        versione,
        inCatalogo: g('isValInCatalog')(riga['In Catalogo'])
    };
}

function azioniStandard(valore, riga, ctx, derivati, opzioni = {}) {
    const admin = g('isAdmin')();
    const indice = ctx.indiceDi(riga);
    const copiaSicura = g('escapeForJsAttr')(valore);

    const copia = opzioni.senzaCopia ? '' :
        `<button class="action-btn" title="Copia" onclick="copyText('${copiaSicura}')"><span class="material-symbols-outlined">content_copy</span></button>`;
    const modifica = (admin && !opzioni.senzaModifica) ?
        `<button class="action-btn" title="Modifica" onclick="editCell(this, ${indice}, '${opzioni.chiave}')"><span class="material-symbols-outlined">edit</span></button>` : '';
    const extra = opzioni.extra || '';

    return `\n                <div class="cell-actions">\n                    ${copia}\n                    ${modifica}\n                    ${extra}\n                </div>\n            `;
}

const azioniDi = (chiave, opzioni = {}) =>
    (v, r, ctx, d) => azioniStandard(v, r, ctx, d, { ...opzioni, chiave });

const NESSUNA_AZIONE = () => '';

const linkConIcona = (icona, titolo) => (valore, riga, ctx, derivati) =>
    cellaLinkOAvviso(valore, icona, titolo ? titolo(derivati) : null);

const linkOppureNo = icona => valore => {
    const testo = (valore || '').toString().trim();
    if (testo.toLowerCase() === 'no') return NON_PREVISTO;
    return cellaLinkOAvviso(testo, icona);
};

const originaleDelProduttore = lingua => valore => {
    const testo = (valore || '').toString().trim();
    if (testo.toLowerCase() === 'no') return NON_DISPONIBILE;
    return cellaLinkOAvviso(testo, '🏭' + bandiera(lingua));
};

const bandiera = lingua => `<img src="https://flagcdn.com/w20/${lingua === 'ITA' ? 'it' : 'gb'}.png" class="flag-icon" alt="${lingua}">`;

const iconaStato = ok =>
    `<div class="status-icon"><span class="material-symbols-outlined stato-${ok ? 'ok' : 'ko'}">${ok ? 'check_circle' : 'cancel'}</span></div>`;

export const COLONNE = [
    {
        key: 'Brand Prodotto', classes: ['col-brand'], sticky: true, width: 96,
        actions: azioniDi('Brand Prodotto')
    },
    {
        key: 'Nome Prodotto', classes: ['col-nome-prodotto'], sticky: true, width: 138,
        actions: azioniDi('Nome Prodotto', { senzaModifica: true })
    },
    {
        key: 'Stato Globale', label: '', classes: ['col-icon'], sticky: true, width: 69,
        actions: NESSUNA_AZIONE,
        render: (valore, riga, ctx, d) => {
            if (!d.inCatalogo) return '<div title="Fuori catalogo" class="led-dot led-gray"></div>';
            const incompleto = (d.isSi && (!d.hasIt || !d.hasEn || !d.hasMetaIt || !d.hasMetaEn))
                || d.docsIncompleto || d.visualIncompleto || (!d.isSi && !d.isNo);
            if (incompleto) return '<div title="Incompleto" class="led-dot led-red"></div>';

            const giorni = riga.lastReviewedAt ? (Date.now() - new Date(riga.lastReviewedAt).getTime()) / 86400000 : Infinity;
            if (giorni < 45) return '<div title="Completo" class="led-dot led-green"></div>';
            const clic = g('isAdmin')() ? ` onclick="confirmProductReview(${ctx.indiceDi(riga)})"` : '';
            return `<div title="Da rivedere" class="led-dot led-purple"${clic}></div>`;
        }
    },
    {
        key: 'Tickets', label: 'Ticket', classes: ['col-tickets'], sticky: true, width: 69,
        header: () => '<span class="th-label"><span class="th-ticket">Ticket</span></span>',
        actions: NESSUNA_AZIONE,
        render: (valore, riga, ctx) => {
            const indice = ctx.indiceDi(riga);
            const aperti = g('getOpenTicketsCount')(indice);
            const html = `<div class="ticket-btn-container"><button class="ticket-btn" onclick="openTicketListModal(${indice})" title="Gestisci Ticket">💬<span class="ticket-badge ${aperti > 0 ? '' : 'zero'}">${aperti}</span></button></div>`;
            return aperti > 0 ? { html, classes: ['bg-error-ticket'] } : html;
        }
    },
    {
        key: 'Miniatura', label: '', classes: ['col-miniatura'], sticky: true, width: 69,
        actions: NESSUNA_AZIONE,
        render: (valore, riga) => {
            const foto = (riga['Foto Principale'] || '').toString().trim();
            if (!INDIRIZZO.test(foto)) return '<div class="miniatura-vuota"></div>';
            return `<div class="miniatura"><img src="${g('escapeHtml')(foto)}" alt="Miniatura"></div>`;
        }
    },
    {
        key: 'Versione Prodotto', classes: ['col-versione'], sticky: true, width: 138,
        actions: (v, r, ctx, d) => azioniStandard(v, r, ctx, d, {
            chiave: 'Versione Prodotto',
            extra: g('isAdmin')() ? `<button class="action-btn" title="Opzioni" onclick="openOptions(${ctx.indiceDi(r)})"><span class="material-symbols-outlined">settings</span></button>` : ''
        })
    },
    { key: 'Codice Univoco', classes: ['col-codice'], actions: azioniDi('Codice Univoco') },
    {
        key: 'Categoria Prodotto', classes: ['col-pills'], actions: azioniDi('Categoria Prodotto'),
        render: (valore, riga, ctx) => cellaPillole(valore, ctx.coloriCategoria, ctx.coloreCategoriaDefault, 'pill-cat')
    },
    {
        key: 'Applicazioni', classes: ['col-pills'], actions: azioniDi('Applicazioni'),
        render: (valore, riga, ctx) => cellaPillole(valore, ctx.coloriApplicazione, ctx.coloreApplicazioneDefault, 'pill-app')
    },
    {
        key: 'Originale', label: 'Originale [ENG]', classes: ['col-btn-cell'],
        title: "L'originale del produttore in inglese. Se il fornitore non ce l'ha, si risponde No.",
        actions: azioniDi('Originale'), render: originaleDelProduttore('ENG')
    },
    {
        key: 'Originale ITA', label: 'Originale [ITA]', classes: ['col-btn-cell'],
        title: "L'originale del produttore in italiano. Se il fornitore non ce l'ha, si risponde No.",
        actions: azioniDi('Originale ITA'), render: originaleDelProduttore('ITA')
    },

    {
        key: 'Su sito', label: 'Web', classes: ['col-x1'], actions: azioniDi('Su sito', { senzaCopia: true }),
        render: (valore, riga, ctx, d) => {
            if (d.isSi) return iconaStato(d.hasIt && d.hasEn && d.hasMetaIt && d.hasMetaEn);
            if (d.isNo) return '<div class="cella-no">No</div>';
            return AVVISO;
        }
    },
    {
        key: 'Pagina Web ITA', label: 'Web 🇮🇹', classes: ['col-web-lang'], actions: azioniDi('Pagina Web ITA'),
        render: (valore, riga, ctx, d) => paginaWeb(valore, d, d.hasIt, 'ITA')
    },
    {
        key: 'Pagina Web ENG', label: 'Web 🇬🇧', classes: ['col-web-lang'], actions: azioniDi('Pagina Web ENG'),
        render: (valore, riga, ctx, d) => paginaWeb(valore, d, d.hasEn, 'ENG')
    },
    {
        key: 'Descrizione Meta ITA', classes: ['col-meta-desc'], actions: azioniDi('Descrizione Meta ITA'),
        render: (valore, riga, ctx, d) => descrizioneMeta(valore, d, d.hasMetaIt)
    },
    {
        key: 'Descrizione Meta ENG', classes: ['col-meta-desc'], actions: azioniDi('Descrizione Meta ENG'),
        render: (valore, riga, ctx, d) => descrizioneMeta(valore, d, d.hasMetaEn)
    },
    { key: 'Note/WebSite', classes: ['col-meta-desc'], actions: azioniDi('Note/WebSite') },

    {
        key: 'Docs', classes: ['col-x1'], actions: NESSUNA_AZIONE,
        render: (valore, riga, ctx, d) => iconaStato(!d.docsIncompleto)
    },
    {
        key: 'Folder Datasheet', classes: ['col-btn-cell'], actions: azioniDi('Folder Datasheet'),
        render: linkConIcona('📂📃', d => 'FOLDER_DATASHEET_' + d.versione)
    },
    { key: 'Datasheet Doc [ENG]', classes: ['col-btn-cell'], actions: azioniDi('Datasheet Doc [ENG]'), render: linkConIcona('📝' + bandiera('ENG')) },
    { key: 'PDF Datasheet [ENG]', classes: ['col-btn-cell'], actions: azioniDi('PDF Datasheet [ENG]'), render: linkConIcona('📑' + bandiera('ENG')) },
    { key: 'Datasheet Doc [ITA]', classes: ['col-btn-cell'], actions: azioniDi('Datasheet Doc [ITA]'), render: linkConIcona('📝' + bandiera('ITA')) },
    { key: 'PDF Datasheet [ITA]', classes: ['col-btn-cell'], actions: azioniDi('PDF Datasheet [ITA]'), render: linkConIcona('📑' + bandiera('ITA')) },
    {
        key: 'QR CODE ITA', classes: ['col-narrow'], actions: NESSUNA_AZIONE,
        header: () => `<span class="th-label">QR CODE ITA ${bandiera('ITA')}</span>`,
        render: (valore, riga, ctx, d) => qrCode(d.urlIt, 'QR CODE ITA', ctx.indiceDi(riga))
    },
    {
        key: 'QR CODE ENG', classes: ['col-narrow'], actions: NESSUNA_AZIONE,
        header: () => `<span class="th-label">QR CODE ENG ${bandiera('ENG')}</span>`,
        render: (valore, riga, ctx, d) => qrCode(d.urlEn, 'QR CODE ENG', ctx.indiceDi(riga))
    },
    { key: 'CE', label: 'CE & RoHS', classes: ['col-btn-cell'], actions: azioniDi('CE'), render: linkConIcona('🇪🇺', d => 'CE_' + d.versione) },

    {
        key: 'Visual', classes: ['col-x1'], actions: NESSUNA_AZIONE,
        render: (valore, riga, ctx, d) => iconaStato(!d.visualIncompleto)
    },
    { key: 'Immagini Prodotto', classes: ['col-btn-cell'], actions: azioniDi('Immagini Prodotto'), render: linkConIcona('🎨') },
    { key: 'Foto Principale', classes: ['col-btn-cell'], actions: azioniDi('Foto Principale'), render: linkConIcona('📷') },
    { key: 'foto formato Webp', label: 'Webp', classes: ['col-btn-cell'], actions: azioniDi('foto formato Webp'), render: linkConIcona('🖼️') },
    { key: 'Render Ambientali', classes: ['col-btn-cell'], actions: azioniDi('Render Ambientali'), render: linkConIcona('🎨') },
    { key: 'Serigrafia', classes: ['col-btn-cell'], actions: azioniDi('Serigrafia'), render: linkOppureNo('📄') },

    { key: 'Versioni Alternative', actions: azioniDi('Versioni Alternative') },

    ...['PersonalCol1', 'PersonalCol2', 'PersonalCol3'].map(chiave => ({
        key: chiave,
        classes: ['col-personal'],
        hidden: () => !g('isAdmin')(),
        header: () => g('buildPersonalColumnHeader')(chiave),
        render: (valore, riga, ctx) => g('buildPersonalColumnCell')(chiave, valore, ctx.indiceDi(riga)).displayContent,
        actions: (valore, riga, ctx) => g('buildPersonalColumnCell')(chiave, valore, ctx.indiceDi(riga)).actionsHtml
    }))
];

export function colonneDellaDashboard(chiaviAttive) {
    return (chiaviAttive || [])
        .map(chiave => COLONNE.find(c => c.key === chiave))
        .filter(Boolean);
}

function paginaWeb(valore, derivati, haLink, lingua) {
    if (derivati.isNo) return NON_PERTINENTE;
    if (derivati.isSi && !haLink) return AVVISO;
    if (!haLink) return '';
    return cellaLinkOAvviso(valore, '🌐' + bandiera(lingua));
}

function descrizioneMeta(valore, derivati, haMeta) {
    if (derivati.isNo) return NON_PERTINENTE;
    if (derivati.isSi && !haMeta) return AVVISO;
    return g('escapeHtml')(valore);
}

function qrCode(indirizzo, colonna, indice) {
    if (!INDIRIZZO.test(indirizzo || '')) return AVVISO;
    const sicuro = g('escapeForJsAttr')(indirizzo);
    return `<div class="qr-cella" onclick="openQrModal('${sicuro}', '${colonna}', ${indice})"><img src="https://api.qrserver.com/v1/create-qr-code/?size=48x48&data=${encodeURIComponent(indirizzo)}&format=png&bgcolor=transparent" alt="QR"></div>`;
}
