
import { escapeHtml } from '../core/ui.js';
import { GRUPPI_SCADENZA } from './config.js';
import { stato } from './stato.js';
import { riquadro, passaFiltri } from './riquadro.js';

function inizioGiorno(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function gruppoScadenza(s, adesso) {
    if (!s.scadenza) return 'senza';
    const d = new Date(s.scadenza);
    if (d < adesso) return 'scadute';
    const oggi = inizioGiorno(adesso);
    const domani = new Date(oggi.getTime() + 86400000);
    if (d < domani) return 'oggi';
    if (d < new Date(oggi.getTime() + 7 * 86400000)) return 'settimana';
    return 'avanti';
}

function colonnaHtml(titolo, schede, { classe = '', conDove = false } = {}) {
    const corpo = schede.length
        ? schede.map(s => riquadro(s, { dove: conDove ? `${s.bacheca_nome} · ${s.colonna_nome}` : s.colonna_nome })).join('')
        : '<p class="colonna-vuota">Niente qui.</p>';
    return `<section class="colonna ${classe}">
        <header class="colonna-testa">
            <span class="colonna-nome">${escapeHtml(titolo)}</span>
            <span class="colonna-conto">${schede.length}</span>
        </header>
        <div class="colonna-corpo">${corpo}</div>
    </section>`;
}

const perScadenza = (a, b) => {
    if (!a.scadenza) return b.scadenza ? 1 : a.titolo.localeCompare(b.titolo);
    if (!b.scadenza) return -1;
    return new Date(a.scadenza) - new Date(b.scadenza);
};

export function disegnaMie(contenitore) {
    const schede = stato.schede.filter(s => passaFiltri(s, stato.criteri)).sort(perScadenza);

    if (!stato.schede.length) {
        contenitore.innerHTML = `<p class="tabellone-vuoto">Non hai schede aperte: quando qualcuno ti aggiunge come membro
            di una scheda, la trovi qui, da qualunque reparto venga.</p>`;
        return;
    }

    if (stato.modoMie === 'reparto') {
        const gruppi = new Map();
        for (const s of schede) {
            const chiave = s.bacheca_id;
            if (!gruppi.has(chiave)) gruppi.set(chiave, { titolo: `${s.reparto_nome} · ${s.bacheca_nome}`, schede: [] });
            gruppi.get(chiave).schede.push(s);
        }
        const ordinati = [...gruppi.values()].sort((a, b) => a.titolo.localeCompare(b.titolo));
        contenitore.innerHTML = ordinati.map(g => colonnaHtml(g.titolo, g.schede)).join('')
            || '<p class="tabellone-vuoto">Nessuna scheda corrisponde ai filtri.</p>';
        return;
    }

    const adesso = new Date();
    contenitore.innerHTML = GRUPPI_SCADENZA.map(([chiave, titolo]) => colonnaHtml(
        titolo,
        schede.filter(s => gruppoScadenza(s, adesso) === chiave),
        { classe: `gruppo-${chiave}`, conDove: true }
    )).join('');
}
