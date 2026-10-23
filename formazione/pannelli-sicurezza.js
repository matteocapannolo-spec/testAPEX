
const testa = (titolo, id, idTitolo = '') => `
        <div class="testa-pannello">
            <h3${idTitolo ? ` id="${idTitolo}"` : ''}>${titolo}</h3>
            <button type="button" class="btn btn-primario" data-action="chiudi-pannello" data-dialogo="${id}">Chiudi</button>
        </div>`;

const PANNELLI = [];

PANNELLI.push(`
    <dialog class="apex-dialog dialogo-ampio" id="pannelloAnagrafica">${testa('Persone dello scadenzario', 'pannelloAnagrafica')}
        <div class="header-actions-row">
            <div class="header-actions">
                <button type="button" class="btn btn-export" data-action="nuova-persona-sic"><span class="material-symbols-outlined">person_add</span> Nuova persona</button>
            </div>
            <div class="filters-container">
                <div class="filter-group"><label for="anagMostra">Mostra</label>
                    <select id="anagMostra" class="standard-select"><option value="">Solo attive</option><option value="tutte">Anche non più in azienda</option></select></div>
            </div>
        </div>
        <div class="tabella-contenitore tabella-piena"><table class="tabella-dati"><thead id="anag-testa"></thead><tbody id="anag-corpo"></tbody></table>
            <p class="tabella-vuota" id="anag-vuoto" hidden></p></div>
    </dialog>
`);

PANNELLI.push(`
    <dialog class="apex-dialog dialogo-largo" id="pannelloObblighi">${testa('Obblighi', 'pannelloObblighi')}
        <div class="header-actions">
            <button type="button" class="btn btn-export" data-action="nuovo-obbligo"><span class="material-symbols-outlined">add_box</span> Nuovo obbligo</button>
        </div>
        <p class="nota-pannello">La validità qui è quella proposta: una persona può averne una sua, dalla sua casella.</p>
        <div class="tabella-contenitore"><table class="tabella-dati"><thead id="obbl-testa"></thead><tbody id="obbl-corpo"></tbody></table>
            <p class="tabella-vuota" id="obbl-vuoto" hidden></p></div>
    </dialog>
`);

PANNELLI.push(`
    <dialog class="apex-dialog dialogo-largo" id="dialogoCasella">${testa('', 'dialogoCasella', 'casTitolo')}
        <p id="casStato"></p>
        <div class="dlg-errore" id="casErrore" hidden></div>

        <h4 class="titolo-sezione" id="casTitoloFatto">Segna come fatto</h4>
        <div class="campi-tre">
            <div class="campo-affiancato"><label class="campo-label" for="casFatto">Fatto il</label><input type="date" id="casFatto" class="edit-input"></div>
            <div class="campo-affiancato"><label class="campo-label" for="casOreFatte">Ore</label><input type="text" inputmode="decimal" id="casOreFatte" class="edit-input" autocomplete="off"></div>
            <div class="campo-affiancato"><label class="campo-label" for="casCosto">Costo (€)</label><input type="text" inputmode="decimal" id="casCosto" class="edit-input" autocomplete="off"></div>
        </div>
        <div class="campi-tre">
            <div class="campo-affiancato"><label class="campo-label" for="casValiditaFatto">Validità in mesi</label><input type="text" inputmode="numeric" id="casValiditaFatto" class="edit-input" autocomplete="off"></div>
            <div class="campo-affiancato"><label class="campo-label" for="casEnte">Ente</label><input type="text" id="casEnte" class="edit-input" maxlength="200" autocomplete="off"></div>
            <div class="campo-affiancato"><label class="campo-label" for="casAttestato">Attestato su Drive</label><input type="url" id="casAttestato" class="edit-input" placeholder="https://…" autocomplete="off" spellcheck="false"></div>
        </div>
        <div class="riga-azione">
            <button type="button" class="btn btn-theme" data-action="annulla-modifica-registrazione" id="casAnnullaModifica" hidden>Annulla modifica</button>
            <button type="button" class="btn btn-export" data-action="registra-fatto" id="casRegistra"><span class="material-symbols-outlined">task_alt</span> Registra</button>
        </div>

        <h4 class="titolo-sezione">Situazione</h4>
        <label class="scelta-riga"><input type="checkbox" id="casRichiesto"> Richiesto per questa persona</label>
        <div class="campi-tre">
            <div class="campo-affiancato"><label class="campo-label" for="casScadenza">Scadenza</label><input type="date" id="casScadenza" class="edit-input"></div>
            <div class="campo-affiancato"><label class="campo-label" for="casValidita">Validità in mesi (sua)</label><input type="text" inputmode="numeric" id="casValidita" class="edit-input" autocomplete="off"></div>
            <div class="campo-affiancato"><label class="campo-label" for="casOre">Ore dell'ultimo</label><input type="text" inputmode="decimal" id="casOre" class="edit-input" autocomplete="off"></div>
        </div>
        <div class="campi-affiancati">
            <div class="campo-affiancato"><label class="campo-label" for="casAppuntamento">Appuntamento</label><select id="casAppuntamento" class="standard-select"></select></div>
            <div class="campo-affiancato"><label class="campo-label" for="casGiornate">Giornate</label><select id="casGiornate" class="standard-select"></select></div>
        </div>
        <div class="giornate" id="casDate"></div>
        <label class="campo-label" for="casNote">Note</label>
        <textarea id="casNote" class="form-textarea" rows="2" maxlength="1000"></textarea>
        <div class="riga-azione"><button type="button" class="btn btn-primario" data-action="salva-casella">Salva situazione</button></div>

        <h4 class="titolo-sezione">Storico</h4>
        <div class="storico" id="casStorico"></div>
    </dialog>
`);

