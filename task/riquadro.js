
import { escapeHtml } from '../core/ui.js';
import { COLORE_HEX, SFONDO_PREDEFINITO, TESTO_PREDEFINITO } from './config.js';
import { etichetta, persona } from './stato.js';
import { volto } from './persone.js';

const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];

export function dataBreve(iso) {
    const d = new Date(iso);
    const anno = d.getFullYear() !== new Date().getFullYear() ? ` ${d.getFullYear()}` : '';
    return `${d.getDate()} ${MESI[d.getMonth()]}${anno}`;
}

export function dataOra(iso) {
    const d = new Date(iso);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${dataBreve(iso)}, ${hh}:${mm}`;
}

export function tonoScadenza(scheda) {
    if (scheda.completata_il) return 'fatta';
    if (scheda.scadenza && new Date(scheda.scadenza) < new Date()) return 'scaduta';
    return '';
}

export function conLink(testo) {
    return escapeHtml(testo).replace(/https?:\/\/[^\s<]+/g,
        u => `<a href="${u}" target="_blank" rel="noopener noreferrer">${u}</a>`);
}

export function pillolaEtichetta(e, extra = '') {
    const sfondo = COLORE_HEX.test(e.sfondo || '') ? e.sfondo : SFONDO_PREDEFINITO;
    const testo = COLORE_HEX.test(e.testo || '') ? e.testo : TESTO_PREDEFINITO;
    return `<span class="etichetta ${extra}" data-sfondo="${sfondo}" data-testo="${testo}">${escapeHtml(e.nome)}</span>`;
}

export function coloraEtichette(radice) {
    radice.querySelectorAll('.etichetta[data-sfondo]').forEach(p => {
        p.style.backgroundColor = p.dataset.sfondo;
        p.style.color = p.dataset.testo;
    });
}

export function coloraSempre() {
    coloraEtichette(document.body);
    new MutationObserver(mutazioni => {
        for (const m of mutazioni) {
            m.addedNodes.forEach(n => { if (n.nodeType === 1) coloraEtichette(n.parentNode || n); });
        }
    }).observe(document.body, { childList: true, subtree: true });
}

function segno(icona, testo, classe = '', titolo = '') {
    const t = titolo ? ` title="${escapeHtml(titolo)}"` : '';
    return `<span class="segno ${classe}"${t}><span class="material-symbols-outlined">${icona}</span>${testo ? escapeHtml(testo) : ''}</span>`;
}

function cerchio(s) {
    const titolo = s.completata_il ? 'Completata: clic per riaprirla' : 'Segna come completata';
    return `<button type="button" class="cerchio mini${s.completata_il ? ' fatta' : ''}" data-action="completa-riquadro"
        data-id="${escapeHtml(s.id)}" title="${titolo}"><span class="material-symbols-outlined">check</span></button>`;
}

export function riquadro(s, { dove = '' } = {}) {
    const etichette = (s.etichette || []).map(etichetta).filter(Boolean)
        .sort((a, b) => a.ordine - b.ordine).map(e => pillolaEtichetta(e)).join('');

    const segni = [];
    if (s.scadenza) {
        const tono = tonoScadenza(s);
        segni.push(segno('schedule', dataBreve(s.scadenza), `scadenza ${tono}`,
            tono === 'scaduta' ? 'Scaduta' : tono === 'fatta' ? 'Completata' : 'Scadenza'));
    }
    if (s.descrizione) segni.push(segno('notes', '', '', 'Ha una descrizione'));
    if (s.n_commenti) segni.push(segno('chat_bubble', String(s.n_commenti), '', 'Commenti'));
    if (s.voci_totali) {
        const piena = s.voci_fatte === s.voci_totali ? 'piena' : '';
        segni.push(segno('check_box', `${s.voci_fatte}/${s.voci_totali}`, `spunte ${piena}`, 'Checklist'));
    }

    const membri = (s.membri || []).map(id => volto(persona(id) || { nome: '' })).join('');
    const luogo = dove ? `<div class="riquadro-dove">${escapeHtml(dove)}</div>` : '';

    return `<article class="riquadro${s.completata_il ? ' completata' : ''}"
            data-action="apri-scheda" data-id="${escapeHtml(s.id)}">
        <span class="riquadro-matita"><span class="material-symbols-outlined">edit</span></span>
        ${luogo}
        ${etichette ? `<div class="riquadro-etichette">${etichette}</div>` : ''}
        <div class="riquadro-titolo">${cerchio(s)}<span>${escapeHtml(s.titolo)}</span></div>
        ${segni.length || membri ? `<div class="riquadro-piede"><div class="riquadro-segni">${segni.join('')}</div><div class="riquadro-membri">${membri}</div></div>` : ''}
    </article>`;
}

export function passaFiltri(s, criteri) {
    if (criteri.membro && !(s.membri || []).includes(criteri.membro)) return false;
    if (criteri.ricerca) {
        const q = criteri.ricerca.toLowerCase();
        const nomiEtichette = (s.etichette || []).map(id => (etichetta(id) || {}).nome || '').join(' ');
        const testo = `${s.titolo} ${s.descrizione || ''} ${nomiEtichette}`.toLowerCase();
        if (!testo.includes(q)) return false;
    }
    return true;
}
