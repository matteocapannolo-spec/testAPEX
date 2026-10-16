
import { escapeHtml, confirmDialog } from '../core/ui.js';
import * as api from './api.js';
import { persona, io, admin, aggiornaRiga } from './stato.js';

import { volto } from './persone.js';
import { caricaChecklist } from './checklist.js';
import { dataOra, conLink } from './riquadro.js';

const el = id => document.getElementById(id);

const dettagli = { scheda: null, commenti: [], attivita: [], inModifica: null };

function errore(testo) {
    el('schedaErrore').textContent = testo || '';
    el('schedaErrore').hidden = !testo;
}

function commentoHtml(c) {
    const p = persona(c.autore) || { nome: 'Persona non più attiva' };
    const mio = c.autore === io();
    const modificato = c.modificato_il ? ' <span class="storia-nota">(modificato)</span>' : '';
    const corpo = dettagli.inModifica === c.id
        ? `<textarea class="form-textarea" id="testoModificaCommento" rows="3">${escapeHtml(c.testo)}</textarea>
           <div class="aggiunta-azioni">
               <button type="button" class="btn btn-primario" data-action="salva-commento" data-id="${escapeHtml(c.id)}">Salva</button>
               <button type="button" class="btn btn-theme" data-action="annulla-commento">Annulla</button>
           </div>`
        : `<div class="commento-testo">${conLink(c.testo)}</div>`;
    const azioni = [];
    if (mio && dettagli.inModifica !== c.id) azioni.push(`<button type="button" class="link-azione" data-action="modifica-commento" data-id="${escapeHtml(c.id)}">Modifica</button>`);
    if (mio || admin()) azioni.push(`<button type="button" class="link-azione" data-action="elimina-commento" data-id="${escapeHtml(c.id)}">Elimina</button>`);
    return `<div class="storia commento">${volto(p)}<div class="storia-corpo">
        <div><strong>${escapeHtml(p.nome)}</strong> <span class="storia-nota">${dataOra(c.created_at)}</span>${modificato}</div>
        ${corpo}
        ${azioni.length ? `<div class="storia-azioni">${azioni.join(' · ')}</div>` : ''}
    </div></div>`;
}

function attivitaHtml(a) {
    const p = persona(a.autore) || { nome: 'Qualcuno' };
    return `<div class="storia">${volto(p)}<div class="storia-corpo">
        <div><strong>${escapeHtml(p.nome)}</strong> ${escapeHtml(a.testo)}</div>
        <div class="storia-nota">${dataOra(a.created_at)}</div>
    </div></div>`;
}

function disegnaStoria() {
    const voci = [
        ...dettagli.commenti.map(c => ({ quando: c.created_at, html: commentoHtml(c) })),
        ...dettagli.attivita.map(a => ({ quando: a.created_at, html: attivitaHtml(a) }))
    ].sort((a, b) => new Date(b.quando) - new Date(a.quando));
    el('schedaStoria').innerHTML = voci.map(v => v.html).join('')
        || '<p class="niente">Ancora nessun commento.</p>';
    const campo = el('testoModificaCommento');
    if (campo) campo.focus();
}

export async function disegnaDettagli(scheda) {
    dettagli.scheda = scheda;
    dettagli.inModifica = null;
    try {
        const [commenti, attivita] = await Promise.all([api.caricaCommenti(scheda.id), api.caricaAttivita(scheda.id)]);
        Object.assign(dettagli, { commenti, attivita });
        await caricaChecklist(scheda);
    } catch (e) {
        errore(e.message);
        return;
    }
    disegnaStoria();
}

async function dopo(azione) {
    errore('');
    try {
        await azione();
        dettagli.commenti = await api.caricaCommenti(dettagli.scheda.id);
        await aggiornaRiga(dettagli.scheda.id);
    } catch (e) {
        errore(e.message);
    }
    disegnaStoria();
}


export function inviaCommento() {
    const testo = el('nuovoCommento').value.trim();
    if (!testo) return;
    el('nuovoCommento').value = '';
    return dopo(() => api.creaCommento({ scheda_id: dettagli.scheda.id, autore: io(), testo }));
}

export function modificaCommento(elemento) {
    dettagli.inModifica = elemento.dataset.id;
    disegnaStoria();
}

export function annullaCommento() {
    dettagli.inModifica = null;
    disegnaStoria();
}

export function salvaCommento(elemento) {
    const testo = el('testoModificaCommento').value.trim();
    if (!testo) return;
    dettagli.inModifica = null;
    return dopo(() => api.aggiornaCommento(elemento.dataset.id, testo));
}

export async function eliminaCommento(elemento) {
    const ok = await confirmDialog({ title: 'Eliminare il commento?', text: 'Non si torna indietro.', confirmLabel: 'Elimina', danger: true });
    if (ok) return dopo(() => api.eliminaCommento(elemento.dataset.id));
}
