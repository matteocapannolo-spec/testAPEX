
import { escapeHtml, toast } from '../core/ui.js';
import { aggiorna, inserisci, elimina } from './api.js';
import { progettoPerId, contesto, ricarica } from './stato.js';
import { derivatiDiRiga } from './derivati.js';
import {
    TIPI_DOCUMENTO, TIPI_ATTESI, FASI, TAPPE, STATI_FATTURA, dataIt, euro, giorni
} from './config.js';

const el = id => document.getElementById(id);
let apertoId = null;
let collegato = false;

function errore(testo) {
    el('schedaErrore').textContent = testo || '';
    el('schedaErrore').hidden = !testo;
}

function campo(tabella, rigaId, nomeCampo, valore, tipo = 'text', extra = '') {
    return `<input class="campo-inline" type="${tipo}"${extra}` +
        ` data-tabella="${escapeHtml(tabella)}" data-riga="${escapeHtml(rigaId || '')}" data-campo="${escapeHtml(nomeCampo)}"` +
        ` value="${escapeHtml(valore ?? '')}" autocomplete="off" spellcheck="false">`;
}

function sezioneDocumenti(progetto, d) {
    const righe = TIPI_ATTESI.map(tipo => {
        const doc = d.documentiPerTipo[tipo] || null;
        const id = doc ? doc.id : '';
        const apri = doc && doc.url
            ? `<a class="btn-link-pill" href="${escapeHtml(doc.url)}" target="_blank" rel="noopener noreferrer" title="Apri">` +
              `<span class="material-symbols-outlined">open_in_new</span></a>`
            : '<span class="pulse-warning" title="Nessun link">⚠️</span>';

        return `<tr data-tipo="${escapeHtml(tipo)}">
            <th scope="row">${escapeHtml(TIPI_DOCUMENTO[tipo])}</th>
            <td>${campo('documenti', id, 'nome', doc?.nome, 'text', ` data-tipo="${escapeHtml(tipo)}" placeholder="nome del documento"`)}</td>
            <td>${campo('documenti', id, 'url', doc?.url, 'url', ` data-tipo="${escapeHtml(tipo)}" placeholder="https://…"`)}</td>
            <td>${campo('documenti', id, 'revisione', doc?.revisione, 'date', ` data-tipo="${escapeHtml(tipo)}"`)}</td>
            <td class="cella-azione">${apri}</td>
        </tr>`;
    }).join('');

    return `<section class="scheda-sezione">
        <h4>Documenti <span class="conteggio">${d.documentiMancanti.length} da caricare</span></h4>
        <table class="tabella-scheda">
            <thead><tr><th>Tipo</th><th>Nome</th><th>Link</th><th>Revisione</th><th></th></tr></thead>
            <tbody>${righe}</tbody>
        </table>
    </section>`;
}

function sezioneFasi(progetto, d) {
    const righe = d.fasi.map(f => {
        const corrente = f.fase === progetto.fase;
        const scarto = f.scarto_giorni === null || f.scarto_giorni === undefined
            ? '<span class="niente">—</span>'
            : `<span class="scarto ${f.scarto_giorni > 0 ? 'in-ritardo' : 'in-anticipo'}">${escapeHtml(giorni(f.scarto_giorni))}</span>`;

        return `<tr${corrente ? ' class="fase-corrente"' : ''}>
            <th scope="row">${escapeHtml(FASI[f.fase] || f.fase)}${corrente ? ' <span class="ora-qui">siamo qui</span>' : ''}</th>
            <td>${campo('fasi', f.id, 'data_prevista', f.data_prevista, 'date')}</td>
            <td>${campo('fasi', f.id, 'data_effettiva', f.data_effettiva, 'date')}</td>
            <td>${scarto}</td>
        </tr>`;
    }).join('');

    return `<section class="scheda-sezione">
        <h4>Fasi</h4>
        <p class="nota-sezione">La data prevista si fissa in anticipo: è l'unico modo perché "ritardo" sia calcolabile. Lo scarto è la differenza fra le due, con il segno.</p>
        <table class="tabella-scheda">
            <thead><tr><th>Fase</th><th>Prevista</th><th>Effettiva</th><th>Scarto</th></tr></thead>
            <tbody>${righe}</tbody>
        </table>
    </section>`;
}

function sezioneFatturazione(progetto, d) {
    const base = progetto.ricavo_totale;
    const righe = d.tappe.map(t => {
        const pronta = d.fatturabili.includes(t);
        const bloccata = d.bloccate.includes(t);
        const importo = (base === null || base === undefined)
            ? '<span class="niente">—</span>'
            : escapeHtml(euro(Number(base) * Number(t.percentuale) / 100));

        const segno = pronta ? '<span class="pill fatt-pronta">fatturabile</span>'
            : bloccata ? '<span class="pill fatt-bloccata">in attesa del traguardo</span>'
            : `<span class="pill fatt-completo">${escapeHtml(STATI_FATTURA[t.stato])}</span>`;

        return `<tr>
            <th scope="row">${escapeHtml(TAPPE[t.tappa] || t.tappa)}</th>
            <td>${escapeHtml(String(t.percentuale))}%</td>
            <td>${importo}</td>
            <td>${segno}</td>
            <td>${escapeHtml(dataIt(t.data_prevista))}</td>
            <td class="cella-azione"><button type="button" class="azione-cella" data-action="tappa-elimina" data-riga="${escapeHtml(t.id)}" title="Elimina la tappa"><span class="material-symbols-outlined">delete</span></button></td>
        </tr>`;
    }).join('');

    const totale = d.tappe.reduce((s, t) => s + Number(t.percentuale || 0), 0);
    const avviso = (base === null || base === undefined)
        ? '<p class="nota-sezione avviso">Il totale da fatturare non è compilato: le tappe sanno dire la percentuale, non quanti euro.</p>'
        : '';

    return `<section class="scheda-sezione">
        <h4>Piano di fatturazione <span class="conteggio ${totale === 100 ? 'ok' : 'attenzione'}">${totale}% del totale</span></h4>
        ${avviso}
        <table class="tabella-scheda">
            <thead><tr><th>Tappa</th><th>%</th><th>Importo</th><th>Stato</th><th>Prevista</th><th></th></tr></thead>
            <tbody>${righe}</tbody>
        </table>
        <div class="riga-aggiunta">
            <select id="nuovaTappa">${Object.entries(TAPPE).map(([k, v]) => `<option value="${escapeHtml(k)}">${escapeHtml(v)}</option>`).join('')}</select>
            <input type="number" id="nuovaPercentuale" min="0.01" max="100" step="0.01" placeholder="%">
            <button type="button" class="btn btn-neutro" data-action="tappa-nuova">Aggiungi tappa</button>
        </div>
    </section>`;
}

