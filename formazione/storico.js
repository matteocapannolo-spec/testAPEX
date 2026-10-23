
import { toast, confirmDialog } from '../core/ui.js';
import * as api from './api.js';
import { dopoScrittura } from './stato.js';
import { dataIt, oreIt, euroIt, oggiIso, numeroInCampo } from './config.js';
import { el, linkPastiglia, testo, erroreDialogo } from './vista.js';
import { inCorso } from './casella.js';

let voci = [];
let modifica = null;

export function inModifica() {
    return modifica;
}

export function pulisciModulo(o, s) {
    modifica = null;
    const validita = s ? (s.validita_mesi ?? s.validita_effettiva) : o.validita_mesi;
    el('casFatto').value = oggiIso();
    el('casOreFatte').value = numeroInCampo(o.ore_previste);
    el('casCosto').value = '';
    el('casValiditaFatto').value = '';
    el('casValiditaFatto').placeholder = validita ? `${validita} (${validita % 12 ? 'mesi' : validita / 12 + ' anni'})` : 'Non scade';
    el('casEnte').value = '';
    el('casAttestato').value = '';
    mostraModo();
}

function mostraModo() {
    el('casTitoloFatto').textContent = modifica ? 'Correggi la voce dello storico' : 'Segna come fatto';
    el('casRegistra').innerHTML = modifica
        ? '<span class="material-symbols-outlined">save</span> Salva modifica'
        : '<span class="material-symbols-outlined">task_alt</span> Registra';
    el('casAnnullaModifica').hidden = !modifica;
}

export function chiudiModifica() {
    modifica = null;
    mostraModo();
}

export async function disegnaStorico() {
    const { personaId, obbligoId } = inCorso;
    try {
        const righe = await api.caricaRegistrazioni(personaId, obbligoId);
        if (inCorso.personaId !== personaId || inCorso.obbligoId !== obbligoId) return;
        voci = righe;
        el('casStorico').innerHTML = righe.length ? righe.map(r =>
            `<div class="riga-storico"><strong>${testo(dataIt(r.fatto_il))}</strong>` +
            [r.ore ? oreIt(r.ore) : '', r.costo ? euroIt(r.costo) : '', r.ente || '', r.note || ''].filter(Boolean).map(x => `<span>${testo(x)}</span>`).join('') +
            linkPastiglia(r.attestato_url, '', 'workspace_premium') +
            `<span class="azioni-storico">` +
            `<button type="button" class="action-btn" data-action="modifica-registrazione" data-id="${testo(r.id)}" title="Modifica"><span class="material-symbols-outlined">edit</span></button>` +
            `<button type="button" class="action-btn" data-action="elimina-registrazione" data-id="${testo(r.id)}" title="Elimina"><span class="material-symbols-outlined">delete</span></button>` +
            `</span></div>`).join('')
            : '<p class="elenco-vuoto">Nessun record al momento.</p>';
    } catch (e) {
        el('casStorico').innerHTML = `<p class="elenco-vuoto">${testo(e.message)}</p>`;
    }
}

export function modificaRegistrazione(bottone) {
    const r = voci.find(v => v.id === Number(bottone.dataset.id));
    if (!r) return;
    modifica = r.id;
    el('casFatto').value = r.fatto_il || '';
    el('casOreFatte').value = numeroInCampo(r.ore);
    el('casCosto').value = numeroInCampo(r.costo);
    el('casValiditaFatto').value = r.validita_mesi || '';
    el('casEnte').value = r.ente || '';
    el('casAttestato').value = r.attestato_url || '';
    erroreDialogo('casErrore', '');
    mostraModo();
    el('casFatto').focus();
}

export async function eliminaRegistrazione(bottone) {
    const r = voci.find(v => v.id === Number(bottone.dataset.id));
    if (!r) return;
    const ok = await confirmDialog({
        title: 'Eliminare questa voce?',
        text: `La voce del ${dataIt(r.fatto_il)} esce dallo storico e la scadenza si ricalcola sulle altre.`,
        confirmLabel: 'Elimina', danger: true
    });
    if (!ok) return;
    try {
        await api.eliminaRegistrazione(r.id);
    } catch (e) {
        return erroreDialogo('casErrore', e.message);
    }
    if (modifica === r.id) chiudiModifica();
    toast('Voce eliminata.');
    await dopoScrittura();
    await disegnaStorico();
}
