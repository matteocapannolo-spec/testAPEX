
import { escapeHtml, toast, confirmDialog } from '../core/ui.js';
import * as api from './api.js';
import { contesto, noteDelFlusso, noteDelloStrumento, ricaricaDopoScrittura } from './stato.js';
import { dataOraIt } from './config.js';
import { volto } from './persone.js';

let aperto = null;

function conLink(testo) {
    return escapeHtml(testo).replace(/https:\/\/[^\s<]+/g,
        u => `<a href="${u}" target="_blank" rel="noopener noreferrer">${u}</a>`);
}

function voce(n, ctx) {
    const chi = ctx.persone[n.autore] || { nome: ctx.nomi[n.autore] || 'Persona non più presente' };
    const aperta = n.promemoria && !n.chiuso_il;
    const classi = ['nota-voce', n.promemoria ? 'promemoria' : '', aperta ? 'aperto' : '', n.promemoria && !aperta ? 'chiuso' : ''].filter(Boolean).join(' ');

    const pulsanti = [];
    if (n.promemoria) {
        pulsanti.push(aperta
            ? `<button type="button" class="btn btn-theme btn-piccolo" data-action="chiudi-promemoria" data-nota="${escapeHtml(n.id)}"><span class="material-symbols-outlined">check</span> Fatto</button>`
            : `<button type="button" class="link-azione" data-action="riapri-promemoria" data-nota="${escapeHtml(n.id)}">Riapri</button>`);
    }
    if (ctx.admin || n.autore === ctx.io) {
        pulsanti.push(`<button type="button" class="action-btn" data-action="elimina-nota" data-nota="${escapeHtml(n.id)}" title="Elimina la nota"><span class="material-symbols-outlined">delete</span></button>`);
    }

    const segno = n.promemoria ? `<span class="nota-segno">${aperta ? 'Promemoria' : 'Promemoria chiuso'}</span>` : '';
    const chiusura = n.promemoria && n.chiuso_il
        ? `<div class="nota-chiusura">Chiuso da ${escapeHtml(ctx.nomi[n.chiuso_da] || 'una persona non più presente')} il ${escapeHtml(dataOraIt(n.chiuso_il))}</div>`
        : '';

    return `<div class="${classi}">`
        + `<div class="nota-testa">${volto(chi)}<strong>${escapeHtml(chi.nome)}</strong>`
        + `<span class="nota-quando">${escapeHtml(dataOraIt(n.creato_il))}</span>${segno}`
        + `<span class="nota-pulsanti">${pulsanti.join('')}</span></div>`
        + `<div class="nota-testo">${conLink(n.testo)}</div>${chiusura}</div>`;
}

function inOrdine(note) {
    const aperti = note.filter(n => n.promemoria && !n.chiuso_il);
    return [...aperti, ...note.filter(n => !aperti.includes(n))];
}

function disegna() {
    if (!aperto) return;
    const ctx = contesto();
    const note = aperto.flusso ? noteDelFlusso(aperto.flusso) : noteDelloStrumento(aperto.strumento);
    const elenco = note.length
        ? inOrdine(note).map(n => voce(n, ctx)).join('')
        : `<p class="elenco-vuoto">${aperto.flusso ? 'Nessuna nota su questo flusso.' : 'Nessuna nota su questo strumento.'}</p>`;
    const promemoria = aperto.strumento
        ? '<label class="spunta-nota"><input type="checkbox" class="nota-promemoria"> È un promemoria per il prossimo intervento</label>'
        : '';

    aperto.contenitore.innerHTML = `<div class="note-elenco">${elenco}</div>`
        + '<div class="nota-nuova">'
        + '<textarea class="form-textarea nota-campo" rows="2" maxlength="4000" placeholder="Scrivi una nota…"></textarea>'
        + `<div class="nota-nuova-piede">${promemoria}`
        + '<button type="button" class="btn btn-export btn-piccolo" data-action="aggiungi-nota"><span class="material-symbols-outlined">add</span> Aggiungi nota</button></div>'
        + '<div class="dlg-errore nota-errore" hidden></div></div>';
    if (aperto.dopo) aperto.dopo();
}

function errore(testo) {
    const box = aperto && aperto.contenitore.querySelector('.nota-errore');
    if (!box) return;
    box.textContent = testo || '';
    box.hidden = !testo;
}

export function mostraNote({ contenitore, flusso = null, strumento = null, dopo = null }) {
    aperto = { contenitore, flusso, strumento, dopo };
    disegna();
}

async function dopo(scrittura, messaggio) {
    try {
        errore('');
        await scrittura();
    } catch (e) {
        errore(e.message);
        return;
    }
    if (messaggio) toast(messaggio);
    await ricaricaDopoScrittura();
    disegna();
}

export function aggiungiNota() {
    if (!aperto) return;
    const testo = aperto.contenitore.querySelector('.nota-campo').value.trim();
    if (!testo) return errore('Scrivi qualcosa prima di aggiungere la nota.');
    const spunta = aperto.contenitore.querySelector('.nota-promemoria');
    const campi = aperto.flusso
        ? { flusso_id: aperto.flusso, testo }
        : { strumento_id: aperto.strumento, testo, promemoria: !!(spunta && spunta.checked) };
    return dopo(() => api.aggiungiNota(campi), campi.promemoria ? 'Promemoria aggiunto' : 'Nota aggiunta');
}

export const chiudiPromemoria = elemento => dopo(() => api.chiudiPromemoria(elemento.dataset.nota, true), 'Promemoria chiuso');
export const riapriPromemoria = elemento => dopo(() => api.chiudiPromemoria(elemento.dataset.nota, false), 'Promemoria riaperto');

export async function eliminaNota(elemento) {
    const ok = await confirmDialog({ title: 'Eliminare la nota?', text: 'Sparisce per tutti.', confirmLabel: 'Elimina', danger: true });
    if (ok) await dopo(() => api.eliminaNota(elemento.dataset.nota), 'Nota eliminata');
}
