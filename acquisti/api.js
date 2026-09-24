
import { supabase } from '../core/supabase.js';
import { CAMPI_CONTATTO } from './config.js';

const db = () => supabase.schema('acquisti');

export function inItaliano(messaggio) {
    const m = String(messaggio || '');
    if (m.includes('categorie_nome_unico')) {
        return 'Esiste già una categoria con questo nome.';
    }
    if (m.includes('prodotti_categorie_categoria_in_uso')) {
        return m.includes('delete')
            ? 'Questa categoria è usata da almeno un prodotto: va tolta da quei prodotti prima di eliminarla.'
            : "Una delle categorie scelte non esiste più: qualcuno l'ha appena eliminata. Chiudi il pannello e riaprilo.";
    }
    if (m.includes('prodotti_url_check')) {
        return 'Il link deve cominciare per https:// (oppure http://).';
    }
    if (m.includes('_email_valida')) {
        return "L'email di un contatto non sembra valida: controlla la chiocciola e il dominio.";
    }
    if (m.includes('nome_pieno')) {
        return 'Il nome non può essere vuoto.';
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

export async function caricaProdotti() {
    const { data, error } = await db()
        .from('prodotti')
        .select(`id, nome, url, note, azienda,
            ${CAMPI_CONTATTO.join(', ')},
            created_at, updated_at, updated_by,
            prodotti_categorie (categoria_id)`)
        .order('nome');

    if (error) throw fallita('Caricamento dei prodotti fallito', error);
    return (data || []).map(({ prodotti_categorie: legami, ...p }) => ({
        ...p,
        categorie: (legami || []).map(l => l.categoria_id)
    }));
}

export async function caricaCategorie() {
    const { data, error } = await db()
        .from('categorie')
        .select('id, nome, ordine')
        .order('ordine')
        .order('nome');

    if (error) throw fallita('Caricamento delle categorie fallito', error);
    return data || [];
}

export async function caricaPersone() {
    const { data, error } = await db().rpc('persone');
    if (error) throw fallita('Caricamento dei nomi fallito', error);
    return data || [];
}

export async function salvaProdotto({ id, categorie, ...campi }) {
    const { data, error } = await db().rpc('salva_prodotto', {
        p_id: id || null,
        p_campi: campi,
        p_categorie: categorie
    });
    if (error) throw fallita('Salvataggio fallito', error);
    return data;
}

export async function eliminaProdotto(id) {
    const { data, error } = await db().from('prodotti').delete().eq('id', id).select('id');
    if (error) throw fallita('Eliminazione fallita', error);
    if (!data || !data.length) {
        throw new Error('Eliminazione non avvenuta: il prodotto non esiste più, oppure non hai il permesso.');
    }
}

export async function creaCategoria(nome, ordine) {
    const { data, error } = await db().from('categorie').insert({ nome, ordine }).select('id');
    if (error) throw fallita('Creazione della categoria fallita', error);
    if (!data || !data.length) throw new Error('Creazione della categoria non avvenuta.');
}

export async function rinominaCategoria(id, nome) {
    const { data, error } = await db().from('categorie').update({ nome }).eq('id', id).select('id');
    if (error) throw fallita('Rinomina fallita', error);
    if (!data || !data.length) {
        throw new Error('Rinomina non avvenuta: la categoria non esiste più, oppure non hai il permesso.');
    }
}

export async function eliminaCategoria(id) {
    const { data, error } = await db().from('categorie').delete().eq('id', id).select('id');
    if (error) throw fallita('Eliminazione della categoria fallita', error);
    if (!data || !data.length) {
        throw new Error('Eliminazione non avvenuta: la categoria non esiste più, oppure non hai il permesso.');
    }
}
