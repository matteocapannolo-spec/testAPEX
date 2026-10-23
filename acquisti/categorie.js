
import { escapeHtml, toast, confirmDialog } from '../core/ui.js';
import { creaCategoria, rinominaCategoria, eliminaCategoria } from './api.js';
import { stato, contesto, usiDi, ricarica } from './stato.js';

const el = id => document.getElementById(id);

let collegato = false;

function errore(testo) {
    el('categorieErrore').textContent = testo || '';
    el('categorieErrore').hidden = !testo;
}

function quanti(n) {
    if (!n) return 'non usata';
    return n === 1 ? '1 prodotto' : `${n} prodotti`;
}

function riga(c) {
    const usi = usiDi(c.id);
    const spiega = usi
        ? `Usata da ${quanti(usi)}: si elimina dopo averla tolta da quei prodotti`
        : 'Elimina questa categoria';

    return '<div class="riga-categoria">'
        + `<input type="text" class="edit-input campo-categoria" data-id="${escapeHtml(c.id)}"`
        + ` value="${escapeHtml(c.nome)}" maxlength="60" autocomplete="off" title="Il nome si salva uscendo dal campo">`
        + `<span class="usi-categoria${usi ? '' : ' nessuno'}">${quanti(usi)}</span>`
        + `<button type="button" class="action-btn" data-action="elimina-categoria" data-id="${escapeHtml(c.id)}"`
        + ` title="${escapeHtml(spiega)}"><span class="material-symbols-outlined">delete</span></button>`
        + '</div>';
}

function disegnaElenco() {
    el('elencoCategorie').innerHTML = stato.categorie.length
        ? stato.categorie.map(riga).join('')
        : '<p class="elenco-vuoto">Nessuna categoria. Scrivine una qui sotto e premi «Aggiungi».</p>';
}

async function scrivi(scrittura, riuscita) {
    try {
        errore('');
        await scrittura();
    } catch (e) {
        errore(e.message);
        return false;
    }

    toast(riuscita);
    try {
        await ricarica();
        if (el('dialogoCategorie').open) disegnaElenco();
    } catch (e) {
        errore('Salvato, ma la rilettura non è riuscita: ' + e.message);
    }
    return true;
}

export function apriCategorie() {
    if (!contesto().puoScrivere) return;
    errore('');
    el('nuovaCategoria').value = '';
    disegnaElenco();

    if (!collegato) {
        el('elencoCategorie').addEventListener('change', rinomina);
        el('nuovaCategoria').addEventListener('keydown', ev => {
            if (ev.key === 'Enter') {
                ev.preventDefault();
                aggiungi();
            }
        });
        collegato = true;
    }

    el('dialogoCategorie').showModal();
    el('nuovaCategoria').focus();
}

export function chiudiCategorie() {
    el('dialogoCategorie').close();
}

export async function aggiungi() {
    const nome = el('nuovaCategoria').value.trim();
    if (!nome) {
        errore('Scrivi il nome della categoria nuova.');
        return;
    }

    const ultimo = stato.categorie.reduce((m, c) => Math.max(m, Number(c.ordine) || 0), 0);

    if (await scrivi(() => creaCategoria(nome, ultimo + 10), `Categoria «${nome}» aggiunta`)) {
        el('nuovaCategoria').value = '';
    }
}

async function rinomina(ev) {
    const campo = ev.target.closest('.campo-categoria');
    if (!campo) return;

    const categoria = stato.categorie.find(c => c.id === campo.dataset.id);
    const nome = campo.value.trim();

    if (!nome) {
        if (categoria) campo.value = categoria.nome;
        errore('Il nome non può essere vuoto: per togliere una categoria c\'è il cestino.');
        return;
    }
    if (categoria && nome === categoria.nome) return;

    if (!await scrivi(() => rinominaCategoria(campo.dataset.id, nome), 'Categoria rinominata')) {
        if (categoria) campo.value = categoria.nome;
    }
}

export async function elimina(elemento) {
    const categoria = stato.categorie.find(c => c.id === elemento.dataset.id);
    if (!categoria) return;

    const usi = usiDi(categoria.id);
    if (usi) {
        errore(`«${categoria.nome}» è usata da ${quanti(usi)}: toglila da quei prodotti, poi eliminala.`);
        return;
    }

    const conferma = await confirmDialog({
        title: 'Eliminare questa categoria?',
        text: `«${categoria.nome}» sparisce dall'elenco e dal filtro. Nessun prodotto la usa.`,
        confirmLabel: 'Elimina',
        danger: true
    });
    if (!conferma) return;

    await scrivi(() => eliminaCategoria(categoria.id), 'Categoria eliminata');
}
