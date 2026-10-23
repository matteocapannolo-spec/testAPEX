
import { escapeHtml } from '../core/ui.js';
import { giornoIt, GRUPPI, TIPI } from './config.js';
import {
    stato, flussiDi, passoFatto, passaggiDi, strumentiDelFlusso, fornitoreInterno, noteDelFlusso,
    promemoriaAperti, cartucciaPerId, nomeLuogo
} from './stato.js';
import { volto } from './persone.js';

function statoCasella(flusso, def, defs) {
    const fatto = passoFatto(flusso.id, def.passo);
    if (fatto) return { tipo: 'fatto', fatto };
    if (def.salta_se_interno && fornitoreInterno(flusso)) return { tipo: 'escluso', motivo: 'Non previsto: il fornitore è tt group' };
    const no = defs.find(d => d.chiude_se_no && (passoFatto(flusso.id, d.passo) || {}).esito === false);
    if (no && def.ordine > no.ordine) return { tipo: 'escluso', motivo: 'Non serve: da non fatturare' };
    if (def.libero) return flusso.stato === 'aperto' ? { tipo: 'libero' } : { tipo: 'escluso', motivo: 'Non registrato' };
    if (def.passo === flusso.passo_corrente) {
        const prima = defs.find(d => d.libero && d.prima_di === def.passo && !passoFatto(flusso.id, d.passo));
        return prima ? { tipo: 'attesa', prima } : { tipo: 'corrente' };
    }
    return { tipo: 'futuro' };
}

function infoFatto(def, fatto) {
    if (def.serve_esito) return fatto.esito ? 'Sì' : 'No';
    return giornoIt(fatto.data) || fatto.numero || 'Fatto';
}

function via(fatto) {
    const da = nomeLuogo(fatto.da_luogo), a = nomeLuogo(fatto.a_luogo);
    return da || a ? `<span class="passo-via">${escapeHtml(da || '?')} → ${escapeHtml(a || '?')}</span>` : '';
}

function casella(flusso, def, n, defs, ctx) {
    const s = statoCasella(flusso, def, defs);
    const numero = def.libero ? '<span class="material-symbols-outlined">schedule</span>' : n;
    const testa = `<span class="passo-n">${numero}</span><span class="passo-nome">${escapeHtml(def.nome)}</span>`;
    const puo = ctx.puoPasso(def);

    if (s.tipo === 'fatto') {
        const chi = ctx.nomi[s.fatto.fatto_da] || '';
        const titolo = [s.fatto.numero, chi && `fatto da ${chi}`, s.fatto.corretto_il && 'corretto'].filter(Boolean).join(' · ');
        return `<button type="button" class="passo passo-fatto" data-action="passo" data-passo="${def.passo}" title="${escapeHtml(titolo)}">`
            + `${testa}<span class="passo-info"><span class="material-symbols-outlined">check</span>${escapeHtml(infoFatto(def, s.fatto))}</span>${via(s.fatto)}</button>`;
    }
    if (s.tipo === 'corrente' || s.tipo === 'libero') {
        const libero = s.tipo === 'libero';
        const titolo = puo ? (libero ? 'Si registra quando arriva: serve prima della fattura' : 'Completa questo passaggio') : `Lo completa: ${GRUPPI[def.gruppo] || def.gruppo}`;
        const testo = libero ? 'Quando arriva' : puo ? 'Da fare' : 'In attesa';
        return `<button type="button" class="passo ${libero ? 'passo-libero' : 'passo-corrente'}${puo ? '' : ' passo-altrui'}" data-action="passo" data-passo="${def.passo}" title="${escapeHtml(titolo)}">`
            + `${testa}<span class="passo-info">${testo}</span></button>`;
    }
    if (s.tipo === 'attesa') {
        return `<span class="passo passo-corrente passo-altrui" title="Prima serve «${escapeHtml(s.prima.nome)}»">${testa}<span class="passo-info">Prima: ${escapeHtml(s.prima.nome.toLowerCase())}</span></span>`;
    }
    if (s.tipo === 'escluso') {
        return `<span class="passo passo-escluso" title="${escapeHtml(s.motivo)}">${testa}<span class="passo-info">—</span></span>`;
    }
    return `<span class="passo passo-futuro">${testa}<span class="passo-info">&nbsp;</span></span>`;
}

function caselle(flusso, ctx) {
    const defs = passaggiDi(flusso.tipo);
    let n = 0;
    const html = defs.map(def => casella(flusso, def, def.libero ? 0 : ++n, defs, ctx)).join('');
    return `<div class="passi passi-${defs.length}">${html}</div>`;
}

