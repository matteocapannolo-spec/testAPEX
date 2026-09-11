
import { requireSession, currentUser, initTheme, toggleTheme, signOut } from '../core/auth.js';
import { requireModule, isAdmin } from '../core/permissions.js';
import { escapeHtml, toast, mountActions } from '../core/ui.js';
import { caricaProgetti, caricaResponsabili, creaProgetto as creaProgettoApi } from './api.js';
import { BUSINESS_UNIT, FILTRO_ATTUALI, ORDINI_CODICE } from './config.js';
import { filtra, ordina, disegna, riempiFiltri, statisticheDi } from './tabella.js';
import { stato, contesto, ricarica, quandoCambia } from './stato.js';
import { apriScheda, chiudiScheda, gestoriScheda } from './scheda.js';
import { caricaRisorse, gestoriRisorse } from './risorse.js';
import { apriCampo, chiudiCampo, salvaCampo, scegliResponsabile } from './modifiche.js';

const el = id => document.getElementById(id);

function mostraAvviso(testo) {
    el('avviso').textContent = testo || '';
    el('avviso').hidden = !testo;
}

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
    const ctx = contesto();
    const visibili = ordina(filtra(stato.progetti, stato.criteri, ctx), ctx);

    disegna({
        thead: el('intestazione'),
        tbody: el('corpo'),
        righe: visibili,
        ctx,
        sezioni: stato.sezioni
    });

    aggiornaPastiglie(statisticheDi(visibili, ctx));
}

function aggiornaPastiglie(s) {
    el('statTotale').textContent = s.totale;
    el('statInCorso').textContent = s.inCorso;
    el('statInRitardo').textContent = s.inRitardo;

    el('statInRitardo').classList.toggle('allarme', s.inRitardo > 0);

    const percentuale = s.documentazione;
    el('statDocBar').style.width = (percentuale === null ? 0 : percentuale) + '%';
    el('statDocText').textContent = percentuale === null ? '—' : percentuale + '%';
}

function leggiFiltri() {
    stato.criteri.ricerca = el('ricerca').value.trim();
    stato.criteri.status = el('filtroStatus').value;
    stato.criteri.fase = el('filtroFase').value;
    stato.criteri.pm = el('filtroPm').value;
    ridisegna();
}

function mostraSceltaPm(valore) {
    let scelta = null;
    for (const v of el('elencoFiltroPm').querySelectorAll('.voce-responsabile')) {
        const suo = (v.dataset.valore || '') === (valore || '');
        v.classList.toggle('scelto', suo);
        if (suo) scelta = v;
    }
    if (scelta) el('btnFiltroPm').innerHTML = scelta.innerHTML;
}

function chiudiFiltroPm() {
    el('elencoFiltroPm').hidden = true;
    el('btnFiltroPm').setAttribute('aria-expanded', 'false');
}

function azzeraFiltri() {
    el('ricerca').value = '';
    el('filtroStatus').value = FILTRO_ATTUALI;
    for (const id of ['filtroFase', 'filtroPm']) el(id).value = '';
    mostraSceltaPm('');
    Object.assign(stato.criteri, { ricerca: '', status: FILTRO_ATTUALI, fase: '', pm: '' });
    ridisegna();
}

async function creaProgetto() {
    const codice = el('nuovoCodice').value.trim();
    const errore = el('nuovoErrore');

    if (!codice) {
        errore.textContent = 'Il codice è obbligatorio: è la chiave con cui il progetto si riconosce ovunque.';
        errore.hidden = false;
        return;
    }

    try {
        await creaProgettoApi(codice, el('nuovoBu').value);
        el('dialogoNuovo').close();
        el('nuovoCodice').value = '';
        errore.hidden = true;
        toast('Progetto creato');
        await ricarica();
    } catch (e) {
        errore.textContent = e.message;
        errore.hidden = false;
    }
}

async function avvia() {
    initTheme();
    await requireSession();
    stato.ruolo = await requireModule('progetti');

    disegnaIntestazione();
    aggiornaVoceTema();
    el('btnNuovo').hidden = !isAdmin(stato.ruolo);
    quandoCambia(ridisegna);

    try {
        const [progetti, responsabili] = await Promise.all([
            caricaProgetti(), caricaResponsabili(), caricaRisorse(isAdmin(stato.ruolo))
        ]);

        stato.progetti = progetti;
        stato.responsabili = responsabili;
        for (const r of responsabili) {
            stato.responsabiliPerId[r.user_id] = r;
            stato.nomiNoti[r.user_id] = r.nome;
        }

        riempiFiltri({
            selectStatus: el('filtroStatus'),
            selectFase: el('filtroFase'),
            elencoPm: el('elencoFiltroPm')
        }, responsabili);
        mostraSceltaPm('');

        el('nuovoBu').innerHTML = Object.entries(BUSINESS_UNIT)
            .map(([k, v]) => `<option value="${escapeHtml(k)}">${escapeHtml(v)}</option>`).join('');

        ridisegna();
    } catch (e) {
        mostraAvviso(e.message);
        return;
    }

    el('ricerca').addEventListener('input', leggiFiltri);
    for (const id of ['filtroStatus', 'filtroFase']) {
        el(id).addEventListener('change', leggiFiltri);
    }

    mountActions(document.body, {
        profilo: () => el('menuProfilo').hidden = !el('menuProfilo').hidden,
        tema: () => { toggleTheme(); aggiornaVoceTema(); },
        logout: () => signOut(),

        sezione: (elemento) => {
            const id = elemento.dataset.sezione;
            stato.sezioni[id].isExpanded = !stato.sezioni[id].isExpanded;
            ridisegna();
        },

        'azzera-filtri': azzeraFiltri,

        'apri-filtro-pm': () => {
            const elenco = el('elencoFiltroPm');
            const apre = elenco.hidden;
            elenco.hidden = !apre;
            el('btnFiltroPm').setAttribute('aria-expanded', String(apre));
        },
        'scegli-filtro-pm': (elemento) => {
            el('filtroPm').value = elemento.dataset.valore || '';
            mostraSceltaPm(el('filtroPm').value);
            chiudiFiltroPm();
            leggiFiltri();
        },

        'ordina-codice': () => {
            stato.ordineCodice = (stato.ordineCodice + 1) % ORDINI_CODICE.length;
            toast(ORDINI_CODICE[stato.ordineCodice].avviso);
            ridisegna();
        },

        scheda: (elemento) => apriScheda(elemento.closest('tr').dataset.index),
        'chiudi-scheda': chiudiScheda,

        modifica: apriCampo,
        'chiudi-campo': chiudiCampo,
        'salva-campo': salvaCampo,
        'scegli-responsabile': scegliResponsabile,

        'nuovo-progetto': () => el('dialogoNuovo').showModal(),
        'chiudi-nuovo': () => el('dialogoNuovo').close(),
        'crea-progetto': creaProgetto,

        ...gestoriScheda(),
        ...gestoriRisorse()
    });
}

avvia();
