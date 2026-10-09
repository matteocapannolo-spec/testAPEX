
import { requireSession, currentUser, initTheme, toggleTheme, signOut } from '../core/auth.js';
import { requireModule } from '../core/permissions.js';
import { escapeHtml, mountActions } from '../core/ui.js';
import { MODULO } from './config.js';
import { stato, admin, ricarica, quandoCambia, mostraAvviso, anniDisponibili } from './stato.js';
import { el, opzioni } from './vista.js';
import { montaPannelli } from './dialoghi.js';
import * as mia from './mia.js';
import * as conf from './conferme.js';
import * as ass from './assegnazioni.js';
import * as norma from './norma.js';
import * as per from './persone.js';
import * as cat from './catalogo.js';
import * as stat from './statistiche.js';

const SCHEDE = {
    mia: mia.disegnaMia,
    conferme: conf.disegnaConferme,
    assegnazioni: ass.disegnaAssegnazioni,
    norma: norma.disegnaNorma,
    persone: per.disegnaPersone,
    catalogo: cat.disegnaCatalogo,
    statistiche: stat.disegnaStatistiche
};

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

function riempiFiltri() {
    opzioni(el('miaAnno'), anniDisponibili().map(a => [a, a]));
    el('miaAnno').value = stato.anno;
    if (!admin()) return;
    ass.riempiFiltriAssegnazioni();
    norma.riempiFiltriNorma();
    per.riempiFiltriPersone();
    cat.riempiFiltriCatalogo();
    stat.riempiFiltriStatistiche();
}

function ridisegna() {
    riempiFiltri();
    if (admin()) {
        const n = conf.daConfermare().length;
        el('contaConferme').textContent = n;
        el('contaConferme').hidden = n === 0;
        per.disegnaElencoReparti();
    }
    document.querySelectorAll('[data-pannello]').forEach(p => { p.hidden = p.dataset.pannello !== stato.scheda; });
    document.querySelectorAll('[data-scheda]').forEach(b => {
        const attiva = b.dataset.scheda === stato.scheda;
        b.classList.toggle('btn-primario', attiva);
        b.classList.toggle('btn-theme', !attiva);
        b.setAttribute('aria-selected', attiva ? 'true' : 'false');
    });
    SCHEDE[stato.scheda]();
}

function apriScheda(bottone) {
    if (!SCHEDE[bottone.dataset.scheda]) return;
    stato.scheda = bottone.dataset.scheda;
    try { sessionStorage.setItem('formazione-scheda', stato.scheda); } catch (e) { }
    ridisegna();
}

const AL_CAMBIO = {
    miaAnno: c => { stato.anno = Number(c.value); mia.disegnaMia(); },
    assAnno: ass.disegnaAssegnazioni, assPersona: ass.disegnaAssegnazioni,
    assCorso: ass.disegnaAssegnazioni, assStato: ass.disegnaAssegnazioni,
    normaCorso: norma.disegnaNorma, normaStato: norma.disegnaNorma,
    perAnno: per.disegnaPersone, perReparto: per.disegnaPersone,
    catTipo: cat.disegnaCatalogo, catNorma: cat.disegnaCatalogo, catAttivi: cat.disegnaCatalogo,
    statAnno: stat.disegnaStatistiche,
    nuovaCorso: ass.aggiornaCostoSuggerito,
    'corso-tipo': cat.aggiornaCampiCorso
};

function alCambio(ev) {
    const c = ev.target;
    if (c.dataset && c.dataset.reparto) return per.rinominaReparto(c);
    const fn = AL_CAMBIO[c.id];
    if (fn) fn(c);
}

async function avvia() {
    montaPannelli();
    initTheme();
    await requireSession();
    stato.ruolo = await requireModule(MODULO);
    stato.utenteId = currentUser() ? currentUser().id : null;

    disegnaIntestazione();
    aggiornaVoceTema();

    el('schede').hidden = !admin();
    if (admin()) {
        try { stato.scheda = sessionStorage.getItem('formazione-scheda') || 'mia'; } catch (e) { }
        if (!SCHEDE[stato.scheda]) stato.scheda = 'mia';
    }

    mountActions(document.body, {
        profilo: () => { el('menuProfilo').hidden = !el('menuProfilo').hidden; },
        tema: () => { toggleTheme(); aggiornaVoceTema(); },
        logout: () => signOut(),
        scheda: apriScheda,

        dichiara: mia.apriDichiarazione, 'chiudi-dichiara': mia.chiudiDichiarazione,
        'salva-dichiara': mia.salvaDichiarazione, ritira: mia.ritira,

        conferma: conf.apriConferma, 'chiudi-conferma': conf.chiudiConferma,
        'salva-conferma': conf.salvaConferma, respingi: conf.respingi,

        'assegna': () => ass.apriAssegna(), 'chiudi-assegna': ass.chiudiAssegna,
        'salva-assegna': ass.salvaAssegna, 'seleziona-persone': ass.selezionaTutte,
        'modifica-assegnazione': ass.apriModificaAssegnazione, 'chiudi-modifica': ass.chiudiModifica,
        'salva-modifica': ass.salvaModifica, 'togli-conferma': ass.togliConferma,
        'elimina-assegnazione': ass.eliminaAssegnazione, 'azzera-assegnazioni': ass.azzeraFiltriAssegnazioni,

        rinnova: norma.rinnova, 'azzera-norma': norma.azzeraFiltriNorma,

        piano: per.apriPiano, 'chiudi-piano': per.chiudiPiano, 'salva-piano': per.salvaPiano,
        reparti: per.apriReparti, 'chiudi-reparti': per.chiudiReparti,
        'aggiungi-reparto': per.aggiungiReparto, 'elimina-reparto': per.eliminaReparto,

        'nuovo-corso': () => cat.apriCorso(null), 'modifica-corso': cat.apriCorso,
        'chiudi-corso': cat.chiudiCorso, 'salva-corso': cat.salvaCorso, 'elimina-corso': cat.eliminaCorso,
        'assegna-corso': b => ass.apriAssegna({ corsoId: Number(b.dataset.id) }),
        'azzera-catalogo': cat.azzeraFiltriCatalogo
    });
    document.body.addEventListener('change', alCambio);

    quandoCambia(ridisegna);

    try {
        await ricarica();
    } catch (e) {
        document.querySelectorAll('[data-pannello]').forEach(p => { p.hidden = true; });
        mostraAvviso(e.message);
    }
}

avvia();
