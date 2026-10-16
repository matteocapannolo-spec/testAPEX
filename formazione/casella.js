
import { toast } from '../core/ui.js';
import * as api from './api.js';
import { personaSicDi, obbligoDi, casellaDi, nomeSic, dopoScrittura } from './stato.js';
import { STATI_SIC, APPUNTAMENTI, dataIt, oreIt, euroIt, oggiIso, numeroDaCampo, numeroInCampo } from './config.js';
import { el, opzioni, erroreDialogo, linkPastiglia, testo, nomeObbligo } from './vista.js';

let inCorso = null;

function intero(campo, nome) {
    const v = numeroDaCampo(el(campo).value);
    if (v !== null && (!Number.isInteger(v) || v < 1 || v > 240)) throw new Error(`${nome} si scrive in mesi interi, per esempio 36.`);
    return v;
}

function decimale(campo, nome) {
    const v = numeroDaCampo(el(campo).value);
    if (Number.isNaN(v) || (v !== null && v < 0)) throw new Error(`${nome} deve essere un numero, per esempio 8 oppure 2,5.`);
    return v;
}

export async function apriCasella(bottone) {
    const [personaId, obbligoId] = String(bottone.dataset.id).split('|').map(Number);
    const p = personaSicDi(personaId), o = obbligoDi(obbligoId);
    if (!p || !o) return;
    const s = casellaDi(personaId, obbligoId);
    inCorso = { personaId, obbligoId };

    el('casTitolo').textContent = `${nomeSic(p)} — ${nomeObbligo(o)}`;
    const statoAttuale = s ? s.stato : 'non_richiesto';
    el('casStato').textContent = STATI_SIC[statoAttuale].etichetta +
        (s && s.ultimo_fatto ? ` · ultima volta il ${dataIt(s.ultimo_fatto)}` : '') +
        (s && s.scadenza ? ` · scade il ${dataIt(s.scadenza)}` : '');

    const validita = s ? (s.validita_mesi ?? s.validita_effettiva) : o.validita_mesi;
    el('casFatto').value = oggiIso();
    el('casOreFatte').value = numeroInCampo(o.ore_previste);
    el('casCosto').value = '';
    el('casValiditaFatto').value = '';
    el('casValiditaFatto').placeholder = validita ? `${validita} (${validita % 12 ? 'mesi' : validita / 12 + ' anni'})` : 'Non scade';
    el('casEnte').value = '';
    el('casAttestato').value = '';

    el('casRichiesto').checked = s ? s.richiesto : true;
    el('casScadenza').value = s && s.scadenza ? s.scadenza : '';
    el('casValidita').value = s && s.validita_mesi ? s.validita_mesi : '';
    el('casValidita').placeholder = o.validita_mesi ? `Quella dell'obbligo: ${o.validita_mesi}` : 'Non scade';
    el('casOre').value = numeroInCampo(s ? s.ore : null);
    opzioni(el('casAppuntamento'), Object.entries(APPUNTAMENTI).map(([k, a]) => [k, a.etichetta]), { vuota: 'Nessuno' });
    el('casAppuntamento').value = s && s.appuntamento ? s.appuntamento : '';
    el('casDataApp').value = s && s.data_appuntamento ? s.data_appuntamento : '';
    el('casNote').value = s && s.note ? s.note : '';

    erroreDialogo('casErrore', '');
    el('casStorico').innerHTML = '<p class="elenco-vuoto">Caricamento…</p>';
    el('dialogoCasella').showModal();
    await disegnaStorico();
}

async function disegnaStorico() {
    const { personaId, obbligoId } = inCorso;
    try {
        const righe = await api.caricaRegistrazioni(personaId, obbligoId);
        if (!inCorso || inCorso.personaId !== personaId || inCorso.obbligoId !== obbligoId) return;
        el('casStorico').innerHTML = righe.length ? righe.map(r =>
            `<div class="riga-storico"><strong>${testo(dataIt(r.fatto_il))}</strong>` +
            [r.ore ? oreIt(r.ore) : '', r.costo ? euroIt(r.costo) : '', r.ente || '', r.note || ''].filter(Boolean).map(x => `<span>${testo(x)}</span>`).join('') +
            linkPastiglia(r.attestato_url, '', 'workspace_premium') + `</div>`).join('')
            : '<p class="elenco-vuoto">Nessun record al momento.</p>';
    } catch (e) {
        el('casStorico').innerHTML = `<p class="elenco-vuoto">${testo(e.message)}</p>`;
    }
}

export async function registraFatto() {
    let riga;
    try {
        if (!el('casFatto').value) throw new Error('Manca il giorno in cui è stato fatto.');
        const url = el('casAttestato').value.trim();
        if (url && !/^https?:\/\//i.test(url)) throw new Error("Il link all'attestato deve cominciare con https://");
        const ore = decimale('casOreFatte', 'Le ore');
        riga = {
            persona_id: inCorso.personaId, obbligo_id: inCorso.obbligoId, fatto_il: el('casFatto').value,
            ore: ore || null, costo: decimale('casCosto', 'Il costo'),
            validita_mesi: intero('casValiditaFatto', 'La validità'),
            ente: el('casEnte').value.trim() || null, attestato_url: url || null
        };
        await api.registraFatto(riga);
    } catch (e) {
        return erroreDialogo('casErrore', e.message);
    }
    el('dialogoCasella').close();
    toast('Registrato: la scadenza è stata ricalcolata.');
    await dopoScrittura();
}

export async function salvaCasella() {
    try {
        const ore = decimale('casOre', 'Le ore');
        await api.salvaScadenza(inCorso.personaId, inCorso.obbligoId, {
            richiesto: el('casRichiesto').checked,
            scadenza: el('casScadenza').value || null,
            validita_mesi: intero('casValidita', 'La validità'),
            ore: ore || null,
            appuntamento: el('casAppuntamento').value || null,
            data_appuntamento: el('casDataApp').value || null,
            note: el('casNote').value.trim() || null
        });
    } catch (e) {
        return erroreDialogo('casErrore', e.message);
    }
    el('dialogoCasella').close();
    toast('Casella salvata.');
    await dopoScrittura();
}
