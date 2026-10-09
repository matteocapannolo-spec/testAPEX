
import { escapeHtml, toast, confirmDialog } from '../core/ui.js';
import * as api from './api.js';
import {
    stato, contesto, contrattoPerId, strumentoPerId, modelloPerId, passaggio,
    strumentiDelContratto, ricaricaDopoScrittura
} from './stato.js';
import { nomeModello, giornoIt, oggiIso } from './config.js';

const el = id => document.getElementById(id);

let contrattoAperto = null;

function errore(testo) {
    el('strumentiErrore').textContent = testo || '';
    el('strumentiErrore').hidden = !testo;
}

function foto(modello) {
    return modello && modello.foto
        ? `<img class="foto-modello" src="${escapeHtml(modello.foto)}" alt="" loading="lazy">`
        : '<span class="foto-modello vuota material-symbols-outlined">precision_manufacturing</span>';
}

function rigaStrumento(s, ctx) {
    const modello = modelloPerId(s.modello_id);
    const togli = ctx.puoAnagrafica
        ? `<button type="button" class="action-btn" data-action="togli-strumento" data-strumento="${escapeHtml(s.id)}" title="Togli dal contratto"><span class="material-symbols-outlined">remove_circle</span></button>`
        : '';
    return '<div class="riga-strumento">'
        + foto(modello)
        + `<div class="strumento-testo"><strong>${escapeHtml(nomeModello(modello))}</strong>`
        + `<span class="strumento-brand">${escapeHtml(modello && modello.brand ? modello.brand : 'Senza brand')}</span></div>`
        + `<button type="button" class="serie serie-cliccabile" data-action="storia-strumento" data-strumento="${escapeHtml(s.id)}" title="La storia di questo strumento">${escapeHtml(s.numero_serie)}</button>`
        + togli + '</div>';
}

function disegnaElenco() {
    const ctx = contesto();
    const strumenti = strumentiDelContratto(contrattoAperto);
    el('elencoStrumenti').innerHTML = strumenti.length
        ? strumenti.map(s => rigaStrumento(s, ctx)).join('')
        : '<p class="elenco-vuoto">Nessuno strumento in questo contratto.</p>';
}

function riempiModelli() {
    const perBrand = new Map();
    for (const m of stato.modelli) {
        const brand = m.brand || 'Senza brand';
        if (!perBrand.has(brand)) perBrand.set(brand, []);
        perBrand.get(brand).push(m);
    }
    el('strumentoModello').innerHTML = '<option value="">Scegli il modello…</option>'
        + [...perBrand].map(([brand, modelli]) => `<optgroup label="${escapeHtml(brand)}">`
            + modelli.map(m => `<option value="${escapeHtml(m.id)}">${escapeHtml(nomeModello(m))}${m.in_catalogo ? '' : ' (fuori catalogo)'}</option>`).join('')
            + '</optgroup>').join('');
}

export function apriStrumenti(elemento) {
    const c = contrattoPerId(elemento.closest('tr').dataset.index);
    if (!c) return;
    contrattoAperto = c.id;
    errore('');
    el('strumentiSottotitolo').textContent = `${c.cliente_nome} · ${c.nome}`;
    el('aggiungiStrumento').hidden = !contesto().puoAnagrafica;
    el('strumentoSerie').value = '';
    riempiModelli();
    el('modelliVuoti').hidden = stato.modelli.length > 0;
    disegnaElenco();
    el('dialogoStrumenti').showModal();
}

export function chiudiStrumenti() {
    el('dialogoStrumenti').close();
}

const stessaSerie = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();

export async function aggiungiStrumento() {
    const modelloId = Number(el('strumentoModello').value);
    const serie = el('strumentoSerie').value.trim();
    if (!modelloId) return errore('Scegli il modello. Se non c\'è, va aggiunto prima in Asset, dashboard Industrial.');
    if (!serie) return errore('Scrivi il numero di serie.');

    try {
        errore('');
        let strumento = stato.strumenti.find(s => s.modello_id === modelloId && stessaSerie(s.numero_serie, serie));
        if (!strumento) {
            const id = await api.creaStrumento({ modello_id: modelloId, numero_serie: serie });
            strumento = { id, modello_id: modelloId, numero_serie: serie };
            stato.strumenti.push(strumento);
        }
        await api.collegaStrumento(contrattoAperto, strumento.id);
    } catch (e) {
        return errore(e.message);
    }

    el('strumentoSerie').value = '';
    toast('Strumento aggiunto al contratto');
    await ricaricaDopoScrittura();
    disegnaElenco();
}

export async function togliStrumento(elemento) {
    const s = strumentoPerId(elemento.dataset.strumento);
    if (!s) return;
    const ok = await confirmDialog({
        title: 'Togliere lo strumento dal contratto?',
        text: `${s.numero_serie} non sarà più coperto da questo contratto. La sua storia resta.`,
        confirmLabel: 'Togli'
    });
    if (!ok) return;
    try {
        errore('');
        await api.scollegaStrumento(contrattoAperto, s.id);
    } catch (e) {
        return errore(e.message);
    }
    toast('Strumento tolto dal contratto');
    await ricaricaDopoScrittura();
    disegnaElenco();
}

function voceContratto(c) {
    const attivo = c.data_conclusione >= oggiIso();
    return `<li><strong>${escapeHtml(c.cliente_nome)}</strong> · ${escapeHtml(c.nome)}`
        + ` <span class="storia-date">${escapeHtml(giornoIt(c.data_sottoscrizione))} – ${escapeHtml(giornoIt(c.data_conclusione))}</span>`
        + (attivo ? ' <span class="flusso-stato aperto">In corso</span>' : '') + '</li>';
}

function voceFlusso(f) {
    const c = contrattoPerId(f.contratto_id);
    const dove = f.stato === 'chiuso'
        ? '<span class="flusso-stato chiuso">Chiuso</span>'
        : `<span class="flusso-stato aperto">${escapeHtml((passaggio(f.passo_corrente) || {}).nome || 'Aperto')}</span>`;
    return `<li><strong>${escapeHtml(f.titolo)}</strong> <span class="storia-date">${escapeHtml(c ? c.nome : '')}</span> ${dove}</li>`;
}

export function apriStoria(elemento) {
    const s = strumentoPerId(elemento.dataset.strumento);
    if (!s) return;
    const modello = modelloPerId(s.modello_id);
    const contratti = stato.contrattiStrumenti.filter(l => l.strumento_id === s.id).map(l => contrattoPerId(l.contratto_id)).filter(Boolean);
    const flussi = stato.flussiStrumenti.filter(l => l.strumento_id === s.id)
        .map(l => stato.flussi.find(f => f.id === l.flusso_id)).filter(Boolean);

    el('storiaTitolo').textContent = s.numero_serie;
    el('storiaSottotitolo').textContent = `${nomeModello(modello)} · ${modello && modello.brand ? modello.brand : 'Senza brand'}`;
    el('storiaContratti').innerHTML = contratti.length ? contratti.map(voceContratto).join('') : '<li class="niente">Nessun contratto</li>';
    el('storiaFlussi').innerHTML = flussi.length ? flussi.map(voceFlusso).join('') : '<li class="niente">Nessun flusso</li>';
    el('dialogoStoria').showModal();
}

export function chiudiStoria() {
    el('dialogoStoria').close();
}
