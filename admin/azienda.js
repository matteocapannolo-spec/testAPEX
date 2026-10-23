
import { escapeHtml } from '../core/ui.js';

export const AZIENDE = {
    tt_group: 'tt group',
    staim: 'Staim Holding'
};

export const diStaim = riga => riga.azienda === 'staim';

export function emailDaMostrare(riga) {
    if (diStaim(riga) && riga.email_contatto) return riga.email_contatto;
    return riga.email || '';
}

export function separaAziende(tbody, righe) {
    const prima = righe.find(diStaim);
    if (!prima) return;
    const tr = [...tbody.rows].find(r => r.dataset.index === String(prima.id));
    if (!tr) return;

    const separatore = document.createElement('tr');
    separatore.className = 'riga-separatore';
    separatore.innerHTML = `<td class="riga-azienda" colspan="${tr.cells.length}">` +
        `<strong>${escapeHtml(AZIENDE.staim)}</strong></td>`;
    tr.before(separatore);
}


const el = id => document.getElementById(id);
let comEra = null;

function mostraRecapito() {
    el('rigaContatto').hidden = !el('aziendaStaim').checked;
}

export function riempiAzienda(persona) {
    const staim = diStaim(persona);
    el('aziendaTt').checked = !staim;
    el('aziendaStaim').checked = staim;
    el('aziendaTt').onchange = mostraRecapito;
    el('aziendaStaim').onchange = mostraRecapito;
    el('contattoValore').value = String(persona.email_contatto || '');
    mostraRecapito();
    comEra = { azienda: staim ? 'staim' : 'tt_group', contatto: el('contattoValore').value.trim() };
}

export function scritturaAzienda(persona) {
    const azienda = el('aziendaStaim').checked ? 'staim' : 'tt_group';
    const contatto = azienda === 'staim' ? el('contattoValore').value.trim() : '';
    if (comEra && azienda === comEra.azienda && contatto === comEra.contatto) return null;
    return ['imposta_azienda', { p_user_id: persona.id, p_azienda: azienda, p_email_contatto: contatto }];
}
