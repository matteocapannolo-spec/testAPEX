
import { toast } from '../core/ui.js';
import * as api from './api.js';
import { PASSO_POSIZIONE } from './config.js';
import { stato, ridisegna, ricarica, aggiornaRiga, mostraAvviso } from './stato.js';

const SOGLIA = 5;
const BORDO = 60;
const VELOCITA = 14;

let presa = null;
let ignoraClic = false;
let radice = null;

export const trascinando = () => !!(presa && presa.attivo);

function posizioneFra(prima, dopo) {
    if (!prima && !dopo) return PASSO_POSIZIONE;
    if (!prima) return dopo.posizione - PASSO_POSIZIONE;
    if (!dopo) return prima.posizione + PASSO_POSIZIONE;
    return (prima.posizione + dopo.posizione) / 2;
}

function avvia() {
    const el = presa.el;
    const box = el.getBoundingClientRect();
    const fantasma = el.cloneNode(true);
    fantasma.classList.add('fantasma');
    fantasma.style.width = `${box.width}px`;
    fantasma.style.height = `${box.height}px`;
    document.body.appendChild(fantasma);

    const segnaposto = document.createElement('div');
    segnaposto.className = presa.tipo === 'scheda' ? 'segnaposto' : 'segnaposto-colonna';
    segnaposto.style.height = `${box.height}px`;
    el.parentNode.insertBefore(segnaposto, el);
    el.classList.add('in-volo');

    Object.assign(presa, { attivo: true, fantasma, segnaposto, dx: presa.x0 - box.left, dy: presa.y0 - box.top });
    presa.origine = vicini(presa.tipo === 'scheda' ? '.riquadro:not(.in-volo)' : '.colonna:not(.in-volo)');
    document.body.classList.add('si-trascina');
    scorriDaSolo();
}

function metti(contenitore, prima) {
    const s = presa.segnaposto;
    if (s.parentNode === contenitore && s.nextSibling === prima) return;
    contenitore.insertBefore(s, prima);
}

function piazza() {
    const { x, y } = presa;
    presa.fantasma.style.left = `${x - presa.dx}px`;
    presa.fantasma.style.top = `${y - presa.dy}px`;

    const colonne = [...radice.querySelectorAll('.colonna:not(.in-volo)')];
    if (presa.tipo === 'colonna') {
        const dopo = colonne.find(c => x < c.getBoundingClientRect().left + c.offsetWidth / 2);
        metti(radice, dopo || radice.querySelector('.colonna-nuova'));
        return;
    }
    const colonna = colonne.find(c => { const b = c.getBoundingClientRect(); return x >= b.left && x <= b.right; });
    if (!colonna) return;
    const corpo = colonna.querySelector('.colonna-corpo');
    const dopo = [...corpo.querySelectorAll('.riquadro:not(.in-volo)')]
        .find(r => { const b = r.getBoundingClientRect(); return y < b.top + b.height / 2; });
    metti(corpo, dopo || null);
}

function scorriDaSolo() {
    if (!trascinando()) return;
    const { x, y } = presa;
    const b = radice.getBoundingClientRect();
    if (x < b.left + BORDO) radice.scrollLeft -= VELOCITA;
    else if (x > b.right - BORDO) radice.scrollLeft += VELOCITA;
    const corpo = presa.segnaposto.closest('.colonna-corpo');
    if (corpo) {
        const c = corpo.getBoundingClientRect();
        if (y < c.top + BORDO / 2) corpo.scrollTop -= VELOCITA;
        else if (y > c.bottom - BORDO / 2) corpo.scrollTop += VELOCITA;
    }
    piazza();
    requestAnimationFrame(scorriDaSolo);
}

function muovi(ev) {
    if (!presa) return;
    presa.x = ev.clientX;
    presa.y = ev.clientY;
    if (!presa.attivo) {
        if (Math.hypot(presa.x - presa.x0, presa.y - presa.y0) < SOGLIA) return;
        avvia();
    }
    piazza();
}

