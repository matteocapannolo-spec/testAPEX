
import { escapeHtml, toast } from '../core/ui.js';
import * as api from './api.js';
import { stato, personaSicDi, obbligoDi, nomeSic, dopoScrittura } from './stato.js';
import { numeroDaCampo, numeroInCampo, mansioneIt } from './config.js';
import { el, tabella, azioniCella, erroreDialogo, testo, volto, nomeObbligo } from './vista.js';

const COLONNE_PERSONE = [
    {
        key: 'persona', label: 'Persona', width: 220, classes: ['col-testo'], sticky: true,
        render: (v, r) => `<span class="persona-riga">${volto(fotoDi(r.user_id))}<strong>${testo(nomeSic(r))}</strong>` +
            (r.attiva ? '' : ' <span class="pill st-spento">Non più in azienda</span>') + '</span>',
        actions: (v, r) => azioniCella(r.id, [['modifica-persona-sic', 'edit', 'Modifica']])
    },
    { key: 'codice_fiscale', label: 'Codice fiscale', width: 180 },
    { key: 'mansione', label: 'Mansione', width: 280, classes: ['col-testo', 'col-piccola'], render: v => testo(mansioneIt(v)) },
    { key: 'guida_mezzi', label: 'Patente B', width: 90, render: v => v === true ? 'Sì' : (v === false ? 'No' : '') },
    { key: 'email', label: 'Indirizzo', width: 240, classes: ['col-testo'], render: (v, r) => testo(r.user_id ? emailDi(r.user_id) : (v || '')) },
    { key: 'account', label: 'Account', width: 150, render: (v, r) => r.user_id ? 'Collegato' : '<span class="testo-tenue">Senza accesso</span>' }
];

const COLONNE_OBBLIGHI = [
    {
        key: 'nome', label: 'Obbligo', width: 360, classes: ['col-testo'],
        render: (v, r) => `<strong>${testo(nomeObbligo(r))}</strong>` + (r.attivo ? '' : ' <span class="pill st-spento">Disattivato</span>'),
        actions: (v, r) => azioniCella(r.id, [['modifica-obbligo', 'edit', 'Modifica']])
    },
    { key: 'tipo', label: 'Tipo', width: 120, render: v => v === 'visita' ? 'Visita medica' : 'Corso' },
    { key: 'validita_mesi', label: 'Validità', width: 120, render: v => v ? testo(v % 12 === 0 ? `${v / 12} ann${v === 12 ? 'o' : 'i'}` : `${v} mesi`) : 'Dipende' },
    { key: 'ordine', label: 'Posizione', width: 100 }
];

function fotoDi(userId) {
    const a = userId && stato.account.find(x => x.user_id === userId);
    return a ? a.avatar : null;
}

function emailDi(userId) {
    const a = stato.account.find(x => x.user_id === userId);
    return a ? a.email : 'collegato';
}

export function disegnaAnagrafica() {
    const tutte = el('anagMostra').value === 'tutte';
    const righe = stato.anagrafica.filter(p => tutte || p.attiva)
        .sort((a, b) => nomeSic(a).localeCompare(nomeSic(b), 'it'));
    tabella('anag', COLONNE_PERSONE, righe, { vuota: 'Nessuna persona.' });
}

export function disegnaObblighi() {
    tabella('obbl', COLONNE_OBBLIGHI, stato.obblighi, { vuota: 'Nessun obbligo.' });
}


let personaInCorso = null;

