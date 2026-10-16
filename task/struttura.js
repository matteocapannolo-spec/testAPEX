
import { escapeHtml, confirmDialog, toast } from '../core/ui.js';
import * as api from './api.js';
import { GIORNI_ARCHIVIO, PASSO_POSIZIONE } from './config.js';
import { stato, admin, bachecaAperta, reparto, ricarica } from './stato.js';
import { dataBreve } from './riquadro.js';

const el = id => document.getElementById(id);

function errore(id, testo) {
    el(id).textContent = testo || '';
    el(id).hidden = !testo;
}


let bachecaInModifica = null;
let dopoBacheca = null;

export function apriModificaBacheca(id, dopo) {
    const b = stato.bacheche.find(x => x.id === id);
    if (!b) return;
    bachecaInModifica = b;
    dopoBacheca = dopo;
    errore('bachecaErrore', '');
    el('bachecaTitolo').textContent = 'Bacheca';
    el('bachecaNome').value = b.nome;
    el('btnEliminaBacheca').hidden = !admin();
    el('dialogoBacheca').showModal();
}

export const chiudiBacheca = () => el('dialogoBacheca').close();

export async function salvaBacheca() {
    const nome = el('bachecaNome').value.trim();
    if (!nome) { errore('bachecaErrore', 'Il nome non può essere vuoto.'); return; }
    try {
        await api.aggiornaBacheca(bachecaInModifica.id, { nome });
        await ricarica({ anagrafiche: true });
    } catch (e) {
        errore('bachecaErrore', e.message);
        return;
    }
    chiudiBacheca();
    if (dopoBacheca) dopoBacheca();
}

export async function eliminaBacheca() {
    const b = bachecaInModifica;
    const ok = await confirmDialog({
        title: 'Eliminare la bacheca?',
        text: `«${b.nome}» sparisce con tutte le sue colonne e tutte le sue schede, archivio compreso. Non si torna indietro.`,
        confirmLabel: 'Elimina tutto', danger: true
    });
    if (!ok) return;
    try {
        await api.eliminaBacheca(b.id);
    } catch (e) {
        errore('bachecaErrore', e.message);
        return;
    }
    chiudiBacheca();
    if (stato.vista === b.id) stato.vista = 'mie';
    await ricarica({ anagrafiche: true });
    if (dopoBacheca) dopoBacheca();
    toast('Bacheca eliminata');
}


let colonnaInModifica = null;

export function apriColonna(elemento) {
    colonnaInModifica = stato.colonne.find(c => c.id === elemento.dataset.id) || null;
    errore('colonnaErrore', '');
    el('colonnaTitolo').textContent = colonnaInModifica ? 'Colonna' : 'Nuova colonna';
    el('colonnaNome').value = colonnaInModifica ? colonnaInModifica.nome : '';
    el('colonnaFine').checked = colonnaInModifica ? colonnaInModifica.di_fine : false;
    const fine = !!colonnaInModifica && colonnaInModifica.di_fine;
    el('colonnaFine').disabled = fine && stato.colonne.filter(c => c.di_fine).length === 1;
    el('rigaSpostaColonna').hidden = !colonnaInModifica;
    el('btnEliminaColonna').hidden = !colonnaInModifica || !admin() || fine;
    el('rigaColonnaTicket').hidden = !colonnaInModifica || !admin();
    el('colonnaTicket').checked = !!colonnaInModifica && stato.colonnaTicket === colonnaInModifica.id;
    el('dialogoColonna').showModal();
    el('colonnaNome').focus();
}

export const nuovaColonna = () => apriColonna({ dataset: {} });
export const chiudiColonna = () => el('dialogoColonna').close();

export async function salvaColonna() {
    const nome = el('colonnaNome').value.trim();
    if (!nome) { errore('colonnaErrore', 'Il nome non può essere vuoto.'); return; }
    const di_fine = el('colonnaFine').checked;
    try {
        if (colonnaInModifica) {
            await api.aggiornaColonna(colonnaInModifica.id, { nome, di_fine });
            const eraQui = stato.colonnaTicket === colonnaInModifica.id;
            const ticket = el('colonnaTicket').checked;
            if (admin() && ticket !== eraQui) {
                await api.aggiornaTicketAsset({ colonna_id: ticket ? colonnaInModifica.id : null });
                stato.colonnaTicket = ticket ? colonnaInModifica.id : null;
            }
        } else {
            const ultima = stato.colonne.reduce((m, c) => Math.max(m, c.posizione), 0);
            await api.creaColonna({ bacheca_id: stato.vista, nome, di_fine, posizione: ultima + PASSO_POSIZIONE });
        }
    } catch (e) {
        errore('colonnaErrore', e.message);
        return;
    }
    chiudiColonna();
    await ricarica();
}

