
import { supabase } from '../core/supabase.js';

const db = () => supabase.schema('marketing');

export function inItaliano(messaggio) {
    const m = String(messaggio || '');
    if (m.includes('sezioni_capitolo_in_uso')) {
        return 'Il capitolo contiene ancora delle sezioni: vanno eliminate prima.';
    }
    if (m.includes('blocchi_sezione_in_uso')) {
        return 'La sezione contiene ancora dei blocchi: vanno eliminati o spostati prima.';
    }
    if (m.includes('blocchi_url_check')) {
        return 'Il link deve cominciare per https:// (oppure http://).';
    }
    if (m.includes('titolo_pieno')) {
        return 'Il titolo non può essere vuoto.';
    }
    if (m.includes('blocchi_tipo_valido') || m.includes('blocchi_stato_valido')) {
        return 'Tipo o stato del blocco non riconosciuti.';
    }
    if (m.includes('row-level security')) {
        return 'Non hai il permesso di modificare questo modulo.';
    }
    return m || 'errore sconosciuto';
}

function fallita(cosa, error) {
    console.error(`${cosa}:`, error);
    return new Error(`${cosa}. ${inItaliano(error?.message)}`);
}

function toccata(data, cosa) {
    if (!data || !data.length) {
        throw new Error(`${cosa} non avvenuta: l'elemento non esiste più, oppure non hai il permesso.`);
    }
    return data[0];
}

export async function caricaCapitoli() {
    const { data, error } = await db().from('capitoli')
        .select('id, numero, titolo, ordine').order('ordine').order('numero');
    if (error) throw fallita('Caricamento dei capitoli fallito', error);
    return data || [];
}

export async function caricaSezioni() {
    const { data, error } = await db().from('sezioni')
        .select('id, capitolo_id, numero, titolo, ordine').order('ordine').order('numero');
    if (error) throw fallita('Caricamento delle sezioni fallito', error);
    return data || [];
}

export async function caricaBlocchi() {
    const { data, error } = await db().from('blocchi')
        .select('id, sezione_id, ordine, tipo, titolo, contenuto, stato, updated_at, updated_by')
        .order('ordine');
    if (error) throw fallita('Caricamento del playbook fallito', error);
    return data || [];
}

export async function caricaPersone() {
    const { data, error } = await db().rpc('persone');
    if (error) throw fallita('Caricamento dei nomi fallito', error);
    return data || [];
}

export async function caricaStorico(bloccoId) {
    const { data, error } = await db().from('storico')
        .select('id, titolo, contenuto, salvato_il, salvato_da')
        .eq('blocco_id', bloccoId)
        .order('salvato_il', { ascending: false });
    if (error) throw fallita('Caricamento delle versioni precedenti fallito', error);
    return data || [];
}

export async function salvaBlocco({ id, ...campi }) {
    if (!id) {
        const { data, error } = await db().from('blocchi').insert(campi).select('id');
        if (error) throw fallita('Salvataggio fallito', error);
        return toccata(data, 'Creazione del blocco').id;
    }
    const { data, error } = await db().from('blocchi').update(campi).eq('id', id).select('id');
    if (error) throw fallita('Salvataggio fallito', error);
    return toccata(data, 'Modifica del blocco').id;
}

export async function eliminaBlocco(id) {
    const { data, error } = await db().from('blocchi').delete().eq('id', id).select('id');
    if (error) throw fallita('Eliminazione fallita', error);
    toccata(data, 'Eliminazione del blocco');
}

export async function spostaBlocco(id, direzione) {
    const { error } = await db().rpc('sposta_blocco', { p_id: id, p_direzione: direzione });
    if (error) throw fallita('Spostamento fallito', error);
}

export async function creaCapitolo(campi) {
    const { data, error } = await db().from('capitoli').insert(campi).select('id');
    if (error) throw fallita('Creazione del capitolo fallita', error);
    return toccata(data, 'Creazione del capitolo').id;
}

export async function aggiornaCapitolo(id, campi) {
    const { data, error } = await db().from('capitoli').update(campi).eq('id', id).select('id');
    if (error) throw fallita('Modifica del capitolo fallita', error);
    toccata(data, 'Modifica del capitolo');
}

export async function eliminaCapitolo(id) {
    const { data, error } = await db().from('capitoli').delete().eq('id', id).select('id');
    if (error) throw fallita('Eliminazione del capitolo fallita', error);
    toccata(data, 'Eliminazione del capitolo');
}

export async function creaSezione(campi) {
    const { data, error } = await db().from('sezioni').insert(campi).select('id');
    if (error) throw fallita('Creazione della sezione fallita', error);
    return toccata(data, 'Creazione della sezione').id;
}

export async function aggiornaSezione(id, campi) {
    const { data, error } = await db().from('sezioni').update(campi).eq('id', id).select('id');
    if (error) throw fallita('Modifica della sezione fallita', error);
    toccata(data, 'Modifica della sezione');
}

export async function eliminaSezione(id) {
    const { data, error } = await db().from('sezioni').delete().eq('id', id).select('id');
    if (error) throw fallita('Eliminazione della sezione fallita', error);
    toccata(data, 'Eliminazione della sezione');
}
