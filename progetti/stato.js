
import { caricaProgetti } from './api.js';
import { FILTRO_ATTUALI } from './config.js';
import { isAdmin } from '../core/permissions.js';
import { sezioniIniziali } from './tabella.js';

export const stato = {
    progetti: [],
    responsabili: [],
    responsabiliPerId: {},
    nomiNoti: {},
    sezioni: sezioniIniziali(),
    criteri: { ricerca: '', status: FILTRO_ATTUALI, fase: '', pm: '' },
    ordineCodice: 0,
    ruolo: null
};

export function contesto() {
    return {
        puoScrivere: isAdmin(stato.ruolo),
        ordineCodice: stato.ordineCodice,
        responsabiliPerId: stato.responsabiliPerId,
        nomiNoti: stato.nomiNoti
    };
}

export function progettoPerId(id) {
    return stato.progetti.find(p => p.id === id) || null;
}

const ascoltatori = [];

export function quandoCambia(fn) {
    ascoltatori.push(fn);
}

export function cambiato() {
    for (const fn of ascoltatori) fn();
}

export async function ricarica() {
    stato.progetti = await caricaProgetti();
    cambiato();
}
