
import { escapeHtml, confirmDialog } from '../core/ui.js';
import * as api from './api.js';
import { aggiornaRiga } from './stato.js';
import { PASSO_POSIZIONE } from './config.js';

const el = id => document.getElementById(id);

const stato = { scheda: null, liste: [], voci: [], nascondiFatte: false };

function errore(testo) {
    el('schedaErrore').textContent = testo || '';
    el('schedaErrore').hidden = !testo;
}

const ultimaPosizione = righe => righe.reduce((m, r) => Math.max(m, r.posizione), 0);

function listaHtml(c) {
    const voci = stato.voci.filter(v => v.checklist_id === c.id);
    const fatte = voci.filter(v => v.fatta).length;
    const perc = voci.length ? Math.round(fatte * 100 / voci.length) : 0;
    const id = escapeHtml(c.id);
    const nascondi = fatte
        ? `<button type="button" class="link-azione" data-action="nascondi-fatte">${stato.nascondiFatte ? `Mostra gli elementi spuntati (${fatte})` : 'Nascondi gli elementi spuntati'}</button>`
        : '';
    const righe = voci.filter(v => !(stato.nascondiFatte && v.fatta)).map(v => `
        <div class="voce${v.fatta ? ' fatta' : ''}">
            <input type="checkbox" class="voce-spunta" data-id="${escapeHtml(v.id)}"${v.fatta ? ' checked' : ''} aria-label="Fatto">
            <input type="text" class="voce-testo" data-id="${escapeHtml(v.id)}" value="${escapeHtml(v.testo)}" maxlength="500">
            <button type="button" class="action-btn" data-action="elimina-voce" data-id="${escapeHtml(v.id)}" title="Elimina">
                <span class="material-symbols-outlined">delete</span>
            </button>
        </div>`).join('');
    return `<section class="checklist" data-checklist="${id}">
        <div class="checklist-testa">
            <span class="material-symbols-outlined">check_box</span>
            <input type="text" class="checklist-nome" data-id="${id}" value="${escapeHtml(c.nome)}" maxlength="120" aria-label="Nome della checklist">
            ${nascondi}
            <button type="button" class="action-btn" data-action="elimina-checklist" data-id="${id}" title="Elimina la checklist"><span class="material-symbols-outlined">delete</span></button>
        </div>
        <div class="checklist-avanzamento">
            <span class="checklist-perc">${perc}%</span>
            <div class="progress-bar-bg checklist-barra"><div class="progress-bar-fill${perc === 100 ? ' piena' : ''}" data-perc="${perc}"></div></div>
        </div>
        ${righe}
        <div class="riga-aggiunta">
            <input type="text" class="edit-input nuova-voce" data-checklist="${id}" placeholder="Aggiungi un elemento" maxlength="500" autocomplete="off">
            <button type="button" class="btn btn-theme" data-action="aggiungi-voce" data-checklist="${id}" title="Aggiungi"><span class="material-symbols-outlined">add</span></button>
        </div>
    </section>`;
}

export function disegnaChecklist() {
    const box = el('schedaChecklist');
    box.innerHTML = stato.liste.map(listaHtml).join('');
    box.querySelectorAll('.progress-bar-fill').forEach(b => { b.style.width = `${b.dataset.perc}%`; });
}

export async function caricaChecklist(scheda) {
    stato.scheda = scheda;
    const [liste, voci] = await Promise.all([api.caricaChecklist(scheda.id), api.caricaVoci(scheda.id)]);
    Object.assign(stato, { liste, voci });
    disegnaChecklist();
}

async function dopo(azione, fuoco = null) {
    errore('');
    try {
        await azione();
        const [liste, voci] = await Promise.all([api.caricaChecklist(stato.scheda.id), api.caricaVoci(stato.scheda.id)]);
        Object.assign(stato, { liste, voci });
        await aggiornaRiga(stato.scheda.id);
    } catch (e) {
        errore(e.message);
    }
    disegnaChecklist();
    if (fuoco) {
        const campo = el('schedaChecklist').querySelector(`.nuova-voce[data-checklist="${fuoco}"]`);
        if (campo) campo.focus();
    }
}

export function nuovaChecklist() {
    const nome = el('nuovaChecklist').value.trim() || 'Checklist';
    el('nuovaChecklist').value = '';
    return dopo(() => api.creaChecklist({ scheda_id: stato.scheda.id, nome, posizione: ultimaPosizione(stato.liste) + PASSO_POSIZIONE }));
}

export async function eliminaChecklist(elemento) {
    const c = stato.liste.find(x => x.id === elemento.dataset.id);
    const ok = await confirmDialog({
        title: 'Eliminare la checklist?', text: `«${c.nome}» sparisce con tutte le sue voci.`,
        confirmLabel: 'Elimina', danger: true
    });
    if (ok) return dopo(() => api.eliminaChecklist(c.id));
}

export function aggiungiVoce(elemento) {
    const lista = elemento.dataset.checklist;
    const campo = el('schedaChecklist').querySelector(`.nuova-voce[data-checklist="${lista}"]`);
    const testo = campo ? campo.value.trim() : '';
    if (!testo) return;
    const posizione = ultimaPosizione(stato.voci.filter(v => v.checklist_id === lista)) + PASSO_POSIZIONE;
    return dopo(() => api.creaVoce({ scheda_id: stato.scheda.id, checklist_id: lista, testo, posizione }), lista);
}

export const eliminaVoce = elemento => dopo(() => api.eliminaVoce(elemento.dataset.id));

export function scambiaNascondiFatte() {
    stato.nascondiFatte = !stato.nascondiFatte;
    disegnaChecklist();
}

export function collegaCampiChecklist() {
    const box = el('schedaChecklist');
    box.addEventListener('change', ev => {
        const t = ev.target;
        const id = t.dataset.id;
        if (t.classList.contains('voce-spunta')) dopo(() => api.aggiornaVoce(id, { fatta: t.checked }));
        if (t.classList.contains('voce-testo')) {
            const testo = t.value.trim();
            if (testo) dopo(() => api.aggiornaVoce(id, { testo })); else disegnaChecklist();
        }
        if (t.classList.contains('checklist-nome')) {
            const nome = t.value.trim();
            if (nome) dopo(() => api.aggiornaChecklist(id, { nome })); else disegnaChecklist();
        }
    });
    box.addEventListener('keydown', ev => {
        if (ev.key !== 'Enter') return;
        if (ev.target.classList.contains('nuova-voce')) { ev.preventDefault(); aggiungiVoce(ev.target); }
        if (ev.target.classList.contains('checklist-nome') || ev.target.classList.contains('voce-testo')) { ev.preventDefault(); ev.target.blur(); }
    });
    el('nuovaChecklist').addEventListener('keydown', ev => {
        if (ev.key === 'Enter') { ev.preventDefault(); nuovaChecklist(); }
    });
}
