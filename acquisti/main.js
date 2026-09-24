
import { requireSession, currentUser, initTheme, toggleTheme, signOut } from '../core/auth.js';
import { requireModule, isAdmin } from '../core/permissions.js';
import { escapeHtml, mountActions } from '../core/ui.js';
import { avviaSuoni } from '../core/suoni.js';
import { MODULO } from './config.js';
import { filtra, ordina, disegna, riempiFiltroCategorie } from './tabella.js';
import { stato, contesto, ricarica, quandoCambia, mostraAvviso } from './stato.js';
import { apriNuovo, apriModifica, chiudiProdotto, salvaDalPannello, eliminaProdotto } from './prodotto.js';
import { apriCategorie, chiudiCategorie, aggiungi, elimina } from './categorie.js';

const el = id => document.getElementById(id);

function iniziali(nome) {
    return String(nome || '').split(' ').map(p => p.charAt(0)).join('').slice(0, 2).toUpperCase();
}

function aggiornaVoceTema() {
    const scuro = document.body.classList.contains('dark-mode');
    el('iconaTema').textContent = scuro ? 'light_mode' : 'dark_mode';
    el('testoTema').textContent = scuro ? 'Modalità Chiara' : 'Modalità Scura';
}

function disegnaIntestazione() {
    const utente = currentUser();
    if (!utente) return;

    const sigla = iniziali(utente.nome);
    el('utenteIniziali').textContent = sigla;
    el('utenteInizialiGrandi').textContent = sigla;
    if (utente.avatarUrl) {
        const img = `<img src="${escapeHtml(utente.avatarUrl)}" alt="" referrerpolicy="no-referrer">`;
        el('utenteAvatar').innerHTML = img;
        el('utenteAvatarGrande').innerHTML = img;
    }
    el('utenteNome').textContent = utente.nome;
    el('utenteEmail').textContent = utente.email;
}

function ridisegna() {
    stato.criteri.categoria = riempiFiltroCategorie(el('filtroCategoria'), stato.categorie);

    const ctx = contesto();
    const visibili = ordina(filtra(stato.prodotti, stato.criteri, ctx));

    disegna({ thead: el('intestazione'), tbody: el('corpo'), righe: visibili, ctx });
    el('statTotale').textContent = visibili.length;

    const vuota = !visibili.length;
    el('vuoto').hidden = !vuota;
    if (vuota) {
        el('vuoto').textContent = stato.prodotti.length
            ? 'Nessun prodotto corrisponde ai filtri.'
            : 'La directory è vuota: il primo prodotto si aggiunge da «Nuovo Prodotto».';
    }
}

function leggiFiltri() {
    stato.criteri.ricerca = el('ricerca').value.trim();
    stato.criteri.categoria = el('filtroCategoria').value;
    ridisegna();
}

function azzeraFiltri() {
    el('ricerca').value = '';
    el('filtroCategoria').value = '';
    Object.assign(stato.criteri, { ricerca: '', categoria: '' });
    ridisegna();
}

async function avvia() {
    initTheme();
    await requireSession();
    stato.ruolo = await requireModule(MODULO);

    disegnaIntestazione();
    aggiornaVoceTema();

    const puoScrivere = isAdmin(stato.ruolo);
    el('btnNuovo').hidden = !puoScrivere;
    el('btnCategorie').hidden = !puoScrivere;

    quandoCambia(ridisegna);

    try {
        await ricarica();
    } catch (e) {
        mostraAvviso(e.message);
        return;
    }

    el('ricerca').addEventListener('input', leggiFiltri);
    el('filtroCategoria').addEventListener('change', leggiFiltri);

    mountActions(document.body, {
        profilo: () => el('menuProfilo').hidden = !el('menuProfilo').hidden,
        tema: () => { toggleTheme(); aggiornaVoceTema(); },
        logout: () => signOut(),

        'azzera-filtri': azzeraFiltri,

        'nuovo-prodotto': apriNuovo,
        'modifica-prodotto': apriModifica,
        'elimina-prodotto': eliminaProdotto,
        'chiudi-prodotto': chiudiProdotto,
        'salva-prodotto': salvaDalPannello,

        categorie: apriCategorie,
        'chiudi-categorie': chiudiCategorie,
        'aggiungi-categoria': aggiungi,
        'elimina-categoria': elimina
    });
}

avviaSuoni();
avvia();
