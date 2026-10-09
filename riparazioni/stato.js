
import * as api from './api.js';
import { isAdmin } from '../core/permissions.js';
import { currentUser } from '../core/auth.js';
import { eBrandInterno } from './config.js';

export const stato = {
    ruolo: null,
    gruppi: [],
    contratti: [],
    flussi: [],
    passi: [],
    passaggi: [],
    clienti: [],
    pratiche: [],
    strumenti: [],
    contrattiStrumenti: [],
    flussiStrumenti: [],
    modelli: [],
    responsabili: [],
    nomi: {},
    persone: {},
    aperti: new Set(),
    criteri: { ricerca: '', responsabile: '', led: '', soloAperti: false }
};

export function contesto() {
    const admin = isAdmin(stato.ruolo);
    const gruppi = new Set(stato.gruppi);
    return {
        admin,
        io: (currentUser() || {}).id,
        puoAnagrafica: admin || gruppi.has('commerciale'),
        puoPasso: def => !!def && (admin || gruppi.has(def.gruppo)),
        nomi: stato.nomi,
        persone: stato.persone
    };
}

export const contrattoPerId = id => stato.contratti.find(c => c.id === id) || null;
export const flussoPerId = id => stato.flussi.find(f => f.id === id) || null;
export const strumentoPerId = id => stato.strumenti.find(s => s.id === id) || null;
export const modelloPerId = id => stato.modelli.find(m => m.id === id) || null;
export const praticaPerId = id => stato.pratiche.find(p => p.id === id) || null;
export const passaggio = n => stato.passaggi.find(p => p.passo === n) || null;

export function passoFatto(flussoId, n) {
    return stato.passi.find(p => p.flusso_id === flussoId && p.passo === n) || null;
}

export function flussiDi(contrattoId) {
    return stato.flussi.filter(f => f.contratto_id === contrattoId);
}

export function strumentiDelContratto(contrattoId) {
    const ids = stato.contrattiStrumenti.filter(l => l.contratto_id === contrattoId).map(l => l.strumento_id);
    return ids.map(strumentoPerId).filter(Boolean);
}

export function strumentiDelFlusso(flussoId) {
    const ids = stato.flussiStrumenti.filter(l => l.flusso_id === flussoId).map(l => l.strumento_id);
    return ids.map(strumentoPerId).filter(Boolean);
}

export function brandDi(strumento) {
    const modello = strumento && modelloPerId(strumento.modello_id);
    return modello ? modello.brand : null;
}

export function strumentiBloccati(flusso) {
    return flusso.stato !== 'aperto' || stato.passi.some(p => p.flusso_id === flusso.id && p.passo >= 3);
}

export const fornitoreInterno = flusso => eBrandInterno(flusso.brand);

const ascoltatori = [];
export function quandoCambia(fn) {
    ascoltatori.push(fn);
}

export async function ricarica() {
    const [contratti, flussi, passi, passaggi, clienti, pratiche, strumenti,
        contrattiStrumenti, flussiStrumenti, modelli, responsabili, persone] = await Promise.all([
        api.caricaContratti(), api.caricaFlussi(), api.caricaPassi(), api.caricaPassaggi(),
        api.caricaClienti(), api.caricaPratiche(), api.caricaStrumenti(),
        api.caricaContrattiStrumenti(), api.caricaFlussiStrumenti(),
        api.caricaModelli(), api.caricaResponsabili(), api.caricaPersone()
    ]);

    Object.assign(stato, {
        contratti, flussi, passi, passaggi, clienti, pratiche, strumenti,
        contrattiStrumenti, flussiStrumenti, modelli, responsabili
    });
    stato.nomi = {};
    stato.persone = {};
    for (const p of [...persone, ...responsabili]) {
        stato.nomi[p.user_id] = p.nome;
        stato.persone[p.user_id] = p;
    }

    for (const fn of ascoltatori) fn();
}

export function mostraAvviso(testo) {
    const avviso = document.getElementById('avviso');
    avviso.textContent = testo || '';
    avviso.hidden = !testo;
}

export async function ricaricaDopoScrittura() {
    try {
        await ricarica();
        mostraAvviso('');
    } catch (e) {
        mostraAvviso(e.message);
    }
}
