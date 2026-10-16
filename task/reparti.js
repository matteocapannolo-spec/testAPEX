
import { escapeHtml, confirmDialog } from '../core/ui.js';
import * as api from './api.js';
import { stato, persona, reparto, etichetteDi, caricaAnagrafiche, ricarica, cambiaVista } from './stato.js';
import { volto } from './persone.js';
import * as etichette from './etichette.js';
import { apriModificaBacheca } from './struttura.js';

const el = id => document.getElementById(id);

const vista = { aperto: null, menu: null, rinomina: null, aggiunta: null };

function errore(testo) {
    el('repartiErrore').textContent = testo || '';
    el('repartiErrore').hidden = !testo;
}

async function esegui(azione) {
    errore('');
    try {
        await azione();
        await caricaAnagrafiche();
        Object.assign(vista, { rinomina: null, aggiunta: null });
    } catch (e) {
        errore(e.message);
    }
    disegnaReparti();
}

const bachecheDi = repartoId => stato.bacheche.filter(b => b.reparto_id === repartoId);
const membriDi = repartoId => stato.repartoMembri.filter(m => m.reparto_id === repartoId).map(m => m.user_id);

const pillola = (r, tipo, testo) =>
    `<button type="button" class="pillola-aggiungi" data-action="mostra-aggiunta" data-reparto="${escapeHtml(r.id)}" data-tipo="${tipo}">
        <span class="material-symbols-outlined">add</span>${testo}</button>`;

function disegnaPersone(r) {
    const dentro = membriDi(r.id);
    const membri = dentro.map(id => {
        const p = persona(id) || { nome: 'Persona non più attiva' };
        return `<span class="persona-chip">${volto(p)}${escapeHtml(p.nome)}
            <button type="button" class="action-btn" data-action="togli-dal-reparto" data-reparto="${escapeHtml(r.id)}" data-id="${escapeHtml(id)}" title="Togli dal reparto">
                <span class="material-symbols-outlined">close</span></button></span>`;
    }).join('');
    const fuori = stato.persone.filter(p => !dentro.includes(p.user_id));
    let coda = pillola(r, 'persona', 'Persona');
    if (vista.aggiunta === `persona:${r.id}`) {
        coda = fuori.length
            ? `<select class="standard-select aggiungi-al-reparto" data-reparto="${escapeHtml(r.id)}" aria-label="Persona da aggiungere">
                <option value="">Scegli chi aggiungere…</option>
                ${fuori.map(p => `<option value="${escapeHtml(p.user_id)}">${escapeHtml(p.nome)}</option>`).join('')}
            </select>`
            : '<span class="niente">Ci lavorano già tutti quelli che hanno accesso a Task.</span>';
    }
    return `<div class="reparto-fila">${membri}${coda}</div>`;
}

function disegnaBacheche(r) {
    const elenco = bachecheDi(r.id).map(b =>
        `<span class="bacheca-gruppo"><button type="button" class="bacheca-chip" data-action="apri-bacheca" data-id="${escapeHtml(b.id)}" title="Apri la bacheca">
            <span class="material-symbols-outlined">view_kanban</span>${escapeHtml(b.nome)}</button><button type="button" class="action-btn" data-action="modifica-bacheca" data-id="${escapeHtml(b.id)}" title="Rinomina o elimina la bacheca" aria-label="Rinomina o elimina la bacheca">
            <span class="material-symbols-outlined">edit</span></button></span>`).join('');
    const coda = vista.aggiunta !== `bacheca:${r.id}` ? pillola(r, 'bacheca', 'Bacheca')
        : `<span class="riga-aggiunta reparto-campo">
            <input type="text" class="edit-input nuova-bacheca" data-reparto="${escapeHtml(r.id)}" placeholder="Nome (nasce con le colonne di sempre)" maxlength="80" autocomplete="off" aria-label="Nome della nuova bacheca">
            <button type="button" class="btn btn-export" data-action="crea-bacheca" data-reparto="${escapeHtml(r.id)}"><span class="material-symbols-outlined">add</span> Crea</button>
        </span>`;
    return `<div class="reparto-fila">${elenco}${coda}</div>`;
}

