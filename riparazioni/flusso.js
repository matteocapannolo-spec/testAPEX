
import { escapeHtml, toast, confirmDialog } from '../core/ui.js';
import * as api from './api.js';
import {
    contesto, contrattoPerId, flussoPerId, modelloPerId, brandDi, strumentiBloccati,
    strumentiDelContratto, strumentiDelFlusso, ricaricaDopoScrittura, mostraAvviso
} from './stato.js';
import { nomeModello } from './config.js';

const el = id => document.getElementById(id);

let aperto = null;

function errore(testo) {
    el('flussoErrore').textContent = testo || '';
    el('flussoErrore').hidden = !testo;
}

function disegnaScelte(scelti, bloccati) {
    const strumenti = strumentiDelContratto(aperto.contratto.id);
    el('flussoStrumenti').innerHTML = strumenti.length
        ? strumenti.map(s => {
            const modello = modelloPerId(s.modello_id);
            return '<label class="scelta-strumento">'
                + `<input type="checkbox" name="strumento" value="${escapeHtml(s.id)}"${scelti.includes(s.id) ? ' checked' : ''}${bloccati ? ' disabled' : ''}>`
                + `<span class="serie">${escapeHtml(s.numero_serie)}</span>`
                + `<span>${escapeHtml(nomeModello(modello))}</span>`
                + `<span class="strumento-brand">${escapeHtml((modello && modello.brand) || 'Senza brand')}</span></label>`;
        }).join('')
        : '<p class="elenco-vuoto">Il contratto non ha strumenti: si aggiungono dalla colonna «Strumenti».</p>';
    el('flussoBloccati').hidden = !bloccati;
}

function apri(contratto, flusso) {
    aperto = { contratto, flusso };
    errore('');
    el('flussoTitoloPannello').textContent = flusso ? 'Modifica flusso' : 'Nuovo flusso';
    el('flussoSottotitolo').textContent = `${contratto.cliente_nome} · ${contratto.nome}`;
    el('flussoTitolo').value = flusso ? flusso.titolo : '';
    const scelti = flusso ? strumentiDelFlusso(flusso.id).map(s => s.id) : [];
    disegnaScelte(scelti, !!flusso && strumentiBloccati(flusso));
    el('dialogoFlusso').showModal();
    el('flussoTitolo').focus();
}

export function apriNuovoFlusso(elemento) {
    const contratto = contrattoPerId(elemento.closest('.riga-flussi').dataset.contratto);
    if (contratto && contesto().puoAnagrafica) apri(contratto, null);
}

export function apriModificaFlusso(elemento) {
    const flusso = flussoPerId(elemento.closest('[data-flusso]').dataset.flusso);
    const contratto = flusso && contrattoPerId(flusso.contratto_id);
    if (contratto && contesto().puoAnagrafica) apri(contratto, flusso);
}

export function chiudiFlusso() {
    el('dialogoFlusso').close();
}

function leggi() {
    const titolo = el('flussoTitolo').value.trim();
    const scelti = [...el('flussoStrumenti').querySelectorAll('input[name="strumento"]:checked')].map(i => i.value);
    if (!titolo) return { problema: 'Scrivi un titolo per il flusso, per esempio il guasto.' };
    if (!scelti.length) return { problema: 'Scegli almeno uno strumento.' };
    const strumenti = strumentiDelContratto(aperto.contratto.id);
    const brand = new Set(scelti.map(id => String(brandDi(strumenti.find(s => s.id === id)) || '').toLowerCase()));
    if (brand.size > 1) return { problema: 'Un flusso contiene strumenti di un solo brand: per un brand diverso si apre un altro flusso.' };
    return { titolo, scelti };
}

export async function salvaFlusso() {
    const { titolo, scelti, problema } = leggi();
    if (problema) return errore(problema);

    const { flusso } = aperto;
    const bloccati = !!flusso && strumentiBloccati(flusso);
    const prima = flusso ? strumentiDelFlusso(flusso.id).map(s => s.id) : [];

    try {
        errore('');
        let id = flusso && flusso.id;
        if (!id) {
            id = await api.creaFlusso(aperto.contratto.id, titolo);
            aperto.flusso = { id, titolo, contratto_id: aperto.contratto.id, stato: 'aperto' };
        } else if (titolo !== flusso.titolo) {
            await api.rinominaFlusso(id, titolo);
        }
        if (!bloccati) {
            for (const s of prima.filter(s => !scelti.includes(s))) await api.togliDalFlusso(id, s);
            for (const s of scelti.filter(s => !prima.includes(s))) {
                await api.aggiungiAlFlusso(id, s);
                prima.push(s);
            }
        }
    } catch (e) {
        errore(e.message);
        await ricaricaDopoScrittura();
        return;
    }

    el('dialogoFlusso').close();
    toast(flusso ? 'Flusso aggiornato' : 'Flusso creato');
    await ricaricaDopoScrittura();
}

export async function eliminaFlusso(elemento) {
    const flusso = flussoPerId(elemento.closest('[data-flusso]').dataset.flusso);
    if (!flusso || !contesto().admin) return;
    const ok = await confirmDialog({
        title: 'Eliminare questo flusso?',
        text: `«${flusso.titolo}» sparisce per tutti, con tutti i suoi passaggi e i loro documenti collegati. Non si recupera.`,
        confirmLabel: 'Elimina',
        danger: true
    });
    if (!ok) return;
    try {
        await api.eliminaFlusso(flusso.id);
    } catch (e) {
        mostraAvviso(e.message);
        return;
    }
    toast('Flusso eliminato');
    await ricaricaDopoScrittura();
}
