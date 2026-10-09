
import { disegnaTabella } from '../core/table.js';
import { escapeHtml } from '../core/ui.js';
import { giornoIt, LED } from './config.js';
import { stato, strumentiDelContratto, flussiDi, passoFatto } from './stato.js';
import { rigaFlussi } from './flussi.js';
import { cellaPersona } from './persone.js';

const NIENTE = '<span class="niente">—</span>';

function testoTagliato(valore) {
    return valore ? `<span title="${escapeHtml(valore)}">${escapeHtml(valore)}</span>` : NIENTE;
}

function nomeConCartella(nome, link, cosa) {
    if (!link) {
        return {
            html: `<span title="Manca il link alla cartella ${cosa} su Google Drive">${escapeHtml(nome)} <span class="pulse-warning">⚠️</span></span>`,
            classes: ['bg-error']
        };
    }
    return `<a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer" class="btn-link-pill pastiglia-cartella" title="Apri la cartella ${cosa} su Google Drive">`
        + `<span class="material-symbols-outlined">folder_open</span><span class="testo-pastiglia">${escapeHtml(nome)}</span></a>`;
}

function azioniContratto(v, riga, ctx) {
    const pulsanti = [];
    if (ctx.puoAnagrafica) {
        pulsanti.push('<button type="button" class="action-btn" data-action="modifica-contratto" title="Modifica il contratto"><span class="material-symbols-outlined">edit</span></button>');
    }
    if (ctx.admin) {
        pulsanti.push('<button type="button" class="action-btn" data-action="elimina-contratto" title="Elimina il contratto"><span class="material-symbols-outlined">delete</span></button>');
    }
    return pulsanti.length ? `<div class="cell-actions">${pulsanti.join('')}</div>` : '';
}

export const COLONNE = [
    {
        key: 'apri', label: '', width: 48, sticky: true, classes: ['col-apri'],
        render: (v, riga) => {
            const aperto = stato.aperti.has(riga.id) || stato.criteri.soloAperti;
            return `<button type="button" class="toggle-section-btn" data-action="apri-contratto" title="${aperto ? 'Chiudi i flussi' : 'Mostra i flussi'}">`
                + `<span class="material-symbols-outlined">${aperto ? 'expand_less' : 'expand_more'}</span></button>`;
        }
    },
    {
        key: 'led', label: '', width: 52, sticky: true, classes: ['col-led'],
        render: (v, riga) => `<span class="led-dot led-${escapeHtml(v)}" title="${escapeHtml(riga.led_motivo || 'Tutto in ordine')}"></span>`
    },
    { key: 'cliente_nome', label: 'Cliente', width: 200, sticky: true, classes: ['col-testo', 'col-cliente'], render: v => testoTagliato(v) },
    { key: 'pratica_nome', label: 'Pratica', width: 190, classes: ['col-cartella'], render: (v, riga) => nomeConCartella(v, riga.pratica_link, 'della pratica') },
    { key: 'nome', label: 'Contratto', width: 210, classes: ['col-cartella'], render: (v, riga) => nomeConCartella(v, riga.link_drive, 'del contratto'), actions: azioniContratto },
    {
        key: 'responsabile_id', label: 'Responsabile Commerciale', width: 200, classes: ['col-persona'],
        render: (v, riga, ctx) => cellaPersona(ctx.persone[v], v ? 'Persona non più presente' : '')
    },
    { key: 'data_sottoscrizione', label: 'Sottoscrizione', width: 125, render: v => giornoIt(v) || NIENTE },
    { key: 'data_conclusione', label: 'Conclusione', width: 125, render: v => giornoIt(v) || NIENTE },
    {
        key: 'sintesi', label: 'Sintesi Contratto', width: 340, classes: ['col-nota'],
        render: v => v ? `<span class="nota" title="${escapeHtml(v)}">${escapeHtml(v)}</span>` : NIENTE
    },
    {
        key: 'n_strumenti', label: 'Strumenti', width: 120,
        render: v => `<button type="button" class="pill pill-numero" data-action="strumenti" title="Gli strumenti del contratto, con la loro storia">${escapeHtml(v)} strum.</button>`
    },
    {
        key: 'n_flussi_aperti', label: 'Flussi Aperti', width: 115,
        render: (v, riga) => {
            if (!v) return NIENTE;
            const fermo = riga.giorni_fermo_max > 14 ? ' fermo' : '';
            return `<span class="pill pill-numero${fermo}" title="Il flusso piu' fermo non si muove da ${escapeHtml(riga.giorni_fermo_max)} giorni">${escapeHtml(v)}</span>`;
        }
    }
];

function testoCercabile(c, ctx) {
    const serie = strumentiDelContratto(c.id).map(s => s.numero_serie);
    const flussi = flussiDi(c.id);
    const numeri = flussi.flatMap(f => stato.passaggi.map(p => (passoFatto(f.id, p.passo) || {}).numero));
    return [c.cliente_nome, c.pratica_nome, c.nome, c.sintesi, ctx.nomi[c.responsabile_id],
        ...serie, ...flussi.map(f => f.titolo), ...numeri].join(' ').toLowerCase();
}

export function filtra(contratti, criteri, ctx) {
    const ago = criteri.ricerca.toLowerCase();
    return contratti.filter(c => {
        if (criteri.soloAperti && !c.n_flussi_aperti) return false;
        if (criteri.responsabile && c.responsabile_id !== criteri.responsabile) return false;
        if (criteri.led && c.led !== criteri.led) return false;
        if (ago && !testoCercabile(c, ctx).includes(ago)) return false;
        return true;
    });
}

export function ordina(righe) {
    const confronta = (a, b) => String(a || '').localeCompare(String(b || ''), 'it', { sensitivity: 'base' });
    return righe.slice().sort((a, b) => confronta(a.cliente_nome, b.cliente_nome) || confronta(a.nome, b.nome));
}

export function disegna({ thead, tbody, righe, ctx }) {
    disegnaTabella({ thead, tbody, colonne: COLONNE, righe, indiceDi: r => r.id, ctx, riempimento: true });

    const larghezza = thead.querySelector('tr').children.length;
    for (const tr of [...tbody.querySelectorAll('tr[data-index]')]) {
        const contratto = righe.find(r => r.id === tr.dataset.index);
        const aperto = contratto && (stato.aperti.has(contratto.id) || stato.criteri.soloAperti);
        if (!aperto) continue;
        tr.classList.add('contratto-aperto');
        tr.after(rigaFlussi(contratto, ctx, larghezza));
    }
}

export function riempiFiltroResponsabili(select, ctx) {
    const scelta = select.value;
    const ids = new Set([...stato.contratti.map(c => c.responsabile_id), ...stato.responsabili.map(r => r.user_id)]);
    const voci = [...ids].filter(Boolean)
        .map(id => ({ id, nome: ctx.nomi[id] || 'Persona non più presente' }))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
    select.innerHTML = '<option value="">Tutti</option>'
        + voci.map(v => `<option value="${escapeHtml(v.id)}">${escapeHtml(v.nome)}</option>`).join('');
    select.value = ids.has(scelta) ? scelta : '';
    return select.value;
}

export function riempiFiltroLed(select) {
    select.innerHTML = '<option value="">Tutti</option>'
        + Object.entries(LED).map(([k, l]) => `<option value="${k}">${escapeHtml(l.etichetta)}</option>`).join('');
}
