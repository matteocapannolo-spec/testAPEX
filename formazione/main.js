
import { requireSession, currentUser, initTheme, toggleTheme, signOut } from '../core/auth.js';
import { supabase } from '../core/supabase.js';
import { montaNotifiche } from '../core/notifiche.js';
import { requireModule } from '../core/permissions.js';
import { escapeHtml, mountActions } from '../core/ui.js';
import { MODULO } from './config.js';
import { caricaAree, collegaAccount } from './api.js';
import { stato, admin, ricarica, quandoCambia, mostraAvviso, anniDisponibili } from './stato.js';
import { el, opzioni } from './vista.js';
import { montaPannelli } from './dialoghi.js';
import { montaPannelliFormazione } from './pannelli.js';
import { montaPannelliSicurezza } from './pannelli-sicurezza.js';
import * as mia from './mia.js';
import * as conf from './conferme.js';
import * as ass from './assegnazioni.js';
import * as per from './persone.js';
import * as cat from './catalogo.js';
import * as stat from './statistiche.js';
import * as sic from './sicurezza.js';
import * as cas from './casella.js';
import * as anag from './anagrafica.js';
import * as storico from './storico.js';

const SCHEDE = {
    mia: mia.disegnaMia,
    formazione: per.disegnaPersone,
    sicurezza: sic.disegnaSicurezza
};

