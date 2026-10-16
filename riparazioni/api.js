
import { supabase } from '../core/supabase.js';
import { MODULO } from './config.js';

const db = () => supabase.schema('riparazioni');

export function inItaliano(messaggio) {
    const m = String(messaggio || '');
    if (m.includes('clienti_nome_unico')) return 'Esiste già un cliente con questo nome.';
    if (m.includes('pratiche_nome_unico')) return 'Questo cliente ha già una pratica con questo nome.';
    if (m.includes('strumenti_serie_unica')) return 'Esiste già uno strumento di questo modello con questo numero di serie.';
    if (m.includes('_link_https')) return 'Il link deve cominciare per https://: conviene copiarlo dalla barra del browser.';
    if (m.includes('contratti_date_in_ordine')) return 'La conclusione del contratto non può venire prima della sottoscrizione.';
    if (m.includes('_nome_pieno') || m.includes('_titolo_pieno') || m.includes('_serie_piena')) return 'Il nome non può essere vuoto.';
    if (m.includes('contratti_strumenti_pkey')) return 'Lo strumento fa già parte di questo contratto.';
    if (m.includes('contatti_qualcosa')) return 'Un contatto ha bisogno almeno di un nome, di un cognome o di un indirizzo email.';
    if (m.includes('contatti_email')) return "L'indirizzo email non sembra valido.";
    if (m.includes('contatti_posto_unico')) return 'Il contratto ha già tre contatti.';
    if (m.includes('strumenti_intervallo_sensato')) return "L'intervallo di manutenzione va da 1 a 120 mesi.";
    if (m.includes('strumenti_bactocare_sensato')) return 'Le manutenzioni BactoCare vanno da 0 a 50.';
    if (m.includes('note_testo_pieno')) return 'La nota è vuota.';
    if (m.includes('luoghi_nome_unico')) return "Questo luogo c'è già nell'elenco.";
    if (m.includes('cartucce_seriale_unico')) return 'Esiste già una cartuccia con questo seriale.';
    if (m.includes('contratti_stato_valido')) return 'Stato del contratto non valido.';
    if (m.includes('violates foreign key constraint') && m.includes('delete')) {
        return 'Non si può eliminare: ci sono ancora flussi o strumenti collegati.';
    }
    if (m.includes('row-level security')) return 'Non hai il permesso di fare questa modifica.';
    return m || 'errore sconosciuto';
}

function fallita(cosa, error) {
    console.error(`${cosa}:`, error);
    return new Error(`${cosa}. ${inItaliano(error?.message)}`);
}

async function leggi(cosa, richiesta) {
    const { data, error } = await richiesta;
    if (error) throw fallita(cosa, error);
    return data || [];
}

async function scrivi(cosa, richiesta) {
    const { data, error } = await richiesta;
    if (error) throw fallita(cosa, error);
    if (!data || !data.length) {
        throw new Error(`${cosa}: la riga non esiste più, oppure non hai il permesso.`);
    }
    return data[0];
}


export const caricaContratti = () => leggi('Caricamento dei contratti fallito',
    db().from('v_contratti').select('*').order('cliente_nome').order('nome'));

export const caricaFlussi = () => leggi('Caricamento dei flussi fallito',
    db().from('v_flussi').select('*').order('created_at'));

export const caricaPassi = () => leggi('Caricamento dei passaggi fallito',
    db().from('passi').select('*'));

export const caricaPassaggi = () => leggi('Caricamento dei nove passaggi fallito',
    db().from('passaggi').select('*').order('passo'));

export const caricaClienti = () => leggi('Caricamento dei clienti fallito',
    db().from('clienti').select('id, nome').order('nome'));

export const caricaPratiche = () => leggi('Caricamento delle pratiche fallito',
    db().from('pratiche').select('id, cliente_id, nome, link_drive').order('nome'));

export const caricaStrumenti = () => leggi('Caricamento degli strumenti fallito',
    db().from('strumenti').select('*'));

export const caricaContrattiStrumenti = () => leggi('Caricamento degli strumenti dei contratti fallito',
    db().from('contratti_strumenti').select('contratto_id, strumento_id'));

export const caricaFlussiStrumenti = () => leggi('Caricamento degli strumenti dei flussi fallito',
    db().from('flussi_strumenti').select('flusso_id, strumento_id'));

