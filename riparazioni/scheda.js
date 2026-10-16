
import { escapeHtml, toast } from '../core/ui.js';
import * as api from './api.js';
import {
    stato, contesto, contrattoPerId, strumentoPerId, modelloPerId, passaggio,
    promemoriaAperti, ricaricaDopoScrittura
} from './stato.js';
import {
    nomeModello, giornoIt, oggiIso, aggiungiMesi, tonoScadenza, eBactoSense,
    LINK_VALIDO, PREAVVISO_MANUTENZIONE
} from './config.js';
import { mostraNote } from './note.js';

const el = id => document.getElementById(id);

const CAMPI = {
    schedaSito: 'sito', schedaPunto: 'punto_installazione',
    schedaProduzione: 'data_produzione', schedaAcquisto: 'data_acquisto',
    schedaInstallazione: 'data_installazione', schedaGaranzia: 'garanzia_fino_al',
    schedaIntervallo: 'intervallo_mesi', schedaUltimo: 'ultimo_intervento', schedaRat: 'ultimo_intervento_link',
    schedaBcTipo: 'bactocare_tipo', schedaBcComprese: 'bactocare_comprese',
    schedaBcFatte: 'bactocare_fatte', schedaBcScadenza: 'bactocare_scadenza'
};
const NUMERI = new Set(['intervallo_mesi', 'bactocare_comprese', 'bactocare_fatte']);

let aperto = null;

function errore(testo) {
    el('schedaErrore').textContent = testo || '';
    el('schedaErrore').hidden = !testo;
}

function foto(modello) {
    return modello && modello.foto
        ? `<img class="foto-modello grande" src="${escapeHtml(modello.foto)}" alt="" loading="lazy">`
        : '<span class="foto-modello grande vuota material-symbols-outlined">precision_manufacturing</span>';
}

function disegnaProssimo() {
    const ultimo = el('schedaUltimo').value;
    const mesi = Number(el('schedaIntervallo').value);
    const prossimo = ultimo && mesi ? aggiungiMesi(ultimo, mesi) : '';
    const box = el('schedaProssimo');
    box.className = 'scheda-prossimo';
    if (!prossimo) {
        box.textContent = 'Con la data dell\'ultimo intervento e l\'intervallo, qui compare il prossimo.';
        return;
    }
    const tono = tonoScadenza(prossimo, PREAVVISO_MANUTENZIONE);
    box.classList.add(tono);
    const frase = tono === 'passata' ? 'era previsto il' : 'previsto il';
    box.innerHTML = `<span class="material-symbols-outlined">event</span> Prossimo intervento: ${frase} <strong>${escapeHtml(giornoIt(prossimo))}</strong>`;
}

function disegnaPromemoria(s) {
    const aperti = promemoriaAperti(s.id);
    el('schedaAvviso').hidden = !aperti.length;
    el('schedaAvviso').innerHTML = aperti.length
        ? `<span class="material-symbols-outlined">push_pin</span><span>${aperti.length === 1 ? 'Un promemoria aperto: lo trovi' : `${aperti.length} promemoria aperti: li trovi`} qui sotto, in «Note e promemoria».</span>`
        : '';
}

function voceContratto(c) {
    const attivo = c.stato === 'attivo' && (!c.data_conclusione || c.data_conclusione >= oggiIso());
    const date = [c.data_sottoscrizione, c.data_conclusione].map(d => giornoIt(d) || '?').join(' – ');
    return `<li><strong>${escapeHtml(c.cliente_nome)}</strong> · ${escapeHtml(c.nome)}`
        + ` <span class="storia-date">${escapeHtml(date)}</span>`
        + (attivo ? ' <span class="flusso-stato aperto">In corso</span>' : '') + '</li>';
}

function voceFlusso(f) {
    const c = contrattoPerId(f.contratto_id);
    const dove = f.stato === 'chiuso'
        ? '<span class="flusso-stato chiuso">Chiuso</span>'
        : `<span class="flusso-stato aperto">${escapeHtml((passaggio(f.tipo, f.passo_corrente) || {}).nome || 'Aperto')}</span>`;
    return `<li><strong>${escapeHtml(f.titolo)}</strong> <span class="storia-date">${escapeHtml(c ? c.nome : '')}</span> ${dove}</li>`;
}

