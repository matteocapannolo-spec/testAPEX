import { supabase } from '../core/supabase.js';
import { getSession, signInWithGoogle, signOut, currentUser, initTheme, toggleTheme, authErrorFromUrl, tornatoDaAccesso } from '../core/auth.js';
import { myModules, isSuperAdmin } from '../core/permissions.js';
import { escapeHtml, toast, mountActions, pillolaRuolo } from '../core/ui.js';

const schermataLogin = document.getElementById('login');
const schermataPortale = document.getElementById('portale');
const contenitoreModuli = document.getElementById('moduli');
const messaggioErrore = document.getElementById('loginErrore');

function mostraLogin(errore) {
    schermataPortale.hidden = true;
    schermataLogin.hidden = false;
    messaggioErrore.textContent = errore || '';
    messaggioErrore.hidden = !errore;
}

async function rifiuta(messaggio) {
    await supabase.auth.signOut();
    mostraLogin(messaggio);
}

function iniziali(nome) {
    return nome.split(' ').map(p => p.charAt(0)).join('').slice(0, 2).toUpperCase();
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
    }
}

function disegnaModuli(moduli) {
    if (moduli.length === 0) {
        contenitoreModuli.innerHTML = `<div class="portale-vuoto">
            Nessun modulo abilitato per il tuo account.<br>Chiedi a un amministratore di darti l'accesso.
        </div>`;
        return;
    }
    contenitoreModuli.innerHTML = moduli.map(disegnaCard).join('');
}

function disegnaCard(m) {
    const icona = `<svg class="modulo-icona" fill="currentColor" aria-hidden="true"><use href="#${iconaModulo(m.module)}"/></svg>`;
    const inSviluppo = m.pronto === false;

    const marchio = inSviluppo ? '<span class="modulo-marchio">Coming soon</span>' : '';

    const piede = `<div class="modulo-piede">
            <div class="nome">${escapeHtml(m.label)}</div>
            ${pillolaRuolo(m.role)}
        </div>`;

    if (inSviluppo) {
        return `<button type="button" class="modulo-card non-pronto" data-action="in-sviluppo" data-modulo="${escapeHtml(m.label)}">${marchio}${icona}${piede}</button>`;
    }
    return `<a class="modulo-card" href="${escapeHtml(m.url)}">${icona}${piede}</a>`;
}

const ICONE_MODULI = {
    asset: 'i-asset',
    progetti: 'i-progetti',
    formazione: 'i-formazione',
    admin: 'i-admin'
};

function iconaModulo(chiave) {
    return ICONE_MODULI[chiave] || 'i-default';
}

function messaggioAccesso({ codice, descrizione }) {
    if (codice === 'bad_oauth_state') {
        return "La richiesta di accesso è scaduta prima che l'accesso Google fosse completato. Riprova.";
    }
    if (codice === 'access_denied') {
        return "Accesso annullato.";
    }
    return "Accesso non riuscito: " + (descrizione || codice);
}

async function avvia() {
    initTheme();

    const erroreAccesso = authErrorFromUrl();

    const sessione = await getSession();
    if (!sessione) {
        if (erroreAccesso) {
            mostraLogin(messaggioAccesso(erroreAccesso));
        } else if (tornatoDaAccesso()) {
            console.error("Accesso completato ma sessione assente.");
            mostraLogin("L'accesso Google è riuscito, ma il browser non ha registrato la sessione.");
        } else {
            mostraLogin('');
        }
        return;
    }

    const { data: profilo, error } = await supabase
        .from('user_profiles').select('id').eq('id', sessione.user.id).maybeSingle();
    if (error) {
        console.error("Verifica del profilo fallita:", error);
        mostraLogin("Non è stato possibile verificare il tuo accesso. Riprova fra poco.");
        return;
    }
    if (!profilo) {
        await rifiuta("Il tuo account non è abilitato ad APEX. Contatta un amministratore.");
        return;
    }

    schermataLogin.hidden = true;
    schermataPortale.hidden = false;
    await disegnaIntestazione();
    aggiornaVoceTema();

    try {
        disegnaModuli(await myModules());
    } catch (e) {
        contenitoreModuli.innerHTML = `<div class="portale-vuoto">
            Non è stato possibile caricare l'elenco dei moduli. Ricarica la pagina.
        </div>`;
    }
}

mountActions(document.body, {
    login: async () => {
        try {
            await signInWithGoogle();
        } catch (e) {
            mostraLogin("Avvio dell'accesso Google non riuscito: " + e.message);
        }
    },
    profilo: () => {
        const menu = document.getElementById('menuProfilo');
        menu.hidden = !menu.hidden;
    },
    'in-sviluppo': el => toast(`Il modulo ${el.dataset.modulo} è in sviluppo: non è ancora disponibile.`),
    logout: () => signOut(),
    tema: () => { toggleTheme(); aggiornaVoceTema(); }
});

document.addEventListener('click', ev => {
    if (!ev.target.closest('.user-profile-wrapper')) {
        const menu = document.getElementById('menuProfilo');
        if (menu) menu.hidden = true;
    }
});

avvia();
