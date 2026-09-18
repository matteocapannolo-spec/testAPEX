
import { disegnaTabella } from '../core/table.js';
import { escapeHtml } from '../core/ui.js';
import {
    SEZIONI, STATI_LED, STATI_IN_ORDINE, STATI_ATTUALI, FILTRO_ATTUALI, FASI, TIPI_ATTESI,
    ORDINI_CODICE
} from './config.js';
import { colonneDi, statoDi } from './colonne.js';
import { voceResponsabile } from './persone.js';
import { derivatiDiRiga } from './derivati.js';

const CAMPI_CERCABILI = ['codice', 'cliente', 'cliente_finale', 'citta', 'indirizzo', 'descrizione', 'priorita'];

function corrisponde(progetto, testo) {
    if (!testo) return true;
    const ago = testo.toLowerCase();
    return CAMPI_CERCABILI.some(c => String(progetto[c] || '').toLowerCase().includes(ago));
}

export function filtra(progetti, criteri, ctx) {
    return progetti.filter(p => {
        if (!corrisponde(p, criteri.ricerca)) return false;
        if (criteri.status) {
            const chiave = statoDi(p, derivatiDiRiga(p, ctx)).chiave;
            const passa = criteri.status === FILTRO_ATTUALI
                ? STATI_ATTUALI.includes(chiave)
                : chiave === criteri.status;
            if (!passa) return false;
        }
        if (criteri.fase && p.fase !== criteri.fase) return false;
        if (criteri.pm && p.pm_user_id !== criteri.pm) return false;
        return true;
    });
}

const FORMA_CODICE = /^(\d{4})\D*(\d+)?/;

function annoENumero(codice) {
    const pezzi = FORMA_CODICE.exec(String(codice || '').trim());
    if (!pezzi) return { anno: 0, numero: Number.MAX_SAFE_INTEGER };
    return {
        anno: Number(pezzi[1]),
        numero: pezzi[2] === undefined ? Number.MAX_SAFE_INTEGER : Number(pezzi[2])
    };
}

function perCodice(righe, ordine) {
    const verso = (modo, a, b) => modo === 'asc' ? a - b : b - a;

    return righe.slice().sort((a, b) => {
        const ca = annoENumero(a.codice), cb = annoENumero(b.codice);
        if (ca.anno !== cb.anno) return verso(ordine.anno, ca.anno, cb.anno);
        return verso(ordine.numero, ca.numero, cb.numero);
    });
}

export function ordina(righe, ctx) {
    const scelto = ORDINI_CODICE[ctx.ordineCodice || 0] || ORDINI_CODICE[0];
    if (scelto.anno) return perCodice(righe, scelto);

    const peso = new Map(STATI_IN_ORDINE.map((chiave, i) => [chiave, i]));
    const chiaveDi = new Map(
        righe.map(p => [p, peso.get(statoDi(p, derivatiDiRiga(p, ctx)).chiave) ?? STATI_IN_ORDINE.length])
    );

    return righe.slice().sort((a, b) => {
        const stato = chiaveDi.get(a) - chiaveDi.get(b);
        if (stato !== 0) return stato;

        const ca = annoENumero(a.codice), cb = annoENumero(b.codice);
        if (ca.anno !== cb.anno) return cb.anno - ca.anno;
        return ca.numero - cb.numero;
    });
}

export function disegna({ thead, tbody, righe, ctx, sezioni }) {
    disegnaTabella({
        thead,
        tbody,
        colonne: colonneDi(ctx),
        sezioni,
        righe,
        indiceDi: riga => riga.id,
        ctx,
        perRiga: (riga, c) => derivatiDiRiga(riga, c),
        riempimento: true
    });
}

export function sezioniIniziali() {
    const stato = {};
    for (const [id, s] of Object.entries(SEZIONI)) {
        stato[id] = { motherCols: s.motherCols, childCols: s.childCols, isExpanded: s.isExpanded };
    }
    return stato;
}

export function riempiFiltri({ selectStatus, selectFase, elencoPm }, responsabili) {
    const opzioni = (select, mappa, primo) => {
        select.innerHTML = `<option value="">${escapeHtml(primo)}</option>` +
            Object.entries(mappa).map(([k, v]) => `<option value="${escapeHtml(k)}">${escapeHtml(v)}</option>`).join('');
    };

    opzioni(selectStatus, STATI_LED, 'Tutti gli status');
    selectStatus.insertAdjacentHTML('afterbegin',
        `<option value="${FILTRO_ATTUALI}">Attuali (Default)</option>`);
    selectStatus.value = FILTRO_ATTUALI;
    opzioni(selectFase, FASI, 'Tutte le fasi');

    elencoPm.innerHTML = voceResponsabile('', 'Tutti i responsabili',
        { icona: 'group', scelto: true, azione: 'scegli-filtro-pm' })
        + responsabili.map(r => voceResponsabile(r.user_id, r.nome,
            { persona: r, azione: 'scegli-filtro-pm' })).join('');
}

export function statisticheDi(visibili, ctx) {
    let attesi = 0, presenti = 0, inCorso = 0, inRitardo = 0;

    for (const p of visibili) {
        const d = derivatiDiRiga(p, ctx);
        attesi += TIPI_ATTESI.length;
        presenti += TIPI_ATTESI.length - d.documentiMancanti.length;

        const chiave = statoDi(p, d).chiave;
        if (chiave === 'in_corso') inCorso++;
        if (chiave === 'in_ritardo' || chiave === 'leggero_ritardo') inRitardo++;
    }

    return {
        totale: visibili.length,
        inCorso,
        inRitardo,
        documentazione: attesi ? Math.round(presenti * 100 / attesi) : null
    };
}