PANNELLI.push(`
    <dialog class="apex-dialog dialogo-largo" id="dialogoPersonaSic">
        <h3 id="psTitolo">Persona</h3>
        <div class="dlg-errore" id="psErrore" hidden></div>
        <div class="campi-affiancati">
            <div class="campo-affiancato"><label class="campo-label" for="psCognome">Cognome</label><input type="text" id="psCognome" class="edit-input" maxlength="80" autocomplete="off"></div>
            <div class="campo-affiancato"><label class="campo-label" for="psNome">Nome</label><input type="text" id="psNome" class="edit-input" maxlength="80" autocomplete="off"></div>
        </div>
        <div class="campi-affiancati">
            <div class="campo-affiancato"><label class="campo-label" for="psAzienda">Azienda</label>
                <select id="psAzienda" class="standard-select"><option value="tt_group">tt group</option><option value="staim">Staim Holding</option></select></div>
            <div class="campo-affiancato" id="rigaEmailStaim"><label class="campo-label" for="psEmail">Email</label><input type="email" id="psEmail" class="edit-input" maxlength="200" autocomplete="off" spellcheck="false"></div>
        </div>
        <p class="nota-pannello" id="psNotaAzienda" hidden>Senza account la persona è di tt group: l'azienda si sceglie dopo aver collegato il suo account, qui sotto.</p>
        <div class="campi-affiancati">
            <div class="campo-affiancato"><label class="campo-label" for="psNascita">Data di nascita</label><input type="date" id="psNascita" class="edit-input"></div>
            <div class="campo-affiancato"><label class="campo-label" for="psLuogo">Luogo di nascita</label><input type="text" id="psLuogo" class="edit-input" maxlength="120" autocomplete="off"></div>
        </div>
        <div class="campi-affiancati">
            <div class="campo-affiancato"><label class="campo-label" for="psCf">Codice fiscale</label><input type="text" id="psCf" class="edit-input" maxlength="16" autocomplete="off" spellcheck="false"></div>
            <div class="campo-affiancato"><label class="campo-label" for="psGuida">Guida mezzi aziendali (patente B)</label>
                <select id="psGuida" class="standard-select"><option value="">Non indicato</option><option value="si">Sì</option><option value="no">No</option></select></div>
        </div>
        <label class="campo-label" for="psMansione">Mansione</label>
        <input type="text" id="psMansione" class="edit-input" maxlength="200" autocomplete="off">
        <label class="campo-label" for="psAccount">Account</label>
        <select id="psAccount" class="standard-select"></select>
        <label class="campo-label" for="psNote">Note</label>
        <textarea id="psNote" class="form-textarea" rows="2" maxlength="1000"></textarea>
        <label class="scelta-riga"><input type="checkbox" id="psAttiva"> In azienda: compare nello scadenzario</label>
        <div class="apex-dialog-actions">
            <button type="button" class="btn btn-theme" data-action="chiudi-pannello" data-dialogo="dialogoPersonaSic">Annulla</button>
            <button type="button" class="btn btn-primario" data-action="salva-persona-sic">Salva</button>
        </div>
    </dialog>
`);

PANNELLI.push(`
    <dialog class="apex-dialog" id="dialogoObbligo">
        <h3 id="obTitolo">Obbligo</h3>
        <div class="dlg-errore" id="obErrore" hidden></div>
        <div class="campi-nome-emoji">
            <div class="campo-affiancato"><label class="campo-label" for="obEmoji">Emoji</label><input type="text" id="obEmoji" class="edit-input" maxlength="16" autocomplete="off"></div>
            <div class="campo-affiancato"><label class="campo-label" for="obNome">Nome</label><input type="text" id="obNome" class="edit-input" maxlength="120" autocomplete="off"></div>
        </div>
        <div class="campi-affiancati">
            <div class="campo-affiancato"><label class="campo-label" for="obTipo">Tipo</label>
                <select id="obTipo" class="standard-select"><option value="corso">Corso</option><option value="visita">Visita medica</option></select></div>
            <div class="campo-affiancato"><label class="campo-label" for="obValidita">Validità in mesi</label><input type="text" inputmode="numeric" id="obValidita" class="edit-input" placeholder="Vuoto = non scade" autocomplete="off"></div>
        </div>
        <div class="campi-affiancati">
            <div class="campo-affiancato"><label class="campo-label" for="obOre">Ore previste</label><input type="text" inputmode="decimal" id="obOre" class="edit-input" autocomplete="off"></div>
            <div class="campo-affiancato"><label class="campo-label" for="obOrdine">Posizione nella griglia</label><input type="number" id="obOrdine" class="edit-input"></div>
        </div>
        <label class="scelta-riga"><input type="checkbox" id="obAttivo"> Attivo: ha una colonna nella griglia</label>
        <div class="apex-dialog-actions">
            <button type="button" class="btn btn-theme" data-action="chiudi-pannello" data-dialogo="dialogoObbligo">Annulla</button>
            <button type="button" class="btn btn-primario" data-action="salva-obbligo">Salva</button>
        </div>
    </dialog>
`);

export function montaPannelliSicurezza() {
    document.body.insertAdjacentHTML('beforeend', PANNELLI.join(''));
}
