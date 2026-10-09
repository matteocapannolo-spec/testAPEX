
import { isAdmin } from '../core/permissions.js';
import * as api from './api.js';
import { annoCorrente } from './config.js';

export const stato = {
    ruolo: null,
    utenteId: null,
    scheda: 'mia',
    anno: annoCorrente(),
    corsi: [],
    assegnazioni: [],
    norma: [],
    piani: [],
    persone: [],
    reparti: [],
    stat: { mesi: [], reparti: [], costi: [] }
};

const ascoltatori = [];

export function quandoCambia(fn) {
    ascoltatori.push(fn);
}

export function avvisa() {
    ascoltatori.forEach(fn => fn());
}

export function admin() {
    return isAdmin(stato.ruolo);
}

export async function ricarica() {
    const comuni = [api.caricaCorsi(), api.caricaAssegnazioni(), api.caricaNorma(), api.caricaPiani()];
    const soloAdmin = admin()
        ? [api.caricaPersone(), api.caricaReparti(), api.caricaStatistiche()]
        : [];
    const [corsi, assegnazioni, norma, piani, persone = [], reparti = [], stat] =
        await Promise.all([...comuni, ...soloAdmin]);
    Object.assign(stato, { corsi, assegnazioni, norma, piani, persone, reparti });
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
