
import { escapeHtml } from '../core/ui.js';
import * as api from './api.js';
import { PASSO_POSIZIONE } from './config.js';
import { stato, ridisegna, aggiornaRiga, mostraAvviso } from './stato.js';
import { riquadro, passaFiltri } from './riquadro.js';

let aggiuntaIn = null;

const perPosizione = (a, b) => a.posizione - b.posizione;
export const schedeDi = colonna => stato.schede.filter(s => s.colonna_id === colonna).sort(perPosizione);

function colonnaHtml(c) {
    const tutte = schedeDi(c.id);
    const visibili = tutte.filter(s => passaFiltri(s, stato.criteri));
    const piede = aggiuntaIn === c.id
        ? `<div class="aggiunta">
               <textarea class="edit-input aggiunta-testo" id="testoNuovaScheda" rows="2" maxlength="500"
                   placeholder="Inserisci un titolo (Invio per salvare)"></textarea>
               <div class="aggiunta-azioni">
                   <button type="button" class="btn btn-primario" data-action="salva-nuova-scheda" data-colonna="${escapeHtml(c.id)}"><span class="material-symbols-outlined">add</span> Aggiungi scheda</button>
                   <button type="button" class="aggiunta-chiudi" data-action="annulla-nuova-scheda" title="Annulla"><span class="material-symbols-outlined">close</span></button>
               </div>
           </div>`
        : `<button type="button" class="colonna-aggiungi" data-action="aggiungi-scheda" data-colonna="${escapeHtml(c.id)}">
               <span class="material-symbols-outlined">add</span> Aggiungi una scheda
           </button>`;
    const fine = c.di_fine ? '<span class="material-symbols-outlined colonna-fine" title="Spostare qui una scheda la segna completata">task_alt</span>' : '';
    const ticket = stato.colonnaTicket === c.id ? '<span class="material-symbols-outlined colonna-fine" title="Qui arrivano i ticket di Asset">confirmation_number</span>' : '';
    return `<section class="colonna" data-colonna="${escapeHtml(c.id)}">
        <header class="colonna-testa">
            <span class="colonna-nome">${escapeHtml(c.nome)}</span>${ticket}${fine}
            <span class="colonna-conto">${tutte.length}</span>
            <button type="button" class="colonna-menu" data-action="menu-colonna" data-id="${escapeHtml(c.id)}" title="Colonna">
                <span class="material-symbols-outlined">more_horiz</span>
            </button>
        </header>
        <div class="colonna-corpo" data-colonna="${escapeHtml(c.id)}">${visibili.map(s => riquadro(s)).join('')}</div>
        <footer class="colonna-piede">${piede}</footer>
    </section>`;
}

export function disegnaBacheca(contenitore) {
    contenitore.innerHTML = stato.colonne.map(colonnaHtml).join('')
        + `<button type="button" class="colonna-nuova" data-action="nuova-colonna">
               <span class="material-symbols-outlined">add</span> Aggiungi un'altra colonna
           </button>`;
    const testo = document.getElementById('testoNuovaScheda');
    if (testo) testo.focus();
}


export function apriAggiunta(el) {
    aggiuntaIn = el.dataset.colonna;
    ridisegna();
}

export function chiudiAggiunta() {
    aggiuntaIn = null;
    ridisegna();
}

export async function salvaNuovaScheda() {
    const campo = document.getElementById('testoNuovaScheda');
    const titolo = campo ? campo.value.trim() : '';
    if (!titolo || !aggiuntaIn) return;
    const colonna = aggiuntaIn;
    const ultima = schedeDi(colonna).pop();
    try {
        const nuova = await api.creaScheda({
            bacheca_id: stato.vista, colonna_id: colonna, titolo,
            posizione: ultima ? ultima.posizione + PASSO_POSIZIONE : PASSO_POSIZIONE
        });
        await aggiornaRiga(nuova.id);
        aggiuntaIn = colonna;
        ridisegna();
    } catch (e) {
        mostraAvviso(e.message);
    }
}

export function tastiAggiunta(ev) {
    if (ev.target.id !== 'testoNuovaScheda') return;
    if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); salvaNuovaScheda(); }
    if (ev.key === 'Escape') chiudiAggiunta();
}