export const caricaContatti = () => leggi('Caricamento dei contatti fallito',
    db().from('contatti').select('*').order('posizione'));

export const caricaNote = () => leggi('Caricamento delle note fallito',
    db().from('note').select('*').order('creato_il', { ascending: false }));

export const caricaModelli = () => leggi('Caricamento dei modelli da Asset fallito', db().rpc('modelli'));
export const caricaResponsabili = () => leggi('Caricamento dei responsabili fallito', db().rpc('responsabili'));
export const caricaPersone = () => leggi('Caricamento dei nomi fallito', db().rpc('persone'));

export async function caricaMieiGruppi(userId) {
    const { data, error } = await supabase
        .from('memberships').select('scope')
        .eq('user_id', userId).eq('module', MODULO).maybeSingle();
    if (error) throw fallita('Lettura dei tuoi gruppi fallita', error);
    const gruppi = data && data.scope && data.scope.gruppi;
    return Array.isArray(gruppi) ? gruppi : [];
}


export const creaCliente = nome => scrivi('Creazione del cliente fallita',
    db().from('clienti').insert({ nome }).select('id')).then(r => r.id);

export const rinominaCliente = (id, nome) => scrivi('Rinomina del cliente fallita',
    db().from('clienti').update({ nome }).eq('id', id).select('id'));

export async function salvaPratica({ id, cliente_id, nome, link_drive }) {
    if (id) {
        await scrivi('Salvataggio della pratica fallito',
            db().from('pratiche').update({ nome, link_drive }).eq('id', id).select('id'));
        return id;
    }
    const riga = await scrivi('Creazione della pratica fallita',
        db().from('pratiche').insert({ cliente_id, nome, link_drive }).select('id'));
    return riga.id;
}


export async function salvaContratto({ id, ...campi }) {
    if (id) {
        await scrivi('Salvataggio del contratto fallito',
            db().from('contratti').update(campi).eq('id', id).select('id'));
        return id;
    }
    const riga = await scrivi('Creazione del contratto fallita',
        db().from('contratti').insert(campi).select('id'));
    return riga.id;
}

export const eliminaContratto = id => scrivi('Eliminazione del contratto fallita',
    db().from('contratti').delete().eq('id', id).select('id'));


export const creaStrumento = ({ modello_id, numero_serie }) => scrivi('Registrazione dello strumento fallita',
    db().from('strumenti').insert({ modello_id, numero_serie }).select('id')).then(r => r.id);

export const salvaStrumento = (id, campi) => scrivi('Salvataggio dello strumento fallito',
    db().from('strumenti').update(campi).eq('id', id).select('id'));

export const collegaStrumento =(contratto_id, strumento_id) => scrivi("Aggiunta dello strumento al contratto fallita",
    db().from('contratti_strumenti').insert({ contratto_id, strumento_id }).select('contratto_id'));

export const scollegaStrumento = (contratto_id, strumento_id) => scrivi('Rimozione dello strumento dal contratto fallita',
    db().from('contratti_strumenti').delete()
        .eq('contratto_id', contratto_id).eq('strumento_id', strumento_id).select('contratto_id'));


export const creaFlusso = campi => scrivi('Creazione del flusso fallita',
    db().from('flussi').insert(campi).select('id')).then(r => r.id);

export const aggiornaFlusso = (id, campi) => scrivi('Salvataggio del flusso fallito',
    db().from('flussi').update(campi).eq('id', id).select('id'));

export const eliminaFlusso = id => scrivi('Eliminazione del flusso fallita',
    db().from('flussi').delete().eq('id', id).select('id'));

export const aggiungiAlFlusso = (flusso_id, strumento_id) => scrivi('Aggiunta dello strumento al flusso fallita',
    db().from('flussi_strumenti').insert({ flusso_id, strumento_id }).select('flusso_id'));

export const togliDalFlusso = (flusso_id, strumento_id) => scrivi('Rimozione dello strumento dal flusso fallita',
    db().from('flussi_strumenti').delete()
        .eq('flusso_id', flusso_id).eq('strumento_id', strumento_id).select('flusso_id'));


function argomentiPasso({ flusso, passo, numero, data, link, esito, da, a, ubicazione, seriale }) {
    return {
        p_flusso: flusso, p_passo: passo,
        p_numero: numero || null, p_data: data || null, p_link: link || null,
        p_esito: typeof esito === 'boolean' ? esito : null,
        p_da: da || null, p_a: a || null, p_ubicazione: ubicazione || null, p_seriale: seriale || null
    };
}

