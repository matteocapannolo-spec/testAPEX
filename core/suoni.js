
const VOLUME = 1;

const FILE = {
    apri: 'ui-pop.mp3',
    chiudi: 'ui-close.mp3',
    clic: 'ui-click-deep.mp3',
    verde: 'ui-chime.mp3',
    errore: 'ui-error.mp3'
};

function indirizzo(nome) {
    return new URL('../assets/suoni/' + FILE[nome], import.meta.url).href;
}

const suoni = new Map();

function audioDi(nome) {
    if (!FILE[nome]) return null;
    if (!suoni.has(nome)) {
        const a = new Audio(indirizzo(nome));
        a.preload = 'auto';
        a.volume = VOLUME;
        suoni.set(nome, a);
    }
    return suoni.get(nome);
}

export function suona(nome) {
    const a = audioDi(nome);
    if (!a) return;
    try {
        a.currentTime = 0;
        const p = a.play();
        if (p && p.catch) p.catch(() => {});
    } catch (e) {
    }
}

const SELETTORI_FINESTRA = 'dialog, .modal-overlay, .dropdown-list, .profile-dropdown';

function aperta(el) {
    if (el.tagName === 'DIALOG') return el.open;
    return el.getClientRects().length > 0;
}

const finestreAperte = new WeakSet();

function aggiornaFinestra(el) {
    const ora = aperta(el);
    const prima = finestreAperte.has(el);
    if (ora === prima) return null;
    if (ora) finestreAperte.add(el);
    else finestreAperte.delete(el);
    return ora ? 'apri' : 'chiudi';
}

const SELETTORI_PULSANTE = [
    'button',
    '[role="button"]',
    '[data-action]',
    '[onclick]',
    'a[href]',
    'input[type="checkbox"]',
    'input[type="radio"]',
    '.profile-menu-item'
].join(',');

let movimenti = 0;
let clicInCorso = false;

function ascoltaClic() {
    document.addEventListener('click', ev => {
        const bersaglio = ev.target;
        if (!bersaglio || !bersaglio.closest) return;
        const el = bersaglio.closest(SELETTORI_PULSANTE);
        if (!el) return;
        if (el.disabled || el.getAttribute('aria-disabled') === 'true') return;
        if (clicInCorso) return;
        clicInCorso = true;
        const prima = movimenti;
        setTimeout(() => {
            clicInCorso = false;
            if (movimenti === prima) suona('clic');
        }, 0);
    }, true);
}

const VERDI = ['led-verde', 'led-green'];

function coloreDi(punto) {
    for (const c of punto.classList) {
        if (c !== 'led-dot' && c.startsWith('led-')) return c;
    }
    return '';
}

function fotografaLed() {
    const mappa = new Map();
    document.querySelectorAll('[data-index]').forEach(riga => {
        riga.querySelectorAll('.led-dot').forEach((punto, i) => {
            mappa.set(riga.dataset.index + '#' + i, coloreDi(punto));
        });
    });
    return mappa;
}

let ledPrima = null;

function controllaLed() {
    const ora = fotografaLed();
    if (ledPrima) {
        for (const [chiave, colore] of ora) {
            const prima = ledPrima.get(chiave);
            if (prima !== undefined && prima !== colore && VERDI.includes(colore)) {
                suona('verde');
                break;
            }
        }
    }
    ledPrima = ora;
}

let attesaLed = null;

function programmaControlloLed() {
    if (attesaLed) clearTimeout(attesaLed);
    attesaLed = setTimeout(() => { attesaLed = null; controllaLed(); }, 120);
}

export function avviaSuoni() {
    if (typeof document === 'undefined' || !document.body) return;

    Object.keys(FILE).forEach(audioDi);

    document.querySelectorAll(SELETTORI_FINESTRA).forEach(el => {
        if (aperta(el)) finestreAperte.add(el);
    });
    ledPrima = fotografaLed();

    ascoltaClic();

    const osservatore = new MutationObserver(record => {
        let movimento = null;
        let ridisegnato = false;
        for (const r of record) {
            if (r.type === 'childList') {
                ridisegnato = true;
                continue;
            }
            const el = r.target;
            if (!el.matches || !el.matches(SELETTORI_FINESTRA)) continue;
            const cambio = aggiornaFinestra(el);
            if (cambio === 'apri') movimento = 'apri';
            else if (cambio === 'chiudi' && movimento === null) movimento = 'chiudi';
        }
        if (movimento) {
            movimenti++;
            suona(movimento);
        }
        if (ridisegnato) programmaControlloLed();
    });

    osservatore.observe(document.documentElement, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['open', 'class', 'hidden', 'style']
    });
}
