
export const MODULO = 'riparazioni';

export const GRUPPI = {
    magazzino: 'Magazzino / logistica',
    commerciale: 'Responsabile commerciale',
    amministrazione: 'Amministrazione'
};

export const BRAND_INTERNO = 'tt group';

export const TIPI = {
    riparazione: { etichetta: 'Riparazione', icona: 'build', titolo: 'per esempio il guasto' },
    manutenzione: { etichetta: 'Manutenzione', icona: 'engineering', titolo: 'per esempio «Manutenzione annuale 2026»' },
    refill: { etichetta: 'Refill', icona: 'water_drop', titolo: 'per esempio «Refill ottobre 2026»' }
};

export const PORTALE_BNOVATE = 'https://erp.bnovate.com/me';

export function eBrandInterno(brand) {
    return String(brand || '').trim().toLowerCase() === BRAND_INTERNO;
}

export const LED = {
    rosso: { etichetta: 'Rosso', peso: 0 },
    giallo: { etichetta: 'Giallo', peso: 1 },
    verde: { etichetta: 'Verde', peso: 2 }
};

export const LINK_VALIDO = /^https:\/\/\S+$/i;

const FORMATO_DATA = { day: '2-digit', month: '2-digit', year: 'numeric' };
const FORMATO_ORA = { hour: '2-digit', minute: '2-digit' };

export function giornoIt(giorno) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(giorno || ''));
    return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

export function dataOraIt(istante) {
    if (!istante) return '';
    const d = new Date(istante);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('it-IT', FORMATO_DATA) + ' alle ' + d.toLocaleTimeString('it-IT', FORMATO_ORA);
}

export function oggiIso() {
    const d = new Date();
    const due = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${due(d.getMonth() + 1)}-${due(d.getDate())}`;
}

export function nomeModello(modello) {
    if (!modello) return 'Modello non più in Asset';
    return [modello.nome, modello.versione].filter(Boolean).join(' ');
}

export function aggiungiMesi(giorno, mesi) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(giorno || ''));
    if (!m || !mesi) return '';
    const anno = Number(m[1]), mese = Number(m[2]) - 1 + Number(mesi), g = Number(m[3]);
    const ultimo = new Date(Date.UTC(anno, mese + 1, 0)).getUTCDate();
    const d = new Date(Date.UTC(anno, mese, Math.min(g, ultimo)));
    return d.toISOString().slice(0, 10);
}

export function giorniA(giorno) {
    if (!/^\d{4}-\d{2}-\d{2}/.test(String(giorno || ''))) return null;
    return Math.round((Date.parse(giorno.slice(0, 10)) - Date.parse(oggiIso())) / 86400000);
}

export const eBactoSense = modello => /bacto\s*sense/i.test(String(modello && modello.nome || ''));

export function scriviGmail(email, oggetto = '', testo = '') {
    let url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}`;
    if (oggetto) url += `&su=${encodeURIComponent(oggetto)}`;
    if (testo) url += `&body=${encodeURIComponent(testo)}`;
    return url;
}

export const PREAVVISO_MANUTENZIONE = 60;

export function tonoScadenza(giorno, preavviso) {
    const g = giorniA(giorno);
    if (g === null) return '';
    if (g < 0) return 'passata';
    return g <= preavviso ? 'vicina' : 'lontana';
}

export const SCADENZA = {
    verde: { etichetta: 'Oltre 6 mesi', breve: 'In corso' },
    giallo: { etichetta: 'Scade entro 6 mesi', breve: 'Entro 6 mesi' },
    arancione: { etichetta: 'Scade entro 3 mesi', breve: 'Entro 3 mesi' },
    rosso: { etichetta: 'Scaduti, da decidere', breve: 'Scaduto' },
    manca: { etichetta: 'Senza data di conclusione', breve: 'Senza data' },
    grigio: { etichetta: 'Rinnovati o chiusi', breve: 'Chiuso' }
};

export const LIVELLO_AVVISO = {
    sei_mesi: 'Scade fra 6 mesi',
    tre_mesi: 'Scade fra 3 mesi',
    scaduto: 'Scaduto',
    manutenzione: 'Manutenzione da fissare',
    refill: 'Refill in scadenza'
};