export async function completaPasso(campi) {
    const { error } = await db().rpc('completa_passo', argomentiPasso(campi));
    if (error) throw fallita('Passaggio non salvato', error);
}

export async function correggiPasso(campi) {
    const { error } = await db().rpc('correggi_passo', argomentiPasso(campi));
    if (error) throw fallita('Correzione non salvata', error);
}


export async function salvaContatto({ id, ...campi }) {
    if (id) {
        await scrivi('Salvataggio del contatto fallito',
            db().from('contatti').update(campi).eq('id', id).select('id'));
        return id;
    }
    const riga = await scrivi('Aggiunta del contatto fallita',
        db().from('contatti').insert(campi).select('id'));
    return riga.id;
}

export const eliminaContatto = id => scrivi('Eliminazione del contatto fallita',
    db().from('contatti').delete().eq('id', id).select('id'));


export const aggiungiNota = campi => scrivi('Nota non salvata',
    db().from('note').insert(campi).select('id'));

export const chiudiPromemoria = (id, chiuso) => scrivi(chiuso ? 'Promemoria non chiuso' : 'Promemoria non riaperto',
    db().from('note').update({ chiuso_il: chiuso ? new Date().toISOString() : null }).eq('id', id).select('id'));

export const eliminaNota = id => scrivi('Eliminazione della nota fallita',
    db().from('note').delete().eq('id', id).select('id'));


export const caricaAvvisi = () => leggi('Caricamento degli avvisi fallito',
    db().from('avvisi').select('*').order('creato_il', { ascending: false }));

export async function generaAvvisi() {
    const { error } = await db().rpc('genera_avvisi');
    if (error) throw fallita('Controllo delle scadenze fallito', error);
}

export const segnaContattato = (id, fatto) => scrivi(fatto ? 'Avviso non segnato' : 'Avviso non riaperto',
    db().from('avvisi').update({ contattato_il: fatto ? new Date().toISOString() : null }).eq('id', id).select('id'));

export async function rinnovaContratto(vecchio, c) {
    const { data, error } = await db().rpc('rinnova_contratto', {
        p_vecchio: vecchio, p_pratica: c.pratica_id, p_nome: c.nome, p_codici: c.codici,
        p_link: c.link_drive, p_responsabile: c.responsabile_id, p_inizio: c.data_sottoscrizione,
        p_fine: c.data_conclusione, p_sintesi: c.sintesi, p_rinnovo_automatico: c.rinnovo_automatico
    });
    if (error) throw fallita('Rinnovo non salvato', error);
    return data;
}

export const cambiaStatoContratto = (id, stato) => scrivi(stato === 'chiuso' ? 'Chiusura del contratto fallita' : 'Riapertura del contratto fallita',
    db().from('contratti').update({ stato }).eq('id', id).select('id'));


export const caricaCartucce = () => leggi('Caricamento delle cartucce fallito',
    db().from('cartucce').select('*').order('seriale'));

export const caricaLuoghi = () => leggi('Caricamento dei luoghi fallito',
    db().from('luoghi').select('id, nome').order('nome'));

export const caricaColleghi = () => leggi('Caricamento delle persone del modulo fallito', db().rpc('colleghi'));

export const creaLuogo = nome => scrivi('Luogo non aggiunto',
    db().from('luoghi').insert({ nome }).select('id')).then(r => r.id);

export async function salvaCartuccia({ id, ...campi }) {
    if (id) {
        await scrivi('Salvataggio della cartuccia fallito',
            db().from('cartucce').update(campi).eq('id', id).select('id'));
        return id;
    }
    const riga = await scrivi('Aggiunta della cartuccia fallita',
        db().from('cartucce').insert(campi).select('id'));
    return riga.id;
}


export const caricaTicket = () => leggi('Caricamento dei ticket fallito', db().rpc('ticket_elenco'));
export async function apriTicket({ categoria, titolo, descrizione }) {
    const { data, error } = await db().rpc('apri_ticket', { p_categoria: categoria, p_titolo: titolo, p_descrizione: descrizione || null });
    if (error) throw fallita('Ticket non aperto', error);
    return data;
}
