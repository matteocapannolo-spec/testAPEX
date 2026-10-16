
import * as api from './api.js';
import { isAdmin } from '../core/permissions.js';
import { currentUser } from '../core/auth.js';
import { eBrandInterno, aggiungiMesi } from './config.js';

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
    contatti: [],
    note: [],
    avvisi: [],
    cartucce: [],
    luoghi: [],
    colleghi: [],
    modelli: [],
    responsabili: [],
    nomi: {},
    persone: {},
    aperti: new Set(),
    criteri: { ricerca: '', responsabile: '', scadenza: '', soloAperti: false }
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
export const passaggiDi = tipo => stato.passaggi.filter(p => p.tipo === (tipo || 'riparazione')).sort((a, b) => a.ordine - b.ordine);
export const passaggio = (tipo, n) => stato.passaggi.find(p => p.tipo === (tipo || 'riparazione') && p.passo === n) || null;
export const cartucciaPerId = id => stato.cartucce.find(c => c.id === id) || null;
export const cartucceDi = contrattoId => stato.cartucce.filter(c => c.contratto_id === contrattoId);
export const nomeLuogo = id => (stato.luoghi.find(l => l.id === id) || {}).nome || '';

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

export const contattiDi = contrattoId => stato.contatti.filter(c => c.contratto_id === contrattoId);

export const noteDelFlusso = flussoId => stato.note.filter(n => n.flusso_id === flussoId);
export const noteDelloStrumento = strumentoId => stato.note.filter(n => n.strumento_id === strumentoId);

export const promemoriaAperti = strumentoId => noteDelloStrumento(strumentoId).filter(n => n.promemoria && !n.chiuso_il);

export function prossimoIntervento(s) {
    return s && s.ultimo_intervento && s.intervallo_mesi ? aggiungiMesi(s.ultimo_intervento, s.intervallo_mesi) : '';
}

const GRAVITA = { scaduto: 3, tre_mesi: 2, sei_mesi: 1, manutenzione: 0, refill: 0 };
export function avvisiDaContattare() {
    const peggiore = new Map();
    for (const a of stato.avvisi) {
        if (!a.contratto_id) continue;
        const c = contrattoPerId(a.contratto_id);
        if (!c || c.stato !== 'attivo' || c.data_conclusione !== a.scadenza) continue;
        const prima = peggiore.get(a.contratto_id);
        if (!prima || GRAVITA[a.livello] > GRAVITA[prima.livello]) peggiore.set(a.contratto_id, a);
    }
    const contratti = [...peggiore.values()].filter(a => !a.contattato_il);
    const strumenti = stato.avvisi.filter(a => a.strumento_id && !a.contattato_il
        && prossimoIntervento(strumentoPerId(a.strumento_id)) === a.scadenza);
    const cartucce = stato.avvisi.filter(a => a.cartuccia_id && !a.contattato_il
        && (cartucciaPerId(a.cartuccia_id) || {}).refill_scadenza === a.scadenza);
    return [...contratti, ...strumenti, ...cartucce].sort((a, b) => a.scadenza.localeCompare(b.scadenza));
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
        contrattiStrumenti, flussiStrumenti, contatti, note, avvisi, cartucce, luoghi, colleghi, modelli, responsabili, persone] = await Promise.all([
        api.caricaContratti(), api.caricaFlussi(), api.caricaPassi(), api.caricaPassaggi(),
        api.caricaClienti(), api.caricaPratiche(), api.caricaStrumenti(),
        api.caricaContrattiStrumenti(), api.caricaFlussiStrumenti(), api.caricaContatti(), api.caricaNote(), api.caricaAvvisi(),
        api.caricaCartucce(), api.caricaLuoghi(), api.caricaColleghi(),
        api.caricaModelli(), api.caricaResponsabili(), api.caricaPersone()
    ]);

    Object.assign(stato, {
        contratti, flussi, passi, passaggi, clienti, pratiche, strumenti,
        contrattiStrumenti, flussiStrumenti, contatti, note, avvisi, cartucce, luoghi, colleghi, modelli, responsabili
    });
    stato.nomi = {};
    stato.persone = {};
    for (const p of [...colleghi, ...persone, ...responsabili]) {
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
