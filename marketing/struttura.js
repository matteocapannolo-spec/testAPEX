
import { escapeHtml, toast, confirmDialog } from '../core/ui.js';
import {
    creaCapitolo, aggiornaCapitolo, eliminaCapitolo, creaSezione, aggiornaSezione, eliminaSezione,
    salvaBlocco, eliminaBlocco
} from './api.js';
import { stato, contesto, albero, capitoloPerId, sezionePerId, bloccoPerId, conTitolo, quandoCambia, ricaricaDopoScrittura } from './stato.js';
import { PASSO_ORDINE, TIPI } from './config.js';
import { freccia } from './sommario.js';
import { montaTrascina } from './trascina.js';
import { fratelli, destinazioneDi, campiPadre, calcolaPosto, puoScendere } from './riordina.js';

const el = id => document.getElementById(id);

const chiusi = new Set();

const FIGLI = { capitolo: 'sezioni', sezione: 'blocchi' };
const ICONA = { testo: 'notes', link: 'link', tabella: 'table_chart' };

function errore(testo) {
    el('strutturaErrore').textContent = testo || '';
    el('strutturaErrore').hidden = !testo;
}

function pulsante(azione, attributi, icona, titolo, spento = false) {
    return `<button type="button" class="action-btn" data-action="${azione}"${attributi} title="${escapeHtml(titolo)}"${spento ? ' disabled' : ''}>`
        + `<span class="material-symbols-outlined">${icona}</span></button>`;
}

function voceDi(livello, id) {
    if (livello === 'capitolo') return capitoloPerId(id);
    if (livello === 'sezione') return sezionePerId(id);
    return bloccoPerId(id);
}

function motivoPieno(livello, voce) {
    if (livello === 'blocco') return '';
    const n = (voce[FIGLI[livello]] || []).length;
    if (!n) return '';
    const cosa = livello === 'capitolo' ? (n === 1 ? 'sezione' : 'sezioni') : (n === 1 ? 'blocco' : 'blocchi');
    return `Contiene ancora ${n} ${cosa}: non si elimina`;
}

function riga(livello, voce) {
    const id = escapeHtml(voce.id);
    const dati = ` data-livello="${livello}" data-id="${id}"`;
    const figli = voce[FIGLI[livello]] || [];
    const pieno = motivoPieno(livello, voce);
    const aggiungi = livello === 'capitolo'
        ? pulsante('struttura-nuova-sezione', ` data-capitolo="${id}"`, 'add', 'Aggiungi una sezione in fondo al capitolo')
        : livello === 'sezione'
            ? pulsante('nuovo-blocco', ` data-sezione="${id}"`, 'add', 'Aggiungi un blocco in fondo alla sezione')
            : '<span class="action-spazio"></span>';
    const tipo = livello === 'blocco'
        ? `<span class="struttura-tipo material-symbols-outlined" title="${escapeHtml(TIPI[voce.tipo] || '')}">${ICONA[voce.tipo] || 'notes'}</span>`
        : '';
    const segnaposto = livello === 'blocco' ? `${TIPI[voce.tipo] || 'Blocco'} senza titolo` : 'Titolo';
    return `<div class="struttura-riga riga-${livello}">`
        + freccia(voce.id, livello === 'blocco' ? 0 : figli.length, chiusi.has(voce.id), 'struttura-ramo')
        + `<span class="struttura-maniglia" draggable="true"${dati} title="Trascina per spostare"><span class="material-symbols-outlined">drag_indicator</span></span>`
        + `<span class="struttura-numero" title="Il numero dipende dalla posizione">${escapeHtml(voce.numero || '')}</span>`
        + tipo
        + `<input type="text" class="edit-input struttura-titolo" data-campo="titolo"${dati} value="${escapeHtml(voce.titolo || '')}" placeholder="${escapeHtml(segnaposto)}" aria-label="Titolo">`
        + aggiungi
        + pulsante('struttura-sposta', `${dati} data-direzione="-1"`, 'arrow_upward', 'Sposta su')
        + pulsante('struttura-sposta', `${dati} data-direzione="1"`, 'arrow_downward', 'Sposta giù')
        + pulsante('struttura-elimina', dati, 'delete', pieno || 'Elimina', Boolean(pieno))
        + '</div>';
}

