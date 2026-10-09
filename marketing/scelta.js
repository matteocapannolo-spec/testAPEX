
import { escapeHtml } from '../core/ui.js';
import { STATI } from './config.js';
import { pillolaStato } from './documento.js';

function disegnaValore(radice) {
    const v = radice.dataset.valore || '';
    radice.querySelector('.scelta-valore').innerHTML = v
        ? pillolaStato(v)
        : `<span class="scelta-vuota">${escapeHtml(radice.dataset.vuota || '')}</span>`;
    for (const voce of radice.querySelectorAll('.scelta-voce')) {
        voce.classList.toggle('scelta-attiva', voce.dataset.valore === v);
    }
}

export function montaSceltaStato(radice) {
    const vuota = radice.dataset.vuota;
    const voci = (vuota ? [['', `<span class="scelta-vuota">${escapeHtml(vuota)}</span>`]] : [])
        .concat(Object.keys(STATI).map(k => [k, pillolaStato(k)]));

    radice.innerHTML =
        `<button type="button" class="standard-select scelta-bottone" data-action="scelta-apri" aria-haspopup="listbox">`
        + '<span class="scelta-valore"></span><span class="material-symbols-outlined">expand_more</span></button>'
        + '<div class="scelta-elenco" role="listbox" hidden>'
        + voci.map(([v, html]) => `<button type="button" class="scelta-voce" role="option" data-action="scelta-voce" data-valore="${escapeHtml(v)}">${html}</button>`).join('')
        + '</div>';

    Object.defineProperty(radice, 'value', {
        get: () => radice.dataset.valore || '',
        set: v => { radice.dataset.valore = v || ''; disegnaValore(radice); }
    });
    radice.value = vuota ? '' : Object.keys(STATI)[0];
}

export function chiudiScelte(tranne) {
    for (const e of document.querySelectorAll('.scelta-elenco')) {
        if (e !== tranne) e.hidden = true;
    }
}

export function apriScelta(bottone) {
    const elenco = bottone.closest('.scelta-stato').querySelector('.scelta-elenco');
    chiudiScelte(elenco);
    elenco.hidden = !elenco.hidden;
}

export function sceltaVoce(voce) {
    const radice = voce.closest('.scelta-stato');
    radice.value = voce.dataset.valore;
    chiudiScelte();
    radice.dispatchEvent(new Event('change', { bubbles: true }));
}
