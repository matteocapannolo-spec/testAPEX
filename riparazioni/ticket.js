
import { escapeHtml, toast } from '../core/ui.js';
import { currentUser } from '../core/auth.js';
import { caricaTicket, apriTicket } from './api.js';
import { dataOraIt } from './config.js';

const el = id => document.getElementById(id);

let ticket = [];

const ASPETTO = {
    bug: { emoji: '🐛', tinta: '', etichetta: "Bug dell'applicazione" },
    feature: { emoji: '➕', tinta: 'tint-feature', etichetta: 'Richiesta Feature / Suggerimento' }
};

function errore(id, testo) {
    el(id).textContent = testo || '';
    el(id).hidden = !testo;
}

function rigaStato(t) {
    if (!t.aperto) return '<div class="t-deadline t-deadline-status">Chiuso</div>';
    if (!t.scadenza) return '<div class="t-deadline t-deadline-none">Non in carico</div>';
    return `<div class="t-deadline"><span class="t-deadline-status">In carico</span> - deadline <span class="t-deadline-date">${escapeHtml(dataOraIt(t.scadenza))}</span></div>`;
}

function voce(t) {
    const a = ASPETTO[t.categoria] || ASPETTO.bug;
    const classi = ['ticket-card-item', a.tinta, t.aperto ? '' : 'ticket-chiuso'].filter(Boolean).join(' ');
    const apri = t.task_scheda_id ? ` href="../task/?scheda=${encodeURIComponent(t.task_scheda_id)}" target="_blank" rel="noopener noreferrer"` : '';
    return `<a class="${classi}"${apri}>`
        + `<div class="t-header"><span>${a.emoji} ${escapeHtml(t.titolo)}</span><span class="t-dove">Task</span></div>`
        + `<div class="t-meta">${escapeHtml(a.etichetta)} · Autore: <b>${escapeHtml(t.autore || '—')}</b> | Data: ${escapeHtml(dataOraIt(t.created_at))}</div>`
        + rigaStato(t) + '</a>';
}

function disegna() {
    const aperti = ticket.filter(t => t.aperto);
    el('contaTicket').textContent = aperti.length;
    el('contaTicket').classList.toggle('zero', aperti.length === 0);
    const ordinati = [...aperti, ...ticket.filter(t => !t.aperto)];
    el('elencoTicket').innerHTML = ordinati.length
        ? ordinati.map(voce).join('')
        : '<p class="elenco-vuoto">Nessun ticket. Se qualcosa non funziona, o manca, si scrive da «Nuovo Ticket».</p>';
}

export async function caricaTicketPagina() {
    try {
        ticket = await caricaTicket();
        errore('ticketErrore', '');
    } catch (e) {
        ticket = [];
        errore('ticketErrore', e.message);
    }
    disegna();
}

export async function apriElencoTicket() {
    el('dialogoTicket').showModal();
    await caricaTicketPagina();
}

export function chiudiElencoTicket() {
    el('dialogoTicket').close();
}

export function apriNuovoTicket() {
    errore('nuovoTicketErrore', '');
    el('ticketCategoria').value = 'bug';
    el('ticketTitolo').value = '';
    el('ticketDescrizione').value = '';
    el('ticketAutore').value = (currentUser() || {}).nome || '';
    el('dialogoNuovoTicket').showModal();
    el('ticketTitolo').focus();
}

export function chiudiNuovoTicket() {
    el('dialogoNuovoTicket').close();
}

export async function salvaTicket() {
    const campi = {
        categoria: el('ticketCategoria').value,
        titolo: el('ticketTitolo').value.trim(),
        descrizione: el('ticketDescrizione').value.trim()
    };
    if (!campi.titolo) return errore('nuovoTicketErrore', 'Il titolo è obbligatorio.');
    if (!campi.descrizione) return errore('nuovoTicketErrore', 'Scrivi cosa succede, o cosa servirebbe.');
    try {
        errore('nuovoTicketErrore', '');
        await apriTicket(campi);
    } catch (e) {
        return errore('nuovoTicketErrore', e.message);
    }
    el('dialogoNuovoTicket').close();
    toast('Ticket inviato: è su Task');
    await caricaTicketPagina();
}
