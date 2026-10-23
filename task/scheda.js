
import { escapeHtml, confirmDialog, toast } from '../core/ui.js';
import * as api from './api.js';
import { stato, admin, persona, etichetteDi, membriDelReparto, aggiornaRiga, ricarica, mostraAvviso } from './stato.js';
import { pillolaEtichetta, conLink } from './riquadro.js';
import { volto } from './persone.js';
import { disegnaDettagli } from './dettagli.js';

const el = id => document.getElementById(id);

export const aperta = { riga: null, colonne: [], tutteEtichette: false };

export function scambiaTutteEtichette() {
    aperta.tutteEtichette = !aperta.tutteEtichette;
    disegnaTesta();
}

function errore(testo) {
    el('schedaErrore').textContent = testo || '';
    el('schedaErrore').hidden = !testo;
}

function perCampo(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const z = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`;
}

function disegnaTesta() {
    const s = aperta.riga;
    el('schedaColonna').innerHTML = aperta.colonne
        .map(c => `<option value="${escapeHtml(c.id)}"${c.id === s.colonna_id ? ' selected' : ''}>${escapeHtml(c.nome)}</option>`).join('');
    el('schedaCompleta').classList.toggle('fatta', !!s.completata_il);
    el('schedaCompleta').title = s.completata_il ? 'Completata: clic per riaprirla' : 'Segna come completata';
    if (document.activeElement !== el('schedaTitolo')) el('schedaTitolo').value = s.titolo;
    el('schedaDove').textContent = `${s.reparto_nome} · ${s.bacheca_nome}`;
    el('btnSpostaScheda').hidden = !admin();

    const membri = s.membri || [];
    el('schedaMembri').innerHTML = membri.map(id => {
        const p = persona(id) || { nome: 'Persona non più attiva' };
        return `<button type="button" class="membro" data-action="togli-membro" data-id="${escapeHtml(id)}" title="${escapeHtml(p.nome)}: clic per toglierlo">${volto(p)}</button>`;
    }).join('');
    const candidati = membriDelReparto(s.reparto_id).filter(p => !membri.includes(p.user_id));
    el('schedaNuovoMembro').innerHTML = '<option value="">+ Aggiungi</option>'
        + candidati.map(p => `<option value="${escapeHtml(p.user_id)}">${escapeHtml(p.nome)}</option>`).join('');
    el('schedaNuovoMembro').hidden = !candidati.length;

    const scelte = new Set(s.etichette || []);
    const mostrate = etichetteDi(s.reparto_id).filter(e => aperta.tutteEtichette || scelte.has(e.id));
    el('schedaEtichette').innerHTML = mostrate.map(e =>
        `<button type="button" class="scelta-etichetta" data-action="etichetta" data-id="${escapeHtml(e.id)}" aria-pressed="${scelte.has(e.id)}" title="${scelte.has(e.id) ? 'Clic per toglierla' : 'Clic per metterla'}">${pillolaEtichetta(e, scelte.has(e.id) ? '' : 'spenta')}</button>`
    ).join('') + `<button type="button" class="action-btn piu-etichette" data-action="tutte-etichette" title="${aperta.tutteEtichette ? 'Mostra solo quelle messe' : 'Aggiungi un\'etichetta'}">
        <span class="material-symbols-outlined">${aperta.tutteEtichette ? 'expand_less' : 'add'}</span></button>`;

    if (document.activeElement !== el('schedaScadenza')) el('schedaScadenza').value = perCampo(s.scadenza);

    const vista = el('schedaDescrizioneVista');
    if (el('schedaDescrizione').hidden) {
        vista.innerHTML = s.descrizione ? conLink(s.descrizione) : '<span class="niente">Aggiungi una descrizione più dettagliata…</span>';
    }
}

export async function apriScheda(elemento) {
    errore('');
    try {
        const riga = await api.caricaScheda(elemento.dataset.id);
        aperta.riga = riga;
        aperta.colonne = stato.vista === riga.bacheca_id ? stato.colonne : await api.caricaColonne(riga.bacheca_id);
    } catch (e) {
        toast(e.message);
        return;
    }
    el('schedaDescrizione').hidden = true;
    el('schedaDescrizioneVista').hidden = false;
    el('nuovoCommento').value = '';
    aperta.tutteEtichette = false;
    disegnaTesta();
    if (!el('dialogoScheda').open) el('dialogoScheda').showModal();
    await disegnaDettagli(aperta.riga);
}

const DURATA_CHIUSURA = 160;
let chiudendo = false;

export async function chiudiScheda() {
    const d = el('dialogoScheda');
    if (chiudendo || !d.open) return;
    chiudendo = true;
    if (d.contains(document.activeElement)) document.activeElement.blur();
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
        d.classList.add('si-chiude');
        await new Promise(r => setTimeout(r, DURATA_CHIUSURA));
        d.classList.remove('si-chiude');
    }
    d.close();
    chiudendo = false;
    aperta.riga = null;
    if (stato.vista === 'mie') await ricarica();
}

export function chiudiCliccandoFuori() {
    const d = el('dialogoScheda');
    const fuori = ev => {
        const b = d.getBoundingClientRect();
        return ev.target === d && (ev.clientX < b.left || ev.clientX > b.right || ev.clientY < b.top || ev.clientY > b.bottom);
    };
    let partitaFuori = false;
    d.addEventListener('pointerdown', ev => { partitaFuori = fuori(ev); });
    d.addEventListener('click', ev => {
        if (partitaFuori && fuori(ev)) chiudiScheda();
        partitaFuori = false;
    });
}

async function rileggi() {
    aperta.riga = await aggiornaRiga(aperta.riga.id);
    disegnaTesta();
}

async function salva(campi) {
    errore('');
    try {
        await api.aggiornaScheda(aperta.riga.id, aperta.riga.versione, campi);
        await rileggi();
        if ('colonna_id' in campi || 'completata_il' in campi) await disegnaDettagli(aperta.riga);
    } catch (e) {
        errore(e.message);
        try { await rileggi(); } catch (e2) { errore(e2.message); }
    }
}

export function collegaCampiScheda() {
    el('schedaTitolo').addEventListener('change', () => {
        const titolo = el('schedaTitolo').value.trim();
        if (!titolo) { el('schedaTitolo').value = aperta.riga.titolo; return; }
        if (titolo !== aperta.riga.titolo) salva({ titolo });
    });
    el('schedaTitolo').addEventListener('keydown', ev => {
        if (ev.key === 'Enter') { ev.preventDefault(); el('schedaTitolo').blur(); }
    });
    el('schedaColonna').addEventListener('change', () => {
        const colonna = el('schedaColonna').value;
        const ultima = stato.schede.filter(s => s.colonna_id === colonna).reduce((m, s) => Math.max(m, s.posizione), 0);
        salva({ colonna_id: colonna, posizione: ultima + 1024 });
    });
    el('schedaScadenza').addEventListener('change', () => {
        const v = el('schedaScadenza').value;
        salva({ scadenza: v ? new Date(v).toISOString() : null });
    });
    el('schedaDescrizione').addEventListener('blur', async () => {
        const testo = el('schedaDescrizione').value.trim() || null;
        el('schedaDescrizione').hidden = true;
        el('schedaDescrizioneVista').hidden = false;
        if (testo !== (aperta.riga.descrizione || null)) await salva({ descrizione: testo });
        else disegnaTesta();
    });
    el('schedaNuovoMembro').addEventListener('change', async () => {
        const id = el('schedaNuovoMembro').value;
        if (!id) return;
        await cambiaLegame(() => api.aggiungiMembro(aperta.riga.id, id));
    });
}

async function cambiaLegame(azione) {
    errore('');
    try {
        await azione();
        await rileggi();
    } catch (e) {
        errore(e.message);
    }
}

export function modificaDescrizione(elemento, ev) {
    if (ev && ev.target.closest('a')) { window.open(ev.target.closest('a').href, '_blank', 'noopener'); return; }
    el('schedaDescrizione').value = aperta.riga.descrizione || '';
    el('schedaDescrizioneVista').hidden = true;
    el('schedaDescrizione').hidden = false;
    el('schedaDescrizione').focus();
}

export const completa = () => salva({ completata_il: aperta.riga.completata_il ? null : new Date().toISOString() });

export async function completaRiquadro(elemento) {
    const s = stato.schede.find(x => x.id === elemento.dataset.id);
    if (!s) return;
    try {
        await api.aggiornaScheda(s.id, s.versione, { completata_il: s.completata_il ? null : new Date().toISOString() });
        if (stato.vista === 'mie') await ricarica();
        else await aggiornaRiga(s.id);
        if (!s.completata_il) toast('Scheda completata');
    } catch (e) {
        mostraAvviso(e.message);
        await ricarica();
    }
}

export const togliMembro =elemento => cambiaLegame(() => api.togliMembro(aperta.riga.id, elemento.dataset.id));

export function scambiaEtichetta(elemento) {
    const id = elemento.dataset.id;
    const presente = (aperta.riga.etichette || []).includes(id);
    return cambiaLegame(() => presente ? api.togliEtichetta(aperta.riga.id, id) : api.aggiungiEtichetta(aperta.riga.id, id));
}

export async function eliminaScheda() {
    const ok = await confirmDialog({
        title: 'Eliminare la scheda?',
        text: `«${aperta.riga.titolo}» sparisce con la sua checklist e i suoi commenti. Non si torna indietro.`,
        confirmLabel: 'Elimina', danger: true
    });
    if (!ok) return;
    try {
        await api.eliminaScheda(aperta.riga.id);
    } catch (e) {
        errore(e.message);
        return;
    }
    stato.schede = stato.schede.filter(s => s.id !== aperta.riga.id);
    await chiudiScheda();
    toast('Scheda eliminata');
    await ricarica();
}
