
export const MODULO = 'riparazioni';

export const GRUPPI = {
    magazzino: 'Magazzino / logistica',
    commerciale: 'Responsabile commerciale',
    amministrazione: 'Amministrazione'
};

export const BRAND_INTERNO = 'tt group';
export const PASSI_FORNITORE = [4, 5];
export const PASSO_FATTURARE = 7;

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