function disegnaStoria(s) {
    const contratti = stato.contrattiStrumenti.filter(l => l.strumento_id === s.id).map(l => contrattoPerId(l.contratto_id)).filter(Boolean);
    const flussi = stato.flussiStrumenti.filter(l => l.strumento_id === s.id)
        .map(l => stato.flussi.find(f => f.id === l.flusso_id)).filter(Boolean);
    el('storiaContratti').innerHTML = contratti.length ? contratti.map(voceContratto).join('') : '<li class="niente">Nessun contratto</li>';
    el('storiaFlussi').innerHTML = flussi.length ? flussi.map(voceFlusso).join('') : '<li class="niente">Nessun flusso</li>';
}

function riempi(s) {
    const modello = modelloPerId(s.modello_id);
    const puo = contesto().puoAnagrafica;
    el('schedaFoto').innerHTML = foto(modello);
    el('schedaSerie').textContent = s.numero_serie;
    el('schedaModello').textContent = `${nomeModello(modello)} · ${modello && modello.brand ? modello.brand : 'Senza brand'}`;

    for (const [id, colonna] of Object.entries(CAMPI)) {
        el(id).value = s[colonna] ?? '';
        el(id).disabled = !puo;
        el(id).classList.toggle('vuoto', !puo && !el(id).value);
    }
    const conBactoCare = eBactoSense(modello) || !!(s.bactocare_tipo || s.bactocare_comprese || s.bactocare_scadenza);
    el('sezioneBactoCare').hidden = !conBactoCare;
    el('sezioneManutenzione').classList.toggle('larga', !conBactoCare);
    el('schedaApriRat').hidden = !s.ultimo_intervento_link;
    el('schedaApriRat').href = s.ultimo_intervento_link || '#';
    el('schedaSalva').hidden = !puo;

    disegnaProssimo();
    disegnaPromemoria(s);
    disegnaStoria(s);
    mostraNote({ contenitore: el('schedaNote'), strumento: s.id, dopo: () => disegnaPromemoria(strumentoPerId(s.id) || s) });
}

export function apriScheda(elemento) {
    const s = strumentoPerId(elemento.dataset.strumento);
    if (!s) return;
    aperto = s.id;
    errore('');
    riempi(s);
    el('dialogoScheda').showModal();
    el('dialogoScheda').scrollTop = 0;
}

export function chiudiScheda() {
    el('dialogoScheda').close();
    aperto = null;
}

function leggi() {
    const campi = {};
    for (const [id, colonna] of Object.entries(CAMPI)) {
        const v = el(id).value.trim();
        campi[colonna] = v === '' ? null : (NUMERI.has(colonna) ? Number(v) : v);
    }
    if (campi.ultimo_intervento_link && !LINK_VALIDO.test(campi.ultimo_intervento_link)) {
        return { problema: 'Il link al RAT deve cominciare per https://: conviene copiarlo dalla barra del browser.' };
    }
    if (campi.intervallo_mesi !== null && !(campi.intervallo_mesi >= 1 && campi.intervallo_mesi <= 120)) {
        return { problema: 'L\'intervallo di manutenzione va da 1 a 120 mesi.' };
    }
    return { campi };
}

export async function salvaScheda() {
    const { campi, problema } = leggi();
    if (problema) return errore(problema);
    try {
        errore('');
        await api.salvaStrumento(aperto, campi);
    } catch (e) {
        return errore(e.message);
    }
    toast('Scheda dello strumento salvata');
    await ricaricaDopoScrittura();
    const s = strumentoPerId(aperto);
    if (s) riempi(s);
}

export function collegaCampiScheda() {
    el('schedaUltimo').addEventListener('input', disegnaProssimo);
    el('schedaIntervallo').addEventListener('input', disegnaProssimo);
}
