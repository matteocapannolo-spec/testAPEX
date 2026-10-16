
import { escapeHtml, confirmDialog } from '../core/ui.js';
import * as api from './api.js';
import { COLORE_HEX, SFONDO_PREDEFINITO, TESTO_PREDEFINITO } from './config.js';
import { reparto, etichetteDi, caricaAnagrafiche } from './stato.js';
import { pillolaEtichetta } from './riquadro.js';

const el = id => document.getElementById(id);

let repartoAperto = null;
let dopoLaChiusura = () => {};

function errore(testo) {
    el('etichetteErrore').textContent = testo || '';
    el('etichetteErrore').hidden = !testo;
}

async function esegui(azione) {
    errore('');
    try {
        await azione();
        await caricaAnagrafiche();
    } catch (e) {
        errore(e.message);
    }
    disegnaEtichette();
}

const selettori = (sfondo, testo, id = '') => {
    const dato = id ? ` data-id="${escapeHtml(id)}"` : '';
    return `<label class="selettore" title="Sfondo"><input type="color" class="colore-etichetta" data-campo="sfondo"${dato} value="${sfondo}"><span>Sfondo</span></label>`
        + `<label class="selettore" title="Testo"><input type="color" class="colore-etichetta" data-campo="testo"${dato} value="${testo}"><span>Testo</span></label>`;
};
const hex = (v, riserva) => (COLORE_HEX.test(v || '') ? v : riserva).toLowerCase();

function disegnaEtichette() {
    const etichette = etichetteDi(repartoAperto);
    el('etichetteSottotitolo').textContent = `Valgono per tutte le bacheche del reparto ${(reparto(repartoAperto) || {}).nome || ''}.`;
    el('elencoEtichette').innerHTML = etichette.map(e => `
        <div class="riga-etichetta">
            <span class="anteprima-etichetta">${pillolaEtichetta(e)}</span>
            <input type="text" class="edit-input nome-etichetta" data-id="${escapeHtml(e.id)}" value="${escapeHtml(e.nome)}" maxlength="60" aria-label="Nome">
            ${selettori(hex(e.sfondo, SFONDO_PREDEFINITO), hex(e.testo, TESTO_PREDEFINITO), e.id)}
            <button type="button" class="action-btn" data-action="elimina-etichetta" data-id="${escapeHtml(e.id)}" title="Elimina"><span class="material-symbols-outlined">delete</span></button>
        </div>`).join('') || '<p class="niente">Nessuna etichetta.</p>';
    el('nuovaEtichettaAnteprima').innerHTML = pillolaEtichetta({ nome: 'Anteprima', sfondo: '#1F845A', testo: '#FFFFFF' });
    el('nuovaEtichettaColori').innerHTML = selettori('#1f845a', '#ffffff');
}

export function apriEtichette(elemento, poi) {
    repartoAperto = elemento.dataset.reparto;
    dopoLaChiusura = poi || (() => {});
    errore('');
    el('nuovaEtichetta').value = '';
    disegnaEtichette();
    el('dialogoEtichette').showModal();
}

export function chiudiEtichette() {
    el('dialogoEtichette').close();
    dopoLaChiusura();
}

export function nuovaEtichetta() {
    const nome = el('nuovaEtichetta').value.trim();
    if (!repartoAperto || !nome) return;
    el('nuovaEtichetta').value = '';
    const ultima = etichetteDi(repartoAperto).reduce((m, e) => Math.max(m, e.ordine), 0);
    return esegui(() => api.creaEtichetta({
        reparto_id: repartoAperto, nome, ordine: ultima + 1,
        sfondo: el('nuovaEtichettaColori').querySelector('[data-campo="sfondo"]').value,
        testo: el('nuovaEtichettaColori').querySelector('[data-campo="testo"]').value
    }));
}

export async function eliminaEtichetta(elemento) {
    const ok = await confirmDialog({
        title: 'Eliminare l\'etichetta?',
        text: 'Sparisce da tutte le schede del reparto che la portano.',
        confirmLabel: 'Elimina', danger: true
    });
    if (ok) return esegui(() => api.eliminaEtichettaReparto(elemento.dataset.id));
}

export function collegaCampiEtichette() {
    for (const box of [el('elencoEtichette'), el('rigaNuovaEtichetta')]) {
        box.addEventListener('input', ev => {
            const t = ev.target;
            if (!t.classList.contains('colore-etichetta')) return;
            const pillola = t.closest('.riga-etichetta').querySelector('.etichetta');
            pillola.style[t.dataset.campo === 'sfondo' ? 'backgroundColor' : 'color'] = t.value;
        });
    }
    el('elencoEtichette').addEventListener('change', ev => {
        const t = ev.target;
        const id = t.dataset.id;
        if (t.classList.contains('colore-etichetta') && COLORE_HEX.test(t.value)) {
            esegui(() => api.aggiornaEtichettaReparto(id, { [t.dataset.campo]: t.value }));
        }
        if (t.classList.contains('nome-etichetta')) {
            const nome = t.value.trim();
            if (nome) esegui(() => api.aggiornaEtichettaReparto(id, { nome }));
            else disegnaEtichette();
        }
    });
    el('nuovaEtichetta').addEventListener('keydown', ev => {
        if (ev.key === 'Enter') { ev.preventDefault(); nuovaEtichetta(); }
    });
    el('dialogoEtichette').addEventListener('cancel', ev => { ev.preventDefault(); chiudiEtichette(); });
}
