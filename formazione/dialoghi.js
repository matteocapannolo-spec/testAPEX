
const PANNELLI = [];

PANNELLI.push(`
    <dialog class="apex-dialog" id="dialogoDichiara">
        <h3>Ho fatto questo corso</h3>
        <p id="dichTitolo"></p>
        <div class="dlg-errore" id="dichErrore" hidden></div>
        <div class="campi-affiancati">
            <div class="campo-affiancato"><label class="campo-label" for="dichOre">Ore spese</label>
                <input type="text" inputmode="decimal" id="dichOre" class="edit-input" autocomplete="off"></div>
            <div class="campo-affiancato"><label class="campo-label" for="dichData">Data del corso</label>
                <input type="date" id="dichData" class="edit-input"></div>
        </div>
        <label class="campo-label" for="dichAttestato">Link all'attestato su Drive (se c'è)</label>
        <input type="url" id="dichAttestato" class="edit-input" placeholder="https://drive.google.com/…" autocomplete="off" spellcheck="false">
        <label class="campo-label" for="dichNota">Nota per l'amministratore</label>
        <textarea id="dichNota" class="form-textarea" rows="2" maxlength="1000"></textarea>
        <div class="apex-dialog-actions">
            <button type="button" class="btn btn-theme" data-action="chiudi-dichiara">Annulla</button>
            <button type="button" class="btn btn-primario" data-action="salva-dichiara">Salva</button>
        </div>
    </dialog>
`);

PANNELLI.push(`
    <dialog class="apex-dialog" id="dialogoConferma">
        <h3>Conferma le ore</h3>
        <p id="confTitolo"></p>
        <div class="dlg-errore" id="confErrore" hidden></div>
        <div class="campi-affiancati">
            <div class="campo-affiancato"><label class="campo-label" for="confOre">Ore</label>
                <input type="text" inputmode="decimal" id="confOre" class="edit-input" autocomplete="off"></div>
            <div class="campo-affiancato"><label class="campo-label" for="confData">Data del corso</label>
                <input type="date" id="confData" class="edit-input"></div>
        </div>
        <div class="apex-dialog-actions">
            <button type="button" class="btn btn-theme" data-action="chiudi-conferma">Annulla</button>
            <button type="button" class="btn btn-primario" data-action="salva-conferma">Conferma</button>
        </div>
    </dialog>
`);

PANNELLI.push(`
    <dialog class="apex-dialog dialogo-largo" id="dialogoAssegna">
        <h3>Assegna un corso</h3>
        <div class="dlg-errore" id="nuovaErrore" hidden></div>
        <label class="campo-label" for="nuovaCorso">Corso</label>
        <select id="nuovaCorso" class="standard-select"></select>
        <div class="campi-tre">
            <div class="campo-affiancato"><label class="campo-label" for="nuovaAnno">Anno del piano</label>
                <input type="number" id="nuovaAnno" class="edit-input" min="2020" max="2100"></div>
            <div class="campo-affiancato"><label class="campo-label" for="nuovaScadenza">Da fare entro (facoltativo)</label>
                <input type="date" id="nuovaScadenza" class="edit-input"></div>
            <div class="campo-affiancato"><label class="campo-label" for="nuovaCosto">Costo a persona</label>
                <input type="text" inputmode="decimal" id="nuovaCosto" class="edit-input" autocomplete="off"></div>
        </div>
        <div class="campo-label riga-persone">Persone
            <span><button type="button" class="link-azione" data-action="seleziona-persone" data-valore="tutte">Tutte</button> ·
            <button type="button" class="link-azione" data-action="seleziona-persone" data-valore="nessuna">Nessuna</button></span></div>
        <div class="scelte-persone" id="nuovaPersone"></div>
        <div class="apex-dialog-actions">
            <button type="button" class="btn btn-theme" data-action="chiudi-assegna">Annulla</button>
            <button type="button" class="btn btn-primario" data-action="salva-assegna">Assegna</button>
        </div>
    </dialog>
`);

PANNELLI.push(`
    <dialog class="apex-dialog" id="dialogoModifica">
        <h3>Assegnazione</h3>
        <p id="modTitolo"></p>
        <div class="dlg-errore" id="modErrore" hidden></div>
        <div class="campi-tre">
            <div class="campo-affiancato"><label class="campo-label" for="modAnno">Anno del piano</label>
                <input type="number" id="modAnno" class="edit-input" min="2020" max="2100"></div>
            <div class="campo-affiancato"><label class="campo-label" for="modScadenza">Entro il</label>
                <input type="date" id="modScadenza" class="edit-input"></div>
            <div class="campo-affiancato"><label class="campo-label" for="modCosto">Costo</label>
                <input type="text" inputmode="decimal" id="modCosto" class="edit-input" autocomplete="off"></div>
        </div>
        <label class="campo-label" for="modNote">Note</label>
        <textarea id="modNote" class="form-textarea" rows="2" maxlength="1000"></textarea>
        <label class="scelta-riga"><input type="checkbox" id="modAnnullata"> Annullata: resta nello storico, ma non conta e non va fatta</label>
        <div class="apex-dialog-actions">
            <button type="button" class="btn btn-danger" data-action="togli-conferma" id="btnTogliConferma" hidden>Togli conferma</button>
            <button type="button" class="btn btn-theme" data-action="chiudi-modifica">Annulla</button>
            <button type="button" class="btn btn-primario" data-action="salva-modifica">Salva</button>
        </div>
    </dialog>
`);

