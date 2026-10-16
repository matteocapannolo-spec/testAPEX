
import { escapeHtml, toast } from '../core/ui.js';
import { currentUser } from '../core/auth.js';
import * as api from './api.js';
import {
    stato, contesto, contrattoPerId, strumentoPerId, modelloPerId, contattiDi, cartucciaPerId,
    avvisiDaContattare, ricaricaDopoScrittura
} from './stato.js';
import { giornoIt, nomeModello, scriviGmail, LIVELLO_AVVISO } from './config.js';
import { cellaPersona } from './persone.js';
import { apriGmail, nomeContatto } from './contatti.js';

const el = id => document.getElementById(id);
const TONO = { sei_mesi: 'giallo', tre_mesi: 'arancione', scaduto: 'rosso', manutenzione: 'arancione', refill: 'arancione' };

function errore(testo) {
    el('avvisiErrore').textContent = testo || '';
    el('avvisiErrore').hidden = !testo;
}

function contrattoDi(a) {
    if (a.contratto_id) return contrattoPerId(a.contratto_id);
    if (a.cartuccia_id) return contrattoPerId((cartucciaPerId(a.cartuccia_id) || {}).contratto_id);
    const ids = stato.contrattiStrumenti.filter(l => l.strumento_id === a.strumento_id).map(l => l.contratto_id);
    return ids.map(contrattoPerId).find(c => c && c.stato === 'attivo') || null;
}

function email(a, contatto) {
    const c = contrattoDi(a);
    const saluto = contatto && contatto.nome ? `Buongiorno ${contatto.nome},` : 'Buongiorno,';
    const firma = `Cordiali saluti,\n${(currentUser() || {}).nome || ''}\ntt group`;
    const data = giornoIt(a.scadenza);
    if (a.cartuccia_id) {
        const ca = cartucciaPerId(a.cartuccia_id);
        return {
            oggetto: `Refill della cartuccia ${ca.seriale}`,
            testo: `${saluto}\n\nil refill della cartuccia ${ca.seriale} del vostro BactoSense scade il ${data}.\nLe proponiamo di rimandarcela per il refill: ci faccia sapere quando possiamo organizzare il ritiro.\n\nRestiamo a disposizione per qualsiasi chiarimento.\n\n${firma}`
        };
    }
    if (a.strumento_id) {
        const s = strumentoPerId(a.strumento_id);
        const modello = nomeModello(modelloPerId(s.modello_id));
        const dove = s.sito ? `, installato presso ${s.sito}` : '';
        return {
            oggetto: `Manutenzione ${modello} ${s.numero_serie}`,
            testo: `${saluto}\n\nla manutenzione periodica dello strumento ${modello}, numero di serie ${s.numero_serie}${dove}, è prevista per il ${data}.\nLe proponiamo di fissare insieme la data dell'intervento.\n\nRestiamo a disposizione per qualsiasi chiarimento.\n\n${firma}`
        };
    }
    const codici = c.codici ? ` (${c.codici})` : '';
    const corpo = a.livello === 'scaduto'
        ? `le segnaliamo che il contratto «${c.nome}»${codici} è scaduto il ${data}.\nFinché non viene rinnovato non possiamo garantire gli interventi previsti: le proponiamo di procedere con il rinnovo.`
        : `le ricordiamo che il contratto «${c.nome}»${codici} scade il ${data}.\nPer non interrompere il servizio le proponiamo di avviare il rinnovo: ci faccia sapere come preferisce procedere.`;
    return {
        oggetto: `Rinnovo del contratto ${c.codici || c.nome}`,
        testo: `${saluto}\n\n${corpo}\n\nRestiamo a disposizione per qualsiasi chiarimento.\n\n${firma}`
    };
}

function voce(a, ctx) {
    const c = contrattoDi(a);
    let cosa = escapeHtml(c ? c.nome : '');
    if (a.strumento_id) {
        const s = strumentoPerId(a.strumento_id);
        cosa = `${escapeHtml(nomeModello(modelloPerId(s.modello_id)))} · <span class="serie">${escapeHtml(s.numero_serie)}</span>`;
    } else if (a.cartuccia_id) {
        cosa = `Cartuccia <span class="serie">${escapeHtml((cartucciaPerId(a.cartuccia_id) || {}).seriale || '')}</span>`;
    }
    const quando = a.strumento_id ? 'prevista il' : a.livello === 'scaduto' ? 'scaduto il' : 'scade il';
    const conEmail = c ? contattiDi(c.id).filter(k => k.email) : [];
    const scrivi = conEmail.length
        ? conEmail.map(k => `<button type="button" class="btn btn-theme btn-piccolo" data-action="scrivi-avviso" data-avviso="${escapeHtml(a.id)}" data-contatto="${escapeHtml(k.id)}" title="Apre Gmail con il testo già pronto"><span class="material-symbols-outlined">send</span> Scrivi a ${escapeHtml(nomeContatto(k))}</button>`).join('')
        : '<span class="avviso-senza">Nessun contatto con email: si aggiunge dalla colonna «Contatti».</span>';

    return `<div class="avviso-voce">`
        + '<div class="avviso-testa">'
        + `<span class="scadenza-tag ${TONO[a.livello]}">${escapeHtml(LIVELLO_AVVISO[a.livello])}</span>`
        + `<strong>${escapeHtml(c ? c.cliente_nome : '')}</strong><span class="avviso-cosa">${cosa}</span>`
        + `<span class="avviso-data">${quando} <strong>${escapeHtml(giornoIt(a.scadenza))}</strong></span></div>`
        + '<div class="avviso-piede">'
        + (c ? cellaPersona(ctx.persone[c.responsabile_id], 'Responsabile non più presente') : '')
        + `<span class="avviso-azioni">${scrivi}`
        + `<button type="button" class="btn btn-primario btn-piccolo" data-action="contattato" data-avviso="${escapeHtml(a.id)}"><span class="material-symbols-outlined">check</span> Cliente contattato</button></span>`
        + '</div></div>';
}

function disegna() {
    const ctx = contesto();
    const avvisi = avvisiDaContattare();
    el('elencoAvvisi').innerHTML = avvisi.length
        ? avvisi.map(a => voce(a, ctx)).join('')
        : '<p class="elenco-vuoto">Nessun cliente da contattare: tutte le scadenze sono state gestite.</p>';
}

export function aggiornaPulsante() {
    const n = avvisiDaContattare().length;
    el('contaAvvisi').textContent = n;
    el('btnAvvisi').classList.toggle('con-avvisi', n > 0);
    if (el('dialogoAvvisi').open) disegna();
}

export function apriAvvisi() {
    errore('');
    disegna();
    el('dialogoAvvisi').showModal();
}

export const chiudiAvvisi = () => el('dialogoAvvisi').close();

export function scriviAvviso(elemento) {
    const a = stato.avvisi.find(x => x.id === elemento.dataset.avviso);
    const k = stato.contatti.find(x => x.id === elemento.dataset.contatto);
    if (!a || !k) return;
    const { oggetto, testo } = email(a, k);
    apriGmail(scriviGmail(k.email, oggetto, testo));
}

export async function segnaContattato(elemento) {
    try {
        errore('');
        await api.segnaContattato(elemento.dataset.avviso, true);
    } catch (e) {
        return errore(e.message);
    }
    toast('Segnato come contattato');
    await ricaricaDopoScrittura();
}
