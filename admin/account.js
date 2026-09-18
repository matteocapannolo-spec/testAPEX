
import { supabase } from '../core/supabase.js';
import { escapeHtml } from '../core/ui.js';
import { nomeDaEmail } from './persone.js';

const NOMI_ESITO = {
    creato: 'creato',
    completato: 'completato',
    gia_presente: 'esisteva già',
    rifiutato: 'rifiutato',
    errore: 'errore'
};

async function chiama(corpo) {
    const { data, error } = await supabase.functions.invoke('admin-user', { body: corpo });
    if (!error) return data;

    let dettaglio = error.message;
    try {
        const risposta = await error.context.json();
        if (risposta && risposta.error) dettaglio = risposta.error;
    } catch (_) {
    }
    throw new Error(dettaglio);
}

const dlgNuove = () => document.getElementById('dialogoNuove');
let alCambiamento = null;

export function apriNuovePersone(dopo) {
    alCambiamento = dopo;
    document.getElementById('nuoveEmail').value = '';
    document.getElementById('nuoveEsiti').innerHTML = '';
    document.getElementById('nuoveErrore').hidden = true;
    document.getElementById('nuoveCrea').disabled = false;
    dlgNuove().showModal();
}

export function chiudiNuovePersone() {
    dlgNuove().close();
}

function erroreNuove(testo) {
    const el = document.getElementById('nuoveErrore');
    el.textContent = testo;
    el.hidden = !testo;
}

export async function creaAccount() {
    const emails = document.getElementById('nuoveEmail').value
        .split('\n').map(r => r.trim()).filter(Boolean);

    if (emails.length === 0) { erroreNuove('Scrivi almeno un indirizzo.'); return; }

    const pulsante = document.getElementById('nuoveCrea');
    pulsante.disabled = true;
    erroreNuove('');
    document.getElementById('nuoveEsiti').innerHTML = '<div class="dlg-attesa">Creazione in corso…</div>';

    let risposta;
    try {
        risposta = await chiama({ azione: 'crea', emails });
    } catch (e) {
        document.getElementById('nuoveEsiti').innerHTML = '';
        erroreNuove(e.message);
        pulsante.disabled = false;
        return;
    }

    const esiti = (risposta && risposta.esiti) || [];
    document.getElementById('nuoveEsiti').innerHTML = `<ul class="elenco-esiti">${
        esiti.map(e => `<li class="esito-${escapeHtml(e.esito)}">
            <span class="esito-email">${escapeHtml(e.email)}</span>
            <span class="esito-parola">${escapeHtml(NOMI_ESITO[e.esito] || e.esito)}</span>
            ${e.dettaglio && e.esito !== 'gia_presente' ? `<span class="esito-dettaglio">${escapeHtml(e.dettaglio)}</span>` : ''}
        </li>`).join('')
    }</ul>`;

    const daRifare = esiti.filter(e => e.esito === 'rifiutato' || e.esito === 'errore').map(e => e.email);
    document.getElementById('nuoveEmail').value = daRifare.join('\n');
    pulsante.disabled = false;

    if (esiti.some(e => e.esito === 'creato' || e.esito === 'completato') && alCambiamento) await alCambiamento();
}

const dlgStato = () => document.getElementById('dialogoStato');
let bersaglio = null;

export function apriStato(persona, dopo) {
    bersaglio = persona;
    alCambiamento = dopo;

    document.getElementById('statoTitolo').textContent = persona.nome;
    document.getElementById('statoErrore').hidden = true;

    document.getElementById('statoTesto').textContent = persona.attivo
        ? 'Disattivando questo account la persona non entra più, e le sue sessioni aperte si chiudono subito. I suoi permessi restano scritti: riattivandola torna com\'era.'
        : 'Questo account è disattivato. Riattivandolo la persona rientra con i permessi che aveva.';

    document.getElementById('statoDisattiva').hidden = !persona.attivo;
    document.getElementById('statoRiattiva').hidden = persona.attivo;
    dlgStato().showModal();
}

export function chiudiStato() {
    dlgStato().close();
    bersaglio = null;
}

async function cambiaStato(azione) {
    if (!bersaglio) return;
    const el = document.getElementById('statoErrore');

    try {
        await chiama({ azione, userId: bersaglio.id });
    } catch (e) {
        el.textContent = e.message;
        el.hidden = false;
        return;
    }

    chiudiStato();
    if (alCambiamento) await alCambiamento();
}

export const disattiva = () => cambiaStato('disattiva');
export const riattiva = () => cambiaStato('riattiva');

const dlgNome = () => document.getElementById('dialogoNome');
let personaDelNome = null;

const SPIEGA_FONTE = {
    scritto: 'Nome scritto a mano. Svuotando il campo si torna a quello automatico.',
    google: 'Nome preso dall\'account Google. Si aggiorna da solo se cambia lì: scrivilo qui solo se è sbagliato.',
    dedotto: 'Nome ricavato dall\'indirizzo, perché questa persona non ha ancora fatto accesso. Apostrofi e cognomi composti non si possono indovinare.'
};

export function apriNome(persona, dopo) {
    personaDelNome = persona;
    alCambiamento = dopo;

    document.getElementById('nomeTitolo').textContent = persona.email || persona.nome;
    document.getElementById('nomeFonte').textContent = SPIEGA_FONTE[persona.fonteNome] || '';
    document.getElementById('nomeErrore').hidden = true;

    const campo = document.getElementById('nomeValore');
    campo.value = persona.nome;

    const automatico = (persona.nome_google || '').trim() || nomeDaEmail(persona.email);
    document.getElementById('nomeAutomatico').textContent = 'Senza correzione sarebbe: ' + automatico;

    dlgNome().showModal();
    campo.focus();
    campo.select();
}

export function chiudiNome() {
    dlgNome().close();
    personaDelNome = null;
}

export async function salvaNome() {
    if (!personaDelNome) return;
    const el = document.getElementById('nomeErrore');
    const valore = document.getElementById('nomeValore').value;

    const { error } = await supabase.rpc('imposta_nome', {
        p_user_id: personaDelNome.id,
        p_nome: valore
    });

    if (error) { el.textContent = error.message; el.hidden = false; return; }

    chiudiNome();
    if (alCambiamento) await alCambiamento();
}