function gruppo(livello, voce, capitoloId, sezioneId = '') {
    const figli = voce[FIGLI[livello]] || [];
    const dove = ` data-capitolo="${escapeHtml(capitoloId)}" data-sezione="${escapeHtml(sezioneId)}"`;
    const dentro = livello === 'capitolo'
        ? figli.map(s => gruppo('sezione', s, voce.id)).join('')
        : livello === 'sezione' ? figli.map(b => gruppo('blocco', b, capitoloId, voce.id)).join('') : '';
    return `<div class="struttura-gruppo gruppo-${livello}${chiusi.has(voce.id) ? ' chiuso' : ''}" data-livello="${livello}" data-id="${escapeHtml(voce.id)}"${dove}>`
        + riga(livello, voce)
        + (dentro ? `<div class="struttura-figli">${dentro}</div>` : '')
        + '</div>';
}

function disegna() {
    el('strutturaAlbero').innerHTML = albero().map(c => gruppo('capitolo', c, c.id)).join('')
        + '<div class="struttura-segno" hidden></div>';
}

export function montaStruttura() {
    el('strutturaAlbero').addEventListener('change', ev => {
        const campo = ev.target.closest('[data-campo]');
        if (campo) rinomina(campo);
    });
    montaTrascina(el('strutturaAlbero'), { quandoLascia: spostaIn, puoScendere });
    quandoCambia(() => { if (el('dialogoStruttura').open) disegna(); });
}

export function apriStruttura() {
    if (!contesto().puoScrivere) return;
    errore('');
    disegna();
    el('dialogoStruttura').showModal();
}

export function chiudiStruttura() {
    el('dialogoStruttura').close();
}

export function apriChiudi(elemento) {
    const id = elemento.dataset.id;
    if (chiusi.has(id)) chiusi.delete(id);
    else chiusi.add(id);
    disegna();
}

async function dopo(fn) {
    let ok = true;
    try {
        errore('');
        await fn();
    } catch (e) {
        errore(e.message);
        ok = false;
    }
    await ricaricaDopoScrittura();
    disegna();
    return ok;
}

function aggiorna(livello, id, campi) {
    if (livello === 'capitolo') return aggiornaCapitolo(id, campi);
    if (livello === 'sezione') return aggiornaSezione(id, campi);
    return salvaBlocco({ id, ...campi });
}

async function rinomina(campo) {
    const { livello, id } = campo.dataset;
    const valore = campo.value.trim();
    if (!valore && livello !== 'blocco') {
        errore('Il titolo non può essere vuoto.');
        return;
    }
    await dopo(() => aggiorna(livello, id, { titolo: valore || null }));
}

function prossimo(elenco) {
    const ordini = elenco.map(v => Number(v.ordine) || 0);
    return (ordini.length ? Math.max(...ordini) : 0) + PASSO_ORDINE;
}

export async function nuovoCapitolo() {
    const ok = await dopo(() => creaCapitolo({ numero: String(stato.capitoli.length + 1), titolo: 'Nuovo capitolo', ordine: prossimo(stato.capitoli) }));
    if (ok) {
        toast('Capitolo aggiunto in fondo: rinominalo dal campo');
        const capitoli = el('strutturaAlbero').querySelectorAll('.gruppo-capitolo');
        if (capitoli.length) capitoli[capitoli.length - 1].scrollIntoView({ block: 'nearest' });
    }
}

export async function nuovaSezione(elemento) {
    const capitoloId = elemento.dataset.capitolo;
    const sorelle = fratelli('sezione', { capitoloId });
    chiusi.delete(capitoloId);
    const ok = await dopo(() => creaSezione({ capitolo_id: capitoloId, numero: '', titolo: 'Nuova sezione', ordine: prossimo(sorelle) }));
    if (ok) toast('Sezione aggiunta in fondo: rinominala dal campo');
}

