
import { escapeHtml, toast, confirmDialog } from '../core/ui.js';
import * as api from './api.js';
import { stato, nomeDi, repartoDi, assegnazioneDi, corsoDi, personeAttive, anniDisponibili, dopoScrittura } from './stato.js';
import { STATI, dataIt, oreIt, euroIt, numeroDaCampo, numeroInCampo } from './config.js';
import { el, tabella, pastigliaStato, tipoIt, linkPastiglia, azioniCella, opzioni, erroreDialogo, testo } from './vista.js';

const COLONNE = [
    {
        key: 'persona', label: 'Persona', width: 190, classes: ['col-testo'], sticky: true,
        render: (v, r) => `<strong>${testo(nomeDi(r.user_id))}</strong>`,
        actions: (v, r) => azioniCella(r.id, [
            ['modifica-assegnazione', 'edit', 'Modifica'],
            ...(r.stato !== 'annullata' ? [['conferma', 'check_circle', r.stato === 'confermata' ? 'Correggi le ore confermate' : 'Registra come fatto']] : []),
            ...(r.stato !== 'confermata' ? [['elimina-assegnazione', 'delete', 'Elimina']] : [])
        ])
    },
    { key: 'reparto', label: 'Reparto', width: 130, render: (v, r) => testo(repartoDi(r.user_id)) },
    {
        key: 'titolo', label: 'Corso', width: 260, classes: ['col-testo'],
        render: (v, r) => testo(v) + (r.di_norma ? ' <span class="pill pill-norma">Di norma</span>' : '')
    },
    { key: 'tipo', label: 'Tipo', width: 160, render: v => testo(tipoIt(v)) },
    { key: 'anno_piano', label: 'Piano', width: 80 },
    { key: 'scadenza', label: 'Entro il', width: 110, render: v => testo(dataIt(v)) },
    { key: 'stato', label: 'Stato', width: 140, render: v => pastigliaStato(v) },
    { key: 'ore', label: 'Ore', width: 90, render: (v, r) => testo(oreIt(r.ore_confermate ?? r.ore_dichiarate)) },
    { key: 'completato_il', label: 'Data corso', width: 110, render: v => testo(dataIt(v)) },
    { key: 'costo', label: 'Costo', width: 110, render: v => testo(euroIt(v)) },
    { key: 'attestato_url', label: 'Attestato', width: 100, render: v => linkPastiglia(v, '', 'workspace_premium') }
];

export function riempiFiltriAssegnazioni() {
    opzioni(el('assAnno'), anniDisponibili().map(a => [a, a]), { vuota: 'Tutti gli anni' });
    opzioni(el('assPersona'), stato.persone.map(p => [p.user_id, p.nome]), { vuota: 'Tutte le persone' });
    opzioni(el('assCorso'), stato.corsi.map(c => [c.id, c.titolo]), { vuota: 'Tutti i corsi' });
    opzioni(el('assStato'), Object.entries(STATI).map(([k, s]) => [k, s.etichetta]), { vuota: 'Tutti gli stati' });
}

export function disegnaAssegnazioni() {
    const anno = el('assAnno').value, persona = el('assPersona').value;
    const corso = el('assCorso').value, st = el('assStato').value;
    const righe = stato.assegnazioni.filter(a =>
        (!anno || a.anno_piano === Number(anno)) && (!persona || a.user_id === persona) &&
        (!corso || a.corso_id === Number(corso)) && (!st || a.stato === st)
    ).sort((a, b) => nomeDi(a.user_id).localeCompare(nomeDi(b.user_id), 'it') || a.titolo.localeCompare(b.titolo, 'it'));
    tabella('ass', COLONNE, righe, {
        vuota: stato.assegnazioni.length ? 'Nessuna assegnazione corrisponde ai filtri.' : 'Ancora nessun corso assegnato: si comincia da «Assegna corso».'
    });
    el('statAssegnazioni').textContent = righe.length;
}

export function azzeraFiltriAssegnazioni() {
    ['assAnno', 'assPersona', 'assCorso', 'assStato'].forEach(id => { el(id).value = ''; });
    disegnaAssegnazioni();
}

export function apriAssegna(prefill = {}) {
    opzioni(el('nuovaCorso'), stato.corsi.filter(c => c.attivo).map(c => [c.id, c.titolo + (c.di_norma ? ' (di norma)' : '')]), { vuota: 'Scegli un corso' });
    el('nuovaCorso').value = prefill.corsoId ? String(prefill.corsoId) : '';
    el('nuovaAnno').value = stato.anno;
    el('nuovaScadenza').value = '';
    el('nuovaCosto').value = '';
    aggiornaCostoSuggerito();
    const scelte = new Set(prefill.persone || []);
    el('nuovaPersone').innerHTML = personeAttive().map(p =>
        `<label class="scelta-persona"><input type="checkbox" value="${escapeHtml(p.user_id)}"${scelte.has(p.user_id) ? ' checked' : ''}>` +
        `<span>${escapeHtml(p.nome)}</span></label>`).join('') || '<p class="elenco-vuoto">Nessuna persona in anagrafica.</p>';
    erroreDialogo('nuovaErrore', '');
    el('dialogoAssegna').showModal();
}

