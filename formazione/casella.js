
import { toast } from '../core/ui.js';
import * as api from './api.js';
import { personaSicDi, obbligoDi, casellaDi, nomeSic, dopoScrittura } from './stato.js';
import { STATI_SIC, APPUNTAMENTI, dataIt, oggiIso, numeroDaCampo, numeroInCampo } from './config.js';
import { el, opzioni, erroreDialogo, testo, nomeObbligo } from './vista.js';
import { disegnaStorico, pulisciModulo, inModifica, chiudiModifica } from './storico.js';

export const inCorso = { personaId: null, obbligoId: null };

export function intero(campo, nome) {
    const v = numeroDaCampo(el(campo).value);
    if (v !== null && (!Number.isInteger(v) || v < 1 || v > 240)) throw new Error(`${nome} si scrive in mesi interi, per esempio 36.`);
    return v;
}

export function decimale(campo, nome) {
    const v = numeroDaCampo(el(campo).value);
    if (Number.isNaN(v) || (v !== null && v < 0)) throw new Error(`${nome} deve essere un numero, per esempio 8 oppure 2,5.`);
    return v;
}

const MAX_GIORNATE = 5;

const hm = o => (o ? String(o).slice(0, 5) : '');

function disegnaGiornate(giornate) {
    const n = Math.max(1, Math.min(MAX_GIORNATE, giornate.length || 1));
    el('casGiornate').value = String(n);
    const intestazione = '<span class="campo-label">Data</span><span class="campo-label">Dalle</span><span class="campo-label">Alle</span>';
    el('casDate').innerHTML = intestazione + Array.from({ length: n }, (x, i) => {
        const g = giornate[i] || {};
        return `<input type="date" class="edit-input" data-giornata="${i}" aria-label="Giornata ${i + 1}" value="${testo(g.data || '')}">` +
            `<input type="time" class="edit-input" data-inizio="${i}" aria-label="Giornata ${i + 1}, dalle" value="${testo(hm(g.inizio))}">` +
            `<input type="time" class="edit-input" data-fine="${i}" aria-label="Giornata ${i + 1}, alle" value="${testo(hm(g.fine))}">`;
    }).join('');
}

export function cambiaGiornate() {
    disegnaGiornate(Array.from({ length: Number(el('casGiornate').value) }, (x, i) => leggiGiornate(true)[i] || {}));
}

function leggiGiornate(conVuote = false) {
    const campo = (attr, i) => el('casDate').querySelector(`[${attr}="${i}"]`).value;
    const giornate = [...el('casDate').querySelectorAll('input[type=date]')].map((x, i) =>
        ({ data: x.value, inizio: campo('data-inizio', i), fine: campo('data-fine', i) }));
    return conVuote ? giornate : giornate.filter(g => g.data).sort((a, b) => a.data.localeCompare(b.data));
}

function giornateDi(s) {
    if (!s) return [];
    const date = s.date_appuntamento || (s.data_appuntamento ? [s.data_appuntamento] : []);
    const lista = (v, i) => (Array.isArray(v) ? v[i] : v) || '';
    return date.map((data, i) => ({ data, inizio: lista(s.ora_inizio, i), fine: lista(s.ora_fine, i) }));
}

