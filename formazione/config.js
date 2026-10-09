
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

export const STATI_NORMA = {
    in_regola: { etichetta: 'In regola', led: 'led-verde' },
    in_scadenza: { etichetta: 'In scadenza', led: 'led-giallo' },
    scaduto: { etichetta: 'Scaduto', led: 'led-rosso' },
    mai_fatto: { etichetta: 'Mai fatto', led: 'led-grigio' }
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