export function aggiornaCostoSuggerito() {
    const c = corsoDi(el('nuovaCorso').value);
    el('nuovaCosto').placeholder = c && c.costo !== null ? `${euroIt(c.costo)} (dal catalogo)` : 'Nessun costo';
}

export function selezionaTutte(bottone) {
    const tutte = bottone.dataset.valore === 'tutte';
    el('nuovaPersone').querySelectorAll('input[type=checkbox]').forEach(c => { c.checked = tutte; });
}

export function chiudiAssegna() {
    el('dialogoAssegna').close();
}

export async function salvaAssegna() {
    const corsoId = Number(el('nuovaCorso').value);
    const anno = Number(el('nuovaAnno').value);
    const costo = numeroDaCampo(el('nuovaCosto').value);
    const persone = [...el('nuovaPersone').querySelectorAll('input:checked')].map(c => c.value);
    if (!corsoId) return erroreDialogo('nuovaErrore', 'Scegli il corso.');
    if (!anno || anno < 2020 || anno > 2100) return erroreDialogo('nuovaErrore', "Scrivi l'anno del piano, per esempio " + stato.anno + '.');
    if (Number.isNaN(costo) || (costo !== null && costo < 0)) return erroreDialogo('nuovaErrore', 'Il costo deve essere un numero, per esempio 120 oppure 89,90.');
    if (!persone.length) return erroreDialogo('nuovaErrore', 'Scegli almeno una persona.');
    const righe = persone.map(user_id => ({
        user_id, corso_id: corsoId, anno_piano: anno,
        scadenza: el('nuovaScadenza').value || null, costo
    }));
    try {
        const n = await api.assegna(righe);
        chiudiAssegna();
        toast(n === 1 ? 'Corso assegnato.' : `Corso assegnato a ${n} persone.`);
    } catch (e) {
        return erroreDialogo('nuovaErrore', e.message);
    }
    await dopoScrittura();
}

let inModifica = null;

export function apriModificaAssegnazione(bottone) {
    const a = assegnazioneDi(bottone.dataset.id);
    if (!a) return;
    inModifica = a.id;
    el('modTitolo').textContent = `${nomeDi(a.user_id)} — ${a.titolo}`;
    el('modAnno').value = a.anno_piano;
    el('modScadenza').value = a.scadenza || '';
    el('modCosto').value = numeroInCampo(a.costo);
    el('modNote').value = a.note || '';
    el('modAnnullata').checked = a.annullata;
    el('btnTogliConferma').hidden = a.ore_confermate === null || a.ore_confermate === undefined;
    erroreDialogo('modErrore', '');
    el('dialogoModifica').showModal();
}

export function chiudiModifica() {
    el('dialogoModifica').close();
    inModifica = null;
}

export async function salvaModifica() {
    const anno = Number(el('modAnno').value);
    const costo = numeroDaCampo(el('modCosto').value);
    if (!anno || anno < 2020 || anno > 2100) return erroreDialogo('modErrore', "Scrivi l'anno del piano.");
    if (Number.isNaN(costo) || (costo !== null && costo < 0)) return erroreDialogo('modErrore', 'Il costo deve essere un numero.');
    try {
        await api.aggiornaAssegnazione(inModifica, {
            anno_piano: anno, scadenza: el('modScadenza').value || null, costo,
            note: el('modNote').value.trim() || null, annullata: el('modAnnullata').checked
        });
    } catch (e) {
        return erroreDialogo('modErrore', e.message);
    }
    chiudiModifica();
    toast('Assegnazione salvata.');
    await dopoScrittura();
}

export async function togliConferma() {
    const ok = await confirmDialog({
        title: 'Togliere la conferma?',
        text: 'Le ore di questo corso escono dalle statistiche finché non vengono confermate di nuovo.',
        confirmLabel: 'Togli conferma', danger: true
    });
    if (!ok) return;
    try {
        await api.aggiornaAssegnazione(inModifica, { ore_confermate: null });
    } catch (e) {
        return erroreDialogo('modErrore', e.message);
    }
    chiudiModifica();
    toast('Conferma tolta.');
    await dopoScrittura();
}

export async function eliminaAssegnazione(bottone) {
    const a = assegnazioneDi(bottone.dataset.id);
    if (!a) return;
    const ok = await confirmDialog({
        title: "Eliminare l'assegnazione?",
        text: `«${a.titolo}» non sarà più assegnato a ${nomeDi(a.user_id)}. Per tenerne traccia, invece, aprila e segnala come annullata.`,
        confirmLabel: 'Elimina', danger: true
    });
    if (!ok) return;
    try {
        await api.eliminaAssegnazione(a.id);
    } catch (e) {
        return toast(e.message);
    }
    toast('Assegnazione eliminata.');
    await dopoScrittura();
}
