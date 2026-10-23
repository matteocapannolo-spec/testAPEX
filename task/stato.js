
import { currentUser } from '../core/auth.js';
import { isAdmin } from '../core/permissions.js';
import * as api from './api.js';
import { CHIAVE_VISTA } from './config.js';

export const stato = {
    ruolo: null,
    persone: [],
    reparti: [],
    repartoMembri: [],
    bacheche: [],
    etichette: [],
    vista: 'mie',
    modoMie: 'scadenza',
    colonne: [],
    schede: [],
    criteri: { ricerca: '', membro: '' }
};

let alCambio = () => {};
export const quandoCambia = fn => { alCambio = fn; };
export const ridisegna = () => alCambio();

export const admin = () => isAdmin(stato.ruolo);
export const io = () => currentUser().id;

export const persona = id => stato.persone.find(p => p.user_id === id) || null;
export const reparto = id => stato.reparti.find(r => r.id === id) || null;
export const bacheca = id => stato.bacheche.find(b => b.id === id) || null;
export const etichetta = id => stato.etichette.find(e => e.id === id) || null;
export const etichetteDi = repartoId => stato.etichette.filter(e => e.reparto_id === repartoId);
export const membriDelReparto = repartoId => stato.persone.filter(p => (p.reparti || []).includes(repartoId));

export const mieiReparti = () => admin()
    ? stato.reparti
    : stato.reparti.filter(r => stato.repartoMembri.some(m => m.reparto_id === r.id && m.user_id === io()));

export const bachecaAperta = () => stato.vista === 'mie' ? null : bacheca(stato.vista);

export function mostraAvviso(testo) {
    const a = document.getElementById('avviso');
    a.textContent = testo || '';
    a.hidden = !testo;
}

function ricordaVista() {
    try { localStorage.setItem(CHIAVE_VISTA, stato.vista); } catch (e) { }
}

export function vistaRicordata() {
    try { return localStorage.getItem(CHIAVE_VISTA) || 'mie'; } catch (e) { return 'mie'; }
}

export async function caricaAnagrafiche() {
    const [persone, reparti, repartoMembri, bacheche, etichette] = await Promise.all([
        api.caricaPersone(), api.caricaReparti(), api.caricaRepartoMembri(),
        api.caricaBacheche(), api.caricaEtichette()
    ]);
    Object.assign(stato, { persone: persone || [], reparti, repartoMembri, bacheche, etichette });
    try {
        stato.colonnaTicket = (await api.caricaTicketAsset() || {}).colonna_id || null;
    } catch (e) {
        stato.colonnaTicket = null;
    }
}

export async function caricaVista() {
    if (stato.vista !== 'mie' && !bacheca(stato.vista)) stato.vista = 'mie';
    if (stato.vista === 'mie') {
        stato.colonne = [];
        stato.schede = await api.caricaMie(io());
    } else {
        const [colonne, schede] = await Promise.all([api.caricaColonne(stato.vista), api.caricaSchede(stato.vista)]);
        Object.assign(stato, { colonne, schede });
    }
    ricordaVista();
}

export async function ricarica({ anagrafiche = false } = {}) {
    try {
        if (anagrafiche) await caricaAnagrafiche();
        await caricaVista();
        mostraAvviso('');
    } catch (e) {
        mostraAvviso(e.message);
    }
    ridisegna();
}

export async function cambiaVista(vista) {
    stato.vista = vista;
    await ricarica();
}

export async function aggiornaRiga(id) {
    const riga = await api.caricaScheda(id);
    const i = stato.schede.findIndex(s => s.id === id);
    if (riga.archiviata) {
        if (i >= 0) stato.schede.splice(i, 1);
    } else if (i >= 0) stato.schede[i] = riga;
    else if (stato.vista === riga.bacheca_id) stato.schede.push(riga);
    ridisegna();
    return riga;
}
