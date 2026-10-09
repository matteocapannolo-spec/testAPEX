
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
    db().from('strumenti').select('id, modello_id, numero_serie, note'));

export const caricaContrattiStrumenti = () => leggi('Caricamento degli strumenti dei contratti fallito',
    db().from('contratti_strumenti').select('contratto_id, strumento_id'));

export const caricaFlussiStrumenti = () => leggi('Caricamento degli strumenti dei flussi fallito',
    db().from('flussi_strumenti').select('flusso_id, strumento_id'));

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

export const collegaStrumento = (contratto_id, strumento_id) => scrivi("Aggiunta dello strumento al contratto fallita",
    db().from('contratti_strumenti').insert({ contratto_id, strumento_id }).select('contratto_id'));

export const scollegaStrumento = (contratto_id, strumento_id) => scrivi('Rimozione dello strumento dal contratto fallita',
    db().from('contratti_strumenti').delete()
        .eq('contratto_id', contratto_id).eq('strumento_id', strumento_id).select('contratto_id'));

export const creaFlusso = (contratto_id, titolo) => scrivi('Creazione del flusso fallita',
    db().from('flussi').insert({ contratto_id, titolo }).select('id')).then(r => r.id);

export const rinominaFlusso = (id, titolo) => scrivi('Rinomina del flusso fallita',
    db().from('flussi').update({ titolo }).eq('id', id).select('id'));

export const eliminaFlusso = id => scrivi('Eliminazione del flusso fallita',
    db().from('flussi').delete().eq('id', id).select('id'));

export const aggiungiAlFlusso = (flusso_id, strumento_id) => scrivi('Aggiunta dello strumento al flusso fallita',
    db().from('flussi_strumenti').insert({ flusso_id, strumento_id }).select('flusso_id'));

export const togliDalFlusso = (flusso_id, strumento_id) => scrivi('Rimozione dello strumento dal flusso fallita',
    db().from('flussi_strumenti').delete()
        .eq('flusso_id', flusso_id).eq('strumento_id', strumento_id).select('flusso_id'));

function argomentiPasso({ flusso, passo, numero, data, link, esito }) {
    return {
        p_flusso: flusso, p_passo: passo,
        p_numero: numero || null, p_data: data || null, p_link: link || null,
        p_esito: typeof esito === 'boolean' ? esito : null
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
