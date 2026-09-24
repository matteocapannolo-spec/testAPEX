
import { escapeHtml, toast, confirmDialog } from '../core/ui.js';
import { salvaProdotto, eliminaProdotto as eliminaProdottoApi } from './api.js';
import { stato, contesto, prodottoPerId, ricaricaDopoScrittura, mostraAvviso } from './stato.js';
import { pillolaCategoria } from './tabella.js';
import { dataOraIt, INDIRIZZO_VALIDO, EMAIL_VALIDA, CONTATTI } from './config.js';

const el = id => document.getElementById(id);

let aperto = null;

function errore(testo) {
    el('prodottoErrore').textContent = testo || '';
    el('prodottoErrore').hidden = !testo;
}

function campiDelPannello() {
    return el('dialogoProdotto').querySelectorAll('[data-campo]');
}

function disegnaScelte(scelte) {
    const ctx = contesto();
    const voci = [...ctx.categorie.values()].map(c =>
        `<label class="scelta-categoria">`
        + `<input type="checkbox" name="categoria" value="${escapeHtml(c.id)}"${scelte.includes(c.id) ? ' checked' : ''}>`
        + pillolaCategoria(c)
        + '</label>');

    el('prodottoCategorie').innerHTML = voci.length
        ? voci.join('')
        : '<p class="elenco-vuoto">Nessuna categoria: aggiungine una dal pulsante «Categorie».</p>';
}

function sottotitolo(p) {
    if (!p) return '';
    const chi = stato.nomi[p.updated_by];
    return 'Ultima modifica: ' + dataOraIt(p.updated_at) + (chi ? ', ' + chi : '');
}

function apri(p) {
    aperto = p ? p.id : null;
    errore('');

    el('prodottoTitolo').textContent = p ? 'Modifica prodotto' : 'Nuovo prodotto';
    el('prodottoSottotitolo').textContent = sottotitolo(p);
    el('prodottoSottotitolo').hidden = !p;
    for (const campo of campiDelPannello()) campo.value = p ? (p[campo.dataset.campo] || '') : '';
    disegnaScelte(p ? p.categorie : []);

    el('dialogoProdotto').showModal();
    el('prodottoNome').focus();
}

export function apriNuovo() {
    if (!contesto().puoScrivere) return;
    apri(null);
}

export function apriModifica(elemento) {
    const p = prodottoPerId(elemento.closest('tr').dataset.index);
    if (p && contesto().puoScrivere) apri(p);
}

export function chiudiProdotto() {
    el('dialogoProdotto').close();
}

function leggiCampi() {
    const campi = { id: aperto };
    for (const campo of campiDelPannello()) campi[campo.dataset.campo] = campo.value.trim();
    campi.categorie = [...el('prodottoCategorie').querySelectorAll('input[name="categoria"]:checked')].map(i => i.value);

    if (!campi.nome) return { problema: 'Il nome del prodotto è obbligatorio.' };
    if (campi.url && !INDIRIZZO_VALIDO.test(campi.url)) {
        return { problema: 'Il link deve cominciare per https:// (oppure http://): conviene copiarlo dalla barra del browser.' };
    }
    if (!campi.categorie.length) return { problema: 'Scegli almeno una categoria.' };

    const emailSbagliata = CONTATTI.find(n => {
        const email = campi[`contatto${n}_email`];
        return email && !EMAIL_VALIDA.test(email);
    });
    if (emailSbagliata) {
        return { problema: `L'email del contatto ${emailSbagliata} non sembra valida: controlla la chiocciola e il dominio.` };
    }
    return { campi };
}

export async function salvaDalPannello() {
    const { campi, problema } = leggiCampi();
    if (problema) {
        errore(problema);
        return;
    }

    try {
        errore('');
        await salvaProdotto(campi);
    } catch (e) {
        errore(e.message);
        return;
    }

    el('dialogoProdotto').close();
    toast(campi.id ? 'Prodotto aggiornato' : 'Prodotto aggiunto');
    await ricaricaDopoScrittura();
}

export async function eliminaProdotto(elemento) {
    const p = prodottoPerId(elemento.closest('tr').dataset.index);
    if (!p || !contesto().puoScrivere) return;

    const conferma = await confirmDialog({
        title: 'Eliminare questo prodotto?',
        text: `«${p.nome}» sparisce dalla directory per tutti, e non si recupera.`,
        confirmLabel: 'Elimina',
        danger: true
    });
    if (!conferma) return;

    try {
        await eliminaProdottoApi(p.id);
    } catch (e) {
        mostraAvviso(e.message);
        return;
    }

    toast('Prodotto eliminato');
    await ricaricaDopoScrittura();
}
