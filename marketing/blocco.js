
import { escapeHtml, toast, confirmDialog } from '../core/ui.js';
import { salvaBlocco, eliminaBlocco as eliminaBloccoApi, spostaBlocco as spostaBloccoApi, caricaStorico } from './api.js';
import { stato, contesto, bloccoPerId, prossimoOrdine, sezioniInOrdine, ricaricaDopoScrittura, mostraAvviso } from './stato.js';
import { scriviEditor, leggiEditor, annullaLink } from './editor.js';
import { INDIRIZZO_VALIDO, PASSO_ORDINE, TIPI, dataOraIt } from './config.js';

const el = id => document.getElementById(id);

let aperto = null;
let tabella = { colonne: [], righe: [] };

function errore(testo) {
    el('bloccoErrore').textContent = testo || '';
    el('bloccoErrore').hidden = !testo;
}

function riempiTendina(select, voci, scelto) {
    select.innerHTML = voci.map(([valore, etichetta]) =>
        `<option value="${escapeHtml(valore)}"${valore === scelto ? ' selected' : ''}>${escapeHtml(etichetta)}</option>`).join('');
}

function leggiGriglia() {
    const griglia = el('bloccoTabella');
    tabella.colonne = [...griglia.querySelectorAll('[data-colonna]')].map(i => i.value);
    tabella.righe = [...griglia.querySelectorAll('tr[data-riga]')].map(tr =>
        [...tr.querySelectorAll('[data-cella]')].map(i => i.value));
}

function disegnaGriglia() {
    const n = tabella.colonne.length;
    const testa = tabella.colonne.map((c, i) =>
        `<th><input type="text" class="edit-input" data-colonna="${i}" value="${escapeHtml(c)}" placeholder="Colonna ${i + 1}"></th>`).join('');
    const righe = tabella.righe.map((r, ri) =>
        `<tr data-riga="${ri}">` + tabella.colonne.map((_, ci) =>
            `<td><input type="text" class="edit-input" data-cella="${ci}" value="${escapeHtml(r[ci] ?? '')}"></td>`).join('')
        + `<td class="cella-azione"><button type="button" class="action-btn" data-action="tabella-togli-riga" data-indice="${ri}" title="Togli la riga"><span class="material-symbols-outlined">close</span></button></td></tr>`).join('');
    el('bloccoTabella').innerHTML = n
        ? `<table class="griglia-tabella"><thead><tr>${testa}<th></th></tr></thead><tbody>${righe}</tbody></table>`
        : '<p class="elenco-vuoto">Nessuna colonna: comincia da «Aggiungi colonna».</p>';
}

export function aggiungiRiga() {
    leggiGriglia();
    tabella.righe.push(tabella.colonne.map(() => ''));
    disegnaGriglia();
}

export function aggiungiColonna() {
    leggiGriglia();
    tabella.colonne.push('');
    for (const r of tabella.righe) r.push('');
    disegnaGriglia();
}

export function togliColonna() {
    leggiGriglia();
    if (!tabella.colonne.length) return;
    tabella.colonne.pop();
    for (const r of tabella.righe) r.pop();
    disegnaGriglia();
}

export function togliRiga(elemento) {
    leggiGriglia();
    tabella.righe.splice(Number(elemento.dataset.indice), 1);
    disegnaGriglia();
}

export function cambiaTipo() {
    const tipo = el('bloccoTipo').value;
    el('campoTesto').hidden = tipo === 'link';
    el('campoTestoSotto').hidden = tipo !== 'tabella';
    el('etichettaTesto').textContent = tipo === 'tabella' ? 'Testo sopra la tabella' : 'Testo';
    el('bloccoEditor').classList.toggle('editor-breve', tipo === 'tabella');
    el('campoLink').hidden = tipo !== 'link';
    el('campoTabella').hidden = tipo !== 'tabella';
    el('bloccoTitolo').placeholder = tipo === 'link' ? 'Il testo che si legge sul collegamento' : 'Facoltativo';
}

function disegnaStorico(versioni) {
    if (!versioni.length) {
        el('bloccoStorico').innerHTML = '<p class="elenco-vuoto">Nessuna versione precedente.</p>';
        return;
    }
    el('bloccoStorico').innerHTML = versioni.map(v => {
        const chi = stato.nomi[v.salvato_da];
        return `<div class="versione">`
            + `<span class="versione-quando">${escapeHtml(dataOraIt(v.salvato_il))}${chi ? ', ' + escapeHtml(chi) : ''}</span>`
            + `<button type="button" class="btn btn-theme btn-piccolo" data-action="ripristina-versione" data-id="${escapeHtml(v.id)}">Ripristina</button>`
            + '</div>';
    }).join('');
}

let versioniCaricate = [];

