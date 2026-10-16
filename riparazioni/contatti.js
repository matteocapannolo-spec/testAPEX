
import { escapeHtml, toast, confirmDialog } from '../core/ui.js';
import * as api from './api.js';
import { contesto, contrattoPerId, contattiDi, ricaricaDopoScrittura } from './stato.js';
import { scriviGmail } from './config.js';

const el = id => document.getElementById(id);
const MASSIMO = 3;

let contratto = null;
let inModifica;

const CAMPI = ['contattoNome', 'contattoCognome', 'contattoSocieta', 'contattoRuolo', 'contattoEmail', 'contattoCellulare'];
const COLONNE = ['nome', 'cognome', 'societa', 'ruolo', 'email', 'cellulare'];

function errore(testo) {
    el('contattiErrore').textContent = testo || '';
    el('contattiErrore').hidden = !testo;
}

export function nomeContatto(c) {
    return [c.nome, c.cognome].filter(Boolean).join(' ') || c.email || 'Contatto senza nome';
}

function recapito(icona, valore, extra) {
    return `<div class="contatto-recapito"><span class="material-symbols-outlined">${icona}</span>`
        + `<span class="contatto-valore">${escapeHtml(valore)}</span>${extra}</div>`;
}

function scheda(c, ctx) {
    const copia = valore => `<button type="button" class="action-btn" data-action="copia" data-testo="${escapeHtml(valore)}" title="Copia"><span class="material-symbols-outlined">content_copy</span></button>`;
    const chi = [c.ruolo, c.societa].filter(Boolean).join(' · ');
    const righe = [];
    if (c.email) {
        righe.push(recapito('mail', c.email,
            `<button type="button" class="btn btn-theme btn-piccolo" data-action="scrivi" data-email="${escapeHtml(c.email)}" title="Apre Gmail con l'indirizzo già messo"><span class="material-symbols-outlined">send</span> Scrivi</button>${copia(c.email)}`));
    }
    if (c.cellulare) righe.push(recapito('call', c.cellulare, copia(c.cellulare)));
    const gestione = ctx.puoAnagrafica
        ? `<span class="contatto-gestione"><button type="button" class="action-btn" data-action="modifica-contatto" data-contatto="${escapeHtml(c.id)}" title="Modifica"><span class="material-symbols-outlined">edit</span></button>`
          + `<button type="button" class="action-btn" data-action="elimina-contatto" data-contatto="${escapeHtml(c.id)}" title="Togli il contatto"><span class="material-symbols-outlined">delete</span></button></span>`
        : '';
    return '<div class="contatto">'
        + `<div class="contatto-testa"><div><strong>${escapeHtml(nomeContatto(c))}</strong>`
        + (chi ? `<div class="contatto-chi">${escapeHtml(chi)}</div>` : '') + `</div>${gestione}</div>`
        + (righe.length ? righe.join('') : '<div class="elenco-vuoto">Nessun recapito.</div>')
        + '</div>';
}

function disegna() {
    const ctx = contesto();
    const contatti = contattiDi(contratto.id);
    el('elencoContatti').innerHTML = contatti.length
        ? contatti.map(c => scheda(c, ctx)).join('')
        : '<p class="elenco-vuoto">Nessun contatto per questo contratto.</p>';
    const modulo = inModifica !== undefined;
    el('formContatto').hidden = !modulo;
    el('btnNuovoContatto').hidden = modulo || !ctx.puoAnagrafica || contatti.length >= MASSIMO;
    el('contattiPieno').hidden = modulo || !ctx.puoAnagrafica || contatti.length < MASSIMO;
}

export function apriContatti(elemento) {
    contratto = contrattoPerId(elemento.closest('tr').dataset.index);
    if (!contratto) return;
    inModifica = undefined;
    errore('');
    el('contattiSottotitolo').textContent = `${contratto.cliente_nome} · ${contratto.nome}`;
    disegna();
    el('dialogoContatti').showModal();
}

export const chiudiContatti = () => el('dialogoContatti').close();

function apriModulo(c) {
    inModifica = c ? c.id : null;
    errore('');
    CAMPI.forEach((id, i) => { el(id).value = c ? (c[COLONNE[i]] || '') : ''; });
    el('formContattoTitolo').textContent = c ? 'Modifica contatto' : 'Nuovo contatto';
    disegna();
    el('contattoNome').focus();
}

export const nuovoContatto = () => apriModulo(null);
export const modificaContatto = elemento => apriModulo(contattiDi(contratto.id).find(c => c.id === elemento.dataset.contatto));
export function annullaContatto() {
    inModifica = undefined;
    errore('');
    disegna();
}

function postoLibero() {
    const presi = new Set(contattiDi(contratto.id).map(c => c.posizione));
    return [1, 2, 3].find(n => !presi.has(n));
}

export async function salvaContatto() {
    const campi = {};
    CAMPI.forEach((id, i) => { campi[COLONNE[i]] = el(id).value.trim() || null; });
    if (!campi.nome && !campi.cognome && !campi.email) return errore('Scrivi almeno il nome, il cognome o l\'email.');
    if (campi.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(campi.email)) return errore('L\'indirizzo email non sembra valido.');
    try {
        errore('');
        if (inModifica) await api.salvaContatto({ id: inModifica, ...campi });
        else await api.salvaContatto({ contratto_id: contratto.id, posizione: postoLibero(), ...campi });
    } catch (e) {
        return errore(e.message);
    }
    toast(inModifica ? 'Contatto aggiornato' : 'Contatto aggiunto');
    inModifica = undefined;
    await ricaricaDopoScrittura();
    disegna();
}

export async function eliminaContatto(elemento) {
    const c = contattiDi(contratto.id).find(x => x.id === elemento.dataset.contatto);
    if (!c) return;
    const ok = await confirmDialog({ title: 'Togliere il contatto?', text: `${nomeContatto(c)} non sarà più fra i contatti del contratto.`, confirmLabel: 'Togli', danger: true });
    if (!ok) return;
    try {
        await api.eliminaContatto(c.id);
    } catch (e) {
        return errore(e.message);
    }
    toast('Contatto tolto');
    await ricaricaDopoScrittura();
    disegna();
}

export const scrivi = elemento => apriGmail(scriviGmail(elemento.dataset.email));

export function apriGmail(url) {
    const finestra = window.open(url, 'gmail-scrivi', 'width=720,height=680');
    if (finestra) finestra.opener = null;
    else window.open(url, '_blank', 'noopener');
}

export async function copia(elemento) {
    try {
        await navigator.clipboard.writeText(elemento.dataset.testo || '');
        toast('Copiato');
    } catch {
        toast('Il browser non ha permesso di copiare');
    }
}
