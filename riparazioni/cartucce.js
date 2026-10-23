
import { escapeHtml, toast } from '../core/ui.js';
import * as api from './api.js';
import { stato, contesto, contrattoPerId, cartucceDi, cartucciaPerId, ricaricaDopoScrittura } from './stato.js';
import { giornoIt, aggiungiMesi, tonoScadenza } from './config.js';

const el = id => document.getElementById(id);

const PREAVVISO_REFILL = 30;

let contratto = null;
let inModifica;

const CAMPI = {
    cartucciaSeriale: 'seriale', cartucciaUbicazione: 'ubicazione', cartucciaNote: 'note',
    cartucciaRefill: 'refill_seriale', cartucciaRefillData: 'refill_data',
    cartucciaRefillScadenza: 'refill_scadenza', cartucciaConsegna: 'ultima_consegna'
};

function errore(testo) {
    el('cartucceErrore').textContent = testo || '';
    el('cartucceErrore').hidden = !testo;
}

function riga(c, ctx) {
    const refill = stato.flussi.filter(f => f.cartuccia_id === c.id).length;
    const tono = tonoScadenza(c.refill_scadenza, PREAVVISO_REFILL);
    const scade = c.refill_scadenza
        ? `<span class="scadenza-tag ${tono === 'passata' ? 'rosso' : tono === 'vicina' ? 'arancione' : 'grigio'}">${tono === 'passata' ? 'scaduto il' : 'scade il'} ${escapeHtml(giornoIt(c.refill_scadenza))}</span>`
        : '';
    const righe = [
        `<span><span class="material-symbols-outlined">location_on</span>${c.ubicazione ? escapeHtml(c.ubicazione) : '<span class="niente">Ubicazione non nota</span>'}</span>`,
        c.refill_seriale ? `<span>Refill <span class="serie">${escapeHtml(c.refill_seriale)}</span> ${scade}</span>` : '<span class="niente">Nessun refill registrato</span>',
        [c.ultima_consegna && `Ultima consegna ${escapeHtml(giornoIt(c.ultima_consegna))}`, refill && `Refill fatti con noi: ${refill}`].filter(Boolean).join(' · ')
    ].filter(Boolean);
    const modifica = ctx.puoAnagrafica
        ? `<button type="button" class="action-btn" data-action="modifica-cartuccia" data-cartuccia="${escapeHtml(c.id)}" title="Modifica la cartuccia"><span class="material-symbols-outlined">edit</span></button>`
        : '';
    return '<div class="cartuccia-riga">'
        + `<span class="serie cartuccia"><span class="material-symbols-outlined">water_drop</span>${escapeHtml(c.seriale)}</span>`
        + `<div class="cartuccia-testo">${righe.map(r => `<div>${r}</div>`).join('')}${c.note ? `<div class="cartuccia-nota">${escapeHtml(c.note)}</div>` : ''}</div>`
        + modifica + '</div>';
}

function disegna() {
    const ctx = contesto();
    const cartucce = cartucceDi(contratto.id);
    el('elencoCartucce').innerHTML = cartucce.length
        ? cartucce.map(c => riga(c, ctx)).join('')
        : '<p class="elenco-vuoto">Nessuna cartuccia per questo contratto.</p>';
    const modulo = inModifica !== undefined;
    el('formCartuccia').hidden = !modulo;
    el('btnNuovaCartuccia').hidden = modulo || !ctx.puoAnagrafica;
}

export function apriCartucce(elemento) {
    contratto = contrattoPerId(elemento.closest('tr').dataset.index);
    if (!contratto) return;
    inModifica = undefined;
    errore('');
    el('cartucceSottotitolo').textContent = `${contratto.cliente_nome} · ${contratto.nome}`;
    disegna();
    el('dialogoCartucce').showModal();
}

export const chiudiCartucce = () => el('dialogoCartucce').close();

function apriModulo(c) {
    inModifica = c ? c.id : null;
    errore('');
    for (const [id, col] of Object.entries(CAMPI)) el(id).value = c ? (c[col] || '') : '';
    el('formCartucciaTitolo').textContent = c ? `Cartuccia ${c.seriale}` : 'Nuova cartuccia';
    disegna();
    el('cartucciaSeriale').focus();
}

export const nuovaCartuccia = () => apriModulo(null);
export const modificaCartuccia = elemento => apriModulo(cartucciaPerId(elemento.dataset.cartuccia));
export function annullaCartuccia() {
    inModifica = undefined;
    errore('');
    disegna();
}

export async function salvaCartuccia() {
    const campi = {};
    for (const [id, col] of Object.entries(CAMPI)) campi[col] = el(id).value.trim() || null;
    if (!campi.seriale) return errore('Scrivi il seriale della cartuccia.');
    if (campi.refill_data && !campi.refill_scadenza) campi.refill_scadenza = aggiungiMesi(campi.refill_data, 9);
    try {
        errore('');
        await api.salvaCartuccia(inModifica ? { id: inModifica, ...campi } : { contratto_id: contratto.id, ...campi });
    } catch (e) {
        return errore(e.message);
    }
    toast(inModifica ? 'Cartuccia aggiornata' : 'Cartuccia aggiunta');
    inModifica = undefined;
    await ricaricaDopoScrittura();
    disegna();
}

export function ridisegnaCartucceSeAperte() {
    if (el('dialogoCartucce').open && contratto) disegna();
}
