
import { caricaProdotti, caricaCategorie, caricaPersone } from './api.js';
import { isAdmin } from '../core/permissions.js';
import { TINTE_CATEGORIE } from './config.js';

export const stato = {
    prodotti: [],
    categorie: [],
    nomi: {},
    criteri: { ricerca: '', categoria: '' },
    ruolo: null
};

export function contesto() {
    const categorie = new Map();
    for (const c of stato.categorie) {
        const tinta = Math.floor(Math.max(0, Number(c.ordine) || 0) / 10) % TINTE_CATEGORIE;
        categorie.set(c.id, { ...c, tinta });
    }

    return {
        puoScrivere: isAdmin(stato.ruolo),
        categorie,
        nomi: stato.nomi
    };
}

export function prodottoPerId(id) {
    return stato.prodotti.find(p => p.id === id) || null;
}

export function usiDi(categoriaId) {
    return stato.prodotti.filter(p => p.categorie.includes(categoriaId)).length;
}

const ascoltatori = [];

export function quandoCambia(fn) {
    ascoltatori.push(fn);
}

export async function ricarica() {
    const [prodotti, categorie, persone] = await Promise.all([
        caricaProdotti(), caricaCategorie(), caricaPersone()
    ]);

    stato.prodotti = prodotti;
    stato.categorie = categorie;
    stato.nomi = {};
    for (const p of persone) stato.nomi[p.user_id] = p.nome;

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
