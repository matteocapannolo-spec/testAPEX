
import { escapeHtml, toast, confirmDialog } from '../core/ui.js';
import * as api from './api.js';
import { stato, contesto, contrattoPerId, praticaPerId, ricaricaDopoScrittura, mostraAvviso } from './stato.js';
import { LINK_VALIDO } from './config.js';

const el = id => document.getElementById(id);
const NUOVO = '__nuovo';

let aperto = null;
let creati = {};
let rinnovoDi = null;

function errore(testo) {
    el('contrattoErrore').textContent = testo || '';
    el('contrattoErrore').hidden = !testo;
}

function opzioni(voci, scelta, etichettaNuovo) {
    return '<option value="">Scegli…</option>'
        + voci.map(v => `<option value="${escapeHtml(v.id)}"${v.id === scelta ? ' selected' : ''}>${escapeHtml(v.nome)}</option>`).join('')
        + `<option value="${NUOVO}">${etichettaNuovo}</option>`;
}

function riempiPratiche(clienteId, scelta) {
    const pratiche = stato.pratiche.filter(p => p.cliente_id === clienteId);
    el('contrattoPratica').innerHTML = opzioni(pratiche, scelta, '+ Nuova pratica…');
    el('contrattoPratica').value = scelta || (clienteId === NUOVO ? NUOVO : '');
    sceltaPratica();
}

function sceltaPratica() {
    const valore = el('contrattoPratica').value;
    el('contrattoNuovaPratica').hidden = valore !== NUOVO;
    const pratica = praticaPerId(valore);
    el('contrattoPraticaLink').value = pratica ? (pratica.link_drive || '') : '';
}

function sceltaCliente() {
    const valore = el('contrattoCliente').value;
    el('contrattoNuovoCliente').hidden = valore !== NUOVO;
    riempiPratiche(valore, null);
}

function apri(c) {
    aperto = c ? c.id : null;
    creati = {};
    rinnovoDi = null;
    errore('');
    el('contrattoTitolo').textContent = c ? 'Modifica contratto' : 'Nuovo contratto';
    el('contrattoCliente').disabled = false;
    el('contrattoNotaRinnovo').hidden = true;

    el('contrattoCliente').innerHTML = opzioni(stato.clienti, c && c.cliente_id, '+ Nuovo cliente…');
    el('contrattoNuovoCliente').hidden = true;
    el('contrattoNuovoCliente').value = '';
    el('contrattoNuovaPratica').value = '';
    riempiPratiche(c ? c.cliente_id : '', c ? c.pratica_id : null);

    const responsabili = stato.responsabili.map(r => ({ id: r.user_id, nome: r.nome }));
    if (c && !responsabili.some(r => r.id === c.responsabile_id)) {
        responsabili.push({ id: c.responsabile_id, nome: stato.nomi[c.responsabile_id] || 'Persona senza spunta' });
    }
    el('contrattoResponsabile').innerHTML = '<option value="">Scegli…</option>'
        + responsabili.map(r => `<option value="${escapeHtml(r.id)}">${escapeHtml(r.nome)}</option>`).join('');

    el('contrattoResponsabile').value = c ? c.responsabile_id : '';
    el('contrattoNome').value = c ? c.nome : '';
    el('contrattoCodici').value = c ? (c.codici || '') : '';
    el('contrattoRinnovo').checked = !!(c && c.rinnovo_automatico);
    el('contrattoLink').value = c ? (c.link_drive || '') : '';
    el('contrattoSottoscrizione').value = c ? (c.data_sottoscrizione || '') : '';
    el('contrattoConclusione').value = c ? (c.data_conclusione || '') : '';
    el('contrattoSintesi').value = c ? (c.sintesi || '') : '';

    el('dialogoContratto').showModal();
}

export function apriNuovoContratto() {
    if (contesto().puoAnagrafica) apri(null);
}

export function apriModificaContratto(elemento) {
    const c = contrattoPerId(elemento.closest('tr').dataset.index);
    if (c && contesto().puoAnagrafica) apri(c);
}

export function chiudiContratto() {
    el('dialogoContratto').close();
}