function disegnaDettaglio(r) {
    const id = escapeHtml(r.id);
    return `<div class="reparto-dettaglio">
        <span class="reparto-voce">Persone</span>${disegnaPersone(r)}
        <span class="reparto-voce">Bacheche</span>${disegnaBacheche(r)}
        <span class="reparto-voce">Altro</span>
        <div class="reparto-fila">
            <button type="button" class="bacheca-chip" data-action="etichette" data-reparto="${id}" title="Le etichette di questo reparto">
                <span class="material-symbols-outlined">label</span>Etichette (${etichetteDi(r.id).length})</button>
            <button type="button" class="bacheca-chip" data-action="archivio" data-reparto="${id}" title="Le schede finite di questo reparto">
                <span class="material-symbols-outlined">inventory_2</span>Archivio</button>
        </div>
    </div>`;
}

function disegnaRiga(r) {
    const id = escapeHtml(r.id);
    const aperto = vista.aperto === r.id;
    const facce = membriDi(r.id).map(u => volto(persona(u) || { nome: '' })).join('');
    const bacheche = bachecheDi(r.id).map(b => escapeHtml(b.nome)).join(' · ');
    const nome = vista.rinomina === r.id
        ? `<input type="text" class="edit-input nome-reparto" data-id="${id}" value="${escapeHtml(r.nome)}" maxlength="80" aria-label="Nome del reparto">`
        : `<button type="button" class="reparto-apri" data-action="apri-reparto" data-id="${id}" aria-expanded="${aperto}">
            <span class="material-symbols-outlined">${aperto ? 'expand_more' : 'chevron_right'}</span><span class="reparto-nome">${escapeHtml(r.nome)}</span></button>`;
    const menu = vista.menu !== r.id ? '' : `<div class="profile-dropdown reparto-menu">
            <div class="profile-menu-item" data-action="rinomina-reparto" data-id="${id}"><span class="material-symbols-outlined">edit</span> Rinomina</div>
            <div class="profile-menu-item danger" data-action="elimina-reparto" data-id="${id}"><span class="material-symbols-outlined">delete</span> Elimina il reparto</div>
        </div>`;
    return `<div class="reparto-blocco${aperto ? ' aperto' : ''}">
        <div class="reparto-riga">
            ${nome}
            <span class="reparto-facce">${facce}</span>
            <span class="reparto-bacheche" title="${bacheche}">${bacheche || '<span class="niente">Nessuna bacheca</span>'}</span>
            <span class="reparto-altro">
                <button type="button" class="action-btn" data-action="menu-reparto" data-id="${id}" title="Altro" aria-label="Altro"><span class="material-symbols-outlined">more_horiz</span></button>
                ${menu}
            </span>
        </div>
        ${aperto ? disegnaDettaglio(r) : ''}
    </div>`;
}

function disegnaReparti() {
    el('elencoReparti').innerHTML = stato.reparti.map(disegnaRiga).join('')
        || '<p class="niente">Nessun reparto: il primo si crea qui sotto.</p>';
    const campo = el('elencoReparti').querySelector('.nome-reparto, .nuova-bacheca, .aggiungi-al-reparto');
    if (!campo) return;
    campo.focus();
    if (campo.tagName === 'SELECT') { try { campo.showPicker(); } catch { } }
}

export function apriRiga(elemento) {
    const id = elemento.dataset.id;
    Object.assign(vista, { aperto: vista.aperto === id ? null : id, menu: null, aggiunta: null });
    disegnaReparti();
}

export function apriMenu(elemento) {
    vista.menu = vista.menu === elemento.dataset.id ? null : elemento.dataset.id;
    disegnaReparti();
}

export function rinomina(elemento) {
    Object.assign(vista, { rinomina: elemento.dataset.id, menu: null });
    disegnaReparti();
}

export function mostraAggiunta(elemento) {
    vista.aggiunta = `${elemento.dataset.tipo}:${elemento.dataset.reparto}`;
    disegnaReparti();
}