export async function apriCasella(bottone) {
    const [personaId, obbligoId] = String(bottone.dataset.id).split('|').map(Number);
    const p = personaSicDi(personaId), o = obbligoDi(obbligoId);
    if (!p || !o) return;
    const s = casellaDi(personaId, obbligoId);
    Object.assign(inCorso, { personaId, obbligoId });

    el('casTitolo').textContent = `${nomeSic(p)} — ${nomeObbligo(o)}`;
    const statoAttuale = s ? s.stato : 'non_richiesto';
    el('casStato').textContent = STATI_SIC[statoAttuale].etichetta +
        (s && s.ultimo_fatto ? ` · ultima volta il ${dataIt(s.ultimo_fatto)}` : '') +
        (s && s.scadenza ? ` · scade il ${dataIt(s.scadenza)}` : '');

    pulisciModulo(o, s);

    el('casRichiesto').checked = s ? s.richiesto : true;
    el('casScadenza').value = s && s.scadenza ? s.scadenza : '';
    el('casValidita').value = s && s.validita_mesi ? s.validita_mesi : '';
    el('casValidita').placeholder = o.validita_mesi ? `Quella dell'obbligo: ${o.validita_mesi}` : 'Non scade';
    el('casOre').value = numeroInCampo(s ? s.ore : null);
    opzioni(el('casAppuntamento'), Object.entries(APPUNTAMENTI).map(([k, a]) => [k, a.etichetta]), { vuota: 'Nessuno' });
    el('casAppuntamento').value = s && s.appuntamento ? s.appuntamento : '';
    opzioni(el('casGiornate'), Array.from({ length: MAX_GIORNATE }, (x, i) => [i + 1, i === 0 ? '1 giornata' : `${i + 1} giornate`]));
    disegnaGiornate(giornateDi(s));
    el('casNote').value = s && s.note ? s.note : '';

    erroreDialogo('casErrore', '');
    el('casStorico').innerHTML = '<p class="elenco-vuoto">Caricamento…</p>';
    el('dialogoCasella').showModal();
    await disegnaStorico();
}

export async function registraFatto() {
    try {
        if (!el('casFatto').value) throw new Error('Manca il giorno in cui è stato fatto.');
        const url = el('casAttestato').value.trim();
        if (url && !/^https?:\/\//i.test(url)) throw new Error("Il link all'attestato deve cominciare con https://");
        const ore = decimale('casOreFatte', 'Le ore');
        const campi = {
            fatto_il: el('casFatto').value, ore: ore || null, costo: decimale('casCosto', 'Il costo'),
            validita_mesi: intero('casValiditaFatto', 'La validità'),
            ente: el('casEnte').value.trim() || null, attestato_url: url || null
        };
        const id = inModifica();
        if (id) await api.aggiornaRegistrazione(id, campi);
        else await api.registraFatto({ persona_id: inCorso.personaId, obbligo_id: inCorso.obbligoId, ...campi });
        chiudiModifica();
        toast(id ? 'Voce corretta: la scadenza è stata ricalcolata.' : 'Registrato: la scadenza è stata ricalcolata.');
    } catch (e) {
        return erroreDialogo('casErrore', e.message);
    }
    el('dialogoCasella').close();
    await dopoScrittura();
}

export async function salvaCasella() {
    try {
        const ore = decimale('casOre', 'Le ore');
        const giornate = leggiGiornate();
        const sbagliata = giornate.find(g => g.inizio && g.fine && g.fine <= g.inizio);
        if (sbagliata) throw new Error(`Il ${dataIt(sbagliata.data)} l'orario di fine deve venire dopo quello di inizio.`);
        const date = giornate.map(g => g.data);
        const conOrario = giornate.some(g => g.inizio || g.fine);
        await api.salvaScadenza(inCorso.personaId, inCorso.obbligoId, {
            richiesto: el('casRichiesto').checked,
            scadenza: el('casScadenza').value || null,
            validita_mesi: intero('casValidita', 'La validità'),
            ore: ore || null,
            appuntamento: el('casAppuntamento').value || null,
            data_appuntamento: date[0] || null,
            date_appuntamento: date.length ? date : null,
            ora_inizio: conOrario ? giornate.map(g => g.inizio || null) : null,
            ora_fine: conOrario ? giornate.map(g => g.fine || null) : null,
            note: el('casNote').value.trim() || null
        });
    } catch (e) {
        return erroreDialogo('casErrore', e.message);
    }
    el('dialogoCasella').close();
    toast('Casella salvata.');
    await dopoScrittura();
}
