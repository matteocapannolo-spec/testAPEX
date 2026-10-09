
import { escapeHtml } from '../core/ui.js';
import { giornoIt, GRUPPI, PASSI_FORNITORE, PASSO_FATTURARE } from './config.js';
import { stato, flussiDi, passoFatto, strumentiDelFlusso, fornitoreInterno } from './stato.js';

function statoCasella(flusso, n) {
    const fatto = passoFatto(flusso.id, n);
    if (fatto) return { tipo: 'fatto', fatto };
    if (fornitoreInterno(flusso) && PASSI_FORNITORE.includes(n)) return { tipo: 'escluso', motivo: 'Non previsto: il fornitore è tt group' };
    const fatturare = passoFatto(flusso.id, PASSO_FATTURARE);
    if (fatturare && fatturare.esito === false && n > PASSO_FATTURARE) return { tipo: 'escluso', motivo: 'Non serve: da non fatturare' };
    if (n === flusso.passo_corrente) return { tipo: 'corrente' };
    return { tipo: 'futuro' };
}

function infoFatto(def, fatto) {
    if (def.serve_esito) return fatto.esito ? 'Sì' : 'No';
    return giornoIt(fatto.data) || 'Fatto';
}

function casella(flusso, def, ctx) {
    const s = statoCasella(flusso, def.passo);
    const testa = `<span class="passo-n">${def.passo}</span><span class="passo-nome">${escapeHtml(def.nome)}</span>`;

    if (s.tipo === 'fatto') {
        const chi = ctx.nomi[s.fatto.fatto_da] || '';
        const titolo = [s.fatto.numero, chi && `fatto da ${chi}`, s.fatto.corretto_il && 'corretto'].filter(Boolean).join(' · ');
        return `<button type="button" class="passo passo-fatto" data-action="passo" data-passo="${def.passo}" title="${escapeHtml(titolo)}">`
            + `${testa}<span class="passo-info"><span class="material-symbols-outlined">check</span>${escapeHtml(infoFatto(def, s.fatto))}</span></button>`;
    }
    if (s.tipo === 'corrente') {
        const puo = ctx.puoPasso(def);
        const titolo = puo ? 'Completa questo passaggio' : `Lo completa: ${GRUPPI[def.gruppo] || def.gruppo}`;
        return `<button type="button" class="passo passo-corrente${puo ? '' : ' passo-altrui'}" data-action="passo" data-passo="${def.passo}" title="${escapeHtml(titolo)}">`
            + `${testa}<span class="passo-info">${puo ? 'Da fare' : 'In attesa'}</span></button>`;
    }
    if (s.tipo === 'escluso') {
        return `<span class="passo passo-escluso" title="${escapeHtml(s.motivo)}">${testa}<span class="passo-info">—</span></span>`;
    }
    return `<span class="passo passo-futuro">${testa}<span class="passo-info">&nbsp;</span></span>`;
}

function etichettaStato(flusso) {
    if (flusso.stato === 'chiuso') return '<span class="flusso-stato chiuso">Chiuso</span>';
    if (flusso.giorni_fermo > 14) {
        return `<span class="flusso-stato fermo" title="Nessun passaggio da ${escapeHtml(flusso.giorni_fermo)} giorni">Fermo da ${escapeHtml(flusso.giorni_fermo)} giorni</span>`;
    }
    return '<span class="flusso-stato aperto">Aperto</span>';
}

function fornitore(flusso) {
    if (!flusso.brand) return '<span class="fornitore vuoto" title="Il flusso non ha ancora strumenti: il fornitore lo decide il loro brand">Fornitore: —</span>';
    const interno = fornitoreInterno(flusso) ? ' (interno)' : '';
    return `<span class="fornitore">Fornitore: <strong>${escapeHtml(flusso.brand)}</strong>${interno}</span>`;
}

function azioniFlusso(flusso, ctx) {
    const pulsanti = [];
    if (ctx.puoAnagrafica && flusso.stato === 'aperto') {
        pulsanti.push('<button type="button" class="action-btn" data-action="modifica-flusso" title="Titolo e strumenti del flusso"><span class="material-symbols-outlined">edit</span></button>');
    }
    if (ctx.admin) {
        pulsanti.push('<button type="button" class="action-btn" data-action="elimina-flusso" title="Elimina il flusso e i suoi passaggi"><span class="material-symbols-outlined">delete</span></button>');
    }
    return pulsanti.length ? `<span class="flusso-azioni">${pulsanti.join('')}</span>` : '';
}

function bloccoFlusso(flusso, ctx) {
    const strumenti = strumentiDelFlusso(flusso.id);
    const serie = strumenti.length
        ? strumenti.map(s => `<span class="serie">${escapeHtml(s.numero_serie)}</span>`).join('')
        : '<span class="niente">Nessuno strumento</span>';

    return `<div class="flusso${flusso.stato === 'chiuso' ? ' flusso-chiuso' : ''}" data-flusso="${escapeHtml(flusso.id)}">`
        + '<div class="flusso-testa">'
        + `<span class="flusso-titolo" title="${escapeHtml(flusso.titolo)}">${escapeHtml(flusso.titolo)}</span>`
        + etichettaStato(flusso) + fornitore(flusso)
        + `<span class="flusso-serie">${serie}</span>`
        + azioniFlusso(flusso, ctx)
        + '</div>'
        + `<div class="passi">${stato.passaggi.map(def => casella(flusso, def, ctx)).join('')}</div>`
        + '</div>';
}

export function rigaFlussi(contratto, ctx, larghezza) {
    const flussi = flussiDi(contratto.id).filter(f => !stato.criteri.soloAperti || f.stato === 'aperto');

    const corpo = flussi.length
        ? flussi.map(f => bloccoFlusso(f, ctx)).join('')
        : '<p class="flussi-vuoto">Nessun flusso per questo contratto.</p>';
    const nuovo = ctx.puoAnagrafica
        ? '<button type="button" class="btn btn-export btn-piccolo" data-action="nuovo-flusso"><span class="material-symbols-outlined">add</span> Nuovo flusso</button>'
        : '';

    const tr = document.createElement('tr');
    tr.className = 'riga-flussi';
    tr.dataset.contratto = contratto.id;
    const td = document.createElement('td');
    td.colSpan = larghezza;
    td.innerHTML = `<div class="flussi-blocco">${corpo}${nuovo}</div>`;
    tr.appendChild(td);
    return tr;
}
