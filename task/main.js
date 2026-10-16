
import { requireSession, currentUser, initTheme, toggleTheme, signOut } from '../core/auth.js';
import { supabase } from '../core/supabase.js';
import { montaNotifiche } from '../core/notifiche.js';
import { requireModule } from '../core/permissions.js';
import { escapeHtml, mountActions } from '../core/ui.js';
import { MODULO } from './config.js';
import { caricaScheda } from './api.js';
import { stato, quandoCambia, admin, mieiReparti, bachecaAperta, ricarica, cambiaVista, vistaRicordata, mostraAvviso, membriDelReparto } from './stato.js';
import { iniziali } from './persone.js';
import { tonoScadenza, passaFiltri, coloraSempre } from './riquadro.js';
import { disegnaBacheca, apriAggiunta, chiudiAggiunta, salvaNuovaScheda, tastiAggiunta } from './bacheca.js';
import { collegaTrascinamento, trascinando } from './trascina.js';
import { disegnaMie } from './mie.js';
import { apriScheda, chiudiScheda, chiudiCliccandoFuori, collegaCampiScheda, modificaDescrizione, completa, completaRiquadro, togliMembro, scambiaEtichetta, scambiaTutteEtichette, eliminaScheda } from './scheda.js';
import { inviaCommento, modificaCommento, annullaCommento, salvaCommento, eliminaCommento } from './dettagli.js';
import { collegaCampiChecklist, nuovaChecklist, eliminaChecklist, aggiungiVoce, eliminaVoce, scambiaNascondiFatte } from './checklist.js';
import * as struttura from './struttura.js';
import * as reparti from './reparti.js';
import * as etichette from './etichette.js';
import * as sposta from './sposta.js';

const el = id => document.getElementById(id);


function aggiornaVoceTema() {
    const scuro = document.body.classList.contains('dark-mode');
    el('iconaTema').textContent = scuro ? 'light_mode' : 'dark_mode';
    el('testoTema').textContent = scuro ? 'Modalità Chiara' : 'Modalità Scura';
}

