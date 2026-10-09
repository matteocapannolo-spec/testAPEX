
import { escapeHtml, toast, confirmDialog } from '../core/ui.js';
import * as api from './api.js';
import { stato, personeAttive, anniDisponibili, dopoScrittura } from './stato.js';
import { oreIt, numeroDaCampo, numeroInCampo } from './config.js';
import { el, tabella, azioniCella, opzioni, erroreDialogo, testo } from './vista.js';

function barra(percentuale) {
    if (percentuale === null || percentuale === undefined) return '<span class="testo-tenue">Nessun obiettivo</span>';
    return `<span class="progress-wrapper"><span class="progress-bar-bg"><span class="progress-bar-fill" data-percentuale="${Number(percentuale)}"></span></span>` +
        `<span class="progress-text">${Number(percentuale)}%</span></span>`;
}

const COLONNE = [
    {
        key: 'nome', label: 'Persona', width: 200, classes: ['col-testo'], sticky: true,
        render: v => `<strong>${testo(v)}</strong>`,
        actions: (v, r) => azioniCella(r.user_id, [['piano', 'edit_note', 'Piano e reparto']])
    },
    { key: 'reparto', label: 'Reparto', width: 140 },
    { key: 'obiettivo_ore', label: 'Obiettivo', width: 100, render: v => testo(oreIt(v)) },
    { key: 'ore_piano', label: 'Ore confermate', width: 130, render: v => testo(oreIt(v) || '0 h') },
    { key: 'percentuale', label: 'Piano', width: 170, render: (v, r) => barra(r.percentuale) },
    { key: 'ore_da_confermare', label: 'Da confermare', width: 120, render: v => Number(v) ? testo(oreIt(v)) : '' },
    { key: 'ore_norma', label: 'Ore di norma', width: 120, render: v => Number(v) ? testo(oreIt(v)) : '' },
    { key: 'corsi', label: 'Corsi fatti', width: 110, render: (v, r) => r.assegnati ? testo(`${r.completati} su ${r.assegnati}`) : '' },
    { key: 'in_ritardo', label: 'In ritardo', width: 100, render: v => Number(v) ? `<span class="testo-allarme">${testo(v)}</span>` : '' }
];

export function riempiFiltriPersone() {
    const prima = el('perAnno').value;
    opzioni(el('perAnno'), anniDisponibili().map(a => [a, a]));
    if (!prima) el('perAnno').value = stato.anno;
    opzioni(el('perReparto'), [...stato.reparti.map(r => [r.id, r.nome]), ['senza', 'Senza reparto']], { vuota: 'Tutti i reparti' });
}

export function disegnaPersone() {
    const anno = Number(el('perAnno').value) || stato.anno;
    const reparto = el('perReparto').value;
    const nomiReparti = new Map(stato.reparti.map(r => [r.id, r.nome]));
    const righe = personeAttive()
        .filter(p => !reparto || (reparto === 'senza' ? !p.reparto_id : p.reparto_id === Number(reparto)))
        .map(p => {
            const piano = stato.piani.find(x => x.user_id === p.user_id && x.anno === anno) || {};
            return { ...piano, user_id: p.user_id, nome: p.nome, reparto: nomiReparti.get(p.reparto_id) || '' };
        });
    tabella('per', COLONNE, righe, { vuota: 'Nessuna persona corrisponde ai filtri.' });
    el('per-corpo').querySelectorAll('.progress-bar-fill').forEach(b => {
        b.style.width = Math.min(100, Number(b.dataset.percentuale) || 0) + '%';
    });
}

let inCorso = null;

