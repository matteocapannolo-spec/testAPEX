
import { TIPI_ATTESI, TRAGUARDO_DI } from './config.js';

function documentiPerTipo(documenti) {
    const per = {};
    for (const d of documenti || []) {
        if (d.tipo === 'altro') continue;
        per[d.tipo] = d;
    }
    return per;
}

function mancanti(per) {
    return TIPI_ATTESI.filter(t => !per[t] || !per[t].url);
}

function sbloccata(progetto, tappa) {
    const campo = TRAGUARDO_DI[tappa.tappa];
    if (!campo) return true;
    return Boolean(progetto[campo]);
}

function ritardoPeggiore(fasi) {
    const oggi = Date.now();
    let peggiore = 0;
    for (const f of fasi) {
        if (f.data_effettiva || !f.data_prevista) continue;
        const giorni = (oggi - new Date(f.data_prevista + 'T00:00:00').getTime()) / 86400000;
        if (giorni > peggiore) peggiore = giorni;
    }
    return Math.floor(peggiore);
}

function incoerenzeDi(progetto, fasi, responsabiliPerId) {
    const trovate = [];

    if (progetto.pm_user_id && !responsabiliPerId[progetto.pm_user_id]) {
        trovate.push('Il responsabile non ha la spunta «PM» sul modulo Progetti');
    }

    const corrente = fasi.find(f => f.fase === progetto.fase);
    if (corrente && corrente.data_effettiva) {
        trovate.push('La fase corrente risulta già conclusa');
    }

    return trovate;
}

export function derivatiDiRiga(progetto, ctx) {
    const per = documentiPerTipo(progetto.documenti);
    const fasi = (progetto.fasi || []).slice().sort((a, b) => a.ordine - b.ordine);

    const tappe = (progetto.fatturazione || []).slice().sort((a, b) => a.ordine - b.ordine);
    const emesse = tappe.filter(t => t.stato !== 'da_fatturare');
    const percentualeFatturata = emesse.reduce((s, t) => s + Number(t.percentuale || 0), 0);

    const daFatturare = tappe.filter(t => t.stato === 'da_fatturare');
    const fatturabili = daFatturare.filter(t => sbloccata(progetto, t));
    const bloccate = daFatturare.filter(t => !sbloccata(progetto, t));

    const base = progetto.ricavo_totale === null || progetto.ricavo_totale === undefined
        ? null
        : Number(progetto.ricavo_totale);
    const inEuro = perc => base === null ? null : base * (Number(perc) || 0) / 100;

    return {
        documentiPerTipo: per,
        documentiMancanti: mancanti(per),
        fasi,
        faseCorrente: fasi.find(f => f.fase === progetto.fase) || null,
        tappe,
        percentualeFatturata,
        prossimaTappa: daFatturare[0] || null,
        fatturabili,
        bloccate,
        importoFatturabile: inEuro(fatturabili.reduce((s, t) => s + Number(t.percentuale || 0), 0)),
        importoBloccato: inEuro(bloccate.reduce((s, t) => s + Number(t.percentuale || 0), 0)),
        ritardoGiorni: ritardoPeggiore(fasi),
        incoerenze: incoerenzeDi(progetto, fasi, ctx.responsabiliPerId || {})
    };
}

