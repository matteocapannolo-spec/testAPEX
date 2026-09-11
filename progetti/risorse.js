
import { escapeHtml, toast, confirmDialog } from '../core/ui.js';
import { caricaCollegamenti, aggiorna, inserisci, elimina } from './api.js';

const el = id => document.getElementById(id);

let collegamenti = [];
let puoScrivere = false;
let collegato = false;

const NOME_ICONA = /^[a-z0-9_]+$/;

export function iconaDi(collegamento) {
    const scelta = String(collegamento.icona || '').trim();

    if (scelta) {
        return NOME_ICONA.test(scelta)
            ? `<span class="material-symbols-outlined">${escapeHtml(scelta)}</span>`
            : `<span class="emoji-collegamento">${escapeHtml(scelta)}</span>`;
    }

    const u = String(collegamento.url || '').toLowerCase();
    if (u.includes('odoo')) {
        return '<svg class="logo-collegamento odoo" aria-hidden="true"><use href="#logo-odoo"></use></svg>';
    }
    if (u.includes('google.com') || u.includes('drive.google')) {
        return '<svg class="logo-collegamento drive" aria-hidden="true"><use href="#logo-drive"></use></svg>';
    }
    return '<span class="material-symbols-outlined">open_in_new</span>';
}

function disegnaBarra() {
    const rotella = puoScrivere
        ? '<button type="button" class="btn btn-theme collegamento rotella" data-action="apri-risorse"'
          + ' title="Scegli i pulsanti di questa barra">'
          + '<span class="material-symbols-outlined">settings</span></button>'
        : '';

    el('collegamenti').innerHTML = rotella + collegamenti.filter(c => c.attivo).map(c =>
        `<a class="btn btn-theme collegamento" href="${escapeHtml(c.url)}" target="_blank" rel="noopener noreferrer"` +
        `${c.descrizione ? ` title="${escapeHtml(c.descrizione)}"` : ''}>` +
        `${iconaDi(c)}${escapeHtml(c.etichetta)}</a>`
    ).join('');
}

function apriChiudiBarra() {
    const barra = el('collegamenti');
    const apre = barra.hidden;
    barra.hidden = !apre;
    el('btnRisorse').setAttribute('aria-expanded', String(apre));
    el('frecciaRisorse').textContent = apre ? 'expand_less' : 'expand_more';
}

export async function caricaRisorse(ammessoAScrivere) {
    puoScrivere = ammessoAScrivere;
    collegamenti = await caricaCollegamenti(ammessoAScrivere);
    disegnaBarra();
}

function inItaliano(messaggio) {
    const m = String(messaggio || '');
    if (m.includes('collegamenti_url_check')) {
        return "L'indirizzo deve cominciare per https:// — questo non lo fa, e non è stato salvato.";
    }
    if (m.includes('collegamenti_icona_corta')) {
        return "L'icona è troppo lunga: ci sta un'emoji, o il nome di un'icona. Non una frase.";
    }
    return m;
}

function errore(testo) {
    el('risorseErrore').textContent = testo || '';
    el('risorseErrore').hidden = !testo;
}

function campo(riga, nomeCampo, valore, classe, segnaposto, spiega) {
    return `<input class="campo-inline ${classe}" type="text"` +
        ` data-tabella="collegamenti" data-riga="${escapeHtml(riga.id)}" data-campo="${escapeHtml(nomeCampo)}"` +
        ` value="${escapeHtml(valore ?? '')}" placeholder="${escapeHtml(segnaposto)}" title="${escapeHtml(spiega)}"` +
        ' autocomplete="off" spellcheck="false">';
}