export async function spostaColonna(elemento) {
    const verso = Number(elemento.dataset.verso);
    const ordinate = [...stato.colonne].sort((a, b) => a.posizione - b.posizione);
    const i = ordinate.findIndex(c => c.id === colonnaInModifica.id);
    const vicina = ordinate[i + verso];
    if (!vicina) return;
    try {
        await api.aggiornaColonna(colonnaInModifica.id, { posizione: vicina.posizione });
        await api.aggiornaColonna(vicina.id, { posizione: colonnaInModifica.posizione });
        [colonnaInModifica.posizione, vicina.posizione] = [vicina.posizione, colonnaInModifica.posizione];
    } catch (e) {
        errore('colonnaErrore', e.message);
    }
    await ricarica();
}

export async function eliminaColonna() {
    const ok = await confirmDialog({
        title: 'Eliminare la colonna?',
        text: `«${colonnaInModifica.nome}» si elimina solo se è vuota, archivio compreso: prima si spostano le sue schede.`,
        confirmLabel: 'Elimina', danger: true
    });
    if (!ok) return;
    try {
        await api.eliminaColonna(colonnaInModifica.id);
    } catch (e) {
        errore('colonnaErrore', e.message);
        return;
    }
    chiudiColonna();
    await ricarica();
}


let archivio = [];
let repartoArchivio = null;

function disegnaArchivio() {
    const q = el('archivioRicerca').value.trim().toLowerCase();
    const righe = archivio.filter(s => !q || `${s.titolo} ${s.descrizione || ''}`.toLowerCase().includes(q));
    el('archivioElenco').innerHTML = righe.map(s => {
        const nota = `${s.bacheca_nome} · ${s.colonna_nome}${s.completata_il ? ` · completata il ${dataBreve(s.completata_il)}` : ''}`;
        return `
        <div class="archivio-riga">
            <button type="button" class="link-azione archivio-titolo" data-action="apri-scheda" data-id="${escapeHtml(s.id)}">${escapeHtml(s.titolo)}</button>
            <span class="storia-nota" title="${escapeHtml(nota)}">${escapeHtml(nota)}</span>
            <button type="button" class="btn btn-theme" data-action="ripristina" data-id="${escapeHtml(s.id)}" data-versione="${s.versione}">Ripristina</button>
        </div>`;
    }).join('') || '<p class="niente">Nessuna scheda in archivio.</p>';
}

export async function apriArchivio(elemento) {
    repartoArchivio = (elemento && elemento.dataset.reparto) || (bachecaAperta() || {}).reparto_id;
    if (!repartoArchivio) return;
    errore('archivioErrore', '');
    el('archivioTitolo').textContent = `Archivio — ${(reparto(repartoArchivio) || {}).nome || ''}`;
    el('archivioRicerca').value = '';
    el('archivioNota').textContent = `Le schede completate da più di ${GIORNI_ARCHIVIO} giorni escono dalla bacheca e restano qui.`;
    el('archivioElenco').innerHTML = '<p class="niente">Caricamento…</p>';
    el('dialogoArchivio').showModal();
    try {
        archivio = await api.caricaArchivio(repartoArchivio);
    } catch (e) {
        el('archivioElenco').innerHTML = '';
        errore('archivioErrore', e.message);
        return;
    }
    disegnaArchivio();
}

export const chiudiArchivio = () => el('dialogoArchivio').close();
export const collegaCampiArchivio = () => el('archivioRicerca').addEventListener('input', disegnaArchivio);

export async function ripristina(elemento) {
    try {
        await api.aggiornaScheda(elemento.dataset.id, Number(elemento.dataset.versione), { completata_il: null, archiviata_il: null });
        archivio = await api.caricaArchivio(repartoArchivio);
    } catch (e) {
        errore('archivioErrore', e.message);
        return;
    }
    disegnaArchivio();
    await ricarica();
    toast('Scheda ripristinata e riaperta');
}

