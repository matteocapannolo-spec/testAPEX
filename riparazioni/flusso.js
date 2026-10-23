
import { escapeHtml, toast, confirmDialog } from '../core/ui.js';
import * as api from './api.js';
import {
    stato, contesto, contrattoPerId, flussoPerId, modelloPerId, brandDi, strumentiBloccati,
    strumentiDelContratto, strumentiDelFlusso, strumentoPerId, promemoriaAperti, cartucceDi,
    ricaricaDopoScrittura, mostraAvviso
} from './stato.js';
import { nomeModello, eBactoSense, LINK_VALIDO, TIPI } from './config.js';
import { mostraNote } from './note.js';

const el = id => document.getElementById(id);

let aperto = null;

function errore(testo) {
    el('flussoErrore').textContent = testo || '';
    el('flussoErrore').hidden = !testo;
}

const tipoScelto = () => (el('flussoTipi').querySelector('input:checked') || {}).value || 'riparazione';

function refillPossibile(contratto) {
    return cartucceDi(contratto.id).length > 0
        || strumentiDelContratto(contratto.id).some(s => eBactoSense(modelloPerId(s.modello_id)));
}

function disegnaScelte(scelti, bloccati) {
    const strumenti = strumentiDelContratto(aperto.contratto.id);
    el('flussoStrumenti').innerHTML = strumenti.length
        ? strumenti.map(s => {
            const modello = modelloPerId(s.modello_id);
            return '<label class="scelta-strumento">'
                + `<input type="checkbox" name="strumento" value="${escapeHtml(s.id)}"${scelti.includes(s.id) ? ' checked' : ''}${bloccati ? ' disabled' : ''}>`
                + `<span class="serie">${escapeHtml(s.numero_serie)}</span>`
                + `<span>${escapeHtml(nomeModello(modello))}</span>`
                + `<span class="strumento-brand">${escapeHtml((modello && modello.brand) || 'Senza brand')}</span></label>`;
        }).join('')
        : '<p class="elenco-vuoto">Il contratto non ha strumenti: si aggiungono dalla colonna «Strumenti».</p>';
    el('flussoBloccati').hidden = !bloccati;
    disegnaPromemoria();
}

function disegnaPromemoria() {
    const scelti = [...el('flussoStrumenti').querySelectorAll('input[name="strumento"]:checked')].map(i => strumentoPerId(i.value)).filter(Boolean);
    const voci = tipoScelto() === 'refill' ? [] : scelti.flatMap(s => promemoriaAperti(s.id).map(n => ({ s, n })));
    el('flussoPromemoria').hidden = !voci.length;
    el('flussoPromemoria').innerHTML = voci.length
        ? '<div class="avviso-titolo"><span class="material-symbols-outlined">push_pin</span> Promemoria aperti su questi strumenti</div><ul>'
          + voci.map(({ s, n }) => `<li><span class="serie">${escapeHtml(s.numero_serie)}</span> ${escapeHtml(n.testo)}</li>`).join('') + '</ul>'
        : '';
}

function aggiornaTipo() {
    const tipo = tipoScelto();
    el('campoStrumenti').hidden = tipo === 'refill';
    el('campoCartuccia').hidden = tipo !== 'refill';
    el('flussoTitolo').placeholder = (TIPI[tipo] || TIPI.riparazione).titolo;
    for (const l of el('flussoTipi').querySelectorAll('.tipo-scelta')) l.classList.toggle('scelto', l.querySelector('input').checked);
    disegnaPromemoria();
}

function riempiTipi(flusso, contratto) {
    const refill = refillPossibile(contratto);
    el('flussoTipi').innerHTML = Object.entries(TIPI).map(([k, t]) => {
        const spento = flusso ? k !== flusso.tipo : (k === 'refill' && !refill);
        const scelto = flusso ? k === flusso.tipo : k === 'riparazione';
        return `<label class="tipo-scelta tipo-${k}${spento ? ' spento' : ''}">`
            + `<input type="radio" name="tipoFlusso" value="${k}"${scelto ? ' checked' : ''}${spento ? ' disabled' : ''}>`
            + `<span class="material-symbols-outlined">${t.icona}</span>${t.etichetta}</label>`;
    }).join('');
    el('flussoTipoNota').textContent = flusso
        ? 'Il tipo di un flusso non si cambia dopo la creazione.'
        : (refill ? '' : 'Il refill c\'è solo per i contratti con un BactoSense o con una cartuccia.');
    el('flussoTipoNota').hidden = !el('flussoTipoNota').textContent;
}

