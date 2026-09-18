
import { escapeHtml, toast } from '../core/ui.js';
import { aggiorna } from './api.js';
import { stato, progettoPerId, contesto, ricarica } from './stato.js';
import { FASI, STATI_DDT, BUSINESS_UNIT } from './config.js';
import { colonneDi } from './colonne.js';
import { voceResponsabile } from './persone.js';

const el = id => document.getElementById(id);

const EDITOR = {
    fase: { tipo: 'scelta', voci: FASI },
    status_ddt: { tipo: 'scelta', voci: STATI_DDT, vuoto: true },
    business_unit: { tipo: 'scelta', voci: BUSINESS_UNIT },
    pm_user_id: { tipo: 'responsabile' },

    documenti_cliente: { tipo: 'booleano' },
    consegna_in_piu_parti: { tipo: 'booleano' },
    service_attivo: { tipo: 'booleano' },
    service_rinnovo: { tipo: 'booleano' },

    qt_ordini: { tipo: 'intero' },
    tempo_consegna_giorni: { tipo: 'intero' },
    service_rinnovo_anni: { tipo: 'intero' },
    ricavo_totale: { tipo: 'decimale' },
    costo_totale: { tipo: 'decimale' },

    descrizione: { tipo: 'testolungo' }
};

const CALCOLATE = new Set([
    'scadenza', 'giorni_effettivi', 'stato_fatturazione', 'prossima_fatturazione',
    'mano_opera', 'mod_fatturazione', 'service_periodo',
    'status'
]);

let inModifica = null;

function specDi(campo) {
    if (EDITOR[campo]) return EDITOR[campo];
    if (campo.startsWith('data_') || campo === 'service_inizio' || campo === 'service_fine') {
        return { tipo: 'data' };
    }
    return { tipo: 'testo' };
}

function etichettaDi(campo) {
    const colonna = colonneDi(contesto()).find(c => c.key === campo);
    return colonna ? (colonna.label || colonna.key) : campo;
}

function editorPerCampo(campo, valore) {
    const spec = specDi(campo);

    if (spec.tipo === 'scelta') {
        const vuota = spec.vuoto ? '<option value="">— non indicato —</option>' : '';
        return vuota + Object.entries(spec.voci)
            .map(([k, v]) => `<option value="${escapeHtml(k)}"${k === valore ? ' selected' : ''}>${escapeHtml(v)}</option>`).join('');
    }

    return '';
}

function elencoResponsabili(valore) {
    const scelto = valore || '';

    const nessuno = voceResponsabile('', '— nessuno —',
        { icona: 'person_off', spento: true, scelto: scelto === '', azione: 'scegli-responsabile' });

    const persone = stato.responsabili.map(r => voceResponsabile(r.user_id, r.nome,
        { persona: r, scelto: r.user_id === scelto, azione: 'scegli-responsabile' })).join('');

    const vuoto = stato.responsabili.length ? ''
        : '<p class="elenco-vuoto">Nessuno ha la spunta «PM» sul modulo Progetti. Si mette dal pannello Admin, sulla scheda della persona.</p>';

    return `<input type="hidden" id="campoValore" value="${escapeHtml(scelto)}">`
        + `<div class="elenco-responsabili" id="elencoResponsabili">${nessuno}${persone}</div>`
        + vuoto;
}

export function scegliResponsabile(elemento) {
    for (const v of el('elencoResponsabili').querySelectorAll('.voce-responsabile')) {
        v.classList.toggle('scelto', v === elemento);
    }
    el('campoValore').value = elemento.dataset.valore || '';
}

function disegnaEditor(campo, valore) {
    const spec = specDi(campo);
    const contenitore = el('campoEditor');

    if (spec.tipo === 'scelta') {
        contenitore.innerHTML = `<select class="standard-select" id="campoValore">${editorPerCampo(campo, valore)}</select>`;
        return;
    }

    if (spec.tipo === 'responsabile') {
        contenitore.innerHTML = elencoResponsabili(valore);
        return;
    }

    if (spec.tipo === 'booleano') {
        const opz = [['', '— non indicato —'], ['true', 'Sì'], ['false', 'No']];
        contenitore.innerHTML = `<select class="standard-select" id="campoValore">` + opz.map(([k, t]) =>
            `<option value="${k}"${String(valore ?? '') === k ? ' selected' : ''}>${escapeHtml(t)}</option>`).join('') + `</select>`;
        return;
    }

    if (spec.tipo === 'testolungo') {
        contenitore.innerHTML = `<textarea class="form-textarea" id="campoValore" rows="5" spellcheck="false">${escapeHtml(valore || '')}</textarea>`;
        return;
    }

    const tipo = spec.tipo === 'intero' || spec.tipo === 'decimale' ? 'number'
        : spec.tipo === 'data' ? 'date' : 'text';
    const passo = spec.tipo === 'decimale' ? ' step="0.01"' : spec.tipo === 'intero' ? ' step="1"' : '';
    contenitore.innerHTML = `<input class="edit-input" type="${tipo}" id="campoValore"${passo} value="${escapeHtml(valore ?? '')}" autocomplete="off" spellcheck="false">`;
}


export function apriCampo(elemento) {
    if (!contesto().puoScrivere) return;

    const td = elemento.closest('td');
    const tr = elemento.closest('tr');
    const campo = td.dataset.col;
    const progetto = progettoPerId(tr.dataset.index);
    if (!progetto || CALCOLATE.has(campo)) return;

    inModifica = { id: progetto.id, campo };
    el('campoTitolo').textContent = etichettaDi(campo);
    el('campoSottotitolo').textContent = `Progetto ${progetto.codice}`;
    el('campoErrore').hidden = true;
    disegnaEditor(campo, progetto[campo]);
    el('dialogoCampo').showModal();
}

export function chiudiCampo() {
    inModifica = null;
    el('dialogoCampo').close();
}

export async function salvaCampo() {
    if (!inModifica) return;
    const grezzo = el('campoValore').value;
    const spec = EDITOR[inModifica.campo] || {};

    let valore = grezzo === '' ? null : grezzo;
    if (valore !== null) {
        if (spec.tipo === 'booleano') valore = grezzo === 'true';
        else if (spec.tipo === 'intero') valore = parseInt(grezzo, 10);
        else if (spec.tipo === 'decimale') valore = Number(grezzo);
    }

    try {
        await aggiorna('progetti', inModifica.id, { [inModifica.campo]: valore });
        chiudiCampo();
        toast('Salvato');
        await ricarica();
    } catch (e) {
        el('campoErrore').textContent = e.message;
        el('campoErrore').hidden = false;
    }
}
