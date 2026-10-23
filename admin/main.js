
import { supabase } from '../core/supabase.js';
import { requireSession, currentUser, initTheme, toggleTheme, signOut } from '../core/auth.js';
import { montaNotifiche } from '../core/notifiche.js';
import { requireModule, isSuperAdmin } from '../core/permissions.js';
import { escapeHtml, toast, mountActions, pillolaRuolo } from '../core/ui.js';
import { disegnaTabella } from '../core/table.js';
import { montaSpriteModuli } from '../core/icone-moduli.js';
import { componiRighe, riepilogaConteggi, iniziali } from './persone.js';
import { colonneDi } from './colonne.js';
import { separaAziende } from './azienda.js';
import { ORDINI, ordinaRighe, ordineDi, ordineSuccessivo } from './ordine.js';
import { apriPermesso, chiudiPermesso, salvaPermesso, revocaPermesso } from './permessi.js';
import { apriNuovePersone, chiudiNuovePersone, creaAccount, apriStato, chiudiStato, disattiva, riattiva, apriNome, chiudiNome, salvaNome } from './account.js';

const riepilogo = document.getElementById('riepilogo');
const avviso = document.getElementById('avviso');

function mostraAvviso(testo) {
    avviso.textContent = testo;
    avviso.hidden = !testo;
}


function aggiornaVoceTema() {
    const scuro = document.body.classList.contains('dark-mode');
    document.getElementById('iconaTema').textContent = scuro ? 'light_mode' : 'dark_mode';
    document.getElementById('testoTema').textContent = scuro ? 'Modalità Chiara' : 'Modalità Scura';
}

async function disegnaIntestazione() {
    const utente = currentUser();
    if (!utente) return;

    const sigla = iniziali(utente.nome);
    document.getElementById('utenteIniziali').textContent = sigla;
    document.getElementById('utenteInizialiGrandi').textContent = sigla;
    if (utente.avatarUrl) {
        const img = `<img src="${escapeHtml(utente.avatarUrl)}" alt="">`;
        document.getElementById('utenteAvatar').innerHTML = img;
        document.getElementById('utenteAvatarGrande').innerHTML = img;
    }
    document.getElementById('utenteNome').textContent = utente.nome;
    document.getElementById('utenteEmail').textContent = utente.email;

    if (await isSuperAdmin()) {
        const badge = document.getElementById('utenteBadge');
        badge.innerHTML = pillolaRuolo('SUPER_ADMIN', { implicito: true, motivo: 'Amministratore di ogni modulo della piattaforma' });
        badge.hidden = false;
        document.getElementById('btnNuovePersone').hidden = false;
    }
}


async function caricaTutto() {
    const [persone, moduli, abilitazioni] = await Promise.all([
        supabase.from('v_persone').select('*'),
        supabase.from('modules').select('key, label, attivo, ordine, ruoli, ambito, aperto_a_tutti, ruolo_default').order('ordine'),
        supabase.from('memberships').select('user_id, module, role, scope')
    ]);

    for (const [nome, esito] of [['persone', persone], ['moduli', moduli], ['abilitazioni', abilitazioni]]) {
        if (esito.error) throw new Error('Lettura di ' + nome + ' non riuscita: ' + esito.error.message);
    }

    return { persone: persone.data || [], moduli: moduli.data || [], abilitazioni: abilitazioni.data || [] };
}


let statoPagina = { righe: [], moduli: [], ordine: ORDINI[0].chiave };

function adattaAltezzaTabella() {
    const contenitore = document.querySelector('.tabella-contenitore');
    if (!contenitore) return;
    const corpo = document.querySelector('.admin-corpo');
    const sotto = corpo ? parseFloat(getComputedStyle(corpo).paddingBottom) || 0 : 0;
    const alto = window.innerHeight - contenitore.getBoundingClientRect().top - sotto;
    contenitore.style.maxHeight = Math.max(260, alto) + 'px';
}

let metro = null;

function larghezzaParolaPiuLunga(etichetta, corpo) {
    if (!metro) {
        metro = document.createElement('span');
        metro.className = 'metro-testata';
        metro.setAttribute('aria-hidden', 'true');
        document.body.appendChild(metro);
    }

    const stile = getComputedStyle(etichetta);
    metro.style.font = stile.font || `${stile.fontWeight} ${corpo}px ${stile.fontFamily}`;
    metro.style.fontSize = corpo + 'px';
    metro.style.letterSpacing = stile.letterSpacing;
    metro.style.textTransform = stile.textTransform;

    let massimo = 0;
    for (const parola of String(etichetta.textContent).split(/\s+/).filter(Boolean)) {
        metro.textContent = parola;
        massimo = Math.max(massimo, metro.getBoundingClientRect().width);
    }
    return massimo;
}

