
import { toast } from '../core/ui.js';
import { stato, nomeSic } from './stato.js';
import { STATI_SIC, annoCorrente, euroIt, mansioneIt, dataIt } from './config.js';
import { inOrdine, emailPersona } from './anagrafica.js';
import { el, tabella, separaAziende, conSeparatore, tagScadenza, ledPersona, volto, nomeObbligo, iconaAppuntamento, azioniCella, opzioni, testo } from './vista.js';

let mostrate = [];

const PROBLEMI = ['scaduto', 'in_scadenza', 'da_fare'];

function dataBreve(giorno) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(giorno || ''));
    return m ? `${m[3]}/${m[2]}/${m[1].slice(2)}` : '';
}

function casella(s, personaId, obbligoId) {
    const id = testo(personaId + '|' + obbligoId);
    if (!s || s.stato === 'non_richiesto') {
        return `<button type="button" class="casella casella-vuota" data-action="casella" data-id="${id}" title="Non richiesto">—</button>`;
    }
    const scritta = s.scadenza ? dataBreve(s.scadenza) : (s.stato === 'in_regola' ? 'Non scade' : STATI_SIC[s.stato].etichetta);
    const nota = s.note ? `<span class="material-symbols-outlined icona-nota" title="${testo(s.note)}">sticky_note_2</span>` : '';
    return `<button type="button" class="casella" data-action="casella" data-id="${id}" title="${testo(STATI_SIC[s.stato].etichetta)}">` +
        tagScadenza(s.stato, scritta) + iconaAppuntamento(s) + nota + `</button>`;
}

function colonne(obblighi) {
    return [
        {
            key: 'persona', label: 'Persona', width: 250, classes: ['col-testo', 'col-persona'], sticky: true,
            render: (v, r, ctx) => `<span class="persona-riga">${volto(ctx.foto.get(r.user_id))}<strong>${testo(nomeSic(r))}</strong>` +
                (r.user_id ? '' : ' <span class="material-symbols-outlined icona-nota" title="Senza account">person_off</span>') + '</span>',
            actions: (v, r) => azioniCella(r.id, [['modifica-persona-sic', 'edit', 'Modifica la persona']])
        },
        { key: 'stato', label: 'Stato', width: 70, classes: ['col-led'], sticky: true, render: (v, r, ctx) => ledPersona(ctx.stati.get(r.id) || []) },
        { key: 'mansione', label: 'Mansione', width: 200, classes: ['col-testo', 'col-piccola'], render: v => `<span title="${testo(mansioneIt(v))}">${testo(mansioneIt(v))}</span>` },
        { key: 'guida_mezzi', label: 'Patente B', width: 90, render: v => v === true ? 'Sì' : (v === false ? 'No' : '') },
        ...obblighi.map(o => ({
            key: 'o' + o.id, label: nomeObbligo(o), width: 132, classes: ['col-casella'], title: o.nome,
            render: (v, r, ctx) => casella(ctx.mappa.get(r.id + '|' + o.id), r.id, o.id)
        }))
    ];
}

export function riempiFiltriSicurezza() {
    const mansioni = [...new Set(stato.anagrafica.map(p => mansioneIt(p.mansione)).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'it'));
    opzioni(el('sicMansione'), mansioni.map(m => [m, m]), { vuota: 'Tutte le mansioni' });
}

export function disegnaSicurezza() {
    const obblighi = stato.obblighi.filter(o => o.attivo);
    const mappa = new Map(stato.scadenzario.map(s => [s.persona_id + '|' + s.obbligo_id, s]));
    const attive = stato.anagrafica.filter(p => p.attiva).sort(inOrdine);
    const caselle = stato.scadenzario.filter(s => attive.some(p => p.id === s.persona_id));
    const stati = new Map();
    caselle.forEach(s => stati.set(s.persona_id, [...(stati.get(s.persona_id) || []), s.stato]));
    const foto = new Map(stato.account.map(a => [a.user_id, a.avatar]));

    const cerca = el('sicRicerca').value.trim().toLowerCase();
    const mansione = el('sicMansione').value, filtro = el('sicStato').value;
    const righe = attive.filter(p => {
        if (cerca && !`${p.cognome} ${p.nome} ${nomeSic(p)}`.toLowerCase().includes(cerca)) return false;
        if (mansione && mansioneIt(p.mansione) !== mansione) return false;
        if (!filtro) return true;
        const sue = caselle.filter(s => s.persona_id === p.id);
        return sue.some(s => filtro === 'problemi' ? PROBLEMI.includes(s.stato) : s.stato === filtro);
    });

    mostrate = righe;
    tabella('sic', conSeparatore(colonne(obblighi)), separaAziende(righe), {
        ctx: { mappa, stati, foto },
        vuota: stato.anagrafica.length ? 'Nessuna persona corrisponde ai filtri.' : 'Lo scadenzario è vuoto: le persone si aggiungono da «Persone».'
    });

    const conta = st => caselle.filter(s => s.stato === st).length;
    el('sicScaduti').textContent = conta('scaduto');
    el('sicScaduti').classList.toggle('allarme', conta('scaduto') > 0);
    el('sicInScadenza').textContent = conta('in_scadenza');
    el('sicDaFare').textContent = conta('da_fare');
    const anno = annoCorrente();
    el('sicCostoEtichetta').textContent = 'Costo ' + anno;
    el('sicCosto').textContent = euroIt(stato.costiSic.filter(c => c.anno === anno).reduce((t, c) => t + Number(c.costo || 0), 0));
}

export function azzeraFiltriSicurezza() {
    el('sicRicerca').value = '';
    el('sicMansione').value = '';
    el('sicStato').value = 'problemi';
    disegnaSicurezza();
}

function nomeNaturale(p) {
    const a = p.user_id && stato.account.find(x => x.user_id === p.user_id);
    return a && a.nome ? a.nome : `${p.nome} ${p.cognome}`;
}

const cella = v => String(v ?? '').replace(/[\t\r\n]+/g, ' ').trim();

export async function copiaPersone() {
    const persone = mostrate.filter(p => !p.separatore);
    if (!persone.length) return toast('Nessuna persona da copiare: cambia i filtri.');
    const righe = persone.map(p => [nomeNaturale(p), emailPersona(p), dataIt(p.data_nascita), p.luogo_nascita, p.codice_fiscale].map(cella).join('\t'));
    try {
        await navigator.clipboard.writeText(righe.join('\r\n'));
        toast(persone.length === 1 ? 'Copiata 1 persona: incollala in Excel.' : `Copiate ${persone.length} persone: incollale in Excel.`);
    } catch (e) {
        toast('Non è stato possibile copiare.');
    }
}