export function apriReparti() {
    errore('');
    el('nuovoReparto').value = '';
    Object.assign(vista, { aperto: null, menu: null, rinomina: null, aggiunta: null });
    el('rigaNuovoReparto').hidden = true;
    el('pillolaNuovoReparto').hidden = false;
    disegnaReparti();
    el('dialogoReparti').showModal();
}

export function mostraNuovoReparto() {
    el('pillolaNuovoReparto').hidden = true;
    el('rigaNuovoReparto').hidden = false;
    el('nuovoReparto').focus();
}

export async function chiudiReparti() {
    el('dialogoReparti').close();
    await ricarica({ anagrafiche: true });
}

export function nuovoReparto() {
    const nome = el('nuovoReparto').value.trim();
    if (!nome) return;
    el('nuovoReparto').value = '';
    return esegui(() => api.nuovoReparto(nome));
}

export async function eliminaReparto(elemento) {
    const r = reparto(elemento.dataset.id);
    vista.menu = null;
    disegnaReparti();
    const ok = await confirmDialog({
        title: 'Eliminare il reparto?',
        text: `«${r.nome}» sparisce con tutte le sue bacheche, le sue schede e le sue etichette. Non si torna indietro.`,
        confirmLabel: 'Elimina tutto', danger: true
    });
    if (ok) return esegui(() => api.eliminaReparto(r.id));
}

export const togliDalReparto = elemento => esegui(
    () => api.togliDalReparto(elemento.dataset.reparto, elemento.dataset.id));

export function creaBacheca(elemento) {
    const campo = el('elencoReparti').querySelector(`.nuova-bacheca[data-reparto="${CSS.escape(elemento.dataset.reparto)}"]`);
    const nome = campo.value.trim();
    if (!nome) return;
    return esegui(() => api.nuovaBacheca(elemento.dataset.reparto, nome));
}

export async function apriBacheca(elemento) {
    el('dialogoReparti').close();
    await caricaAnagrafiche();
    await cambiaVista(elemento.dataset.id);
}

export const apriEtichette = elemento => etichette.apriEtichette(elemento, disegnaReparti);
export const modificaBacheca = elemento => apriModificaBacheca(elemento.dataset.id, disegnaReparti);

export function collegaCampiReparti() {
    const elenco = el('elencoReparti');
    elenco.addEventListener('change', ev => {
        const t = ev.target;
        if (t.classList.contains('aggiungi-al-reparto') && t.value) {
            esegui(() => api.aggiungiAlReparto(t.dataset.reparto, t.value));
        }
        if (t.classList.contains('nome-reparto')) {
            const nome = t.value.trim();
            const r = reparto(t.dataset.id);
            if (nome && nome !== r.nome) esegui(() => api.aggiornaReparto(t.dataset.id, { nome }));
            else { vista.rinomina = null; disegnaReparti(); }
        }
    });
    elenco.addEventListener('keydown', ev => {
        const t = ev.target;
        if (ev.key === 'Enter' && t.classList.contains('nuova-bacheca')) {
            ev.preventDefault();
            creaBacheca(t);
        }
        if (ev.key === 'Enter' && t.classList.contains('nome-reparto')) {
            ev.preventDefault();
            t.blur();
        }
        if (ev.key === 'Escape' && (vista.rinomina || vista.aggiunta)) {
            ev.preventDefault();
            Object.assign(vista, { rinomina: null, aggiunta: null });
            disegnaReparti();
        }
    });
    elenco.addEventListener('focusout', ev => {
        const t = ev.target;
        if (t.classList.contains('nome-reparto') && t.value.trim() === (reparto(t.dataset.id) || {}).nome) {
            setTimeout(() => { if (vista.rinomina === t.dataset.id) { vista.rinomina = null; disegnaReparti(); } }, 0);
        }
    });
    el('dialogoReparti').addEventListener('click', ev => {
        if (vista.menu && !ev.target.closest('.reparto-altro')) {
            vista.menu = null;
            const menu = el('elencoReparti').querySelector('.reparto-menu');
            if (menu) menu.remove();
        }
    });
    el('nuovoReparto').addEventListener('keydown', ev => {
        if (ev.key === 'Enter') { ev.preventDefault(); nuovoReparto(); }
    });
    etichette.collegaCampiEtichette();
}
