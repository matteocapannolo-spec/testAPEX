
import { toast, confirmDialog } from '../core/ui.js';
import * as api from './api.js';
import { stato, nomeDi, corsoDi, personeAttive, dopoScrittura } from './stato.js';
import { TIPI, oreIt, euroIt, numeroDaCampo, numeroInCampo } from './config.js';
import { el, tabella, tipoIt, linkPastiglia, azioniCella, opzioni, erroreDialogo, testo } from './vista.js';

function quanti(corsoId) {
    return stato.assegnazioni.filter(a => a.corso_id === corsoId && !a.annullata).length;
}

const COLONNE = [
    {
        key: 'titolo', label: 'Corso', width: 300, classes: ['col-testo'], sticky: true,
        render: (v, r) => `<strong>${testo(v)}</strong>` + (r.attivo ? '' : ' <span class="pill st-spento">Disattivato</span>'),
        actions: (v, r) => azioniCella(r.id, [
            ['modifica-corso', 'edit', 'Modifica'],
            ['assegna-corso', 'group_add', 'Assegna a…'],
            ...(quanti(r.id) ? [] : [['elimina-corso', 'delete', 'Elimina']])
        ])
    },
    { key: 'tipo', label: 'Tipo', width: 170, render: v => testo(tipoIt(v)) },
    { key: 'di_norma', label: 'Di norma', width: 100, render: v => v ? '<span class="pill pill-norma">Di norma</span>' : '' },
    { key: 'fornitore', label: 'Fornitore o docente', width: 200, classes: ['col-testo'], render: (v, r) => testo(r.tipo === 'interno' && r.docente_id ? nomeDi(r.docente_id) : v) },
    { key: 'ore_previste', label: 'Ore', width: 90, render: v => testo(oreIt(v)) },
    { key: 'costo', label: 'Costo a persona', width: 130, render: v => testo(euroIt(v)) },
    { key: 'validita_mesi', label: 'Validità', width: 110, render: v => v ? testo(v % 12 === 0 ? `${v / 12} ann${v === 12 ? 'o' : 'i'}` : `${v} mesi`) : '' },
    { key: 'assegnati', label: 'Assegnato a', width: 110, render: (v, r) => testo(quanti(r.id) || '') },
    { key: 'materiale_url', label: 'Materiale', width: 100, render: v => linkPastiglia(v, '', 'menu_book') }
];

export function riempiFiltriCatalogo() {
    opzioni(el('catTipo'), Object.entries(TIPI), { vuota: 'Tutti i tipi' });
}

export function disegnaCatalogo() {
    const tipo = el('catTipo').value, norma = el('catNorma').value, attivi = el('catAttivi').value;
    const righe = stato.corsi.filter(c =>
        (!tipo || c.tipo === tipo) &&
        (!norma || (norma === 'si') === c.di_norma) &&
        (attivi === 'tutti' || c.attivo)
    );
    tabella('cat', COLONNE, righe, {
        vuota: stato.corsi.length ? 'Nessun corso corrisponde ai filtri.' : 'Il catalogo è vuoto: il primo corso si aggiunge da «Nuovo corso».'
    });
    el('statCorsi').textContent = righe.length;
}

export function azzeraFiltriCatalogo() {
    el('catTipo').value = '';
    el('catNorma').value = '';
    el('catAttivi').value = '';
    disegnaCatalogo();
}

let inCorso = null;

const CAMPI = ['titolo', 'tipo', 'fornitore', 'ore_previste', 'costo', 'validita_mesi', 'materiale_url', 'note'];

export function apriCorso(bottone) {
    const c = bottone && bottone.dataset.id ? corsoDi(bottone.dataset.id) : null;
    inCorso = c ? c.id : null;
    el('corsoTitoloDlg').textContent = c ? 'Modifica corso' : 'Nuovo corso';
    opzioni(el('corso-tipo'), Object.entries(TIPI));
    opzioni(el('corso-docente'), personeAttive().map(p => [p.user_id, p.nome]), { vuota: 'Nessuno' });
    for (const campo of CAMPI) el('corso-' + campo).value = c ? (typeof c[campo] === 'number' ? numeroInCampo(c[campo]) : (c[campo] ?? '')) : '';
    if (!c) el('corso-tipo').value = 'online';
    el('corso-docente').value = c && c.docente_id ? c.docente_id : '';
    el('corso-di_norma').checked = c ? c.di_norma : false;
    el('corso-attivo').checked = c ? c.attivo : true;
    aggiornaCampiCorso();
    erroreDialogo('corsoErrore', '');
    el('dialogoCorso').showModal();
}

export function aggiornaCampiCorso() {
    const interno = el('corso-tipo').value === 'interno';
    el('rigaDocente').hidden = !interno;
    if (!interno) el('corso-docente').value = '';
}

export function chiudiCorso() {
    el('dialogoCorso').close();
    inCorso = null;
}

function leggiCorso() {
    const titolo = el('corso-titolo').value.trim();
    if (!titolo) throw new Error('Scrivi il titolo del corso.');
    const numeri = {};
    for (const [campo, nome] of [['ore_previste', 'Le ore'], ['costo', 'Il costo'], ['validita_mesi', 'La validità']]) {
        const v = numeroDaCampo(el('corso-' + campo).value);
        if (Number.isNaN(v) || (v !== null && v < 0)) throw new Error(`${nome} deve essere un numero.`);
        numeri[campo] = v;
    }
    if (numeri.validita_mesi !== null && !Number.isInteger(numeri.validita_mesi)) throw new Error('La validità si scrive in mesi interi, per esempio 36.');
    const url = el('corso-materiale_url').value.trim();
    if (url && !/^https?:\/\//i.test(url)) throw new Error('Il link al materiale deve cominciare con https://');
    return {
        titolo, tipo: el('corso-tipo').value, di_norma: el('corso-di_norma').checked,
        fornitore: el('corso-fornitore').value.trim() || null,
        docente_id: el('corso-docente').value || null,
        ...numeri, ore_previste: numeri.ore_previste || null,
        materiale_url: url || null, note: el('corso-note').value.trim() || null,
        attivo: el('corso-attivo').checked
    };
}

export async function salvaCorso() {
    try {
        await api.salvaCorso(inCorso, leggiCorso());
    } catch (e) {
        return erroreDialogo('corsoErrore', e.message);
    }
    chiudiCorso();
    toast('Corso salvato.');
    await dopoScrittura();
}

export async function eliminaCorso(bottone) {
    const c = corsoDi(bottone.dataset.id);
    if (!c) return;
    const ok = await confirmDialog({
        title: `Eliminare «${c.titolo}»?`, text: 'Il corso non è assegnato a nessuno: sparisce dal catalogo.',
        confirmLabel: 'Elimina', danger: true
    });
    if (!ok) return;
    try {
        await api.eliminaCorso(c.id);
    } catch (e) {
        return toast(e.message);
    }
    toast('Corso eliminato.');
    await dopoScrittura();
}