PANNELLI.push(`
    <dialog class="apex-dialog" id="dialogoPiano">
        <h3 id="pianoTitolo">Piano</h3>
        <div class="dlg-errore" id="pianoErrore" hidden></div>
        <div class="campi-affiancati">
            <div class="campo-affiancato"><label class="campo-label" for="pianoReparto">Reparto</label>
                <select id="pianoReparto" class="standard-select"></select></div>
            <div class="campo-affiancato"><label class="campo-label" for="pianoOre">Obiettivo di ore nell'anno</label>
                <input type="text" inputmode="decimal" id="pianoOre" class="edit-input" autocomplete="off"></div>
        </div>
        <label class="campo-label" for="pianoObiettivi">Obiettivi (competenze da acquisire)</label>
        <textarea id="pianoObiettivi" class="form-textarea" rows="3" maxlength="2000"></textarea>
        <div class="apex-dialog-actions">
            <button type="button" class="btn btn-theme" data-action="chiudi-piano">Annulla</button>
            <button type="button" class="btn btn-primario" data-action="salva-piano">Salva</button>
        </div>
    </dialog>
`);

PANNELLI.push(`
    <dialog class="apex-dialog" id="dialogoReparti">
        <h3>Reparti</h3>
        <p>Il nome si salva uscendo dal campo. Le persone si mettono in un reparto dalla scheda Persone.</p>
        <div class="dlg-errore" id="repartiErrore" hidden></div>
        <div class="elenco-reparti" id="elencoReparti"></div>
        <div class="riga-elenco">
            <input type="text" id="nuovoReparto" class="edit-input" placeholder="Nuovo reparto" maxlength="80" autocomplete="off">
            <button type="button" class="btn btn-export" data-action="aggiungi-reparto"><span class="material-symbols-outlined">add</span> Aggiungi</button>
        </div>
        <div class="apex-dialog-actions">
            <button type="button" class="btn btn-primario" data-action="chiudi-reparti">Chiudi</button>
        </div>
    </dialog>
`);

PANNELLI.push(`
    <dialog class="apex-dialog dialogo-largo" id="dialogoCorso">
        <h3 id="corsoTitoloDlg">Nuovo corso</h3>
        <div class="dlg-errore" id="corsoErrore" hidden></div>
        <label class="campo-label" for="corso-titolo">Titolo</label>
        <input type="text" id="corso-titolo" class="edit-input" maxlength="200" autocomplete="off">
        <div class="campi-affiancati">
            <div class="campo-affiancato"><label class="campo-label" for="corso-tipo">Tipo</label>
                <select id="corso-tipo" class="standard-select"></select></div>
            <div class="campo-affiancato"><label class="campo-label" for="corso-fornitore">Fornitore o piattaforma</label>
                <input type="text" id="corso-fornitore" class="edit-input" maxlength="200" autocomplete="off"></div>
        </div>
        <div id="rigaDocente" hidden>
            <label class="campo-label" for="corso-docente">Docente interno</label>
            <select id="corso-docente" class="standard-select"></select>
        </div>
        <div class="campi-tre">
            <div class="campo-affiancato"><label class="campo-label" for="corso-ore_previste">Ore previste</label>
                <input type="text" inputmode="decimal" id="corso-ore_previste" class="edit-input" autocomplete="off"></div>
            <div class="campo-affiancato"><label class="campo-label" for="corso-costo">Costo a persona (€)</label>
                <input type="text" inputmode="decimal" id="corso-costo" class="edit-input" autocomplete="off"></div>
            <div class="campo-affiancato"><label class="campo-label" for="corso-validita_mesi">Validità in mesi</label>
                <input type="text" inputmode="numeric" id="corso-validita_mesi" class="edit-input" placeholder="Vuoto = non scade" autocomplete="off"></div>
        </div>
        <label class="scelta-riga"><input type="checkbox" id="corso-di_norma"> Di norma: obbligatorio per legge (primo soccorso, antincendio…). Va nella scheda Di norma e non conta nel piano annuale</label>
        <label class="campo-label" for="corso-materiale_url">Link al materiale o alla piattaforma</label>
        <input type="url" id="corso-materiale_url" class="edit-input" placeholder="https://…" autocomplete="off" spellcheck="false">
        <label class="campo-label" for="corso-note">Note</label>
        <textarea id="corso-note" class="form-textarea" rows="2" maxlength="2000"></textarea>
        <label class="scelta-riga"><input type="checkbox" id="corso-attivo"> Attivo: si può assegnare</label>
        <div class="apex-dialog-actions">
            <button type="button" class="btn btn-theme" data-action="chiudi-corso">Annulla</button>
            <button type="button" class="btn btn-primario" data-action="salva-corso">Salva</button>
        </div>
    </dialog>
`);

export function montaPannelli() {
    document.body.insertAdjacentHTML('beforeend', PANNELLI.join(''));
}
