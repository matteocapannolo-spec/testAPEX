
import { supabase } from '../core/supabase.js';

const db = () => supabase.schema('formazione');

export function inItaliano(messaggio) {
    const m = String(messaggio || '');
    if (m.includes('assegnazioni_una_per_piano')) return 'Questo corso è già assegnato a questa persona nello stesso anno.';
    if (m.includes('corsi_titolo_unico')) return 'Esiste già un corso con questo titolo.';
    if (m.includes('reparti_nome_unico')) return 'Esiste già un reparto con questo nome.';
    if (m.includes('assegnazioni_corso_id_fkey')) return 'Il corso è assegnato a qualcuno: invece di eliminarlo, disattivalo.';
    if (m.includes('corsi_docente_solo_interni')) return 'Il docente si indica solo per i corsi interni.';
    if (m.includes('assegnazioni_conferma_con_data')) return 'Per confermare serve la data del corso.';
    if (m.includes('row-level security')) return 'Non hai i permessi per questa modifica.';
    if (m.includes('Invalid schema')) return 'Lo schema «formazione» non è ancora esposto in Supabase.';
    return m || 'errore sconosciuto';
}

function fallita(cosa, error) {
    console.error(`${cosa}:`, error);
    return new Error(`${cosa}. ${inItaliano(error?.message)}`);
}

function almenoUna(cosa, data) {
    if (!data || !data.length) throw new Error(`${cosa}: nessuna riga modificata. Ricarica la pagina e riprova.`);
    return data;
}

async function leggi(cosa, query) {
    const { data, error } = await query;
    if (error) throw fallita(`Caricamento ${cosa} fallito`, error);
    return data || [];
}

export const caricaCorsi = () => leggi('del catalogo', db().from('corsi').select('*').order('titolo'));
export const caricaAssegnazioni = () => leggi('delle assegnazioni', db().from('v_assegnazioni').select('*').order('id'));
export const caricaNorma = () => leggi('dei corsi di norma', db().from('v_norma').select('*'));
export const caricaPiani = () => leggi('dei piani', db().from('v_piano').select('*'));
export const caricaReparti = () => leggi('dei reparti', db().from('reparti').select('*').order('ordine').order('nome'));
export const caricaPersone = () => leggi('delle persone', db().rpc('persone'));

export async function caricaStatistiche() {
    const [mesi, reparti, costi] = await Promise.all([
        leggi('delle statistiche', db().from('v_ore_mese').select('*')),
        leggi('delle statistiche per reparto', db().from('v_stat_reparto').select('*')),
        leggi('dei costi', db().from('v_costi_anno').select('*'))
    ]);
    return { mesi, reparti, costi };
}

export async function salvaCorso(id, campi) {
    const query = id
        ? db().from('corsi').update(campi).eq('id', id).select('id')
        : db().from('corsi').insert(campi).select('id');
    const { data, error } = await query;
    if (error) throw fallita('Salvataggio del corso fallito', error);
    return almenoUna('Salvataggio del corso', data)[0].id;
}

export async function eliminaCorso(id) {
    const { data, error } = await db().from('corsi').delete().eq('id', id).select('id');
    if (error) throw fallita('Eliminazione del corso fallita', error);
    almenoUna('Eliminazione del corso', data);
}

export async function assegna(righe) {
    const { data, error } = await db().from('assegnazioni').insert(righe).select('id');
    if (error) throw fallita('Assegnazione fallita', error);
    return almenoUna('Assegnazione', data).length;
}

export async function aggiornaAssegnazione(id, campi) {
    const { data, error } = await db().from('assegnazioni').update(campi).eq('id', id).select('id');
    if (error) throw fallita('Salvataggio fallito', error);
    almenoUna('Salvataggio', data);
}

export async function eliminaAssegnazione(id) {
    const { data, error } = await db().from('assegnazioni').delete().eq('id', id).select('id');
    if (error) throw fallita('Eliminazione fallita', error);
    almenoUna('Eliminazione (un corso già confermato non si elimina: si annulla)', data);
}

export async function dichiara(id, { ore, data, attestato, nota }) {
    const { error } = await db().rpc('dichiara', {
        p_id: id, p_ore: ore, p_completato_il: data, p_attestato_url: attestato, p_nota: nota
    });
    if (error) throw fallita('Dichiarazione non salvata', error);
}

export async function ritiraDichiarazione(id) {
    const { error } = await db().rpc('ritira_dichiarazione', { p_id: id });
    if (error) throw fallita('Ritiro non riuscito', error);
}

export async function salvaPiano(userId, anno, campi) {
    const { data, error } = await db().from('piani')
        .upsert({ user_id: userId, anno, ...campi }, { onConflict: 'user_id,anno' }).select('user_id');
    if (error) throw fallita('Salvataggio del piano fallito', error);
    almenoUna('Salvataggio del piano', data);
}

export async function salvaReparto(id, nome) {
    const query = id
        ? db().from('reparti').update({ nome }).eq('id', id).select('id')
        : db().from('reparti').insert({ nome }).select('id');
    const { data, error } = await query;
    if (error) throw fallita('Salvataggio del reparto fallito', error);
    almenoUna('Salvataggio del reparto', data);
}

export async function eliminaReparto(id) {
    const { data, error } = await db().from('reparti').delete().eq('id', id).select('id');
    if (error) throw fallita('Eliminazione del reparto fallita', error);
    almenoUna('Eliminazione del reparto', data);
}

export async function impostaReparto(userId, repartoId) {
    const query = repartoId
        ? db().from('reparto_persona').upsert({ user_id: userId, reparto_id: repartoId }).select('user_id')
        : db().from('reparto_persona').delete().eq('user_id', userId).select('user_id');
    const { error } = await query;
    if (error) throw fallita('Cambio di reparto fallito', error);
}
