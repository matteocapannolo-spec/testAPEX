
import { supabase } from '../core/supabase.js';
import { escapeHtml } from '../core/ui.js';

const dialogo = () => document.getElementById('dialogoPermesso');

let contesto = null;

async function ruoliPossibili(modulo) {
    const ruoli = modulo.ruoli || [];
    const esiti = await Promise.all(ruoli.map(r =>
        supabase.rpc('membership_change_denied_reason', { p_module: modulo.key, p_role: r.chiave })
    ));

    return ruoli.map((r, i) => ({
        ...r,
        motivoRifiuto: esiti[i].error ? esiti[i].error.message : esiti[i].data
    }));
}

function disegnaRuoli(ruoli, ruoloAttuale) {
    return ruoli.map(r => {
        const vietato = !!r.motivoRifiuto;
        const scelto = r.chiave === ruoloAttuale;
        return `<label class="scelta-ruolo${vietato ? ' vietata' : ''}"${vietato ? ` title="${escapeHtml(r.motivoRifiuto)}"` : ''}>
                <input type="radio" name="ruolo" value="${escapeHtml(r.chiave)}"${scelto ? ' checked' : ''}${vietato ? ' disabled' : ''}>
                <span class="scelta-etichetta">${escapeHtml(r.etichetta)}</span>
                <span class="scelta-chiave">${escapeHtml(r.chiave)}</span>
                ${vietato ? `<span class="scelta-motivo">${escapeHtml(r.motivoRifiuto)}</span>` : ''}
            </label>`;
    }).join('');
}

function disegnaAmbito(ambito, scopeAttuale) {
    if (!ambito) return '';
    const scelti = (scopeAttuale && scopeAttuale[ambito.chiave]) || [];
    const voci = (ambito.valori || []).map(v => `<label class="scelta-ambito">
            <input type="checkbox" name="ambito" value="${escapeHtml(v.chiave)}"${scelti.includes(v.chiave) ? ' checked' : ''}>
            <span>${escapeHtml(v.etichetta)}</span>
        </label>`).join('');

    const nota = ambito.nota
        ? `<div class="blocco-nota">${escapeHtml(ambito.nota)}</div>`
        : '';

    return `<div class="blocco-ambito">
            <div class="blocco-titolo">${escapeHtml(ambito.etichetta)}</div>
            ${voci}
            ${nota}
        </div>`;
}

export async function apriPermesso({ persona, modulo, ruoloAttuale, scopeAttuale, alSalvataggio }) {
    const dlg = dialogo();
    contesto = { persona, modulo, ruoloAttuale, alSalvataggio };

    document.getElementById('dlgTitolo').textContent = persona.nome;
    document.getElementById('dlgSottotitolo').textContent = modulo.label;
    document.getElementById('dlgErrore').hidden = true;
    document.getElementById('dlgRuoli').innerHTML = '<div class="dlg-attesa">Verifica dei permessi…</div>';
    document.getElementById('dlgAmbito').innerHTML = '';
    document.getElementById('dlgRevoca').hidden = !ruoloAttuale;
    dlg.showModal();

    const ruoli = await ruoliPossibili(modulo);
    document.getElementById('dlgRuoli').innerHTML = disegnaRuoli(ruoli, ruoloAttuale);
    document.getElementById('dlgAmbito').innerHTML = disegnaAmbito(modulo.ambito, scopeAttuale);

    const nessunoPossibile = ruoli.every(r => r.motivoRifiuto);
    document.getElementById('dlgSalva').hidden = nessunoPossibile;
    if (nessunoPossibile && ruoli.length) {
        mostraErrore('Non puoi assegnare nessun ruolo su questo modulo: ' + ruoli[0].motivoRifiuto);
    }
}

function mostraErrore(testo) {
    const el = document.getElementById('dlgErrore');
    el.textContent = testo;
    el.hidden = !testo;
}

export function chiudiPermesso() {
    dialogo().close();
    contesto = null;
}

function letturaScelte() {
    const ruolo = document.querySelector('#dlgRuoli input[name="ruolo"]:checked');
    const ambito = [...document.querySelectorAll('#dlgAmbito input[name="ambito"]:checked')].map(i => i.value);
    return { ruolo: ruolo ? ruolo.value : null, ambito };
}

export async function salvaPermesso() {
    if (!contesto) return;
    const { persona, modulo, alSalvataggio } = contesto;
    const { ruolo, ambito } = letturaScelte();

    if (!ruolo) { mostraErrore('Scegli un ruolo, oppure rimuovi l\'accesso.'); return; }

    const scope = modulo.ambito ? { [modulo.ambito.chiave]: ambito } : {};

    const { error } = await supabase.rpc('grant_membership', {
        p_user_id: persona.id,
        p_module: modulo.key,
        p_role: ruolo,
        p_scope: scope
    });

    if (error) { mostraErrore(error.message); return; }

    chiudiPermesso();
    await alSalvataggio();
}

export async function revocaPermesso() {
    if (!contesto) return;
    const { persona, modulo, alSalvataggio } = contesto;

    const { error } = await supabase.rpc('revoke_membership', {
        p_user_id: persona.id,
        p_module: modulo.key
    });

    if (error) { mostraErrore(error.message); return; }

    chiudiPermesso();
    await alSalvataggio();
}
