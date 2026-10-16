import { supabase, URL_INGRESSO } from './supabase.js';

const PORTALE = new URL('../', import.meta.url).href;

let utenteCorrente = null;

function nomeDaEmail(email) {
    if (!email) return '';
    return email.split('@')[0].split('.')
        .map(p => p.charAt(0).toUpperCase() + p.slice(1))
        .join(' ');
}

function componiUtente(user) {
    if (!user) return null;
    const raw = user.user_metadata && user.user_metadata.avatar_url;
    const avatarUrl = (typeof raw === 'string' && /^https:\/\//i.test(raw)) ? raw : null;
    return { id: user.id, email: user.email, nome: nomeDaEmail(user.email), avatarUrl };
}

export async function getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
        console.error("Lettura della sessione fallita:", error);
        return null;
    }
    utenteCorrente = componiUtente(data.session ? data.session.user : null);
    return data.session || null;
}

export async function requireSession() {
    const sessione = await getSession();
    if (!sessione) {
        window.location.replace(PORTALE);
        await new Promise(() => { });
    }
    return sessione;
}

export function currentUser() {
    return utenteCorrente;
}

export function portalUrl() {
    return PORTALE;
}

export function loginRedirectUrl() {
    return window.location.origin + window.location.pathname;
}

export function authErrorFromUrl() {
    const query = new URLSearchParams(URL_INGRESSO.query);
    const frammento = new URLSearchParams(URL_INGRESSO.hash.replace(/^#/, ''));
    const codice = query.get('error_code') || frammento.get('error_code')
        || query.get('error') || frammento.get('error');
    if (!codice) return null;
    const descrizione = query.get('error_description') || frammento.get('error_description') || '';
    try {
        window.history.replaceState(null, '', loginRedirectUrl());
    } catch (e) {
    }
    return { codice, descrizione };
}

export function tornatoDaAccesso() {
    const frammento = new URLSearchParams(URL_INGRESSO.hash.replace(/^#/, ''));
    const query = new URLSearchParams(URL_INGRESSO.query);
    return Boolean(frammento.get('access_token') || query.get('code'));
}

export async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: loginRedirectUrl(),
            queryParams: { hd: 'tt-group.it', prompt: 'select_account' }
        }
    });
    if (error) throw error;
}

export async function signOut() {
    await supabase.auth.signOut();
    window.location.replace(PORTALE);
}

const CHIAVE_TEMA = 'apex-tema';

export function initTheme() {
    let tema = 'chiaro';
    try {
        tema = localStorage.getItem(CHIAVE_TEMA) || 'chiaro';
    } catch (e) {
    }
    document.body.classList.toggle('dark-mode', tema === 'scuro');
}

export function toggleTheme() {
    const scuro = document.body.classList.toggle('dark-mode');
    try {
        localStorage.setItem(CHIAVE_TEMA, scuro ? 'scuro' : 'chiaro');
    } catch (e) { }
    return scuro;
}