async function apri(b, sezioneId) {
    aperto = b ? b.id : null;
    errore('');
    annullaLink();

    el('bloccoTitoloPannello').textContent = b ? 'Modifica blocco' : 'Nuovo blocco';
    riempiTendina(el('bloccoSezione'),
        sezioniInOrdine().map(s => [s.id, `${s.numero} ${s.titolo}`.trim()]),
        b ? b.sezione_id : sezioneId);
    riempiTendina(el('bloccoTipo'), Object.entries(TIPI), b ? b.tipo : 'testo');
    el('bloccoStato').value = b ? b.stato : 'ok';
    el('bloccoTitolo').value = b ? (b.titolo || '') : '';

    const c = (b && b.contenuto) || {};
    scriviEditor('bloccoEditor', (b && b.tipo === 'tabella' ? c.prima : c.html) || '');
    scriviEditor('bloccoEditorSotto', c.dopo || '');
    el('bloccoUrl').value = c.url || '';
    el('bloccoDescrizione').value = c.descrizione || '';
    tabella = { colonne: [...(c.colonne || [])], righe: (c.righe || []).map(r => [...r]) };
    disegnaGriglia();
    cambiaTipo();

    el('bloccoStoricoSezione').hidden = !b;
    el('dialogoBlocco').showModal();
    el('bloccoTitolo').focus();

    if (b) {
        el('bloccoStorico').innerHTML = '<p class="elenco-vuoto">Caricamento…</p>';
        try {
            versioniCaricate = await caricaStorico(b.id);
            disegnaStorico(versioniCaricate);
        } catch (e) {
            el('bloccoStorico').innerHTML = `<p class="elenco-vuoto">${escapeHtml(e.message)}</p>`;
        }
    }
}

export function apriNuovo(elemento) {
    if (!contesto().puoScrivere) return;
    const sezioneId = (elemento && elemento.dataset.sezione) || (stato.sezioni[0] && stato.sezioni[0].id);
    if (!sezioneId) {
        toast('Prima serve una sezione: si crea da «Struttura».');
        return;
    }
    apri(null, sezioneId);
}

export function apriModifica(elemento) {
    const b = bloccoPerId(elemento.dataset.id);
    if (b && contesto().puoScrivere) apri(b);
}

export function chiudiBlocco() {
    el('dialogoBlocco').close();
}

export function ripristinaVersione(elemento) {
    const v = versioniCaricate.find(x => x.id === elemento.dataset.id);
    if (!v) return;
    const c = v.contenuto || {};
    el('bloccoTitolo').value = v.titolo || '';
    if (c.html !== undefined) scriviEditor('bloccoEditor', c.html);
    if (c.url !== undefined) { el('bloccoUrl').value = c.url || ''; el('bloccoDescrizione').value = c.descrizione || ''; }
    if (c.colonne !== undefined) {
        scriviEditor('bloccoEditor', c.prima || '');
        scriviEditor('bloccoEditorSotto', c.dopo || '');
        tabella = { colonne: [...c.colonne], righe: (c.righe || []).map(r => [...r]) };
        disegnaGriglia();
    }
    toast('Versione ripristinata nel pannello: si conferma con «Salva»');
}

function leggiCampi() {
    const tipo = el('bloccoTipo').value;
    const campi = {
        id: aperto,
        sezione_id: el('bloccoSezione').value,
        tipo,
        titolo: el('bloccoTitolo').value.trim() || null,
        stato: el('bloccoStato').value
    };
    if (!campi.sezione_id) return { problema: 'Scegli la sezione in cui va il blocco.' };

    if (tipo === 'testo') {
        campi.contenuto = { html: leggiEditor('bloccoEditor') };
    } else if (tipo === 'link') {
        const url = el('bloccoUrl').value.trim();
        if (!INDIRIZZO_VALIDO.test(url)) {
            return { problema: 'Il link deve cominciare per https:// (oppure http://): conviene copiarlo dalla barra del browser.' };
        }
        if (!campi.titolo) return { problema: 'Un link ha bisogno del testo che si legge sul collegamento.' };
        campi.contenuto = { url, descrizione: el('bloccoDescrizione').value.trim() };
    } else {
        leggiGriglia();
        if (!tabella.colonne.length) return { problema: 'Una tabella ha bisogno di almeno una colonna.' };
        campi.contenuto = {
            prima: leggiEditor('bloccoEditor'),
            colonne: tabella.colonne.map(c => c.trim()),
            righe: tabella.righe.map(r => r.map(v => v.trim())),
            dopo: leggiEditor('bloccoEditorSotto')
        };
    }

    const b = aperto ? bloccoPerId(aperto) : null;
    if (!b || b.sezione_id !== campi.sezione_id) {
        campi.ordine = prossimoOrdine(campi.sezione_id, PASSO_ORDINE);
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
        await salvaBlocco(campi);
    } catch (e) {
        errore(e.message);
        return;
    }
    el('dialogoBlocco').close();
    toast(campi.id ? 'Blocco aggiornato' : 'Blocco aggiunto');
    await ricaricaDopoScrittura();
}

export async function eliminaBlocco(elemento) {
    const b = bloccoPerId(elemento.dataset.id);
    if (!b || !contesto().puoScrivere) return;

    const conferma = await confirmDialog({
        title: 'Eliminare questo blocco?',
        text: `«${b.titolo || TIPI[b.tipo] || 'Blocco'}» sparisce dal playbook per tutti, insieme alle sue versioni precedenti.`,
        confirmLabel: 'Elimina',
        danger: true
    });
    if (!conferma) return;

    try {
        await eliminaBloccoApi(b.id);
    } catch (e) {
        mostraAvviso(e.message);
        return;
    }
    toast('Blocco eliminato');
    await ricaricaDopoScrittura();
}

export async function spostaBlocco(elemento) {
    if (!contesto().puoScrivere) return;
    try {
        await spostaBloccoApi(elemento.dataset.id, Number(elemento.dataset.direzione));
    } catch (e) {
        mostraAvviso(e.message);
        return;
    }
    await ricaricaDopoScrittura();
}
