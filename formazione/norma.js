
import { stato, nomeDi, repartoDi } from './stato.js';
import { STATI_NORMA, dataIt } from './config.js';
import { el, tabella, ledNorma, azioniCella, opzioni, testo } from './vista.js';
import { apriAssegna } from './assegnazioni.js';

const PRIORITA = { scaduto: 0, mai_fatto: 1, in_scadenza: 2, in_regola: 3 };

const COLONNE = [
    {
        key: 'persona', label: 'Persona', width: 190, classes: ['col-testo'], sticky: true,
        render: (v, r) => `<strong>${testo(nomeDi(r.user_id))}</strong>`,
        actions: (v, r) => r.rinnovo_assegnato || r.stato_norma === 'in_regola'
            ? ''
            : azioniCella(r.user_id + '|' + r.corso_id, [['rinnova', 'event_repeat', 'Assegna il rinnovo']])
    },
    { key: 'reparto', label: 'Reparto', width: 130, render: (v, r) => testo(repartoDi(r.user_id)) },
    { key: 'titolo', label: 'Corso', width: 240, classes: ['col-testo'] },
    { key: 'stato_norma', label: 'Stato', width: 150, render: v => ledNorma(v) },
    { key: 'ultimo_completamento', label: 'Ultimo corso', width: 120, render: v => testo(dataIt(v)) },
    { key: 'valida_fino', label: 'Valido fino al', width: 120, render: (v, r) => testo(v ? dataIt(v) : (r.ultimo_completamento ? 'Non scade' : '')) },
    {
        key: 'prossima_scadenza', label: 'Rinnovo', width: 180,
        render: (v, r) => r.rinnovo_assegnato ? testo('Assegnato' + (v ? ', entro il ' + dataIt(v) : '')) : ''
    }
];

export function riempiFiltriNorma() {
    const corsi = stato.corsi.filter(c => c.di_norma);
    opzioni(el('normaCorso'), corsi.map(c => [c.id, c.titolo]), { vuota: 'Tutti i corsi di norma' });
    opzioni(el('normaStato'), Object.entries(STATI_NORMA).map(([k, s]) => [k, s.etichetta]), { vuota: 'Tutti gli stati' });
}

export function disegnaNorma() {
    const corso = el('normaCorso').value, st = el('normaStato').value;
    const attive = new Set(stato.persone.filter(p => p.attivo).map(p => p.user_id));
    const tutte = stato.norma.filter(n => attive.has(n.user_id) && (!corso || n.corso_id === Number(corso)));

    for (const chiave of Object.keys(STATI_NORMA)) {
        el('norma-' + chiave).textContent = tutte.filter(n => n.stato_norma === chiave).length;
    }
    el('norma-scaduto').classList.toggle('allarme', tutte.some(n => n.stato_norma === 'scaduto'));

    const righe = tutte.filter(n => !st || n.stato_norma === st).sort((a, b) =>
        PRIORITA[a.stato_norma] - PRIORITA[b.stato_norma] ||
        String(a.valida_fino || '').localeCompare(String(b.valida_fino || '')) ||
        nomeDi(a.user_id).localeCompare(nomeDi(b.user_id), 'it'));

    tabella('norma', COLONNE, righe, {
        vuota: stato.corsi.some(c => c.di_norma)
            ? 'Nessuno corrisponde ai filtri. Un corso di norma compare qui per una persona dopo che le è stato assegnato.'
            : 'Nessun corso di norma nel catalogo: si segna «Di norma» quando si crea il corso.'
    });
}

export function azzeraFiltriNorma() {
    el('normaCorso').value = '';
    el('normaStato').value = '';
    disegnaNorma();
}

export function rinnova(bottone) {
    const [userId, corsoId] = String(bottone.dataset.id).split('|');
    apriAssegna({ corsoId: Number(corsoId), persone: [userId] });
}

