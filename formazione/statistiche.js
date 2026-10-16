
import { stato, anniDisponibili } from './stato.js';
import { MESI, TIPI, oreIt, euroIt, annoCorrente } from './config.js';
import { el, tabella, opzioni, testo } from './vista.js';

const forte = (r, html) => r.totale ? `<strong>${html}</strong>` : html;

const ore = v => Number(v) ? oreIt(v) : '';
const euro = v => Number(v) ? euroIt(v) : '';

const COLONNE_MESI = [
    { key: 'etichetta', label: 'Mese', width: 110, render: (v, r) => forte(r, testo(v)) },
    { key: 'ore', label: 'Ore', width: 110, render: (v, r) => forte(r, testo(ore(v))) },
    { key: 'corsi', label: 'Corsi fatti', width: 110, render: (v, r) => forte(r, testo(v || '')) },
    { key: 'costo', label: 'Costo', width: 130, render: (v, r) => forte(r, testo(euro(v))) }
];

const COLONNE_TIPI = [
    { key: 'etichetta', label: 'Tipo di corso', width: 200, classes: ['col-testo'], render: (v, r) => forte(r, testo(v)) },
    { key: 'ore', label: 'Ore', width: 110, render: (v, r) => forte(r, testo(ore(v))) },
    { key: 'corsi', label: 'Corsi fatti', width: 110, render: (v, r) => forte(r, testo(v || '')) },
    { key: 'costo', label: 'Costo', width: 130, render: (v, r) => forte(r, testo(euro(v))) }
];

const COLONNE_REPARTI = [
    { key: 'etichetta', label: 'Reparto', width: 200, classes: ['col-testo'], render: (v, r) => forte(r, testo(v)) },
    { key: 'ore', label: 'Ore', width: 110, render: (v, r) => forte(r, testo(ore(v))) },
    { key: 'persone', label: 'Persone formate', width: 140, render: (v, r) => forte(r, testo(v || '')) },
    { key: 'media', label: 'Ore a persona', width: 130, render: (v, r) => forte(r, testo(ore(v))) },
    { key: 'costo', label: 'Costo', width: 130, render: (v, r) => forte(r, testo(euro(v))) }
];

function somma(righe, campo) {
    return righe.reduce((s, r) => s + (Number(r[campo]) || 0), 0);
}

function conTotale(righe, campi) {
    const totale = { id: 'totale', etichetta: 'Totale', totale: true };
    for (const c of campi) totale[c] = somma(righe, c);
    return [...righe, totale];
}

export function riempiFiltriStatistiche() {
    const prima = el('statAnno').value;
    opzioni(el('statAnno'), anniDisponibili().filter(a => a <= annoCorrente() + 1).map(a => [a, a]));
    if (!prima) el('statAnno').value = annoCorrente();
}

export function disegnaStatistiche() {
    const anno = Number(el('statAnno').value) || annoCorrente();
    const delAnno = stato.stat.mesi.filter(m => m.anno === anno);

    const mesi = MESI.map((nome, i) => {
        const righe = delAnno.filter(m => m.mese === i + 1);
        return { id: 'm' + i, etichetta: nome, ore: somma(righe, 'ore'), corsi: somma(righe, 'corsi'), costo: somma(righe, 'costo') };
    });
    tabella('statMesi', COLONNE_MESI, conTotale(mesi, ['ore', 'corsi', 'costo']));

    const tipi = Object.entries(TIPI).map(([chiave, nome]) => {
        const righe = delAnno.filter(m => m.tipo === chiave);
        return { id: chiave, etichetta: nome, ore: somma(righe, 'ore'), corsi: somma(righe, 'corsi'), costo: somma(righe, 'costo') };
    });
    tabella('statTipi', COLONNE_TIPI, conTotale(tipi, ['ore', 'corsi', 'costo']));

    const reparti = stato.stat.reparti.filter(r => r.anno === anno)
        .sort((a, b) => (a.ordine ?? 999) - (b.ordine ?? 999) || a.reparto.localeCompare(b.reparto, 'it'))
        .map(r => ({ id: r.reparto, etichetta: r.reparto, ore: Number(r.ore), persone: Number(r.persone), costo: Number(r.costo), media: r.persone ? Number(r.ore) / r.persone : 0 }));
    const conTot = conTotale(reparti, ['ore', 'persone', 'costo']);
    const tot = conTot[conTot.length - 1];
    tot.media = tot.persone ? tot.ore / tot.persone : 0;
    tabella('statReparti', COLONNE_REPARTI, reparti.length ? conTot : [], { vuota: `Nessun corso confermato nel ${anno}.` });

    scriviRiepilogo(anno, 'stat');
}

export function scriviRiepilogo(anno, prefisso) {
    const delAnno = stato.stat.mesi.filter(m => m.anno === anno);
    const persone = somma(stato.stat.reparti.filter(r => r.anno === anno), 'persone');
    const costi = stato.stat.costi.find(c => c.anno === anno) || {};
    const campi = prefisso === 'stat'
        ? ['statOreTot', 'statPersone', 'statCostoSostenuto', 'statCostoPrevisto']
        : ['frmOre', 'frmPersone', 'frmCosto', 'frmPrevisto'];
    el(campi[0]).textContent = oreIt(somma(delAnno, 'ore')) || '0 h';
    el(campi[1]).textContent = persone;
    el(campi[2]).textContent = euroIt(somma(delAnno, 'costo'));
    el(campi[3]).textContent = euroIt(costi.costo_previsto || 0);
}
