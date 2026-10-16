import { escapeHtml } from './ui.js';

const RADICE = new URL('../', import.meta.url);

const OGNI_QUANTO = 60000;
const QUANTE = 30;

const LINK_AMMESSO = /^[a-z]+\/(\?scheda=[0-9a-f-]{36})?$/;

const ICONA = `<svg class="notifiche-icona" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>`;

const MARKUP = `
    <button type="button" class="notifiche-btn" data-notifiche="apri" title="Notifiche" aria-label="Notifiche">
        ${ICONA}
        <span class="notifiche-badge zero">0</span>
    </button>
    <div class="notifiche-menu" hidden>
        <div class="notifiche-testa">
            <span class="notifiche-titolo">Notifiche</span>
            <button type="button" class="notifiche-tutte" data-notifiche="tutte" hidden>Segna tutte come lette</button>
        </div>
        <div class="notifiche-elenco"></div>
    </div>`;

function quando(iso) {
    const secondi = (Date.now() - new Date(iso).getTime()) / 1000;
    if (secondi < 60) return 'adesso';
    if (secondi < 3600) return Math.floor(secondi / 60) + ' min fa';
    if (secondi < 86400) return Math.floor(secondi / 3600) + ' h fa';
    if (secondi < 172800) return 'ieri';
    return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}

function disegnaNotifica(n) {
    const altre = n.conteggio > 1 ? ` · e altre ${n.conteggio - 1} modifiche` : '';
    const link = LINK_AMMESSO.test(n.link || '') ? n.link : '';
    return `<button type="button" class="notifica${n.letta_il ? '' : ' da-leggere'}" data-notifiche="vai" data-id="${escapeHtml(n.id)}" data-link="${escapeHtml(link)}">
        <span class="notifica-punto"></span>
        <span class="notifica-corpo">
            <span class="notifica-titolo">${escapeHtml(n.titolo)}</span>
            <span class="notifica-testo">${escapeHtml(n.testo)}${escapeHtml(altre)}</span>
            <span class="notifica-quando">${escapeHtml(quando(n.created_at))}</span>
        </span>
    </button>`;
}

export function montaNotifiche(client, sito = RADICE) {
    const profilo = document.querySelector('.header-nav .user-profile-wrapper');
    if (!profilo || !client || document.querySelector('.notifiche-wrapper')) return;

    const contenitore = document.createElement('div');
    contenitore.className = 'notifiche-wrapper';
    contenitore.innerHTML = MARKUP;
    profilo.before(contenitore);

    const badge = contenitore.querySelector('.notifiche-badge');
    const menu = contenitore.querySelector('.notifiche-menu');
    const elenco = contenitore.querySelector('.notifiche-elenco');
    const tutte = contenitore.querySelector('.notifiche-tutte');
    let spento = false;

    function mostraConteggio(n) {
        badge.textContent = n > 99 ? '99+' : String(n);
        badge.classList.toggle('zero', n === 0);
        tutte.hidden = n === 0;
    }

    async function aggiornaConteggio() {
        if (spento || document.hidden) return;
        const { count, error } = await client.from('notifiche')
            .select('id', { count: 'exact', head: true }).is('letta_il', null);
        if (error) {
            console.error('Notifiche non disponibili:', error);
            spento = true;
            return;
        }
        mostraConteggio(count || 0);
    }

    async function caricaElenco() {
        elenco.innerHTML = '<div class="notifiche-vuoto">Caricamento…</div>';
        const { data, error } = await client.from('notifiche')
            .select('id, tipo, titolo, testo, link, conteggio, letta_il, created_at')
            .order('created_at', { ascending: false }).limit(QUANTE);
        if (error) {
            console.error('Caricamento delle notifiche fallito:', error);
            elenco.innerHTML = '<div class="notifiche-vuoto errore">Non è stato possibile caricare le notifiche.</div>';
            return;
        }
        elenco.innerHTML = data.length
            ? data.map(disegnaNotifica).join('')
            : '<div class="notifiche-vuoto">Nessuna notifica.</div>';
        mostraConteggio(data.filter(n => !n.letta_il).length);
        aggiornaConteggio();
    }

    function apriChiudi() {
        menu.hidden = !menu.hidden;
        if (menu.hidden) return;
        document.querySelectorAll('.profile-dropdown').forEach(m => {
            if (m.id === 'menuProfilo') m.hidden = true;
            m.classList.remove('show');
        });
        caricaElenco();
    }

    async function segnaLette(filtro) {
        const { error } = await filtro(client.from('notifiche').update({ letta_il: new Date().toISOString() }));
        if (error) {
            console.error('Notifiche non segnate come lette:', error);
            elenco.insertAdjacentHTML('afterbegin', '<div class="notifiche-vuoto errore">Non è stato possibile segnarle come lette.</div>');
            return false;
        }
        return true;
    }

    async function vai(el) {
        if (el.classList.contains('da-leggere')) {
            if (!await segnaLette(q => q.eq('id', el.dataset.id))) return;
        }
        if (el.dataset.link) {
            window.location.href = new URL(el.dataset.link, sito).href;
            return;
        }
        caricaElenco();
    }

    contenitore.addEventListener('click', ev => {
        const el = ev.target.closest('[data-notifiche]');
        if (!el) return;
        ev.preventDefault();
        const azione = el.dataset.notifiche;
        if (azione === 'apri') apriChiudi();
        else if (azione === 'tutte') segnaLette(q => q.is('letta_il', null)).then(ok => ok && caricaElenco());
        else if (azione === 'vai') vai(el);
    });

    document.addEventListener('click', ev => {
        if (!menu.hidden && !contenitore.contains(ev.target)) menu.hidden = true;
    }, true);

    document.addEventListener('visibilitychange', aggiornaConteggio);
    setInterval(aggiornaConteggio, OGNI_QUANTO);
    aggiornaConteggio();
}