const PANNELLI = {
    pannelloConferme: conf.disegnaConferme,
    pannelloAssegnazioni: ass.disegnaAssegnazioni,
    pannelloCatalogo: cat.disegnaCatalogo,
    pannelloStatistiche: stat.disegnaStatistiche,
    pannelloAnagrafica: anag.disegnaAnagrafica,
    pannelloObblighi: anag.disegnaObblighi
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



function schedaPermessa(nome) {
    return nome === 'mia' || Boolean(stato.aree[nome]);
}

function riempiFiltri() {
    opzioni(el('miaAnno'), anniDisponibili().map(a => [a, a]));
    el('miaAnno').value = stato.anno;
    if (stato.aree.formazione) {
        ass.riempiFiltriAssegnazioni();
        per.riempiFiltriPersone();
        cat.riempiFiltriCatalogo();
        stat.riempiFiltriStatistiche();
    }
    if (stato.aree.sicurezza) sic.riempiFiltriSicurezza();
}

function ridisegna() {
    riempiFiltri();
    if (stato.aree.formazione) {
        const n = conf.daConfermare().length;
        el('contaConferme').textContent = n;
        el('contaConferme').hidden = n === 0;
        per.disegnaElencoReparti();
    }
    document.querySelectorAll('section[data-pannello]').forEach(p => { p.hidden = p.dataset.pannello !== stato.scheda; });
    document.querySelectorAll('[data-scheda]').forEach(b => {
        const attiva = b.dataset.scheda === stato.scheda;
        b.hidden = !schedaPermessa(b.dataset.scheda);
        b.classList.toggle('btn-primario', attiva);
        b.classList.toggle('btn-theme', !attiva);
        b.setAttribute('aria-selected', attiva ? 'true' : 'false');
    });
    SCHEDE[stato.scheda]();
    for (const [id, disegna] of Object.entries(PANNELLI)) {
        if (el(id).open) disegna();
    }
}

function apriScheda(bottone) {
    if (!schedaPermessa(bottone.dataset.scheda)) return;
    stato.scheda = bottone.dataset.scheda;
    try { sessionStorage.setItem('formazione-scheda', stato.scheda); } catch (e) { }
    ridisegna();
}

function apriPannello(bottone) {
    const id = bottone.dataset.dialogo;
    if (!PANNELLI[id]) return;
    PANNELLI[id]();
    el(id).showModal();
}

function chiudiPannello(bottone) {
    el(bottone.dataset.dialogo).close();
}

function vediCorsi(bottone) {
    ass.azzeraFiltriAssegnazioni();
    el('assPersona').value = bottone.dataset.id;
    ass.disegnaAssegnazioni();
    el('pannelloAssegnazioni').showModal();
}

const AL_CAMBIO = {
    miaAnno: c => { stato.anno = Number(c.value); mia.disegnaMia(); },
    assAnno: ass.disegnaAssegnazioni, assPersona: ass.disegnaAssegnazioni,
    assCorso: ass.disegnaAssegnazioni, assStato: ass.disegnaAssegnazioni,
    perAnno: per.disegnaPersone, perReparto: per.disegnaPersone,
    catTipo: cat.disegnaCatalogo, catAttivi: cat.disegnaCatalogo,
    statAnno: stat.disegnaStatistiche,
    nuovaCorso: ass.aggiornaCostoSuggerito,
    'corso-tipo': cat.aggiornaCampiCorso,
    sicMansione: sic.disegnaSicurezza, sicStato: sic.disegnaSicurezza,
    anagMostra: anag.disegnaAnagrafica,
    casGiornate: cas.cambiaGiornate,
    psAzienda: anag.aggiornaCampiPersona,
    psAccount: anag.cambiaAccount
};

function alCambio(ev) {
    const c = ev.target;
    if (c.dataset && c.dataset.reparto) return per.rinominaReparto(c);
    const fn = AL_CAMBIO[c.id];
    if (fn) fn(c);
}

const AZIONI = {
    scheda: apriScheda,
    'apri-pannello': apriPannello, 'chiudi-pannello': chiudiPannello, 'vedi-corsi': vediCorsi,

    dichiara: mia.apriDichiarazione, 'chiudi-dichiara': mia.chiudiDichiarazione,
    'salva-dichiara': mia.salvaDichiarazione, ritira: mia.ritira,

    conferma: conf.apriConferma, 'chiudi-conferma': conf.chiudiConferma,
    'salva-conferma': conf.salvaConferma, respingi: conf.respingi,

    assegna: () => ass.apriAssegna(), 'chiudi-assegna': ass.chiudiAssegna,
    'salva-assegna': ass.salvaAssegna, 'seleziona-persone': ass.selezionaTutte,
    'modifica-assegnazione': ass.apriModificaAssegnazione, 'chiudi-modifica': ass.chiudiModifica,
    'salva-modifica': ass.salvaModifica, 'togli-conferma': ass.togliConferma,
    'elimina-assegnazione': ass.eliminaAssegnazione, 'azzera-assegnazioni': ass.azzeraFiltriAssegnazioni,

    piano: per.apriPiano, 'chiudi-piano': per.chiudiPiano, 'salva-piano': per.salvaPiano,
    reparti: per.apriReparti, 'chiudi-reparti': per.chiudiReparti,
    'aggiungi-reparto': per.aggiungiReparto, 'elimina-reparto': per.eliminaReparto,

    'nuovo-corso': () => cat.apriCorso(null), 'modifica-corso': cat.apriCorso,
    'chiudi-corso': cat.chiudiCorso, 'salva-corso': cat.salvaCorso, 'elimina-corso': cat.eliminaCorso,
    'assegna-corso': b => ass.apriAssegna({ corsoId: Number(b.dataset.id) }),
    'azzera-catalogo': cat.azzeraFiltriCatalogo,

    casella: cas.apriCasella, 'registra-fatto': cas.registraFatto, 'salva-casella': cas.salvaCasella,
    'azzera-sicurezza': sic.azzeraFiltriSicurezza,
    'nuova-persona-sic': () => anag.apriPersonaSic(null), 'modifica-persona-sic': anag.apriPersonaSic,
    'salva-persona-sic': anag.salvaPersonaSic,
    'nuovo-obbligo': () => anag.apriObbligo(null), 'modifica-obbligo': anag.apriObbligo,
    copia: anag.copia, 'copia-persone': sic.copiaPersone,
    'modifica-registrazione': storico.modificaRegistrazione, 'elimina-registrazione': storico.eliminaRegistrazione,
    'annulla-modifica-registrazione': storico.chiudiModifica,
    'salva-obbligo': anag.salvaObbligo
};

async function collegaNuovi() {
    try {
        await collegaAccount();
    } catch (e) {
        mostraAvviso(e.message);
    }
}


async function avvia() {
    montaPannelli();
    montaPannelliFormazione();
    montaPannelliSicurezza();
    initTheme();
    await requireSession();
    stato.ruolo = await requireModule(MODULO);
    stato.utenteId = currentUser() ? currentUser().id : null;

    disegnaIntestazione();
    montaNotifiche(supabase);
    aggiornaVoceTema();

    mountActions(document.body, {
        profilo: () => { el('menuProfilo').hidden = !el('menuProfilo').hidden; },
        tema: () => { toggleTheme(); aggiornaVoceTema(); },
        logout: () => signOut(),
        ...AZIONI
    });
    document.body.addEventListener('change', alCambio);
    el('sicRicerca').addEventListener('input', sic.disegnaSicurezza);

    quandoCambia(ridisegna);

    try {
        stato.aree = await caricaAree();
        if (stato.aree.sicurezza) await collegaNuovi();
        el('schede').hidden = !admin();
        try { stato.scheda = sessionStorage.getItem('formazione-scheda') || 'mia'; } catch (e) { }
        if (!SCHEDE[stato.scheda] || !schedaPermessa(stato.scheda)) stato.scheda = 'mia';
        await ricarica();
    } catch (e) {
        document.querySelectorAll('section[data-pannello]').forEach(p => { p.hidden = true; });
        mostraAvviso(e.message);
    }
}

avvia();
