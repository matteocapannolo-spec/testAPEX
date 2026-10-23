
export function cognomeDiPersona(riga) {
    const locale = String(riga.email || '').split('@')[0];
    const punto = locale.indexOf('.');
    if (punto > 0) return locale.slice(punto + 1).replace(/\./g, ' ');

    const parti = String(riga.nome || '').trim().split(/\s+/);
    return parti.length > 1 ? parti[parti.length - 1] : (parti[0] || '');
}

function senzaFronzoli(testo) {
    return String(testo).toLowerCase().replace(/[^a-z0-9]/g, '');
}

const PARTICELLE = ['de', 'del', 'della', 'dello', 'degli', 'dei', 'di', 'da', 'dal', 'dalla',
    'lo', 'la', 'le', 'van', 'von', 'der', 'den'];

export function nomeInvertito(riga) {
    const nome = String(riga.nome || '').trim();
    const parti = nome.split(/\s+/);
    if (parti.length < 2) return nome;

    if (!String(riga.email || '').trim()) return nome;

    const cognome = senzaFronzoli(riga.cognome || cognomeDiPersona(riga));
    for (let quante = 1; quante < parti.length; quante++) {
        let taglio = parti.length - quante;
        if (senzaFronzoli(parti.slice(taglio).join('')) !== cognome) continue;

        while (taglio > 1 && PARTICELLE.includes(senzaFronzoli(parti[taglio - 1]))) taglio--;

        return parti.slice(taglio).join(' ') + ' ' + parti.slice(0, taglio).join(' ');
    }
    return nome;
}

export const ORDINI = [
    { chiave: 'cognome-su', campo: 'cognome', verso: 1, breve: 'Cognome, dalla A alla Z', icona: 'arrow_upward' },
    { chiave: 'cognome-giu', campo: 'cognome', verso: -1, breve: 'Cognome, dalla Z alla A', icona: 'arrow_downward' },
    { chiave: 'nome-su', campo: 'nome', verso: 1, breve: 'Nome, dalla A alla Z', icona: 'arrow_upward' },
    { chiave: 'nome-giu', campo: 'nome', verso: -1, breve: 'Nome, dalla Z alla A', icona: 'arrow_downward' }
];

export function ordineDi(chiave) {
    return ORDINI.find(o => o.chiave === chiave) || ORDINI[0];
}

export function ordineSuccessivo(chiave) {
    const i = ORDINI.findIndex(o => o.chiave === chiave);
    return ORDINI[(i + 1) % ORDINI.length].chiave;
}

export function ordinaRighe(righe, chiave) {
    const ordine = ordineDi(chiave);
    const testo = r => ordine.campo === 'cognome'
        ? (r.cognome || cognomeDiPersona(r)) + ' ' + r.nome
        : r.nome;

    return [...righe].sort((a, b) => {
        const staim = (a.azienda === 'staim') - (b.azienda === 'staim');
        if (staim) return staim;
        const priorita = r => (!r.attivo ? 0 : (!r.ha_profilo ? 1 : 2));
        const pa = priorita(a), pb = priorita(b);
        if (pa !== pb) return pa - pb;
        return testo(a).localeCompare(testo(b), 'it', { sensitivity: 'base' }) * ordine.verso;
    });
}
