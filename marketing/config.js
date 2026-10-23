
export const MODULO = 'marketing';

export const TIPI = {
    testo: 'Testo',
    link: 'Link',
    tabella: 'Tabella'
};

export const STATI = {
    ok: 'Ok',
    da_rivedere: 'Da rivedere',
    bozza: 'Bozza'
};

export const INDIRIZZO_VALIDO = /^https?:\/\//i;

export const PASSO_ORDINE = 10;

const FORMATO_DATA = new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
const FORMATO_DATA_ORA = new Intl.DateTimeFormat('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
});

export function dataIt(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : FORMATO_DATA.format(d);
}

export function dataOraIt(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : FORMATO_DATA_ORA.format(d);
}

export function nomeFile() {
    const d = new Date();
    const mese = String(d.getMonth() + 1).padStart(2, '0');
    const giorno = String(d.getDate()).padStart(2, '0');
    return `Marketing Playbook ${d.getFullYear()}-${mese}-${giorno}`;
}