export async function spostaIn(livello, id, dest, indice, nuovo = livello) {
    const voce = voceDi(livello, id);
    if (!voce) return;
    if (livello === 'blocco' && nuovo === 'sezione') return promuovi(voce, dest, indice);
    if (livello === 'sezione' && nuovo === 'blocco') return declassa(voce, dest, indice);
    if (fratelli(livello, dest).findIndex(v => v.id === id) === indice) return;

    const { ordine, altri } = calcolaPosto(fratelli(livello, dest).filter(v => v.id !== id), indice);
    chiusi.delete(dest.sezioneId || dest.capitoloId);
    await dopo(async () => {
        for (const [quale, campi] of altri) await aggiorna(livello, quale, campi);
        await aggiorna(livello, id, { ...campiPadre(livello, dest), ordine });
    });
}

async function promuovi(b, dest, indice) {
    const { ordine, altri } = calcolaPosto(fratelli('sezione', dest), indice);
    const ok = await dopo(async () => {
        for (const [quale, campi] of altri) await aggiornaSezione(quale, campi);
        const sezione = await creaSezione({ capitolo_id: dest.capitoloId, numero: '', titolo: conTitolo(b) ? b.titolo.trim() : 'Nuova sezione', ordine });
        await salvaBlocco({ id: b.id, sezione_id: sezione, ordine: PASSO_ORDINE, ...(b.tipo === 'link' ? {} : { titolo: null }) });
    });
    if (ok) toast('Il blocco è diventato una sezione');
}

async function declassa(s, dest, indice) {
    if (!puoScendere(s.id)) {
        errore('Diventa un blocco solo una sezione vuota, o con un solo blocco senza titolo.');
        return;
    }
    const blocchi = stato.blocchi.filter(b => b.sezione_id === s.id);
    const { ordine, altri } = calcolaPosto(fratelli('blocco', dest), indice);
    chiusi.delete(dest.sezioneId);
    const ok = await dopo(async () => {
        for (const [quale, campi] of altri) await salvaBlocco({ id: quale, ...campi });
        if (blocchi.length) {
            await salvaBlocco({ id: blocchi[0].id, sezione_id: dest.sezioneId, ordine, titolo: s.titolo });
        } else {
            await salvaBlocco({ sezione_id: dest.sezioneId, ordine, tipo: 'testo', titolo: s.titolo, contenuto: { html: '' }, stato: 'bozza' });
        }
        await eliminaSezione(s.id);
    });
    if (ok) toast('La sezione è diventata un blocco');
}

export async function sposta(elemento) {
    const { livello, id } = elemento.dataset;
    const voce = voceDi(livello, id);
    if (!voce) return;
    const dest = destinazioneDi(livello, voce);
    const i = fratelli(livello, dest).findIndex(v => v.id === id);
    const j = i + Number(elemento.dataset.direzione);
    if (i < 0 || j < 0 || j >= fratelli(livello, dest).length) return;
    await spostaIn(livello, id, dest, j);
}

export async function elimina(elemento) {
    const { livello, id } = elemento.dataset;
    const voce = voceDi(livello, id);
    if (!voce) return;

    const nomi = { capitolo: 'questo capitolo', sezione: 'questa sezione', blocco: 'questo blocco' };
    const nome = voce.titolo ? `«${[voce.numero, voce.titolo].filter(Boolean).join(' ')}»` : `Il blocco (${TIPI[voce.tipo] || 'senza titolo'})`;
    const conferma = await confirmDialog({
        title: `Eliminare ${nomi[livello]}?`,
        text: livello === 'blocco'
            ? `${nome} sparisce dal playbook per tutti, con le sue versioni precedenti.`
            : `${nome} sparisce dal sommario per tutti.`,
        confirmLabel: 'Elimina',
        danger: true
    });
    if (!conferma) return;
    if (livello === 'capitolo') await dopo(() => eliminaCapitolo(id));
    else if (livello === 'sezione') await dopo(() => eliminaSezione(id));
    else await dopo(() => eliminaBlocco(id));
}