function vicini(selettore) {
    const s = presa.segnaposto;
    let prima = s.previousElementSibling;
    while (prima && !prima.matches(selettore)) prima = prima.previousElementSibling;
    let dopo = s.nextElementSibling;
    while (dopo && !dopo.matches(selettore)) dopo = dopo.nextElementSibling;
    return [prima, dopo];
}

function pulisci() {
    presa.fantasma.remove();
    presa.segnaposto.remove();
    presa.el.classList.remove('in-volo');
    document.body.classList.remove('si-trascina');
}

let coda = Promise.resolve();

function salvaScheda(id, colonna, posizione) {
    coda = coda.then(async () => {
        const scheda = stato.schede.find(s => s.id === id);
        if (!scheda) return;
        try {
            await api.aggiornaScheda(id, scheda.versione, { colonna_id: colonna, posizione });
            const riga = await aggiornaRiga(id);
            if (riga.completata_il && riga.di_fine) toast('Scheda completata');
        } catch (e) {
            mostraAvviso(e.message);
            await ricarica();
        }
    });
}

async function salvaColonna(id, posizione) {
    try {
        await api.aggiornaColonna(id, { posizione });
    } catch (e) {
        mostraAvviso(e.message);
        await ricarica();
    }
}

function lascia() {
    if (!presa) return;
    const p = presa;
    if (!p.attivo) { presa = null; return; }
    ignoraClic = true;
    setTimeout(() => { ignoraClic = false; }, 50);

    if (p.tipo === 'scheda') {
        const corpo = p.segnaposto.parentNode;
        const [prima, dopo] = vicini('.riquadro:not(.in-volo)');
        const trova = el => el && stato.schede.find(s => s.id === el.dataset.id);
        const colonna = corpo.dataset.colonna;
        const posizione = posizioneFra(trova(prima), trova(dopo));
        pulisci();
        presa = null;
        const fermo = prima === p.origine[0] && dopo === p.origine[1];
        const scheda = stato.schede.find(s => s.id === p.id);
        if (scheda && !fermo) {
            Object.assign(scheda, { colonna_id: colonna, posizione });
            salvaScheda(p.id, colonna, posizione);
        }
    } else {
        const [prima, dopo] = vicini('.colonna:not(.in-volo)');
        const trova = el => el && stato.colonne.find(c => c.id === el.dataset.colonna);
        const posizione = posizioneFra(trova(prima), trova(dopo));
        pulisci();
        presa = null;
        const fermo = prima === p.origine[0] && dopo === p.origine[1];
        const colonna = stato.colonne.find(c => c.id === p.id);
        if (colonna && !fermo) {
            colonna.posizione = posizione;
            stato.colonne.sort((a, b) => a.posizione - b.posizione);
            salvaColonna(p.id, posizione);
        }
    }
    ridisegna();
}

function annulla() {
    if (!presa) return;
    if (presa.attivo) pulisci();
    presa = null;
    ridisegna();
}

export function collegaTrascinamento(contenitore) {
    radice = contenitore;
    radice.addEventListener('pointerdown', ev => {
        if (ev.button !== 0 || ev.pointerType === 'touch' || stato.vista === 'mie') return;
        if (ev.target.closest('button, input, textarea, select, a, .aggiunta')) return;
        const scheda = ev.target.closest('.riquadro');
        const testa = !scheda && ev.target.closest('.colonna-testa');
        const el = scheda || (testa && testa.closest('.colonna'));
        if (!el) return;
        ev.preventDefault();
        presa = {
            tipo: scheda ? 'scheda' : 'colonna', el,
            id: scheda ? scheda.dataset.id : el.dataset.colonna,
            x0: ev.clientX, y0: ev.clientY, x: ev.clientX, y: ev.clientY, attivo: false
        };
    });
    window.addEventListener('pointermove', muovi);
    window.addEventListener('pointerup', lascia);
    window.addEventListener('pointercancel', annulla);
    window.addEventListener('keydown', ev => { if (ev.key === 'Escape' && trascinando()) annulla(); });
    window.addEventListener('click', ev => {
        if (!ignoraClic) return;
        ev.stopPropagation();
        ev.preventDefault();
        ignoraClic = false;
    }, true);
}
