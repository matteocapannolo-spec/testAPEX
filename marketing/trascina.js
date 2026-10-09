
const PADRE = { sezione: 'capitolo', blocco: 'sezione' };
const RIENTRO = { capitolo: 0, sezione: 22, blocco: 44 };
const SPOSTAMENTO = 32;

let corrente = null;

function livelloVoluto(ev) {
    const dx = ev.clientX - corrente.x0;
    if (corrente.livello === 'blocco' && dx < -SPOSTAMENTO) return 'sezione';
    if (corrente.livello === 'sezione' && corrente.puoScendere && dx > SPOSTAMENTO) return 'blocco';
    return corrente.livello;
}

function fratelliDi(gruppo) {
    return [...gruppo.parentElement.children]
        .filter(x => x.classList.contains('struttura-gruppo') && x !== corrente.gruppo);
}

function destDi(gruppo, livello) {
    if (livello === 'sezione') return { capitoloId: gruppo.dataset.capitolo };
    if (livello === 'blocco') return { sezioneId: gruppo.dataset.sezione };
    return {};
}

function prima(gruppo, livello) {
    return { segno: { elemento: gruppo, dove: 'sopra', livello }, dest: destDi(gruppo, livello), indice: fratelliDi(gruppo).indexOf(gruppo), livello };
}

function dopo(gruppo, livello) {
    return { segno: { elemento: gruppo, dove: 'sotto', livello }, dest: destDi(gruppo, livello), indice: fratelliDi(gruppo).indexOf(gruppo) + 1, livello };
}

function sulPosto(livello) {
    if (livello === 'sezione') {
        const sezione = corrente.gruppo.parentElement.closest('.gruppo-sezione');
        return sezione ? dopo(sezione, 'sezione') : null;
    }
    let sopra = corrente.gruppo.previousElementSibling;
    while (sopra && !sopra.classList.contains('gruppo-sezione')) sopra = sopra.previousElementSibling;
    if (!sopra) return null;
    const blocchi = sopra.querySelectorAll(':scope > .struttura-figli > .gruppo-blocco');
    return {
        segno: { elemento: sopra, dove: 'sotto', livello: 'blocco' },
        dest: { sezioneId: sopra.dataset.id },
        indice: blocchi.length,
        livello: 'blocco'
    };
}

function bersaglio(ev) {
    if (!corrente) return null;
    const sotto = ev.target.closest('.struttura-gruppo');
    if (!sotto) return null;
    const livello = livelloVoluto(ev);
    const cambia = livello !== corrente.livello;
    if (corrente.gruppo.contains(sotto)) return cambia ? sulPosto(livello) : null;

    const pari = sotto.closest(`.gruppo-${livello}`);
    if (pari && !corrente.gruppo.contains(pari)) {
        const riga = pari.querySelector('.struttura-riga').getBoundingClientRect();
        if (cambia && ev.clientY > riga.bottom) return dopo(pari, livello);
        const r = cambia ? riga : pari.getBoundingClientRect();
        return ev.clientY > r.top + r.height / 2 ? dopo(pari, livello) : prima(pari, livello);
    }

    if (sotto.dataset.livello === PADRE[livello]) {
        return {
            segno: { elemento: sotto.querySelector('.struttura-riga'), dove: 'dentro', livello },
            dest: { capitoloId: sotto.dataset.capitolo, sezioneId: livello === 'blocco' ? sotto.dataset.id : '' },
            indice: 0,
            livello
        };
    }
    return null;
}

function mostraSegno(albero, segno) {
    const linea = albero.querySelector('.struttura-segno');
    if (!linea) return;
    if (!segno) {
        linea.hidden = true;
        return;
    }
    const base = albero.getBoundingClientRect();
    const r = segno.elemento.getBoundingClientRect();
    const rientro = RIENTRO[segno.livello] || 0;
    const y = segno.dove === 'sopra' ? r.top : r.bottom;
    linea.style.top = `${y - base.top + albero.scrollTop - 1}px`;
    linea.style.left = `${r.left - base.left + rientro}px`;
    linea.style.width = `${r.width - rientro}px`;
    linea.hidden = false;
}

function scorriAiBordi(albero, y) {
    const r = albero.getBoundingClientRect();
    if (y < r.top + 40) albero.scrollTop -= 14;
    else if (y > r.bottom - 40) albero.scrollTop += 14;
}

function pulisci(albero) {
    if (corrente) corrente.gruppo.classList.remove('in-trascinamento');
    corrente = null;
    mostraSegno(albero, null);
}

export function montaTrascina(albero, { quandoLascia, puoScendere }) {
    albero.addEventListener('dragstart', ev => {
        const maniglia = ev.target.closest && ev.target.closest('.struttura-maniglia');
        if (!maniglia) return;
        const gruppo = maniglia.closest('.struttura-gruppo');
        const { livello, id } = maniglia.dataset;
        corrente = { livello, id, gruppo, x0: ev.clientX, puoScendere: livello === 'sezione' && puoScendere(id) };
        ev.dataTransfer.effectAllowed = 'move';
        ev.dataTransfer.setData('text/plain', id);
        ev.dataTransfer.setDragImage(maniglia.closest('.struttura-riga'), 20, 18);
        requestAnimationFrame(() => { if (corrente) gruppo.classList.add('in-trascinamento'); });
    });

    albero.addEventListener('dragover', ev => {
        if (!corrente) return;
        scorriAiBordi(albero, ev.clientY);
        const b = bersaglio(ev);
        mostraSegno(albero, b && b.segno);
        if (!b) return;
        ev.preventDefault();
        ev.dataTransfer.dropEffect = 'move';
    });

    albero.addEventListener('dragleave', ev => {
        if (!albero.contains(ev.relatedTarget)) mostraSegno(albero, null);
    });

    albero.addEventListener('drop', ev => {
        const b = bersaglio(ev);
        const preso = corrente;
        pulisci(albero);
        if (!b || !preso) return;
        ev.preventDefault();
        quandoLascia(preso.livello, preso.id, b.dest, b.indice, b.livello);
    });

    albero.addEventListener('dragend', () => pulisci(albero));
}
