
import { toast, confirmDialog } from '../core/ui.js';
import { completaPasso, correggiPasso } from './api.js';
import { contesto, flussoPerId, passaggio, passoFatto, ricaricaDopoScrittura } from './stato.js';
import { GRUPPI, LINK_VALIDO, PASSO_FATTURARE, dataOraIt, oggiIso } from './config.js';

const el = id => document.getElementById(id);

let aperto = null;

function errore(testo) {
    el('passoErrore').textContent = testo || '';
    el('passoErrore').hidden = !testo;
}

function esitoScelto() {
    const scelto = el('dialogoPasso').querySelector('input[name="esito"]:checked');
    return scelto ? scelto.value === 'si' : null;
}

function leggiCampi() {
    return {
        numero: el('passoNumero').value.trim(),
        data: el('passoData').value,
        link: el('passoLink').value.trim(),
        esito: esitoScelto()
    };
}

function mancante(def, c) {
    if (def.serve_numero && !c.numero) return `Manca il campo «${def.etichetta_numero}».`;
    if (def.serve_data && !c.data) return 'Manca la data.';
    if (def.serve_link && !LINK_VALIDO.test(c.link)) return 'Manca il link al documento su Google Drive (deve cominciare per https://).';
    if (def.serve_esito && c.esito === null) return 'Manca la risposta sì / no.';
    return null;
}

function aggiornaSalva() {
    if (!aperto || !aperto.modificabile) return;
    const manca = mancante(aperto.def, leggiCampi());
    el('passoSalva').disabled = !!manca;
    el('passoSalva').title = manca || '';
}

function storico(fatto, ctx) {
    if (!fatto) return '';
    let testo = `Fatto da ${ctx.nomi[fatto.fatto_da] || 'una persona non più presente'} il ${dataOraIt(fatto.fatto_il)}.`;
    if (fatto.corretto_il) {
        testo += ` Corretto da ${ctx.nomi[fatto.corretto_da] || 'una persona non più presente'} il ${dataOraIt(fatto.corretto_il)}.`;
    }
    return testo;
}

export function apriPasso(elemento) {
    const flusso = flussoPerId(elemento.closest('[data-flusso]').dataset.flusso);
    const def = passaggio(Number(elemento.dataset.passo));
    if (!flusso || !def) return;

    const ctx = contesto();
    const fatto = passoFatto(flusso.id, def.passo);
    const correggibile = !!fatto && (ctx.admin || fatto.fatto_da === ctx.io);
    const completabile = !fatto && def.passo === flusso.passo_corrente && ctx.puoPasso(def);
    aperto = { flusso, def, fatto, modificabile: correggibile || completabile };
    errore('');

    el('passoTitolo').textContent = `${def.passo}. ${def.nome}`;
    el('passoSottotitolo').textContent = flusso.titolo;

    let nota = storico(fatto, ctx);
    if (!fatto && !completabile) nota = `Questo passaggio lo completa il gruppo «${GRUPPI[def.gruppo] || def.gruppo}».`;
    el('passoStorico').textContent = nota;
    el('passoStorico').hidden = !nota;

    el('campoNumero').hidden = !def.serve_numero;
    el('etichettaNumero').textContent = def.etichetta_numero || 'Numero';
    el('campoData').hidden = !def.serve_data;
    el('campoLink').hidden = !def.serve_link;
    el('campoEsito').hidden = !def.serve_esito;

    el('passoNumero').value = fatto ? (fatto.numero || '') : '';
    el('passoData').value = fatto ? (fatto.data || '') : oggiIso();
    el('passoLink').value = fatto ? (fatto.link || '') : '';
    for (const r of el('dialogoPasso').querySelectorAll('input[name="esito"]')) {
        r.checked = !!fatto && fatto.esito !== null && (r.value === 'si') === fatto.esito;
    }

    const apri = el('passoApri');
    apri.hidden = !(fatto && fatto.link);
    if (fatto && fatto.link) apri.href = fatto.link;

    for (const campo of el('dialogoPasso').querySelectorAll('.campo-passo')) campo.disabled = !aperto.modificabile;
    el('passoSalva').hidden = !aperto.modificabile;
    el('passoSalva').textContent = fatto ? 'Salva correzione' : 'Completa';
    el('passoChiudi').textContent = aperto.modificabile ? 'Annulla' : 'Chiudi';
    aggiornaSalva();

    el('dialogoPasso').showModal();
}

export function chiudiPasso() {
    el('dialogoPasso').close();
    aperto = null;
}

export async function salvaPasso() {
    if (!aperto || !aperto.modificabile) return;
    const { flusso, def, fatto } = aperto;
    const campi = leggiCampi();
    const manca = mancante(def, campi);
    if (manca) {
        errore(manca);
        return;
    }

    if (def.passo === PASSO_FATTURARE && campi.esito === false && !fatto) {
        const ok = await confirmDialog({
            title: 'Chiudere il flusso?',
            text: `Con «No» il flusso «${flusso.titolo}» si chiude qui: il Modulo RAT e la fattura non servono.`,
            confirmLabel: 'Chiudi il flusso'
        });
        if (!ok) return;
    }

    try {
        errore('');
        const argomenti = { flusso: flusso.id, passo: def.passo, ...campi };
        await (fatto ? correggiPasso(argomenti) : completaPasso(argomenti));
    } catch (e) {
        errore(e.message);
        return;
    }

    chiudiPasso();
    toast(fatto ? 'Passaggio corretto' : `Passaggio «${def.nome}» completato`);
    await ricaricaDopoScrittura();
}

export function collegaCampiPasso() {
    el('dialogoPasso').addEventListener('input', aggiornaSalva);
    el('dialogoPasso').addEventListener('change', aggiornaSalva);
}