function disegnaIntestazione() {
    const utente = currentUser();
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


function riempiVista() {
    const gruppi = mieiReparti().map(r => {
        const bacheche = stato.bacheche.filter(b => b.reparto_id === r.id);
        if (!bacheche.length) return '';
        return `<optgroup label="${escapeHtml(r.nome)}">${bacheche.map(b =>
            `<option value="${escapeHtml(b.id)}">${escapeHtml(b.nome)}</option>`).join('')}</optgroup>`;
    }).join('');
    el('vista').innerHTML = '<option value="mie">Le mie schede</option>' + gruppi;
    el('vista').value = stato.vista;
}

function riempiMembri() {
    const b = bachecaAperta();
    const persone = b ? membriDelReparto(b.reparto_id) : stato.persone;
    const scelto = stato.criteri.membro;
    el('filtroMembro').innerHTML = '<option value="">Tutti</option>'
        + persone.map(p => `<option value="${escapeHtml(p.user_id)}">${escapeHtml(p.nome)}</option>`).join('');
    el('filtroMembro').value = persone.some(p => p.user_id === scelto) ? scelto : '';
    stato.criteri.membro = el('filtroMembro').value;
}

function ridisegna() {
    if (trascinando()) return;
    const b = bachecaAperta();
    const inBacheca = !!b;
    riempiVista();
    riempiMembri();

    el('btnArchivio').hidden = !inBacheca;
    el('btnReparti').hidden = !admin();
    el('gruppoModoMie').hidden = inBacheca;
    el('modoMie').value = stato.modoMie;
    el('gruppoMembro').hidden = !inBacheca;

    const visibili = stato.schede.filter(s => passaFiltri(s, stato.criteri));
    el('statSchede').textContent = visibili.length;
    const scadute = visibili.filter(s => tonoScadenza(s) === 'scaduta').length;
    el('statScadute').textContent = scadute;
    el('statScadute').classList.toggle('allarme', scadute > 0);

    const contenitore = el('tabellone');
    if (!mieiReparti().length) {
        contenitore.innerHTML = `<p class="tabellone-vuoto">${admin()
            ? 'Non c\'è ancora nessun reparto: il primo si crea da «Reparti», e lì si scelgono le persone che ci lavorano.'
            : 'Non lavori ancora in nessun reparto: chiedi a un amministratore di Task di aggiungerti al tuo.'}</p>`;
        return;
    }
    if (inBacheca) disegnaBacheca(contenitore);
    else disegnaMie(contenitore);
}

function leggiFiltri() {
    stato.criteri.ricerca = el('ricerca').value.trim();
    stato.criteri.membro = el('filtroMembro').value;
    ridisegna();
}

function azzeraFiltri() {
    el('ricerca').value = '';
    el('filtroMembro').value = '';
    leggiFiltri();
}


async function avvia() {
    initTheme();
    await requireSession();
    stato.ruolo = await requireModule(MODULO);
    disegnaIntestazione();
    montaNotifiche(supabase);
    aggiornaVoceTema();
    quandoCambia(ridisegna);
    coloraSempre();

    const richiesta = new URLSearchParams(location.search).get('scheda');
    const daAprire = /^[0-9a-f-]{36}$/i.test(richiesta || '') ? richiesta : null;
    stato.vista = vistaRicordata();
    if (daAprire) {
        try {
            stato.vista = (await caricaScheda(daAprire)).bacheca_id;
        } catch (e) {
            mostraAvviso(e.message);
        }
    }
    await ricarica({ anagrafiche: true });

    el('vista').addEventListener('change', () => cambiaVista(el('vista').value));
    el('modoMie').addEventListener('change', () => { stato.modoMie = el('modoMie').value; ridisegna(); });
    el('ricerca').addEventListener('input', leggiFiltri);
    el('filtroMembro').addEventListener('change', leggiFiltri);
    el('tabellone').addEventListener('keydown', tastiAggiunta);
    collegaTrascinamento(el('tabellone'));
    collegaCampiScheda();
    chiudiCliccandoFuori();
    collegaCampiChecklist();
    struttura.collegaCampiArchivio();
    reparti.collegaCampiReparti();
    sposta.collegaCampiSposta();
    el('dialogoScheda').addEventListener('cancel', ev => { ev.preventDefault(); chiudiScheda(); });

    mountActions(document.body, {
        profilo: () => el('menuProfilo').hidden = !el('menuProfilo').hidden,
        tema: () => { toggleTheme(); aggiornaVoceTema(); },
        logout: () => signOut(),
        'azzera-filtri': azzeraFiltri,

        'aggiungi-scheda': apriAggiunta,
        'annulla-nuova-scheda': chiudiAggiunta,
        'salva-nuova-scheda': salvaNuovaScheda,

        'apri-scheda': apriScheda,
        'chiudi-scheda': chiudiScheda,
        'modifica-descrizione': modificaDescrizione,
        completa,
        'completa-riquadro': completaRiquadro,
        'togli-membro': togliMembro,
        etichetta: scambiaEtichetta,
        'tutte-etichette': scambiaTutteEtichette,
        'elimina-scheda': eliminaScheda,
        'sposta-scheda': sposta.apriSposta,
        'chiudi-sposta': sposta.chiudiSposta,
        'conferma-sposta': sposta.confermaSposta,
        'nuova-checklist': nuovaChecklist,
        'elimina-checklist': eliminaChecklist,
        'aggiungi-voce': aggiungiVoce,
        'elimina-voce': eliminaVoce,
        'nascondi-fatte': scambiaNascondiFatte,
        'invia-commento': inviaCommento,
        'modifica-commento': modificaCommento,
        'annulla-commento': annullaCommento,
        'salva-commento': salvaCommento,
        'elimina-commento': eliminaCommento,

        'modifica-bacheca': reparti.modificaBacheca,
        'chiudi-bacheca': struttura.chiudiBacheca,
        'salva-bacheca': struttura.salvaBacheca,
        'elimina-bacheca': struttura.eliminaBacheca,
        'menu-colonna': struttura.apriColonna,
        'nuova-colonna': struttura.nuovaColonna,
        'chiudi-colonna': struttura.chiudiColonna,
        'salva-colonna': struttura.salvaColonna,
        'sposta-colonna': struttura.spostaColonna,
        'elimina-colonna': struttura.eliminaColonna,
        archivio: struttura.apriArchivio,
        'chiudi-archivio': struttura.chiudiArchivio,
        ripristina: struttura.ripristina,

        reparti: reparti.apriReparti,
        'chiudi-reparti': reparti.chiudiReparti,
        'nuovo-reparto': reparti.nuovoReparto,
        'elimina-reparto': reparti.eliminaReparto,
        'togli-dal-reparto': reparti.togliDalReparto,
        'crea-bacheca': reparti.creaBacheca,
        'apri-reparto': reparti.apriRiga,
        'menu-reparto': reparti.apriMenu,
        'rinomina-reparto': reparti.rinomina,
        'mostra-aggiunta': reparti.mostraAggiunta,
        'mostra-nuovo-reparto': reparti.mostraNuovoReparto,
        'apri-bacheca': reparti.apriBacheca,
        etichette: reparti.apriEtichette,
        'chiudi-etichette': etichette.chiudiEtichette,
        'nuova-etichetta': etichette.nuovaEtichetta,
        'elimina-etichetta': etichette.eliminaEtichetta
    });

    if (daAprire) await apriScheda({ dataset: { id: daAprire } });
}

avvia().catch(e => mostraAvviso(e.message));
