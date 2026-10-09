
import { caricaCapitoli, caricaSezioni, caricaBlocchi, caricaPersone } from './api.js';
import { isAdmin } from '../core/permissions.js';

export const stato = {
    capitoli: [],
    sezioni: [],
    blocchi: [],
    nomi: {},
    criteri: { ricerca: '', capitolo: '', stato: '' },
    ruolo: null
};

export function contesto() {
    return {
        puoScrivere: isAdmin(stato.ruolo),
        nomi: stato.nomi
    };
}

function raggruppa(elenco, chiave) {
    const gruppi = new Map();
    for (const x of elenco) {
        if (!gruppi.has(x[chiave])) gruppi.set(x[chiave], []);
        gruppi.get(x[chiave]).push(x);
    }
    return gruppi;
}

export function albero() {
    const perSezione = raggruppa(stato.blocchi, 'sezione_id');
    const perCapitolo = raggruppa(stato.sezioni, 'capitolo_id');
    return stato.capitoli.map(c => ({
        ...c,
        sezioni: (perCapitolo.get(c.id) || []).map(s => ({ ...s, blocchi: perSezione.get(s.id) || [] }))
    }));
}

export function sezioniInOrdine() {
    return albero().flatMap(c => c.sezioni);
}

export function bloccoPerId(id) {
    return stato.blocchi.find(b => b.id === id) || null;
}

export function sezionePerId(id) {
    return stato.sezioni.find(s => s.id === id) || null;
}

export function capitoloPerId(id) {
    return stato.capitoli.find(c => c.id === id) || null;
}

export function prossimoOrdine(sezioneId, passo) {
    const ultimi = stato.blocchi.filter(b => b.sezione_id === sezioneId).map(b => Number(b.ordine) || 0);
    return (ultimi.length ? Math.max(...ultimi) : 0) + passo;
}

export function conTitolo(b) {
    return Boolean(b.titolo && String(b.titolo).trim());
}

function numera() {
    const due = n => String(n).padStart(2, '0');
    const numeroDi = new Map();
    const figli = new Map();
    const prossimo = genitore => {
        const n = (figli.get(genitore) || 0) + 1;
        figli.set(genitore, n);
        return `${numeroDi.get(genitore)}.${due(n)}`;
    };
    stato.capitoli.forEach((c, i) => {
        c.numero = String(i + 1);
        numeroDi.set(c.id, c.numero);
    });
    for (const s of stato.sezioni) {
        s.numero = numeroDi.has(s.capitolo_id) ? prossimo(s.capitolo_id) : '';
        numeroDi.set(s.id, s.numero);
    }
    for (const b of stato.blocchi) {
        b.numero = conTitolo(b) && numeroDi.get(b.sezione_id) ? prossimo(b.sezione_id) : '';
    }
}

const ascoltatori = [];

export function quandoCambia(fn) {
    ascoltatori.push(fn);
}

export async function ricarica() {
    const [capitoli, sezioni, blocchi, persone] = await Promise.all([
        caricaCapitoli(), caricaSezioni(), caricaBlocchi(), caricaPersone()
    ]);
    stato.capitoli = capitoli;
    stato.sezioni = sezioni;
    stato.blocchi = blocchi;
    numera();
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