function etichettaTipo(flusso) {
    const t = TIPI[flusso.tipo] || TIPI.riparazione;
    return `<span class="tipo-flusso tipo-${escapeHtml(flusso.tipo || 'riparazione')}"><span class="material-symbols-outlined">${t.icona}</span>${t.etichetta}</span>`;
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
        pulsanti.push('<button type="button" class="action-btn" data-action="modifica-flusso" title="Modifica il flusso: titolo, cartella, strumenti, tecnico, fuori contratto"><span class="material-symbols-outlined">edit</span></button>');
    }
    if (ctx.admin) {
        pulsanti.push('<button type="button" class="action-btn" data-action="elimina-flusso" title="Elimina il flusso e i suoi passaggi"><span class="material-symbols-outlined">delete</span></button>');
    }
    return pulsanti.length ? `<span class="flusso-azioni">${pulsanti.join('')}</span>` : '';
}

function cartella(flusso, ctx) {
    if (flusso.link_cartella) {
        return '<span class="cartella-flusso">'
            + `<a href="${escapeHtml(flusso.link_cartella)}" target="_blank" rel="noopener noreferrer" class="btn-link-pill pastiglia-cartella" title="Apri la cartella del flusso su Google Drive">`
            + '<span class="material-symbols-outlined">folder_open</span><span class="testo-pastiglia">Cartella</span></a>'
            + `<button type="button" class="action-btn copia-link" data-action="copia" data-testo="${escapeHtml(flusso.link_cartella)}" title="Copia il link"><span class="material-symbols-outlined">content_copy</span></button>`
            + '</span>';
    }
    if (flusso.stato !== 'aperto') {
        return '<span class="cartella-mancante spenta" title="Il flusso non ha il link alla sua cartella"><span class="material-symbols-outlined">folder_off</span>Senza cartella</span>';
    }
    const testo = '<span class="material-symbols-outlined">folder_off</span>Manca la cartella';
    return ctx.puoAnagrafica
        ? `<button type="button" class="cartella-mancante" data-action="modifica-flusso" title="Aggiungi il link alla cartella del flusso">${testo}</button>`
        : `<span class="cartella-mancante" title="Il flusso non ha il link alla sua cartella">${testo}</span>`;
}

function serieCliccabile(s) {
    const aperti = promemoriaAperti(s.id).length;
    const puntina = aperti ? '<span class="material-symbols-outlined puntina">push_pin</span>' : '';
    const titolo = aperti ? `${aperti === 1 ? 'Un promemoria aperto' : `${aperti} promemoria aperti`}: apri la scheda` : 'La scheda dello strumento';
    return `<button type="button" class="serie serie-cliccabile${aperti ? ' con-promemoria' : ''}" data-action="scheda-strumento" data-strumento="${escapeHtml(s.id)}" title="${escapeHtml(titolo)}">${puntina}${escapeHtml(s.numero_serie)}</button>`;
}

function bottoneNote(flusso) {
    const n = noteDelFlusso(flusso.id).length;
    return `<button type="button" class="note-flusso${n ? '' : ' vuote'}" data-action="note-flusso" title="${n ? 'Le note del flusso' : 'Aggiungi una nota al flusso'}">`
        + `<span class="material-symbols-outlined">sticky_note_2</span>${n ? `${n} ${n === 1 ? 'nota' : 'note'}` : 'Note'}</button>`;
}

function oggetti(flusso) {
    if (flusso.tipo === 'refill') {
        const c = cartucciaPerId(flusso.cartuccia_id);
        return `<span class="serie cartuccia" title="La cartuccia del refill"><span class="material-symbols-outlined">water_drop</span>${escapeHtml(c ? c.seriale : 'Cartuccia')}</span>`;
    }
    const strumenti = strumentiDelFlusso(flusso.id);
    return strumenti.length ? strumenti.map(serieCliccabile).join('') : '<span class="niente">Nessuno strumento</span>';
}

function fuoriContratto(flusso) {
    if (!flusso.fuori_contratto) return '';
    return `<span class="fuori-contratto" title="${escapeHtml(flusso.fuori_contratto_nota || '')}"><span class="material-symbols-outlined">report</span>Fuori contratto</span>`;
}

function tecnico(flusso, ctx) {
    const p = flusso.tecnico_id && ctx.persone[flusso.tecnico_id];
    return p ? `<span class="tecnico-flusso" title="Tecnico: ${escapeHtml(p.nome)}">${volto(p)}</span>` : '';
}

function bloccoFlusso(flusso, ctx) {
    return `<div class="flusso bordo-${escapeHtml(flusso.tipo || 'riparazione')}${flusso.stato === 'chiuso' ? ' flusso-chiuso' : ''}" data-flusso="${escapeHtml(flusso.id)}">`
        + '<div class="flusso-testa">'
        + etichettaTipo(flusso) + cartella(flusso, ctx)
        + `<span class="flusso-titolo" title="${escapeHtml(flusso.titolo)}">${escapeHtml(flusso.titolo)}</span>`
        + etichettaStato(flusso) + fornitore(flusso)
        + `<span class="flusso-serie">${oggetti(flusso)}</span>`
        + fuoriContratto(flusso) + tecnico(flusso, ctx)
        + `<span class="flusso-destra">${bottoneNote(flusso)}${azioniFlusso(flusso, ctx)}</span>`
        + '</div>'
        + caselle(flusso, ctx)
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