function sezioneFornitori(progetto) {
    const chip = (progetto.fornitori || []).map(f =>
        `<span class="chip">${escapeHtml(f.azienda)}` +
        `<button type="button" class="chip-x" data-action="fornitore-elimina" data-riga="${escapeHtml(f.id)}" title="Togli">×</button></span>`
    ).join('');

    return `<section class="scheda-sezione">
        <h4>Mano d'opera esterna</h4>
        <div class="chips">${chip || '<span class="niente">nessun fornitore</span>'}</div>
        <div class="riga-aggiunta">
            <input type="text" id="nuovoFornitore" placeholder="Nome dell'azienda" autocomplete="off">
            <button type="button" class="btn btn-neutro" data-action="fornitore-nuovo">Aggiungi</button>
        </div>
    </section>`;
}

function sezioneIncoerenze(d) {
    if (!d.incoerenze.length) return '';
    return `<section class="scheda-sezione incoerenze">
        <h4>Da controllare</h4>
        <ul>${d.incoerenze.map(i => `<li>${escapeHtml(i)}</li>`).join('')}</ul>
    </section>`;
}

export function apriScheda(id) {
    const progetto = progettoPerId(id);
    if (!progetto) return;

    apertoId = id;
    const d = derivatiDiRiga(progetto, contesto());

    el('schedaCodice').textContent = progetto.codice;
    el('schedaCliente').textContent = [progetto.cliente, progetto.citta].filter(Boolean).join(' · ') || 'senza cliente';
    errore('');

    const cancellato = progetto.status === 'annullato';
    const btn = el('btnCancellato');
    btn.hidden = !contesto().puoScrivere;
    btn.textContent = cancellato ? 'Riattiva progetto' : 'Segna come cancellato';

    el('schedaCorpo').innerHTML =
        sezioneIncoerenze(d) +
        sezioneDocumenti(progetto, d) +
        sezioneFasi(progetto, d) +
        sezioneFatturazione(progetto, d) +
        sezioneFornitori(progetto);

    if (!collegato) {
        el('schedaCorpo').addEventListener('change', salvaInline);
        collegato = true;
    }

    el('dialogoScheda').showModal();
}

export function chiudiScheda() {
    apertoId = null;
    el('dialogoScheda').close();
}

function riapri() {
    const id = apertoId;
    if (id) apriScheda(id);
}

async function salvaInline(ev) {
    const input = ev.target.closest('.campo-inline');
    if (!input || !contesto().puoScrivere) return;

    const { tabella, riga, campo: nomeCampo, tipo } = input.dataset;
    const valore = input.value === '' ? null : input.value;

    try {
        if (riga) {
            await aggiorna(tabella, riga, { [nomeCampo]: valore });
        } else {
            if (valore === null) return;
            await inserisci(tabella, { progetto_id: apertoId, tipo, [nomeCampo]: valore });
        }
        await ricarica();
        riapri();
        toast('Salvato');
    } catch (e) {
        errore(e.message);
    }
}

export function gestoriScheda() {
    const conRicarica = async (azione) => {
        try {
            await azione();
            await ricarica();
            riapri();
        } catch (e) {
            errore(e.message);
        }
    };

    return {
        'segna-cancellato': () => conRicarica(async () => {
            const progetto = progettoPerId(apertoId);
            if (!progetto) return;
            const nuovo = progetto.status === 'annullato' ? 'in_corso' : 'annullato';
            await aggiorna('progetti', apertoId, { status: nuovo });
        }),

        'tappa-nuova': () => conRicarica(async () => {
            const percentuale = Number(el('nuovaPercentuale').value);
            if (!percentuale || percentuale <= 0) throw new Error('Serve una percentuale maggiore di zero.');
            await inserisci('fatturazione', {
                progetto_id: apertoId,
                tappa: el('nuovaTappa').value,
                percentuale
            });
        }),

        'tappa-elimina': (elemento) => conRicarica(() => elimina('fatturazione', elemento.dataset.riga)),

        'fornitore-nuovo': () => conRicarica(async () => {
            const azienda = el('nuovoFornitore').value.trim();
            if (!azienda) throw new Error('Serve il nome dell\'azienda.');
            await inserisci('fornitori', { progetto_id: apertoId, azienda });
        }),

        'fornitore-elimina': (elemento) => conRicarica(() => elimina('fornitori', elemento.dataset.riga))
    };
}
