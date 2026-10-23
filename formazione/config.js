
export const MODULO = 'formazione';

export const TIPI = {
    online_certificato: 'Online con certificato',
    online: 'Online',
    dispense: 'Su dispense',
    interno: 'Interno'
};

export const STATI = {
    da_fare: { etichetta: 'Da fare', classe: 'st-grigio' },
    in_ritardo: { etichetta: 'In ritardo', classe: 'st-rosso' },
    dichiarata: { etichetta: 'Da confermare', classe: 'st-giallo' },
    confermata: { etichetta: 'Confermato', classe: 'st-verde' },
    annullata: { etichetta: 'Annullato', classe: 'st-spento' }
};

export const STATI_SIC = {
    in_regola: { etichetta: 'In regola', led: 'led-verde' },
    in_scadenza: { etichetta: 'In scadenza', led: 'led-giallo' },
    scaduto: { etichetta: 'Scaduto', led: 'led-rosso' },
    da_fare: { etichetta: 'Da fare', led: 'led-viola' },
    non_richiesto: { etichetta: 'Non richiesto', led: null }
};

export const APPUNTAMENTI = {
    richiesto: { etichetta: 'Richiesto', icona: 'outgoing_mail' },
    valutazione: { etichetta: 'In valutazione', icona: 'hourglass_empty' },
    prenotato: { etichetta: 'Prenotato', icona: 'event' },
    rimandato: { etichetta: 'Rimandato una volta', icona: 'event_repeat' },
    confermato: { etichetta: 'Confermato', icona: 'event_available' },
    non_prenotare: { etichetta: 'Non prenotare', icona: 'block' }
};

export const MESI = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

export function annoCorrente() {
    return new Date().getFullYear();
}

export function oggiIso() {
    const d = new Date();
    const due = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${due(d.getMonth() + 1)}-${due(d.getDate())}`;
}

export function dataIt(giorno) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(giorno || ''));
    return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

const FORMATO_ORE = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 });
const FORMATO_EURO = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });

export function oreIt(n) {
    if (n === null || n === undefined || n === '') return '';
    const v = Number(n);
    return Number.isFinite(v) ? FORMATO_ORE.format(v) + ' h' : '';
}

export function euroIt(n) {
    if (n === null || n === undefined || n === '') return '';
    const v = Number(n);
    return Number.isFinite(v) ? FORMATO_EURO.format(v) : '';
}

export function numeroDaCampo(testo) {
    const t = String(testo ?? '').trim().replace(',', '.');
    if (t === '') return null;
    const v = Number(t);
    return Number.isFinite(v) ? v : NaN;
}

export function numeroInCampo(n) {
    return n === null || n === undefined || n === '' ? '' : String(n).replace('.', ',');
}

export function mansioneIt(testo) {
    const t = String(testo ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
    return t.replace(/(^|[^a-zà-ù0-9])([a-zà-ù])/g, (m, prima, lettera) => prima + lettera.toUpperCase());
}

const soloLettere = s => String(s || '').toLowerCase().normalize('NFD').replace(/[^a-z]/g, '');

export function cognomePrima(completo, cognome) {
    const n = String(completo || '').replace(/\s+/g, ' ').trim();
    const c = String(cognome || '').replace(/\s+/g, ' ').trim();
    if (!c || !n) return n || c;
    const parole = n.split(' ');
    const tutto = soloLettere(c), primo = soloLettere(c.split(' ')[0]);
    for (let i = 0; i < parole.length; i++) {
        const coda = parole.slice(i);
        const trovato = soloLettere(coda.join('')) === tutto || (primo.length > 1 && soloLettere(parole[i]) === primo);
        if (!trovato) continue;
        return i === 0 ? n : `${coda.join(' ')} ${parole.slice(0, i).join(' ')}`;
    }
    return n;
}

export const AZIENDE = { tt_group: 'tt group', staim: 'Staim Holding' };
