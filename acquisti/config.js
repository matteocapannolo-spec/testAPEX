
export const MODULO = 'acquisti';

export const TINTE_CATEGORIE = 8;

const FORMATO_DATA = { day: '2-digit', month: '2-digit', year: 'numeric' };
const FORMATO_ORA = { hour: '2-digit', minute: '2-digit' };

export function dataIt(istante) {
    if (!istante) return '';
    const d = new Date(istante);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('it-IT', FORMATO_DATA);
}

export function dataOraIt(istante) {
    if (!istante) return '';
    const d = new Date(istante);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('it-IT', FORMATO_DATA) + ' alle ' + d.toLocaleTimeString('it-IT', FORMATO_ORA);
}

export function dominioDi(indirizzo) {
    const testo = String(indirizzo || '').trim();
    try {
        return new URL(testo).hostname.replace(/^www\./i, '') || testo;
    } catch (e) {
        return testo;
    }
}

export const CONTATTI = [1, 2];
export const PARTI_CONTATTO = ['nome', 'tel', 'email'];
export const CAMPI_CONTATTO = CONTATTI.flatMap(n => PARTI_CONTATTO.map(p => `contatto${n}_${p}`));

export const EMAIL_VALIDA = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export const INDIRIZZO_VALIDO = /^https?:\/\/\S+$/i;
