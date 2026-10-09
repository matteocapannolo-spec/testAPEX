
import { toast, confirmDialog } from '../core/ui.js';
import * as api from './api.js';
import { stato, assegnazioneDi, dopoScrittura } from './stato.js';
import { dataIt, oreIt, oggiIso, numeroDaCampo, numeroInCampo } from './config.js';
import { el, tabella, pastigliaStato, ledNorma, tipoIt, linkPastiglia, azioniCella, erroreDialogo, testo } from './vista.js';

function cellaOre(r) {
    if (r.ore_confermate !== null && r.ore_confermate !== undefined) return testo(oreIt(r.ore_confermate));
    if (r.ore_dichiarate !== null && r.ore_dichiarate !== undefined) {
        return `<span class="ore-dichiarate" title="Dichiarate, in attesa di conferma">${testo(oreIt(r.ore_dichiarate))}</span>`;
    }
    return '';
}

const COLONNE_CORSI = [
    {
        key: 'titolo', label: 'Corso', width: 280, classes: ['col-testo'],
        render: (v, r) => testo(v) + (r.di_norma ? ' <span class="pill pill-norma">Di norma</span>' : ''),
        actions: (v, r) => {
            const voci = [];
            if (r.stato !== 'confermata' && r.stato !== 'annullata') voci.push(['dichiara', 'task_alt', 'Dichiara completamento e ore']);
            if (r.stato === 'dichiarata') voci.push(['ritira', 'undo', 'Ritira la dichiarazione']);
            return azioniCella(r.id, voci);
        }
    },
    { key: 'tipo', label: 'Tipo', width: 170, render: v => testo(tipoIt(v)) },
    { key: 'ore_previste', label: 'Ore previste', width: 110, render: v => testo(oreIt(v)) },
    { key: 'scadenza', label: 'Entro il', width: 110, render: v => testo(dataIt(v)) },
    { key: 'stato', label: 'Stato', width: 140, render: v => pastigliaStato(v) },
    { key: 'ore', label: 'Ore fatte', width: 110, render: (v, r) => cellaOre(r) },
    { key: 'completato_il', label: 'Data corso', width: 110, render: v => testo(dataIt(v)) },
    { key: 'attestato_url', label: 'Attestato', width: 100, render: v => linkPastiglia(v, '', 'workspace_premium') },
    { key: 'materiale_url', label: 'Materiale', width: 100, render: v => linkPastiglia(v, '', 'menu_book') }
];

const COLONNE_NORMA = [
    { key: 'titolo', label: 'Corso di norma', width: 280, classes: ['col-testo'] },
    { key: 'stato_norma', label: 'Stato', width: 150, render: v => ledNorma(v) },
    { key: 'ultimo_completamento', label: 'Ultimo corso', width: 120, render: v => testo(dataIt(v)) },
    { key: 'valida_fino', label: 'Valido fino al', width: 120, render: (v, r) => testo(v ? dataIt(v) : (r.ultimo_completamento ? 'Non scade' : '')) },
    { key: 'prossima_scadenza', label: 'Rinnovo', width: 160, render: (v, r) => r.rinnovo_assegnato ? testo('Assegnato' + (v ? ', entro il ' + dataIt(v) : '')) : '' }
];

export function disegnaMia() {
    const mie = stato.assegnazioni.filter(a => a.user_id === stato.utenteId && a.anno_piano === stato.anno);
    const piano = stato.piani.find(p => p.user_id === stato.utenteId && p.anno === stato.anno);

    tabella('mia', COLONNE_CORSI, mie, {
        vuota: `Nessun corso assegnato per il ${stato.anno}.`
    });

    const norma = stato.norma.filter(n => n.user_id === stato.utenteId)
        .sort((a, b) => a.titolo.localeCompare(b.titolo, 'it'));
    tabella('mia-norma', COLONNE_NORMA, norma, { vuota: 'Nessun corso di norma assegnato.' });

    el('miaOre').textContent = oreIt(piano ? piano.ore_piano : 0) || '0 h';
    el('miaObiettivo').textContent = piano && piano.obiettivo_ore ? oreIt(piano.obiettivo_ore) : '—';
    el('miaPercentuale').textContent = piano && piano.percentuale !== null && piano.percentuale !== undefined ? piano.percentuale + '%' : '—';
    const daConfermare = mie.filter(a => a.stato === 'dichiarata').length;
    const inRitardo = mie.filter(a => a.stato === 'in_ritardo').length;
    el('miaDaConfermare').textContent = daConfermare;
    el('miaRitardo').textContent = inRitardo;
    el('miaRitardo').classList.toggle('allarme', inRitardo > 0);
    el('miaObiettivi').hidden = !(piano && piano.obiettivi);
    el('miaObiettivi').textContent = piano && piano.obiettivi ? 'Obiettivi del piano: ' + piano.obiettivi : '';
}

let inCorso = null;

export function apriDichiarazione(bottone) {
    const a = assegnazioneDi(bottone.dataset.id);
    if (!a) return;
    inCorso = a.id;
    el('dichTitolo').textContent = a.titolo;
    el('dichOre').value = numeroInCampo(a.ore_dichiarate ?? a.ore_previste);
    el('dichData').value = a.completato_il || oggiIso();
    el('dichAttestato').value = a.attestato_url || '';
    el('dichNota').value = a.nota_dipendente || '';
    erroreDialogo('dichErrore', '');
    el('dialogoDichiara').showModal();
}

export function chiudiDichiarazione() {
    el('dialogoDichiara').close();
    inCorso = null;
}

export async function salvaDichiarazione() {
    const ore = numeroDaCampo(el('dichOre').value);
    if (!ore || ore <= 0) return erroreDialogo('dichErrore', 'Scrivi le ore spese, per esempio 4 oppure 2,5.');
    if (!el('dichData').value) return erroreDialogo('dichErrore', 'Manca la data del corso.');
    try {
        await api.dichiara(inCorso, {
            ore, data: el('dichData').value,
            attestato: el('dichAttestato').value.trim(), nota: el('dichNota').value.trim()
        });
    } catch (e) {
        return erroreDialogo('dichErrore', e.message);
    }
    chiudiDichiarazione();
    toast("Dichiarazione salvata: l'amministratore la confermerà.");
    await dopoScrittura();
}

export async function ritira(bottone) {
    const a = assegnazioneDi(bottone.dataset.id);
    if (!a) return;
    const ok = await confirmDialog({
        title: 'Ritirare la dichiarazione?',
        text: `Le ore dichiarate per «${a.titolo}» vengono tolte. Potrai dichiararle di nuovo.`,
        confirmLabel: 'Ritira'
    });
    if (!ok) return;
    try {
        await api.ritiraDichiarazione(a.id);
    } catch (e) {
        return toast(e.message);
    }
    toast('Dichiarazione ritirata.');
    await dopoScrittura();
}