function leggi() {
    const v = id => el(id).value.trim();
    const campi = {
        cliente: v('contrattoCliente'), nuovoCliente: v('contrattoNuovoCliente'),
        pratica: v('contrattoPratica'), nuovaPratica: v('contrattoNuovaPratica'), praticaLink: v('contrattoPraticaLink'),
        nome: v('contrattoNome'), codici: v('contrattoCodici'), rinnovo_automatico: el('contrattoRinnovo').checked, link_drive: v('contrattoLink'), responsabile_id: v('contrattoResponsabile'),
        data_sottoscrizione: v('contrattoSottoscrizione'), data_conclusione: v('contrattoConclusione'), sintesi: v('contrattoSintesi')
    };
    if (!campi.cliente || (campi.cliente === NUOVO && !campi.nuovoCliente)) return { problema: 'Scegli il cliente, oppure scrivi il nome di quello nuovo.' };
    if (!campi.pratica || (campi.pratica === NUOVO && !campi.nuovaPratica)) return { problema: 'Scegli la pratica, oppure scrivi il nome di quella nuova.' };
    if (!campi.nome) return { problema: 'Il nome del contratto è obbligatorio.' };
    if (!campi.responsabile_id) return { problema: 'Scegli il responsabile commerciale.' };
    if (!aperto && (!campi.data_sottoscrizione || !campi.data_conclusione)) return { problema: 'Servono le date di sottoscrizione e di conclusione.' };
    if (campi.data_sottoscrizione && campi.data_conclusione && campi.data_conclusione < campi.data_sottoscrizione) {
        return { problema: 'La conclusione non può venire prima della sottoscrizione.' };
    }
    campi.data_sottoscrizione = campi.data_sottoscrizione || null;
    campi.data_conclusione = campi.data_conclusione || null;
    for (const link of [campi.praticaLink, campi.link_drive]) {
        if (link && !LINK_VALIDO.test(link)) return { problema: 'I link devono cominciare per https://: conviene copiarli dalla barra del browser.' };
    }
    return { campi };
}

async function salva(c) {
    let clienteId = c.cliente;
    if (clienteId === NUOVO) {
        clienteId = creati.cliente || (creati.cliente = await api.creaCliente(c.nuovoCliente));
    }

    let praticaId = c.pratica;
    if (praticaId === NUOVO) {
        praticaId = creati.pratica || (creati.pratica = await api.salvaPratica({ cliente_id: clienteId, nome: c.nuovaPratica, link_drive: c.praticaLink || null }));
    } else {
        const pratica = praticaPerId(praticaId);
        if ((pratica.link_drive || '') !== c.praticaLink) {
            await api.salvaPratica({ id: praticaId, nome: pratica.nome, link_drive: c.praticaLink || null });
        }
    }

    if (rinnovoDi) {
        await api.rinnovaContratto(rinnovoDi, {
            pratica_id: praticaId, nome: c.nome, codici: c.codici || null, link_drive: c.link_drive || null,
            responsabile_id: c.responsabile_id, data_sottoscrizione: c.data_sottoscrizione,
            data_conclusione: c.data_conclusione, sintesi: c.sintesi || null, rinnovo_automatico: c.rinnovo_automatico
        });
        return;
    }
    await api.salvaContratto({
        id: aperto, pratica_id: praticaId, nome: c.nome, codici: c.codici || null,
        rinnovo_automatico: c.rinnovo_automatico, link_drive: c.link_drive || null,
        responsabile_id: c.responsabile_id, data_sottoscrizione: c.data_sottoscrizione,
        data_conclusione: c.data_conclusione, sintesi: c.sintesi || null
    });
}

export async function salvaContrattoDalPannello() {
    const { campi, problema } = leggi();
    if (problema) {
        errore(problema);
        return;
    }
    try {
        errore('');
        await salva(campi);
    } catch (e) {
        errore(e.message);
        return;
    }
    el('dialogoContratto').close();
    toast(rinnovoDi ? 'Contratto rinnovato' : aperto ? 'Contratto aggiornato' : 'Contratto creato');
    await ricaricaDopoScrittura();
}

export async function eliminaContratto(elemento) {
    const c = contrattoPerId(elemento.closest('tr').dataset.index);
    if (!c || !contesto().admin) return;
    const ok = await confirmDialog({
        title: 'Eliminare questo contratto?',
        text: `«${c.nome}» di ${c.cliente_nome} sparisce per tutti. Un contratto con dei flussi non si elimina: prima vanno eliminati loro.`,
        confirmLabel: 'Elimina',
        danger: true
    });
    if (!ok) return;
    try {
        await api.eliminaContratto(c.id);
    } catch (e) {
        mostraAvviso(e.message);
        return;
    }
    toast('Contratto eliminato');
    await ricaricaDopoScrittura();
}

export function collegaCampiContratto() {
    el('contrattoCliente').addEventListener('change', sceltaCliente);
    el('contrattoPratica').addEventListener('change', sceltaPratica);
}


const giorno = ms => new Date(ms).toISOString().slice(0, 10);

export function apriRinnovo(c) {
    if (!c || !contesto().puoAnagrafica) return;
    apri(c);
    aperto = null;
    rinnovoDi = c.id;
    el('contrattoTitolo').textContent = `Rinnovo di «${c.nome}»`;
    el('contrattoCliente').disabled = true;
    el('contrattoNotaRinnovo').hidden = false;
    el('contrattoLink').value = '';
    const inizio = Date.parse(c.data_conclusione) + 86400000;
    const durata = Date.parse(c.data_conclusione) - Date.parse(c.data_sottoscrizione);
    el('contrattoSottoscrizione').value = c.data_conclusione ? giorno(inizio) : '';
    el('contrattoConclusione').value = Number.isFinite(durata) ? giorno(inizio + durata) : '';
}