function adattaTestoIntestazioni() {
    const MASSIMO = 9.3, MINIMO = 6;
    for (const etichetta of document.querySelectorAll('#intestazione th.col-modulo .th-label')) {
        etichetta.style.fontSize = '';
        const disponibile = etichetta.clientWidth;
        const larga = larghezzaParolaPiuLunga(etichetta, MASSIMO);
        if (!disponibile || !larga || larga <= disponibile) continue;

        const voluta = Math.max(MINIMO, Math.floor(MASSIMO * (disponibile / larga) * 10) / 10);
        etichetta.style.fontSize = voluta + 'px';
    }

    pareggiaFasceDelNome();
}

function pareggiaFasceDelNome() {
    const tabella = document.querySelector('.tabella-persone');
    const etichette = [...document.querySelectorAll('#intestazione th.col-modulo .th-label')];
    if (!tabella || !etichette.length) return;

    tabella.style.removeProperty('--altezza-nome');
    const piuAlta = etichette.reduce((massimo, e) => Math.max(massimo, e.getBoundingClientRect().height), 0);
    if (piuAlta > 0) tabella.style.setProperty('--altezza-nome', Math.ceil(piuAlta) + 'px');
}

function adattaLarghezzaModuli() {
    const riga = document.querySelector('#corpo tr');
    const tabella = document.querySelector('.tabella-persone');
    if (!riga || !tabella) return;
    const alta = Math.round(riga.getBoundingClientRect().height);
    if (alta > 0) tabella.style.setProperty('--cella-modulo', alta + 'px');
}

function ridisegna() {
    const righe = ordinaRighe(statoPagina.righe, statoPagina.ordine);
    disegnaTabella({
        thead: document.getElementById('intestazione'),
        tbody: document.getElementById('corpo'),
        colonne: colonneDi(statoPagina.moduli, statoPagina.ordine),
        righe,
        indiceDi: riga => riga.id,
        riempimento: true
    });
    separaAziende(document.getElementById('corpo'), righe);
    adattaLarghezzaModuli();
    adattaTestoIntestazioni();
    adattaAltezzaTabella();
}

async function ricarica() {
    let dati;
    try {
        dati = await caricaTutto();
    } catch (e) {
        console.error(e);
        riepilogo.textContent = '';
        mostraAvviso(e.message + ' — ricarica la pagina; se persiste, potrebbero mancare le migrazioni 028 e 029.');
        return;
    }

    mostraAvviso('');
    const righe = componiRighe(dati);
    statoPagina = { ...statoPagina, righe, moduli: dati.moduli };

    riepilogo.textContent = riepilogaConteggi(righe, dati.moduli);

    ridisegna();
}

async function avvia() {
    initTheme();
    await requireSession();
    await requireModule('admin');

    await disegnaIntestazione();
    montaNotifiche(supabase);
    aggiornaVoceTema();

    montaSpriteModuli();
    await ricarica();
}

mountActions(document.body, {
    profilo: () => {
        const menu = document.getElementById('menuProfilo');
        menu.hidden = !menu.hidden;
    },
    logout: () => signOut(),
    tema: () => { toggleTheme(); aggiornaVoceTema(); toast('Tema cambiato'); },

    ordina: () => {
        statoPagina.ordine = ordineSuccessivo(statoPagina.ordine);
        ridisegna();
        toast(ordineDi(statoPagina.ordine).breve);
    },

    permesso: el => {
        const persona = statoPagina.righe.find(r => r.id === el.dataset.persona);
        const modulo = statoPagina.moduli.find(m => m.key === el.dataset.modulo);
        if (!persona || !modulo) return;
        apriPermesso({
            persona,
            modulo,
            ruoloAttuale: persona.abilitazioni[modulo.key] || null,
            scopeAttuale: persona.scope ? persona.scope[modulo.key] : null,
            alSalvataggio: async () => { await ricarica(); toast('Permesso aggiornato'); }
        });
    },
    'chiudi-permesso': () => chiudiPermesso(),
    'salva-permesso': () => salvaPermesso(),
    'revoca-permesso': () => revocaPermesso(),

    'nuove-persone': () => apriNuovePersone(async () => { await ricarica(); toast('Anagrafica aggiornata'); }),
    'chiudi-nuove': () => chiudiNuovePersone(),
    'crea-account': () => creaAccount(),

    stato: el => {
        const persona = statoPagina.righe.find(r => r.id === el.dataset.persona);
        if (!persona) return;
        apriStato(persona, async () => { await ricarica(); toast('Account aggiornato'); });
    },
    'chiudi-stato': () => chiudiStato(),
    disattiva: () => disattiva(),
    riattiva: () => riattiva(),

    nome: el => {
        const persona = statoPagina.righe.find(r => r.id === el.dataset.persona);
        if (!persona) return;
        apriNome(persona, async () => { await ricarica(); toast('Persona aggiornata'); });
    },
    'chiudi-nome': () => chiudiNome(),
    'salva-nome': () => salvaNome()
});

window.onresize = adattaAltezzaTabella;

document.addEventListener('click', ev => {
    if (!ev.target.closest('.user-profile-wrapper')) {
        const menu = document.getElementById('menuProfilo');
        if (menu) menu.hidden = true;
    }
});

avvia();
