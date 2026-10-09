
import { escapeHtml, toast } from '../core/ui.js';
import { creaCliente, rinominaCliente } from './api.js';
import { stato, contesto, ricaricaDopoScrittura } from './stato.js';

const el = id => document.getElementById(id);

function errore(testo) {
    el('clientiErrore').textContent = testo || '';
    el('clientiErrore').hidden = !testo;
}

function disegna() {
    const puo = contesto().puoAnagrafica;
    const conta = id => stato.pratiche.filter(p => p.cliente_id === id).length;
    el('elencoClienti').innerHTML = stato.clienti.length
        ? stato.clienti.map(c => '<div class="riga-cliente">'
            + `<input type="text" class="edit-input" data-cliente="${escapeHtml(c.id)}" value="${escapeHtml(c.nome)}" maxlength="200"${puo ? '' : ' disabled'}>`
            + `<span class="usi-cliente">${conta(c.id)} prat.</span></div>`).join('')
        : '<p class="elenco-vuoto">Nessun cliente.</p>';
    el('rigaNuovoCliente').hidden = !puo;
}

export function apriClienti() {
    errore('');
    el('nuovoCliente').value = '';
    disegna();
    el('dialogoClienti').showModal();
}

export function chiudiClienti() {
    el('dialogoClienti').close();
}

async function rinomina(ev) {
    const campo = ev.target.closest('[data-cliente]');
    if (!campo) return;
    const cliente = stato.clienti.find(c => c.id === campo.dataset.cliente);
    const nome = campo.value.trim();
    if (!cliente || nome === cliente.nome) return;
    if (!nome) {
        campo.value = cliente.nome;
        return errore('Il nome del cliente non può essere vuoto.');
    }
    try {
        errore('');
        await rinominaCliente(cliente.id, nome);
    } catch (e) {
        campo.value = cliente.nome;
        return errore(e.message);
    }
    toast('Cliente rinominato');
    await ricaricaDopoScrittura();
    disegna();
}

export async function aggiungiCliente() {
    const nome = el('nuovoCliente').value.trim();
    if (!nome) return errore('Scrivi il nome del cliente.');
    try {
        errore('');
        await creaCliente(nome);
    } catch (e) {
        return errore(e.message);
    }
    el('nuovoCliente').value = '';
    toast('Cliente aggiunto');
    await ricaricaDopoScrittura();
    disegna();
}

export function collegaCampiClienti() {
    el('elencoClienti').addEventListener('focusout', rinomina);
}
