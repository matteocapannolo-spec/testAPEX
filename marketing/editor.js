
import { pulisciHtml } from './testo.js';
import { INDIRIZZO_VALIDO } from './config.js';

const el = id => document.getElementById(id);

const BARRA = [
    ['grassetto', 'format_bold', 'Grassetto'],
    ['corsivo', 'format_italic', 'Corsivo'],
    ['elenco-puntato', 'format_list_bulleted', 'Elenco puntato'],
    ['elenco-numerato', 'format_list_numbered', 'Elenco numerato'],
    ['link', 'link', 'Collegamento']
];

let selezioneSalvata = null;

const parti = editor => ({
    area: editor.querySelector('.editor-area'),
    link: editor.querySelector('.editor-link'),
    url: editor.querySelector('.editor-link-url')
});

export function montaEditor() {
    const dialogo = el('dialogoBlocco');
    for (const editor of dialogo.querySelectorAll('.editor')) {
        editor.insertAdjacentHTML('afterbegin',
            '<div class="editor-barra" role="toolbar" aria-label="Formattazione">'
            + BARRA.map(([cmd, icona, titolo]) =>
                `<button type="button" class="action-btn" data-action="editor-cmd" data-cmd="${cmd}" title="${titolo}"><span class="material-symbols-outlined">${icona}</span></button>`).join('')
            + '</div>'
            + '<div class="editor-link" hidden>'
            + '<input type="url" class="edit-input editor-link-url" placeholder="https://…" autocomplete="off" spellcheck="false" aria-label="Indirizzo del collegamento">'
            + '<button type="button" class="btn btn-primario btn-piccolo" data-action="editor-link-applica">Applica</button>'
            + '<button type="button" class="btn btn-theme btn-piccolo" data-action="editor-link-annulla">Annulla</button>'
            + '</div>');
    }
    dialogo.addEventListener('mousedown', ev => {
        if (ev.target.closest('.editor-barra button')) ev.preventDefault();
    });
    dialogo.addEventListener('keydown', ev => {
        const campo = ev.target.closest('.editor-link-url');
        if (!campo) return;
        if (ev.key === 'Enter') { ev.preventDefault(); applicaLink(campo); }
        if (ev.key === 'Escape') { ev.preventDefault(); annullaLink(); }
    });
}

export function scriviEditor(id, html) {
    el(id).innerHTML = pulisciHtml(html);
    annullaLink();
}

export function leggiEditor(id) {
    return pulisciHtml(el(id).innerHTML);
}

const COMANDI = {
    grassetto: 'bold',
    corsivo: 'italic',
    'elenco-puntato': 'insertUnorderedList',
    'elenco-numerato': 'insertOrderedList'
};

export function esegui(elemento) {
    const editor = elemento.closest('.editor');
    if (!editor) return;
    const cmd = elemento.dataset.cmd;
    if (cmd === 'link') {
        chiediLink(editor);
        return;
    }
    const nativo = COMANDI[cmd];
    if (!nativo) return;
    parti(editor).area.focus();
    document.execCommand(nativo, false, null);
}

function chiediLink(editor) {
    annullaLink();
    const sel = window.getSelection();
    selezioneSalvata = sel && sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
    const { link, url } = parti(editor);
    link.hidden = false;
    url.value = '';
    url.focus();
}

export function annullaLink() {
    for (const link of el('dialogoBlocco').querySelectorAll('.editor-link')) link.hidden = true;
    selezioneSalvata = null;
}

export function applicaLink(elemento) {
    const editor = elemento.closest('.editor');
    if (!editor) return;
    const { area, url: campo } = parti(editor);
    const url = campo.value.trim();
    if (!INDIRIZZO_VALIDO.test(url)) {
        campo.focus();
        return;
    }
    area.focus();
    const sel = window.getSelection();
    if (selezioneSalvata) {
        sel.removeAllRanges();
        sel.addRange(selezioneSalvata);
    }
    if (!sel.rangeCount || sel.getRangeAt(0).collapsed) {
        const a = document.createElement('a');
        a.href = url;
        a.textContent = url;
        if (sel.rangeCount) {
            sel.getRangeAt(0).insertNode(a);
        } else {
            area.appendChild(a);
        }
    } else {
        document.execCommand('createLink', false, url);
    }
    annullaLink();
}