export function apriPersonaSic(bottone) {
    const p = bottone && bottone.dataset.id ? personaSicDi(bottone.dataset.id) : null;
    personaInCorso = p ? p.id : null;
    el('psTitolo').textContent = p ? nomeSic(p) : 'Nuova persona';
    const collegata = Boolean(p && p.user_id);
    for (const id of ['psCognome', 'psNome']) {
        el(id).disabled = collegata;
    }
    el('psCognome').value = p ? p.cognome : '';
    el('psNome').value = p ? p.nome : '';
    el('psCf').value = p && p.codice_fiscale ? p.codice_fiscale : '';
    el('psMansione').value = p && p.mansione ? p.mansione : '';
    el('psGuida').value = p && p.guida_mezzi === true ? 'si' : (p && p.guida_mezzi === false ? 'no' : '');
    el('psNote').value = p && p.note ? p.note : '';
    el('psAttiva').checked = p ? p.attiva : true;

    const liberi = stato.account.filter(a => !a.persona_id || (p && a.persona_id === p.id));
    const voci = liberi.map(a => `<option value="${escapeHtml(a.user_id)}">${escapeHtml(a.nome + ' — ' + a.email)}</option>`);
    el('psAccount').innerHTML = '<option value="">Senza accesso</option>' + voci.join('');
    el('psAccount').value = p && p.user_id ? p.user_id : '';

    erroreDialogo('psErrore', '');
    el('dialogoPersonaSic').showModal();
}

export async function salvaPersonaSic() {
    const cf = el('psCf').value.replace(/\s/g, '').toUpperCase();
    const campi = {
        cognome: el('psCognome').value.trim(), nome: el('psNome').value.trim(),
        codice_fiscale: cf || null, mansione: mansioneIt(el('psMansione').value) || null,
        guida_mezzi: el('psGuida').value === 'si' ? true : (el('psGuida').value === 'no' ? false : null),
        user_id: el('psAccount').value || null, note: el('psNote').value.trim() || null,
        attiva: el('psAttiva').checked
    };
    if (!campi.cognome || !campi.nome) return erroreDialogo('psErrore', 'Scrivi cognome e nome.');
    if (cf && !/^[A-Z0-9]{16}$/.test(cf)) return erroreDialogo('psErrore', 'Il codice fiscale deve avere 16 lettere e cifre.');
    try {
        await api.salvaPersonaSic(personaInCorso, campi);
    } catch (e) {
        return erroreDialogo('psErrore', e.message);
    }
    el('dialogoPersonaSic').close();
    toast('Persona salvata.');
    await dopoScrittura();
}


let obbligoInCorso = null;

export function apriObbligo(bottone) {
    const o = bottone && bottone.dataset.id ? obbligoDi(bottone.dataset.id) : null;
    obbligoInCorso = o ? o.id : null;
    el('obTitolo').textContent = o ? 'Modifica obbligo' : 'Nuovo obbligo';
    el('obNome').value = o ? o.nome : '';
    el('obEmoji').value = o && o.emoji ? o.emoji : '';
    el('obTipo').value = o ? o.tipo : 'corso';
    el('obValidita').value = o && o.validita_mesi ? o.validita_mesi : '';
    el('obOre').value = numeroInCampo(o ? o.ore_previste : null);
    el('obOrdine').value = o ? o.ordine : (Math.max(0, ...stato.obblighi.map(x => x.ordine)) + 10);
    el('obAttivo').checked = o ? o.attivo : true;
    erroreDialogo('obErrore', '');
    el('dialogoObbligo').showModal();
}

export async function salvaObbligo() {
    const nome = el('obNome').value.trim();
    const validita = numeroDaCampo(el('obValidita').value);
    const ore = numeroDaCampo(el('obOre').value);
    if (!nome) return erroreDialogo('obErrore', "Scrivi il nome dell'obbligo.");
    if (validita !== null && (!Number.isInteger(validita) || validita < 1 || validita > 240)) return erroreDialogo('obErrore', 'La validità si scrive in mesi interi, per esempio 60.');
    if (Number.isNaN(ore) || (ore !== null && ore <= 0)) return erroreDialogo('obErrore', 'Le ore devono essere un numero maggiore di zero.');
    try {
        await api.salvaObbligo(obbligoInCorso, {
            nome, emoji: el('obEmoji').value.trim() || null, tipo: el('obTipo').value, validita_mesi: validita, ore_previste: ore,
            ordine: Number(el('obOrdine').value) || 100, attivo: el('obAttivo').checked
        });
    } catch (e) {
        return erroreDialogo('obErrore', e.message);
    }
    el('dialogoObbligo').close();
    toast('Obbligo salvato.');
    await dopoScrittura();
}

