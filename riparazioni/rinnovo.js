
import { toast } from '../core/ui.js';
import * as api from './api.js';
import { contesto, contrattoPerId, ricaricaDopoScrittura, mostraAvviso } from './stato.js';
import { giornoIt } from './config.js';
import { apriRinnovo } from './contratto.js';

const el = id => document.getElementById(id);
let aperto = null;

export function apriDomandaRinnovo(elemento) {
    const c = contrattoPerId(elemento.closest('tr').dataset.index);
    if (!c || !contesto().puoAnagrafica) return;
    aperto = c;
    const scaduto = c.scadenza === 'rosso';
    el('rinnovoTitolo').textContent = scaduto ? 'Il contratto è scaduto' : 'Rinnovare il contratto?';
    el('rinnovoTesto').textContent = `«${c.nome}» di ${c.cliente_nome} ${scaduto ? 'è scaduto' : 'scade'} il ${giornoIt(c.data_conclusione)}. `
        + (scaduto ? 'È stato rinnovato?' : 'Se il rinnovo è già deciso, puoi registrarlo adesso.');
    el('rinnovoAutomatico').hidden = !c.rinnovo_automatico;
    el('btnChiudiContratto').hidden = !scaduto;
    el('dialogoRinnovo').showModal();
}

export const chiudiDomandaRinnovo = () => el('dialogoRinnovo').close();

export function siRinnovo() {
    el('dialogoRinnovo').close();
    apriRinnovo(aperto);
}

export async function noRinnovo() {
    el('dialogoRinnovo').close();
    try {
        await api.cambiaStatoContratto(aperto.id, 'chiuso');
    } catch (e) {
        mostraAvviso(e.message);
        return;
    }
    toast('Contratto chiuso: lo ritrovi fra «Rinnovati o chiusi»');
    await ricaricaDopoScrittura();
}

export async function riapriContratto(elemento) {
    const c = contrattoPerId(elemento.closest('tr').dataset.index);
    if (!c || !contesto().puoAnagrafica) return;
    try {
        await api.cambiaStatoContratto(c.id, 'attivo');
    } catch (e) {
        mostraAvviso(e.message);
        return;
    }
    toast('Contratto riaperto');
    await ricaricaDopoScrittura();
}
