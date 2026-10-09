
import { requireSession, currentUser, initTheme, toggleTheme, signOut } from '../core/auth.js';
import { requireModule, isAdmin } from '../core/permissions.js';
import { escapeHtml, mountActions } from '../core/ui.js';
import { MODULO, dataIt } from './config.js';
import { stato, contesto, albero, ricarica, quandoCambia, mostraAvviso } from './stato.js';
import { filtra, contaBlocchi, disegnaDocumento } from './documento.js';
import { montaSommario, disegnaSommario, apriChiudiRamo } from './sommario.js';
import { montaEditor, esegui, applicaLink, annullaLink } from './editor.js';
import * as blocco from './blocco.js';
import * as struttura from './struttura.js';
import { esportaPdf } from './stampa.js';
import { esportaWord } from './word.js';
import { montaSceltaStato, apriScelta, sceltaVoce, chiudiScelte } from './scelta.js';

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

function riempiFiltroCapitoli() {
    const scelto = el('filtroCapitolo').value;
    el('filtroCapitolo').innerHTML = '<option value="">Tutti i capitoli</option>'
        + stato.capitoli.map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.numero)}. ${escapeHtml(c.titolo)}</option>`).join('');
    const esiste = stato.capitoli.some(c => c.id === scelto);
    el('filtroCapitolo').value = esiste ? scelto : '';
    stato.criteri.capitolo = el('filtroCapitolo').value;
}

function ridisegna() {
    riempiFiltroCapitoli();
    const ctx = contesto();
    const tutto = albero();
    const visibile = filtra(tutto, stato.criteri);

    disegnaDocumento(el('documento'), visibile, ctx);
    disegnaSommario(visibile);

    el('statBlocchi').textContent = contaBlocchi(visibile);
    const daRivedere = stato.blocchi.filter(b => b.stato === 'da_rivedere').length;
    el('statRivedere').textContent = daRivedere;
    el('statRivedere').classList.toggle('allarme', daRivedere > 0);

    const vuoto = !visibile.length;
    el('vuoto').hidden = !vuoto;
    el('documento').hidden = vuoto;
    if (vuoto) {
        el('vuoto').textContent = stato.capitoli.length
            ? 'Nessun blocco corrisponde ai filtri.'
            : 'Il playbook è vuoto: il primo capitolo si crea da «Struttura».';
    }
}

function leggiFiltri() {
    stato.criteri.ricerca = el('ricerca').value.trim();
    stato.criteri.capitolo = el('filtroCapitolo').value;
    stato.criteri.stato = el('filtroStato').value;
    ridisegna();
}

function azzeraFiltri() {
    el('ricerca').value = '';
    el('filtroCapitolo').value = '';
    el('filtroStato').value = '';
    Object.assign(stato.criteri, { ricerca: '', capitolo: '', stato: '' });
    ridisegna();
}

function chiudiMenu() {
    for (const m of document.querySelectorAll('.menu-esporta')) m.hidden = true;
}

function apriMenu(elemento) {
    const menu = el(elemento.dataset.menu);
    const eraAperto = !menu.hidden;
    chiudiMenu();
    menu.hidden = eraAperto;
}

async function avvia() {
    initTheme();
    await requireSession();
    stato.ruolo = await requireModule(MODULO);

    disegnaIntestazione();
    aggiornaVoceTema();
    el('stampaData').textContent = dataIt(new Date().toISOString());

    const puoScrivere = isAdmin(stato.ruolo);
    el('btnNuovo').hidden = !puoScrivere;
    el('btnStruttura').hidden = !puoScrivere;

    montaSommario(el('sommario'), el('documento'));
    montaEditor();
    montaSceltaStato(el('filtroStato'));
    montaSceltaStato(el('bloccoStato'));
    struttura.montaStruttura();
    quandoCambia(ridisegna);

    try {
        await ricarica();
    } catch (e) {
        mostraAvviso(e.message);
        return;
    }

    el('ricerca').addEventListener('input', leggiFiltri);
    el('filtroCapitolo').addEventListener('change', leggiFiltri);
    el('filtroStato').addEventListener('change', leggiFiltri);
    el('bloccoTipo').addEventListener('change', blocco.cambiaTipo);

    mountActions(document.body, {
        profilo: () => el('menuProfilo').hidden = !el('menuProfilo').hidden,
        tema: () => { toggleTheme(); aggiornaVoceTema(); },
        logout: () => signOut(),

        'azzera-filtri': azzeraFiltri,

        'menu-esporta': apriMenu,
        'esporta-pdf': elemento => { chiudiMenu(); esportaPdf(elemento); },
        'esporta-word': elemento => { chiudiMenu(); esportaWord(elemento); },

        'nuovo-blocco': blocco.apriNuovo,
        'modifica-blocco': blocco.apriModifica,
        'elimina-blocco': blocco.eliminaBlocco,
        'sposta-blocco': blocco.spostaBlocco,
        'chiudi-blocco': blocco.chiudiBlocco,
        'salva-blocco': blocco.salvaDalPannello,
        'ripristina-versione': blocco.ripristinaVersione,
        'tabella-riga': blocco.aggiungiRiga,
        'tabella-colonna': blocco.aggiungiColonna,
        'tabella-togli-colonna': blocco.togliColonna,
        'tabella-togli-riga': blocco.togliRiga,

        'sommario-ramo': apriChiudiRamo,

        'scelta-apri': apriScelta,
        'scelta-voce': sceltaVoce,

        'editor-cmd': esegui,
        'editor-link-applica': applicaLink,
        'editor-link-annulla': annullaLink,

        struttura: struttura.apriStruttura,
        'chiudi-struttura': struttura.chiudiStruttura,
        'struttura-nuovo-capitolo': struttura.nuovoCapitolo,
        'struttura-nuova-sezione': struttura.nuovaSezione,
        'struttura-ramo': struttura.apriChiudi,
        'struttura-sposta': struttura.sposta,
        'struttura-elimina': struttura.elimina
    });
}

document.addEventListener('click', ev => {
    if (!ev.target.closest('.user-profile-wrapper')) {
        const menu = el('menuProfilo');
        if (menu) menu.hidden = true;
    }
    if (!ev.target.closest('.menu-esporta-wrap')) chiudiMenu();
    if (!ev.target.closest('.scelta-stato')) chiudiScelte();
});

avvia();