function riempiCartucce(contratto, scelta) {
    const cartucce = cartucceDi(contratto.id);
    el('flussoCartuccia').innerHTML = '<option value="">Scegli la cartuccia…</option>'
        + cartucce.map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.seriale)}${c.ubicazione ? ` · ${escapeHtml(c.ubicazione)}` : ''}</option>`).join('');
    el('flussoCartuccia').value = scelta || '';
    el('flussoCartuccia').disabled = !!aperto.flusso;
    el('flussoSenzaCartucce').hidden = cartucce.length > 0;
}

function riempiTecnici(scelta) {
    el('flussoTecnico').innerHTML = '<option value="">Nessuno</option>'
        + stato.colleghi.map(p => `<option value="${escapeHtml(p.user_id)}">${escapeHtml(p.nome)}</option>`).join('');
    el('flussoTecnico').value = scelta || '';
}

function apri(contratto, flusso, fuoco = 'flussoTitolo') {
    aperto = { contratto, flusso };
    errore('');
    el('flussoTitoloPannello').textContent = flusso ? 'Modifica flusso' : 'Nuovo flusso';
    el('flussoSottotitolo').textContent = `${contratto.cliente_nome} · ${contratto.nome}`;
    el('flussoTitolo').value = flusso ? flusso.titolo : '';
    el('flussoCartella').value = flusso ? (flusso.link_cartella || '') : '';
    riempiTipi(flusso, contratto);
    riempiCartucce(contratto, flusso && flusso.cartuccia_id);
    riempiTecnici(flusso && flusso.tecnico_id);
    const scelti = flusso ? strumentiDelFlusso(flusso.id).map(s => s.id) : [];
    disegnaScelte(scelti, !!flusso && strumentiBloccati(flusso));

    el('campoFuori').hidden = !flusso;
    el('flussoFuori').checked = !!(flusso && flusso.fuori_contratto);
    el('flussoFuoriNota').value = flusso ? (flusso.fuori_contratto_nota || '') : '';
    el('flussoFuoriNota').hidden = !el('flussoFuori').checked;

    aggiornaTipo();
    el('dialogoFlusso').showModal();
    el(fuoco).focus();
}

export function apriNuovoFlusso(elemento) {
    const contratto = contrattoPerId(elemento.closest('.riga-flussi').dataset.contratto);
    if (contratto && contesto().puoAnagrafica) apri(contratto, null);
}

export function apriModificaFlusso(elemento) {
    const flusso = flussoPerId(elemento.closest('[data-flusso]').dataset.flusso);
    const contratto = flusso && contrattoPerId(flusso.contratto_id);
    const fuoco = elemento.classList.contains('cartella-mancante') ? 'flussoCartella' : 'flussoTitolo';
    if (contratto && contesto().puoAnagrafica) apri(contratto, flusso, fuoco);
}

export function chiudiFlusso() {
    el('dialogoFlusso').close();
}

function leggi() {
    const tipo = aperto.flusso ? aperto.flusso.tipo : tipoScelto();
    const titolo = el('flussoTitolo').value.trim();
    const cartella = el('flussoCartella').value.trim();
    const cartuccia = el('flussoCartuccia').value;
    const tecnico = el('flussoTecnico').value || null;
    const fuori = el('flussoFuori').checked;
    const fuoriNota = el('flussoFuoriNota').value.trim();
    const scelti = [...el('flussoStrumenti').querySelectorAll('input[name="strumento"]:checked')].map(i => i.value);
    if (!titolo) return { problema: 'Scrivi un titolo per il flusso.' };
    if (cartella && !LINK_VALIDO.test(cartella)) return { problema: 'Il link alla cartella deve cominciare per https://: conviene copiarlo dalla barra del browser.' };
    if (tipo === 'refill' && !cartuccia) return { problema: 'Scegli la cartuccia del refill.' };
    if (tipo !== 'refill' && !scelti.length) return { problema: 'Scegli almeno uno strumento.' };
    if (fuori && !fuoriNota) return { problema: 'Per il fuori contratto serve una nota: cosa ha chiesto il cliente, e quando.' };
    const strumenti = strumentiDelContratto(aperto.contratto.id);
    const brand = new Set(scelti.map(id => String(brandDi(strumenti.find(s => s.id === id)) || '').toLowerCase()));
    if (tipo !== 'refill' && brand.size > 1) return { problema: 'Un flusso contiene strumenti di un solo brand: per un brand diverso si apre un altro flusso.' };
    return { tipo, titolo, cartella: cartella || null, cartuccia, tecnico, fuori, fuoriNota: fuoriNota || null, scelti: tipo === 'refill' ? [] : scelti };
}

export async function salvaFlusso() {
    const c = leggi();
    if (c.problema) return errore(c.problema);

    const { flusso } = aperto;
    const bloccati = !!flusso && strumentiBloccati(flusso);
    const prima = flusso ? strumentiDelFlusso(flusso.id).map(s => s.id) : [];

    try {
        errore('');
        let id = flusso && flusso.id;
        if (!id) {
            id = await api.creaFlusso({
                contratto_id: aperto.contratto.id, titolo: c.titolo, link_cartella: c.cartella,
                tipo: c.tipo, cartuccia_id: c.tipo === 'refill' ? c.cartuccia : null, tecnico_id: c.tecnico
            });
            aperto.flusso = { id, tipo: c.tipo, titolo: c.titolo, link_cartella: c.cartella, tecnico_id: c.tecnico, contratto_id: aperto.contratto.id, stato: 'aperto', fuori_contratto: false };
        } else {
            const campi = {};
            if (c.titolo !== flusso.titolo) campi.titolo = c.titolo;
            if (c.cartella !== (flusso.link_cartella || null)) campi.link_cartella = c.cartella;
            if (c.tecnico !== (flusso.tecnico_id || null)) campi.tecnico_id = c.tecnico;
            if (c.fuori !== !!flusso.fuori_contratto || (c.fuori && c.fuoriNota !== flusso.fuori_contratto_nota)) {
                Object.assign(campi, { fuori_contratto: c.fuori, fuori_contratto_nota: c.fuori ? c.fuoriNota : null });
            }
            if (Object.keys(campi).length) await api.aggiornaFlusso(id, campi);
        }
        if (!bloccati) {
            for (const s of prima.filter(s => !c.scelti.includes(s))) await api.togliDalFlusso(id, s);
            for (const s of c.scelti.filter(s => !prima.includes(s))) {
                await api.aggiungiAlFlusso(id, s);
                prima.push(s);
            }
        }
    } catch (e) {
        errore(e.message);
        await ricaricaDopoScrittura();
        return;
    }

    el('dialogoFlusso').close();
    toast(flusso ? 'Flusso aggiornato' : 'Flusso creato');
    await ricaricaDopoScrittura();
}

export async function eliminaFlusso(elemento) {
    const flusso = flussoPerId(elemento.closest('[data-flusso]').dataset.flusso);
    if (!flusso || !contesto().admin) return;
    const ok = await confirmDialog({
        title: 'Eliminare questo flusso?',
        text: `«${flusso.titolo}» sparisce per tutti, con tutti i suoi passaggi e i loro documenti collegati. Non si recupera.`,
        confirmLabel: 'Elimina',
        danger: true
    });
    if (!ok) return;
    try {
        await api.eliminaFlusso(flusso.id);
    } catch (e) {
        mostraAvviso(e.message);
        return;
    }
    toast('Flusso eliminato');
    await ricaricaDopoScrittura();
}

export function collegaCampiFlusso() {
    el('flussoStrumenti').addEventListener('change', disegnaPromemoria);
    el('flussoTipi').addEventListener('change', aggiornaTipo);
    el('flussoFuori').addEventListener('change', () => {
        el('flussoFuoriNota').hidden = !el('flussoFuori').checked;
        if (el('flussoFuori').checked) el('flussoFuoriNota').focus();
    });
}


export function apriNoteFlusso(elemento) {
    const flusso = flussoPerId(elemento.closest('[data-flusso]').dataset.flusso);
    if (!flusso) return;
    const contratto = contrattoPerId(flusso.contratto_id);
    el('noteSottotitolo').textContent = `${flusso.titolo}${contratto ? ` · ${contratto.cliente_nome}` : ''}`;
    mostraNote({ contenitore: el('noteFlusso'), flusso: flusso.id });
    el('dialogoNote').showModal();
    el('noteFlusso').querySelector('.nota-campo').focus();
}

export const chiudiNoteFlusso = () => el('dialogoNote').close();
