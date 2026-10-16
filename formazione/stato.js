
import { isAdmin } from '../core/permissions.js';
import * as api from './api.js';
import { annoCorrente, cognomePrima } from './config.js';

export const stato = {
    ruolo: null,
    utenteId: null,
    scheda: 'mia',
    anno: annoCorrente(),
    corsi: [],
    assegnazioni: [],
    aree: { formazione: false, sicurezza: false },
    piani: [],
    persone: [],
    reparti: [],
    stat: { mesi: [], reparti: [], costi: [] },
    scadenzario: [],
    obblighi: [],
    anagrafica: [],
    costiSic: [],
    account: []
};

const ascoltatori = [];

export function quandoCambia(fn) {
    ascoltatori.push(fn);
}

export function avvisa() {
    ascoltatori.forEach(fn => fn());
}

export function admin() {
    return isAdmin(stato.ruolo) && (stato.aree.formazione || stato.aree.sicurezza);
}

export async function ricarica() {
    const f = stato.aree.formazione, s = stato.aree.sicurezza;
    const vuoto = Promise.resolve([]);
    const [corsi, assegnazioni, piani, scadenzario, obblighi, persone, reparti, stat, anagrafica, costiSic, account] =
        await Promise.all([
            api.caricaCorsi(), api.caricaAssegnazioni(), api.caricaPiani(),
            api.caricaScadenzario(), api.caricaObblighi(),
            f ? api.caricaPersone() : vuoto,
            f ? api.caricaReparti() : vuoto,
            f ? api.caricaStatistiche() : Promise.resolve(null),
            s ? api.caricaAnagrafica() : vuoto,
            s ? api.caricaCostiSicurezza() : vuoto,
            s ? api.caricaAccount() : vuoto
        ]);
    const ordinate = persone.map(p => ({ ...p, nome: cognomePrima(p.nome, p.cognome) }))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
    Object.assign(stato, { corsi, assegnazioni, piani, scadenzario, obblighi, persone: ordinate, reparti, anagrafica, costiSic, account });
    stato.stat = stat || { mesi: [], reparti: [], costi: [] };
    avvisa();
}

export async function dopoScrittura() {
    try {
        await ricarica();
    } catch (e) {
        mostraAvviso(e.message);
    }
}

export function nomeDi(userId) {
    const p = stato.persone.find(x => x.user_id === userId);
    return p ? p.nome : '—';
}

export function repartoDi(userId) {
    const p = stato.persone.find(x => x.user_id === userId);
    const r = p && stato.reparti.find(x => x.id === p.reparto_id);
    return r ? r.nome : '';
}

export function corsoDi(id) {
    return stato.corsi.find(c => c.id === Number(id)) || null;
}

export function assegnazioneDi(id) {
    return stato.assegnazioni.find(a => a.id === Number(id)) || null;
}

export function personeAttive() {
    return stato.persone.filter(p => p.attivo);
}

export function anniDisponibili() {
    const anni = new Set([annoCorrente(), annoCorrente() + 1]);
    stato.assegnazioni.forEach(a => anni.add(a.anno_piano));
    stato.piani.forEach(p => anni.add(p.anno));
    stato.stat.mesi.forEach(m => anni.add(m.anno));
    return [...anni].filter(Boolean).sort((a, b) => b - a);
}

export function mostraAvviso(testo) {
    const el = document.getElementById('avviso');
    el.textContent = testo || '';
    el.hidden = !testo;
}

export function personaSicDi(id) {
    return stato.anagrafica.find(p => p.id === Number(id)) || null;
}

export function obbligoDi(id) {
    return stato.obblighi.find(o => o.id === Number(id)) || null;
}

export function casellaDi(personaId, obbligoId) {
    return stato.scadenzario.find(s => s.persona_id === Number(personaId) && s.obbligo_id === Number(obbligoId)) || null;
}

export function nomeSic(p) {
    if (!p) return '';
    const a = p.user_id && stato.account.find(x => x.user_id === p.user_id);
    return a && a.nome ? cognomePrima(a.nome, p.cognome) : `${p.cognome} ${p.nome}`;
}
