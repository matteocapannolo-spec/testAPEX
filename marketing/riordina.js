
import { stato, conTitolo } from './stato.js';
import { PASSO_ORDINE } from './config.js';

export function fratelli(livello, dest) {
    if (livello === 'capitolo') return stato.capitoli;
    if (livello === 'sezione') return stato.sezioni.filter(s => s.capitolo_id === dest.capitoloId);
    return stato.blocchi.filter(b => b.sezione_id === dest.sezioneId);
}

export function destinazioneDi(livello, voce) {
    if (livello === 'capitolo') return {};
    if (livello === 'sezione') return { capitoloId: voce.capitolo_id };
    return { sezioneId: voce.sezione_id };
}

export function campiPadre(livello, dest) {
    if (livello === 'sezione') return { capitolo_id: dest.capitoloId };
    if (livello === 'blocco') return { sezione_id: dest.sezioneId };
    return {};
}

export function calcolaPosto(elenco, indice) {
    const a = elenco[indice - 1] ? Number(elenco[indice - 1].ordine) : null;
    const b = elenco[indice] ? Number(elenco[indice].ordine) : null;
    if (a === null || b === null || b - a >= 2) {
        const ordine = a === null && b === null ? PASSO_ORDINE
            : a === null ? b - PASSO_ORDINE
                : b === null ? a + PASSO_ORDINE
                    : Math.floor((a + b) / 2);
        return { ordine, altri: [] };
    }
    const lista = [...elenco];
    lista.splice(indice, 0, null);
    let ordine = PASSO_ORDINE;
    const altri = [];
    lista.forEach((v, i) => {
        const o = (i + 1) * PASSO_ORDINE;
        if (v === null) ordine = o;
        else if (Number(v.ordine) !== o) altri.push([v.id, { ordine: o }]);
    });
    return { ordine, altri };
}

export function puoScendere(id) {
    const blocchi = stato.blocchi.filter(b => b.sezione_id === id);
    return !blocchi.length || (blocchi.length === 1 && blocchi[0].tipo !== 'link' && !conTitolo(blocchi[0]));
}
