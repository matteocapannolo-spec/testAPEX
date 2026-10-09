
import { supabase } from '../core/supabase.js';
import { requireSession, currentUser, initTheme, toggleTheme, signOut } from '../core/auth.js';
import { requireModule, isSuperAdmin } from '../core/permissions.js';
import { escapeHtml, toast, mountActions, pillolaRuolo } from '../core/ui.js';
import { disegnaTabella } from '../core/table.js';
import { colonneDi, componiRighe, riepilogaConteggi, iniziali } from './persone.js';
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

let statoPagina = { righe: [], moduli: [] };

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
    statoPagina = { righe, moduli: dati.moduli };

    riepilogo.textContent = riepilogaConteggi(righe, dati.moduli);

    disegnaTabella({
        thead: document.getElementById('intestazione'),
        tbody: document.getElementById('corpo'),
        colonne: colonneDi(dati.moduli),
        righe,
        indiceDi: riga => riga.id
    });
}

async function avvia() {
    initTheme();
    await requireSession();
    await requireModule('admin');

    await disegnaIntestazione();
    aggiornaVoceTema();
    await ricarica();
}

mountActions(document.body, {
    profilo: () => {
        const menu = document.getElementById('menuProfilo');
        menu.hidden = !menu.hidden;
    },
    logout: () => signOut(),
    tema: () => { toggleTheme(); aggiornaVoceTema(); toast('Tema cambiato'); },

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
        apriNome(persona, async () => { await ricarica(); toast('Nome aggiornato'); });
    },
    'chiudi-nome': () => chiudiNome(),
    'salva-nome': () => salvaNome()
});

document.addEventListener('click', ev => {
    if (!ev.target.closest('.user-profile-wrapper')) {
        const menu = document.getElementById('menuProfilo');
        if (menu) menu.hidden = true;
    }
});

avvia();
