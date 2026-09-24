
export const MODULO = 'progetti';

export const STATI = {
    in_corso: 'In Corso',
    in_ritardo: 'In Ritardo',
    completato: 'Completato',
    annullato: 'Annullato'
};

export const STATI_LED = {
    in_corso: 'In corso',
    leggero_ritardo: 'In leggero ritardo',
    in_ritardo: 'In ritardo',
    completato: 'Completato',
    completato_lacunoso: 'Completato ma lacunoso',
    cancellato: 'Progetto cancellato'
};

export const STATI_IN_ORDINE = [
    'in_ritardo',
    'leggero_ritardo',
    'in_corso',
    'completato_lacunoso',
    'completato',
    'cancellato'
];

export const FILTRO_ATTUALI = 'attuali';
export const STATI_ATTUALI = STATI_IN_ORDINE.slice(0, 4);

export const ORDINI_CODICE = [
    {
        anno: null,
        numero: null,
        breve: 'Ordine di partenza',
        avviso: "Ordine di partenza: prima lo stato, con i ritardi in cima, poi l'anno più recente, poi il numero di pratica più basso."
    },
    {
        anno: 'desc',
        numero: 'desc',
        breve: 'Anno recente, numero alto',
        avviso: 'Anno dal più recente al più vecchio; dentro ogni anno, numero di pratica dal più alto al più basso.'
    },
    {
        anno: 'desc',
        numero: 'asc',
        breve: 'Anno recente, numero basso',
        avviso: 'Anno dal più recente al più vecchio; dentro ogni anno, numero di pratica dal più basso al più alto.'
    },
    {
        anno: 'asc',
        numero: 'desc',
        breve: 'Anno vecchio, numero alto',
        avviso: 'Anno dal più vecchio al più recente; dentro ogni anno, numero di pratica dal più alto al più basso.'
    },
    {
        anno: 'asc',
        numero: 'asc',
        breve: 'Anno vecchio, numero basso',
        avviso: 'Anno dal più vecchio al più recente; dentro ogni anno, numero di pratica dal più basso al più alto.'
    }
];

export const FASI = {
    commerciale: 'Commerciale',
    esecutiva: 'Esecutiva',
    conclusiva: 'Conclusiva',
    fatturazione: 'Fatturazione',
    service_in_corso: 'Service In Corso',
    completato: 'Completato'
};

export const FASI_IN_ORDINE = Object.keys(FASI);

export const STATI_DDT = {
    non_consegnato: 'Non consegnato',
    parziale: 'Parzialmente consegnato',
    consegnato: 'Consegnato'
};

export const TIPI_DOCUMENTO = {
    cartella: 'Cartella Progetto',
    diario: 'Diario di Progetto',
    contratto: 'Cartella Contratto / Ordine',
    koi: 'Link KOI',
    bom: 'BOM',
    sopralluogo: 'Doc Sopralluogo',
    rat: 'Mod RaT',
    ddt: 'Ddt(n)',
    dico: 'DICO',
    sal: 'SAL',
    altro: 'Altro'
};

export const TIPI_ATTESI = Object.keys(TIPI_DOCUMENTO).filter(t => t !== 'altro');

export const TAPPE = {
    acconto: 'Acconto',
    consegna: 'Consegna',
    installazione: 'Installazione',
    collaudo: 'Collaudo',
    altro: 'Altro'
};

export const STATI_FATTURA = {
    da_fatturare: 'Da fatturare',
    fatturato: 'Fatturato',
    sollecitato: 'Sollecitato',
    incassato: 'Incassato'
};

export const TRAGUARDO_DI = {
    acconto: 'data_ordine',
    consegna: 'data_consegna_pronta',
    installazione: 'data_fine_installazioni',
    collaudo: 'data_collaudo',
    altro: null
};

export const BUSINESS_UNIT = {
    visual_design: 'Visual Design',
    industrial: 'Industrial'
};
export const SEZIONI = {
    anagrafica: {
        etichetta: 'Dati Anagrafici',
        motherCols: ['sez_anagrafica'],
        childCols: ['business_unit', 'cliente', 'cliente_finale', 'indirizzo', 'citta', 'pm_user_id'],
        isExpanded: false
    },
    progettuale: {
        etichetta: 'Gestione Progettuale',
        motherCols: ['sez_progettuale'],
        childCols: ['data_opportunita', 'data_ordine', 'qt_ordini', 'documenti_cliente',
                    'descrizione', 'tempo_consegna_giorni', 'data_koi', 'consegna_in_piu_parti',
                    'data_consegna_pronta', 'data_prossima_consegna', 'status_ddt',
                    'mano_opera', 'data_inizio_installazioni', 'data_fine_installazioni',
                    'data_collaudo', 'scadenza'],
        isExpanded: false
    },
    fatturato: {
        etichetta: 'Fatturazione',
        motherCols: ['sez_fatturazione'],
        childCols: ['mod_fatturazione', 'stato_fatturazione', 'prossima_fatturazione'],
        isExpanded: false
    },
    service: {
        etichetta: 'Service',
        motherCols: ['sez_service'],
        childCols: ['service_attivo', 'service_periodo', 'service_rinnovo', 'service_rinnovo_anni'],
        isExpanded: false
    },
    documentale: {
        etichetta: 'Docs Drive',
        motherCols: ['sez_docs'],
        childCols: ['doc_cartella', 'doc_diario', 'doc_contratto', 'doc_koi', 'doc_bom'],
        isExpanded: false
    }
};

export const DOCS_NEL_GRUPPO = ['cartella', 'diario', 'contratto', 'koi', 'bom'];

export const COLONNE_SCIOLTE = ['giorni_effettivi', 'ricavo_totale', 'costo_totale'];

export function dataIt(valore) {
    if (!valore) return '';
    const [a, m, g] = valore.split('-');
    return `${g}/${m}/${a}`;
}

export function euro(valore) {
    if (valore === null || valore === undefined || valore === '') return '';
    return Number(valore).toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
}

export function giorni(valore) {
    if (valore === null || valore === undefined || valore === '') return '';
    const n = Number(valore);
    return (n > 0 ? '+' : '') + n + ' gg';
}