export function apriPiano(bottone) {
    const p = stato.persone.find(x => x.user_id === bottone.dataset.id);
    if (!p) return;
    const anno = Number(el('perAnno').value) || stato.anno;
    const piano = stato.piani.find(x => x.user_id === p.user_id && x.anno === anno) || {};
    inCorso = { userId: p.user_id, anno, repartoPrima: p.reparto_id || null };
    el('pianoTitolo').textContent = `${p.nome} — piano ${anno}`;
    opzioni(el('pianoReparto'), stato.reparti.map(r => [r.id, r.nome]), { vuota: 'Nessun reparto' });
    el('pianoReparto').value = p.reparto_id ? String(p.reparto_id) : '';
    el('pianoOre').value = numeroInCampo(piano.obiettivo_ore);
    el('pianoObiettivi').value = piano.obiettivi || '';
    erroreDialogo('pianoErrore', '');
    el('dialogoPiano').showModal();
}

export function chiudiPiano() {
    el('dialogoPiano').close();
    inCorso = null;
}

export async function salvaPiano() {
    const ore = numeroDaCampo(el('pianoOre').value);
    if (Number.isNaN(ore) || (ore !== null && ore < 0)) return erroreDialogo('pianoErrore', 'Le ore devono essere un numero, per esempio 40.');
    const reparto = el('pianoReparto').value ? Number(el('pianoReparto').value) : null;
    try {
        if (reparto !== inCorso.repartoPrima) await api.impostaReparto(inCorso.userId, reparto);
        await api.salvaPiano(inCorso.userId, inCorso.anno, {
            obiettivo_ore: ore, obiettivi: el('pianoObiettivi').value.trim() || null
        });
    } catch (e) {
        return erroreDialogo('pianoErrore', e.message);
    }
    chiudiPiano();
    toast('Piano salvato.');
    await dopoScrittura();
}

export function apriReparti() {
    disegnaElencoReparti();
    el('nuovoReparto').value = '';
    erroreDialogo('repartiErrore', '');
    el('dialogoReparti').showModal();
}

export function disegnaElencoReparti() {
    el('elencoReparti').innerHTML = stato.reparti.map(r =>
        `<div class="riga-elenco"><input type="text" class="edit-input" maxlength="80" value="${escapeHtml(r.nome)}" data-reparto="${escapeHtml(r.id)}" aria-label="Nome del reparto">` +
        `<button type="button" class="action-btn" data-action="elimina-reparto" data-id="${escapeHtml(r.id)}" title="Elimina"><span class="material-symbols-outlined">delete</span></button></div>`
    ).join('') || '<p class="elenco-vuoto">Ancora nessun reparto.</p>';
}

export function chiudiReparti() {
    el('dialogoReparti').close();
}

export async function aggiungiReparto() {
    const nome = el('nuovoReparto').value.trim();
    if (!nome) return erroreDialogo('repartiErrore', 'Scrivi il nome del reparto.');
    try {
        await api.salvaReparto(null, nome);
    } catch (e) {
        return erroreDialogo('repartiErrore', e.message);
    }
    el('nuovoReparto').value = '';
    erroreDialogo('repartiErrore', '');
    await dopoScrittura();
}

export async function rinominaReparto(campo) {
    const r = stato.reparti.find(x => x.id === Number(campo.dataset.reparto));
    const nome = campo.value.trim();
    if (!r || nome === r.nome) return;
    if (!nome) { campo.value = r.nome; return; }
    try {
        await api.salvaReparto(r.id, nome);
    } catch (e) {
        campo.value = r.nome;
        return erroreDialogo('repartiErrore', e.message);
    }
    erroreDialogo('repartiErrore', '');
    await dopoScrittura();
}

export async function eliminaReparto(bottone) {
    const r = stato.reparti.find(x => x.id === Number(bottone.dataset.id));
    if (!r) return;
    const quanti = stato.persone.filter(p => p.reparto_id === r.id).length;
    const ok = await confirmDialog({
        title: `Eliminare «${r.nome}»?`,
        text: quanti ? `${quanti} persone restano senza reparto. Le loro ore restano, sotto «Senza reparto».` : 'Nessuna persona è in questo reparto.',
        confirmLabel: 'Elimina', danger: true
    });
    if (!ok) return;
    try {
        await api.eliminaReparto(r.id);
    } catch (e) {
        return erroreDialogo('repartiErrore', e.message);
    }
    await dopoScrittura();
}
