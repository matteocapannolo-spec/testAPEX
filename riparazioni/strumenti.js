
import { escapeHtml, toast, confirmDialog } from '../core/ui.js';
import * as api from './api.js';
import {
    stato, contesto, contrattoPerId, strumentoPerId, modelloPerId,
    strumentiDelContratto, promemoriaAperti, prossimoIntervento, ricaricaDopoScrittura
} from './stato.js';
import { nomeModello, giornoIt, tonoScadenza, PREAVVISO_MANUTENZIONE } from './config.js';

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

function dettagli(s) {
    const pezzi = [];
    if (s.sito) pezzi.push(`<span title="Sito di installazione"><span class="material-symbols-outlined">location_on</span>${escapeHtml(s.sito)}</span>`);
    if (s.ultimo_intervento) {
        const data = escapeHtml(giornoIt(s.ultimo_intervento));
        pezzi.push(s.ultimo_intervento_link
            ? `<a href="${escapeHtml(s.ultimo_intervento_link)}" target="_blank" rel="noopener noreferrer" title="Apri il RAT dell'ultimo intervento">Ultimo intervento ${data}</a>`
            : `<span>Ultimo intervento ${data}</span>`);
    }
    const prossimo = prossimoIntervento(s);
    if (prossimo) {
        const tono = tonoScadenza(prossimo, PREAVVISO_MANUTENZIONE);
        pezzi.push(`<span class="prossimo ${tono}" title="Ultimo intervento più ${escapeHtml(s.intervallo_mesi)} mesi">Prossimo ${escapeHtml(giornoIt(prossimo))}</span>`);
    }
    return pezzi.length ? `<span class="strumento-dettagli">${pezzi.join('<span class="sep">·</span>')}</span>` : '';
}

function rigaStrumento(s, ctx) {
    const modello = modelloPerId(s.modello_id);
    const togli = ctx.puoAnagrafica
        ? `<button type="button" class="action-btn" data-action="togli-strumento" data-strumento="${escapeHtml(s.id)}" title="Togli dal contratto"><span class="material-symbols-outlined">remove_circle</span></button>`
        : '';
    const aperti = promemoriaAperti(s.id).length;
    const puntina = aperti ? '<span class="material-symbols-outlined puntina">push_pin</span>' : '';
    return '<div class="riga-strumento">'
        + foto(modello)
        + `<div class="strumento-testo"><strong>${escapeHtml(nomeModello(modello))}</strong>`
        + `<span class="strumento-brand">${escapeHtml(modello && modello.brand ? modello.brand : 'Senza brand')}</span>${dettagli(s)}</div>`
        + `<button type="button" class="serie serie-cliccabile${aperti ? ' con-promemoria' : ''}" data-action="scheda-strumento" data-strumento="${escapeHtml(s.id)}" title="${aperti ? 'Promemoria aperti: apri la scheda' : 'La scheda dello strumento'}">${puntina}${escapeHtml(s.numero_serie)}</button>`
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


export function ridisegnaSeAperto() {
    if (el('dialogoStrumenti').open && contrattoAperto) disegnaElenco();
}
