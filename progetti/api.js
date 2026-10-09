
import { supabase } from '../core/supabase.js';

const db = () => supabase.schema('progetti');

function fallita(cosa, error) {
    console.error(`${cosa}:`, error);
    return new Error(`${cosa}. ${error?.message || 'errore sconosciuto'}`);
}

export async function caricaProgetti() {
    const { data, error } = await db()
        .from('progetti')
        .select(`
            *,
            documenti (*),
            fatturazione (*),
            fornitori (*),
            fasi (*)
        `)
        .order('codice', { ascending: false });

    if (error) throw fallita('Caricamento dei progetti fallito', error);
    return data || [];
}

export async function caricaResponsabili() {
    const { data, error } = await db().rpc('responsabili');
    if (error) throw fallita('Caricamento dei responsabili fallito', error);
    return data || [];
}

export async function caricaCollegamenti(tutti = false) {
    let q = db().from('collegamenti').select('*');

    if (!tutti) q = q.eq('attivo', true);

    const { data, error } = await q.order('ordine');
    if (error) throw fallita('Caricamento dei collegamenti fallito', error);
    return data || [];
}

export async function aggiorna(tabella, id, campi) {
    const { data, error } = await db().from(tabella).update(campi).eq('id', id).select().single();
    if (error) throw fallita('Salvataggio fallito', error);
    return data;
}

export async function inserisci(tabella, riga) {
    const { data, error } = await db().from(tabella).insert(riga).select().single();
    if (error) throw fallita('Inserimento fallito', error);
    return data;
}

export async function elimina(tabella, id) {
    const { error } = await db().from(tabella).delete().eq('id', id);
    if (error) throw fallita('Eliminazione fallita', error);
}

export async function creaProgetto(codice, businessUnit) {
    return inserisci('progetti', { codice: codice.trim(), business_unit: businessUnit });
}
