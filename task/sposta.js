
import { escapeHtml } from '../core/ui.js';
import * as api from './api.js';
import { stato, admin, persona, reparto, etichetta, etichetteDi, ricarica } from './stato.js';
import { aperta, apriScheda } from './scheda.js';

const el = id => document.getElementById(id);
const semplice = t => String(t || '').toLowerCase().replace(/[^\p{L}\p{N} &|]/gu, '').replace(/\s+/g, ' ').trim();

let colonneArrivo = [];

function errore(testo) {
    el('spostaErrore').textContent = testo || '';
    el('spostaErrore').hidden = !testo;
}

function riempiBacheche() {
    el('spostaBacheca').innerHTML = stato.reparti.map(r => {
        const sue = stato.bacheche.filter(b => b.reparto_id === r.id);
        if (!sue.length) return '';
        return `<optgroup label="${escapeHtml(r.nome)}">${sue.map(b =>
            `<option value="${escapeHtml(b.id)}"${b.id === aperta.riga.bacheca_id ? ' selected' : ''}>${escapeHtml(b.nome)}</option>`).join('')}</optgroup>`;
    }).join('');
}

function disegnaAvviso() {
    const s = aperta.riga;
    const b = stato.bacheche.find(x => x.id === el('spostaBacheca').value);
    const avviso = el('spostaAvviso');
    if (!b || b.reparto_id === s.reparto_id) { avviso.hidden = true; return; }
    const nomeNuovo = (reparto(b.reparto_id) || {}).nome || '';
    const nomiArrivo = new Set(etichetteDi(b.reparto_id).map(e => semplice(e.nome)));
    const perse = (s.etichette || []).map(etichetta).filter(e => e && !nomiArrivo.has(semplice(e.nome))).map(e => e.nome);
    const fuori = (s.membri || []).filter(id => !((persona(id) || {}).reparti || []).includes(b.reparto_id))
        .map(id => (persona(id) || { nome: 'una persona non più attiva' }).nome);
    const frasi = [`Passa al reparto ${nomeNuovo}: le etichette diventano quelle con lo stesso nome.`];
    if (perse.length) frasi.push(`Senza un'etichetta uguale, si tolgono: ${perse.join(', ')}.`);
    if (fuori.length) frasi.push(`Escono dalla scheda perché non lavorano in ${nomeNuovo}: ${fuori.join(', ')}.`);
    avviso.textContent = frasi.join(' ');
    avviso.hidden = false;
}

async function riempiColonne() {
    const bacheca = el('spostaBacheca').value;
    el('spostaColonna').innerHTML = '';
    el('btnConfermaSposta').disabled = true;
    try {
        colonneArrivo = await api.caricaColonne(bacheca);
    } catch (e) {
        errore(e.message);
        return;
    }
    const qui = bacheca === aperta.riga.bacheca_id;
    const scelta = qui ? aperta.riga.colonna_id : (colonneArrivo.find(c => !c.di_fine) || colonneArrivo[0] || {}).id;
    el('spostaColonna').innerHTML = colonneArrivo.map(c =>
        `<option value="${escapeHtml(c.id)}"${c.id === scelta ? ' selected' : ''}>${escapeHtml(c.nome)}</option>`).join('');
    aggiornaPulsante();
    disegnaAvviso();
}

function aggiornaPulsante() {
    const colonna = el('spostaColonna').value;
    el('btnConfermaSposta').disabled = !colonna || colonna === aperta.riga.colonna_id;
}

export async function apriSposta() {
    if (!aperta.riga || !admin()) return;
    errore('');
    riempiBacheche();
    el('dialogoSposta').showModal();
    await riempiColonne();
}

export const chiudiSposta = () => el('dialogoSposta').close();

export async function confermaSposta() {
    const id = aperta.riga.id;
    errore('');
    el('btnConfermaSposta').disabled = true;
    try {
        await api.spostaScheda(id, aperta.riga.versione, el('spostaColonna').value);
    } catch (e) {
        errore(e.message);
        aggiornaPulsante();
        return;
    }
    chiudiSposta();
    await ricarica();
    await apriScheda({ dataset: { id } });
}

export function collegaCampiSposta() {
    el('spostaBacheca').addEventListener('change', riempiColonne);
    el('spostaColonna').addEventListener('change', aggiornaPulsante);
}
