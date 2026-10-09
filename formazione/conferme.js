
import { toast, confirmDialog } from '../core/ui.js';
import * as api from './api.js';
import { stato, nomeDi, repartoDi, assegnazioneDi, dopoScrittura } from './stato.js';
import { dataIt, oreIt, oggiIso, numeroDaCampo, numeroInCampo } from './config.js';
import { el, tabella, linkPastiglia, azioniCella, erroreDialogo, testo } from './vista.js';

const COLONNE = [
    {
        key: 'persona', label: 'Persona', width: 190, classes: ['col-testo'],
        render: (v, r) => `<strong>${testo(nomeDi(r.user_id))}</strong>`,
        actions: (v, r) => azioniCella(r.id, [
            ['conferma', 'check_circle', 'Conferma le ore'],
            ['respingi', 'block', 'Respingi la dichiarazione']
        ])
    },
    { key: 'reparto', label: 'Reparto', width: 140, render: (v, r) => testo(repartoDi(r.user_id)) },
    { key: 'titolo', label: 'Corso', width: 260, classes: ['col-testo'] },
    { key: 'ore_previste', label: 'Ore previste', width: 110, render: v => testo(oreIt(v)) },
    { key: 'ore_dichiarate', label: 'Ore dichiarate', width: 120, render: v => `<strong>${testo(oreIt(v))}</strong>` },
    { key: 'completato_il', label: 'Data corso', width: 110, render: v => testo(dataIt(v)) },
    { key: 'attestato_url', label: 'Attestato', width: 100, render: v => linkPastiglia(v, '', 'workspace_premium') },
    { key: 'nota_dipendente', label: 'Nota', width: 220, classes: ['col-testo'], render: v => `<span class="nota" title="${testo(v)}">${testo(v)}</span>` }
];

export function daConfermare() {
    return stato.assegnazioni.filter(a => a.stato === 'dichiarata');
}

export function disegnaConferme() {
    const righe = daConfermare().sort((a, b) => String(a.dichiarato_il).localeCompare(String(b.dichiarato_il)));
    tabella('conferme', COLONNE, righe, { vuota: 'Nessuna dichiarazione in attesa.' });
}

let inCorso = null;

export function apriConferma(bottone) {
    const a = assegnazioneDi(bottone.dataset.id);
    if (!a) return;
    inCorso = a.id;
    el('confTitolo').textContent = `${nomeDi(a.user_id)} — ${a.titolo}`;
    el('confOre').value = numeroInCampo(a.ore_confermate ?? a.ore_dichiarate ?? a.ore_previste);
    el('confData').value = a.completato_il || oggiIso();
    erroreDialogo('confErrore', '');
    el('dialogoConferma').showModal();
}

export function chiudiConferma() {
    el('dialogoConferma').close();
    inCorso = null;
}

export async function salvaConferma() {
    const ore = numeroDaCampo(el('confOre').value);
    if (!ore || ore <= 0) return erroreDialogo('confErrore', 'Scrivi le ore da confermare.');
    if (!el('confData').value) return erroreDialogo('confErrore', 'Manca la data del corso.');
    try {
        await api.aggiornaAssegnazione(inCorso, { ore_confermate: ore, completato_il: el('confData').value });
    } catch (e) {
        return erroreDialogo('confErrore', e.message);
    }
    chiudiConferma();
    toast('Ore confermate.');
    await dopoScrittura();
}

export async function respingi(bottone) {
    const a = assegnazioneDi(bottone.dataset.id);
    if (!a) return;
    const ok = await confirmDialog({
        title: 'Respingere la dichiarazione?',
        text: `Ore, data, attestato e nota dichiarati da ${nomeDi(a.user_id)} per «${a.titolo}» vengono tolti. Il corso torna da fare.`,
        confirmLabel: 'Respingi', danger: true
    });
    if (!ok) return;
    try {
        await api.aggiornaAssegnazione(a.id, { ore_dichiarate: null, completato_il: null, attestato_url: null, nota_dipendente: null });
    } catch (e) {
        return toast(e.message);
    }
    toast('Dichiarazione respinta.');
    await dopoScrittura();
}
