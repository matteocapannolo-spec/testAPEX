
import { supabase } from '../core/supabase.js';

const db = () => supabase.schema('formazione');

export function inItaliano(messaggio) {
    const m = String(messaggio || '');
    if (m.includes('assegnazioni_una_per_piano')) return 'Questo corso è già assegnato a questa persona nello stesso anno.';
    if (m.includes('corsi_titolo_unico')) return 'Esiste già un corso con questo titolo.';
    if (m.includes('reparti_nome_unico')) return 'Esiste già un reparto con questo nome.';
    if (m.includes('assegnazioni_corso_id_fkey')) return 'Il corso è assegnato a qualcuno: invece di eliminarlo, disattivalo.';
    if (m.includes('anagrafica_cf_unico')) return 'Esiste già una persona con questo codice fiscale.';
    if (m.includes('anagrafica_codice_fiscale_check')) return 'Il codice fiscale deve avere 16 lettere e cifre.';
    if (m.includes('anagrafica_user_id_key')) return "Questo account è già collegato a un'altra persona.";
    if (m.includes('anagrafica_email_unica')) return "Questo indirizzo è già di un'altra persona dello scadenzario.";
    if (m.includes('anagrafica_email_check')) return "L'indirizzo email non è scritto bene.";
    if (m.includes('obblighi_nome_unico')) return 'Esiste già un obbligo con questo nome.';
    if (m.includes('corsi_docente_solo_interni')) return 'Il docente si indica solo per i corsi interni.';
    if (m.includes('assegnazioni_conferma_con_data')) return 'Per confermare serve la data del corso.';
    if (m.includes('row-level security')) return 'Non hai i permessi per questa modifica.';
    if (m.includes('Invalid schema')) return "Il modulo non è raggiungibile. Avvisa l'amministratore.";
    return m || 'errore sconosciuto';
}

function fallita(cosa, error) {
    console.error(`${cosa}:`, error);
    return new Error(`${cosa}. ${inItaliano(error?.message)}`);
}

function almenoUna(cosa, data) {
    if (!data || !data.length) throw new Error(`${cosa}: non è stata salvata nessuna informazione. Ricarica la pagina e riprova.`);
    return data;
}


async function leggi(cosa, query) {
    const { data, error } = await query;
    if (error) throw fallita(`Caricamento ${cosa} fallito`, error);
    return data || [];
}

export const caricaCorsi = () => leggi('del catalogo', db().from('corsi').select('*').order('titolo'));
export const caricaAssegnazioni = () => leggi('delle assegnazioni', db().from('v_assegnazioni').select('*').order('id'));
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

export async function caricaAree() {
    const [f, s] = await Promise.all([
        db().rpc('gestisce', { p_area: 'formazione' }),
        db().rpc('gestisce', { p_area: 'sicurezza' })
    ]);
    if (f.error || s.error) throw fallita('Lettura dei permessi fallita', f.error || s.error);
    return { formazione: f.data === true, sicurezza: s.data === true };
}


export const caricaScadenzario = () => leggi('dello scadenzario', db().from('v_scadenzario').select('*'));
export const caricaObblighi = () => leggi('degli obblighi', db().from('obblighi').select('*').order('ordine').order('nome'));
export const caricaAnagrafica = () => leggi('delle persone', db().from('anagrafica').select('*').order('cognome').order('nome'));
export const caricaCostiSicurezza = () => leggi('dei costi', db().from('v_costi_sicurezza').select('*'));
export const caricaAccount = () => leggi('degli account', db().rpc('account'));

export const caricaRegistrazioni = (personaId, obbligoId) => leggi('dello storico',
    db().from('registrazioni').select('*').eq('persona_id', personaId).eq('obbligo_id', obbligoId).order('fatto_il', { ascending: false }));

export async function salvaScadenza(personaId, obbligoId, campi) {
    const { data, error } = await db().from('scadenze')
        .upsert({ persona_id: personaId, obbligo_id: obbligoId, ...campi }, { onConflict: 'persona_id,obbligo_id' })
        .select('persona_id');
    if (error) throw fallita('Salvataggio della casella fallito', error);
    almenoUna('Salvataggio della casella', data);
}

export async function registraFatto(riga) {
    const { data, error } = await db().from('registrazioni').insert(riga).select('id');
    if (error) throw fallita('Registrazione fallita', error);
    almenoUna('Registrazione', data);
}

export async function aggiornaRegistrazione(id, campi) {
    const { data, error } = await db().from('registrazioni').update(campi).eq('id', id).select('id');
    if (error) throw fallita('Correzione fallita', error);
    almenoUna('Correzione', data);
}

export async function eliminaRegistrazione(id) {
    const { data, error } = await db().from('registrazioni').delete().eq('id', id).select('id');
    if (error) throw fallita('Eliminazione fallita', error);
    almenoUna('Eliminazione', data);
}

export async function salvaPersonaSic(id, campi) {
    const query = id
        ? db().from('anagrafica').update(campi).eq('id', id).select('id')
        : db().from('anagrafica').insert(campi).select('id');
    const { data, error } = await query;
    if (error) throw fallita('Salvataggio della persona fallito', error);
    return almenoUna('Salvataggio della persona', data)[0].id;
}

export const caricaAziende = () => leggi('delle aziende', db().rpc('aziende'));

export async function impostaAzienda(personaId, azienda, emailContatto) {
    const { error } = await db().rpc('imposta_azienda', {
        p_persona_id: personaId, p_azienda: azienda, p_email_contatto: emailContatto
    });
    if (error) throw fallita("Salvataggio dell'azienda fallito", error);
}

export async function salvaObbligo(id, campi) {
    const query = id
        ? db().from('obblighi').update(campi).eq('id', id).select('id')
        : db().from('obblighi').insert(campi).select('id');
    const { data, error } = await query;
    if (error) throw fallita("Salvataggio dell'obbligo fallito", error);
    almenoUna("Salvataggio dell'obbligo", data);
}


export async function collegaAccount() {
    const { data, error } = await db().rpc('collega_account');
    if (error) throw fallita('Collegamento agli account fallito', error);
    return data || 0;
}

