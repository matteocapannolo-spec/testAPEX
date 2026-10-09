
import { requireSession, currentUser, initTheme, toggleTheme, signOut } from '../core/auth.js';
import { requireModule } from '../core/permissions.js';
import { escapeHtml, mountActions } from '../core/ui.js';
import { MODULO } from './config.js';
import { caricaMieiGruppi } from './api.js';
import { stato, contesto, ricarica, quandoCambia, mostraAvviso } from './stato.js';
import { filtra, ordina, disegna, riempiFiltroResponsabili, riempiFiltroLed } from './tabella.js';
import { apriPasso, chiudiPasso, salvaPasso, collegaCampiPasso } from './passo.js';
import { apriNuovoContratto, apriModificaContratto, chiudiContratto, salvaContrattoDalPannello, eliminaContratto, collegaCampiContratto } from './contratto.js';
import { apriStrumenti, chiudiStrumenti, aggiungiStrumento, togliStrumento, apriStoria, chiudiStoria } from './strumenti.js';
import { apriNuovoFlusso, apriModificaFlusso, chiudiFlusso, salvaFlusso, eliminaFlusso } from './flusso.js';
import { apriClienti, chiudiClienti, aggiungiCliente, collegaCampiClienti } from './clienti.js';

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
    const ctx = contesto();
    stato.criteri.responsabile = riempiFiltroResponsabili(el('filtroResponsabile'), ctx);
    el('btnNuovo').hidden = !ctx.puoAnagrafica;

    const visibili = ordina(filtra(stato.contratti, stato.criteri, ctx));
    disegna({ thead: el('intestazione'), tbody: el('corpo'), righe: visibili, ctx });

    el('statContratti').textContent = visibili.length;
    el('statFlussi').textContent = visibili.reduce((n, c) => n + (c.n_flussi_aperti || 0), 0);
    const rossi = visibili.filter(c => c.led === 'rosso').length;
    el('statRossi').textContent = rossi;
    el('statRossi').classList.toggle('allarme', rossi > 0);

    el('vuoto').hidden = visibili.length > 0;
    el('vuoto').textContent = stato.contratti.length
        ? 'Nessun contratto corrisponde ai filtri.'
        : 'Non ci sono ancora contratti: il primo si crea da «Nuovo Contratto».';
}

function leggiFiltri() {
    Object.assign(stato.criteri, {
        ricerca: el('ricerca').value.trim(),
        responsabile: el('filtroResponsabile').value,
        led: el('filtroLed').value,
        soloAperti: el('soloAperti').checked
    });
    ridisegna();
}

function azzeraFiltri() {
    el('ricerca').value = '';
    el('filtroResponsabile').value = '';
    el('filtroLed').value = '';
    el('soloAperti').checked = false;
    leggiFiltri();
}

function apriChiudiContratto(elemento) {
    const id = elemento.closest('tr').dataset.index;
    if (stato.aperti.has(id)) stato.aperti.delete(id);
    else stato.aperti.add(id);
    ridisegna();
}

async function avvia() {
    initTheme();
    await requireSession();
    stato.ruolo = await requireModule(MODULO);

    disegnaIntestazione();
    aggiornaVoceTema();
    riempiFiltroLed(el('filtroLed'));
    quandoCambia(ridisegna);

    try {
        stato.gruppi = await caricaMieiGruppi(currentUser().id);
        await ricarica();
    } catch (e) {
        mostraAvviso(e.message);
        return;
    }

    el('ricerca').addEventListener('input', leggiFiltri);
    for (const id of ['filtroResponsabile', 'filtroLed', 'soloAperti']) el(id).addEventListener('change', leggiFiltri);
    collegaCampiPasso();
    collegaCampiContratto();
    collegaCampiClienti();

    mountActions(document.body, {
        profilo: () => el('menuProfilo').hidden = !el('menuProfilo').hidden,
        tema: () => { toggleTheme(); aggiornaVoceTema(); },
        logout: () => signOut(),
        'azzera-filtri': azzeraFiltri,

        'apri-contratto': apriChiudiContratto,
        'nuovo-contratto': apriNuovoContratto,
        'modifica-contratto': apriModificaContratto,
        'elimina-contratto': eliminaContratto,
        'chiudi-contratto': chiudiContratto,
        'salva-contratto': salvaContrattoDalPannello,

        passo: apriPasso,
        'chiudi-passo': chiudiPasso,
        'salva-passo': salvaPasso,

        strumenti: apriStrumenti,
        'chiudi-strumenti': chiudiStrumenti,
        'aggiungi-strumento': aggiungiStrumento,
        'togli-strumento': togliStrumento,
        'storia-strumento': apriStoria,
        'chiudi-storia': chiudiStoria,

        'nuovo-flusso': apriNuovoFlusso,
        'modifica-flusso': apriModificaFlusso,
        'elimina-flusso': eliminaFlusso,
        'chiudi-flusso': chiudiFlusso,
        'salva-flusso': salvaFlusso,

        clienti: apriClienti,
        'chiudi-clienti': chiudiClienti,
        'aggiungi-cliente': aggiungiCliente
    });
}

avvia();