function rigaPannello(c) {
    const nascosto = !c.attivo;

    return `<div class="riga-risorsa${nascosto ? ' nascosta' : ''}">`
        + `<span class="anteprima-icona">${iconaDi(c)}</span>`
        + campo(c, 'icona', c.icona, 'campo-icona', '🔧',
            "Un'emoji, oppure il nome di un'icona Material Symbols (build, inventory, folder_open). Vuoto: la sceglie l'indirizzo")
        + campo(c, 'etichetta', c.etichetta, 'campo-etichetta', 'Nome del pulsante', 'Il testo che si legge sul pulsante')
        + campo(c, 'url', c.url, 'campo-url', 'https://…', "L'indirizzo che il pulsante apre. Deve cominciare per https://")
        + `<button type="button" class="azione-risorsa" data-action="mostra-risorsa" data-id="${escapeHtml(c.id)}"`
        + ` title="${nascosto ? 'Nascosto dalla barra: premi per rimetterlo' : 'Visibile nella barra: premi per nasconderlo'}">`
        + `<span class="material-symbols-outlined">${nascosto ? 'visibility_off' : 'visibility'}</span></button>`
        + `<button type="button" class="azione-risorsa pericolo" data-action="elimina-risorsa" data-id="${escapeHtml(c.id)}"`
        + ' title="Elimina questo collegamento">'
        + '<span class="material-symbols-outlined">delete</span></button>'
        + '</div>';
}

function disegnaPannello() {
    el('elencoRisorse').innerHTML = collegamenti.length
        ? collegamenti.map(rigaPannello).join('')
        : '<p class="elenco-vuoto">Nessun collegamento. Premi «Aggiungi» per il primo.</p>';
}

async function rinfresca() {
    collegamenti = await caricaCollegamenti(true);
    disegnaBarra();
    if (el('dialogoRisorse').open) disegnaPannello();
}

export function apriRisorse() {
    if (!puoScrivere) return;
    errore('');
    disegnaPannello();

    if (!collegato) {
        el('elencoRisorse').addEventListener('change', salvaCampo);
        collegato = true;
    }

    el('dialogoRisorse').showModal();
}

export function chiudiRisorse() {
    el('dialogoRisorse').close();
}

async function salvaCampo(ev) {
    const input = ev.target.closest('.campo-inline');
    if (!input || !puoScrivere) return;

    const { riga, campo: nomeCampo } = input.dataset;
    const valore = input.value.trim() === '' ? null : input.value.trim();

    try {
        errore('');
        await aggiorna('collegamenti', riga, { [nomeCampo]: valore });
        await rinfresca();
    } catch (e) {
        errore(inItaliano(e.message));
    }
}

export async function nuovaRisorsa() {
    const ultimo = collegamenti.reduce((m, c) => Math.max(m, Number(c.ordine) || 0), 0);

    try {
        errore('');
        await inserisci('collegamenti', {
            etichetta: 'Nuovo collegamento',
            url: 'https://',
            ordine: ultimo + 10,
            attivo: false
        });
        await rinfresca();
        toast('Collegamento aggiunto: è nascosto finché non lo mostri');
    } catch (e) {
        errore(inItaliano(e.message));
    }
}

export async function mostraRisorsa(elemento) {
    const c = collegamenti.find(x => x.id === elemento.dataset.id);
    if (!c) return;

    try {
        errore('');
        await aggiorna('collegamenti', c.id, { attivo: !c.attivo });
        await rinfresca();
    } catch (e) {
        errore(inItaliano(e.message));
    }
}

export async function eliminaRisorsa(elemento) {
    const c = collegamenti.find(x => x.id === elemento.dataset.id);
    if (!c) return;

    const conferma = await confirmDialog({
        title: 'Eliminare questo collegamento?',
        text: `«${c.etichetta}» sparisce per sempre. Per toglierlo solo dalla barra c'è l'occhio accanto, che si può rimettere.`,
        confirmLabel: 'Elimina',
        danger: true
    });
    if (!conferma) return;

    try {
        errore('');
        await elimina('collegamenti', c.id);
        await rinfresca();
        toast('Collegamento eliminato');
    } catch (e) {
        errore(inItaliano(e.message));
    }
}

export function gestoriRisorse() {
    return {
        risorse: apriChiudiBarra,
        'apri-risorse': apriRisorse,
        'chiudi-risorse': chiudiRisorse,
        'nuova-risorsa': nuovaRisorsa,
        'mostra-risorsa': mostraRisorsa,
        'elimina-risorsa': eliminaRisorsa
    };
}
