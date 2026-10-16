
import { supabase } from '../core/supabase.js';

const db = () => supabase.schema('task');

export function inItaliano(messaggio) {
    const m = String(messaggio || '');
    if (m.includes('reparti_nome_unico')) return 'Esiste già un reparto con questo nome.';
    if (m.includes('_nome_pieno') || m.includes('_titolo_pieno') || m.includes('_testo_pieno')) return 'Il testo non può essere vuoto.';
    if (m.includes('schede_colonna_id_fkey')) return 'La colonna contiene ancora delle schede (anche in archivio): vanno spostate prima.';
    if (m.includes('_pkey') || m.includes('duplicate key')) return 'C\'è già.';
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

async function chiama(cosa, nome, argomenti) {
    const { data, error } = await db().rpc(nome, argomenti);
    if (error) throw fallita(cosa, error);
    return data;
}


export const caricaPersone = () => chiama('Caricamento delle persone fallito', 'persone');

export const caricaReparti = () => leggi('Caricamento dei reparti fallito',
    db().from('reparti').select('*').order('ordine').order('nome'));

export const caricaRepartoMembri = () => leggi('Caricamento dei membri dei reparti fallito',
    db().from('reparto_membri').select('*'));

export const caricaBacheche = () => leggi('Caricamento delle bacheche fallito',
    db().from('bacheche').select('*').order('ordine').order('nome'));

export const caricaEtichette = () => leggi('Caricamento delle etichette fallito',
    db().from('etichette').select('*').order('ordine').order('nome'));

export const caricaColonne = bacheca => leggi('Caricamento delle colonne fallito',
    db().from('colonne').select('*').eq('bacheca_id', bacheca).order('posizione'));

export const caricaSchede = bacheca => leggi('Caricamento delle schede fallito',
    db().from('v_schede').select('*').eq('bacheca_id', bacheca).eq('archiviata', false).order('posizione'));

export const caricaMie = utente => leggi('Caricamento delle tue schede fallito',
    db().from('v_schede').select('*').contains('membri', [utente]).eq('archiviata', false)
        .is('completata_il', null).order('scadenza', { nullsFirst: false }));

export const caricaArchivio = reparto => leggi('Caricamento dell\'archivio fallito',
    db().from('v_schede').select('*').eq('reparto_id', reparto).eq('archiviata', true)
        .order('completata_il', { ascending: false }).limit(500));

export const caricaScheda = id => scrivi('Caricamento della scheda fallito',
    db().from('v_schede').select('*').eq('id', id));

export const caricaChecklist = scheda => leggi('Caricamento delle checklist fallito',
    db().from('checklist').select('*').eq('scheda_id', scheda).order('posizione'));

export const caricaVoci = scheda => leggi('Caricamento della checklist fallito',
    db().from('checklist_voci').select('*').eq('scheda_id', scheda).order('posizione'));

export const caricaCommenti = scheda => leggi('Caricamento dei commenti fallito',
    db().from('commenti').select('*').eq('scheda_id', scheda).order('created_at', { ascending: false }));

export const caricaAttivita = scheda => leggi('Caricamento della cronologia fallito',
    db().from('attivita').select('*').eq('scheda_id', scheda).order('created_at', { ascending: false }));


export const creaScheda = campi => scrivi('Creazione della scheda fallita',
    db().from('schede').insert(campi).select());

export async function aggiornaScheda(id, versione, campi) {
    const { data, error } = await db().from('schede').update(campi)
        .eq('id', id).eq('versione', versione).select();
    if (error) throw fallita('Salvataggio della scheda fallito', error);
    if (!data || !data.length) {
        throw new Error('Qualcuno ha modificato questa scheda nel frattempo: la ricarico, poi riprova.');
    }
    return data[0];
}

export const spostaScheda = (id, versione, colonna) => chiama('Spostamento della scheda fallito',
    'sposta_scheda', { p_scheda: id, p_versione: versione, p_colonna: colonna });

export const eliminaScheda = id => scrivi('Eliminazione della scheda fallita',
    db().from('schede').delete().eq('id', id).select());

export const aggiungiMembro = (scheda, utente) => scrivi('Aggiunta del membro fallita',
    db().from('scheda_membri').insert({ scheda_id: scheda, user_id: utente }).select());

export const togliMembro = (scheda, utente) => scrivi('Rimozione del membro fallita',
    db().from('scheda_membri').delete().eq('scheda_id', scheda).eq('user_id', utente).select());

export const aggiungiEtichetta = (scheda, etichetta) => scrivi('Aggiunta dell\'etichetta fallita',
    db().from('scheda_etichette').insert({ scheda_id: scheda, etichetta_id: etichetta }).select());

export const togliEtichetta = (scheda, etichetta) => scrivi('Rimozione dell\'etichetta fallita',
    db().from('scheda_etichette').delete().eq('scheda_id', scheda).eq('etichetta_id', etichetta).select());


export const creaChecklist = campi => scrivi('Creazione della checklist fallita',
    db().from('checklist').insert(campi).select());

export const aggiornaChecklist = (id, campi) => scrivi('Salvataggio della checklist fallito',
    db().from('checklist').update(campi).eq('id', id).select());

export const eliminaChecklist = id => scrivi('Eliminazione della checklist fallita',
    db().from('checklist').delete().eq('id', id).select());

export const creaVoce = campi => scrivi('Aggiunta alla checklist fallita',
    db().from('checklist_voci').insert(campi).select());

export const aggiornaVoce = (id, campi) => scrivi('Salvataggio della checklist fallito',
    db().from('checklist_voci').update(campi).eq('id', id).select());

export const eliminaVoce = id => scrivi('Eliminazione dalla checklist fallita',
    db().from('checklist_voci').delete().eq('id', id).select());

export const creaCommento = campi => scrivi('Invio del commento fallito',
    db().from('commenti').insert(campi).select());

export const aggiornaCommento = (id, testo) => scrivi('Modifica del commento fallita',
    db().from('commenti').update({ testo }).eq('id', id).select());

export const eliminaCommento = id => scrivi('Eliminazione del commento fallita',
    db().from('commenti').delete().eq('id', id).select());


export const creaColonna = campi => scrivi('Creazione della colonna fallita',
    db().from('colonne').insert(campi).select());

export const aggiornaColonna = (id, campi) => scrivi('Salvataggio della colonna fallito',
    db().from('colonne').update(campi).eq('id', id).select());

export const eliminaColonna = id => scrivi('Eliminazione della colonna fallita',
    db().from('colonne').delete().eq('id', id).select());

export const nuovaBacheca = (reparto, nome) => chiama('Creazione della bacheca fallita',
    'nuova_bacheca', { p_reparto: reparto, p_nome: nome });

export const aggiornaBacheca = (id, campi) => scrivi('Salvataggio della bacheca fallito',
    db().from('bacheche').update(campi).eq('id', id).select());

export const eliminaBacheca = id => scrivi('Eliminazione della bacheca fallita',
    db().from('bacheche').delete().eq('id', id).select());


export const nuovoReparto = nome => chiama('Creazione del reparto fallita', 'nuovo_reparto', { p_nome: nome });

export const aggiornaReparto = (id, campi) => scrivi('Salvataggio del reparto fallito',
    db().from('reparti').update(campi).eq('id', id).select());

export const eliminaReparto = id => scrivi('Eliminazione del reparto fallita',
    db().from('reparti').delete().eq('id', id).select());

export const aggiungiAlReparto = (reparto, utente) => scrivi('Aggiunta al reparto fallita',
    db().from('reparto_membri').insert({ reparto_id: reparto, user_id: utente }).select());

export const togliDalReparto = (reparto, utente) => scrivi('Rimozione dal reparto fallita',
    db().from('reparto_membri').delete().eq('reparto_id', reparto).eq('user_id', utente).select());

export const creaEtichetta = campi => scrivi('Creazione dell\'etichetta fallita',
    db().from('etichette').insert(campi).select());

export const aggiornaEtichettaReparto = (id, campi) => scrivi('Salvataggio dell\'etichetta fallito',
    db().from('etichette').update(campi).eq('id', id).select());

export const eliminaEtichettaReparto = id => scrivi('Eliminazione dell\'etichetta fallita',
    db().from('etichette').delete().eq('id', id).select());


export async function caricaTicketAsset() {
    const { data, error } = await db().from('ticket_asset').select('colonna_id').eq('id', 1).maybeSingle();
    if (error) throw fallita('Caricamento della colonna dei ticket fallito', error);
    return data;
}

export const aggiornaTicketAsset = campi => scrivi('Salvataggio della colonna dei ticket fallito',
    db().from('ticket_asset').update(campi).eq('id', 1).select());
