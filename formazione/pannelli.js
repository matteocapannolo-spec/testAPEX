
const testa = (titolo, id) => `
        <div class="testa-pannello">
            <h3>${titolo}</h3>
            <button type="button" class="btn btn-primario" data-action="chiudi-pannello" data-dialogo="${id}">Chiudi</button>
        </div>`;

const tabella = (nome, classi = 'tabella-piena') => `
        <div class="tabella-contenitore ${classi}"><table class="tabella-dati"><thead id="${nome}-testa"></thead><tbody id="${nome}-corpo"></tbody></table>
            <p class="tabella-vuota" id="${nome}-vuoto" hidden></p></div>`;

const PANNELLI = [];

PANNELLI.push(`
    <dialog class="apex-dialog dialogo-ampio" id="pannelloConferme">${testa('Da confermare', 'pannelloConferme')}
        <p class="nota-pannello">Le ore dichiarate dai colleghi. Finché non le confermi non entrano nelle statistiche. Passa sul nome per confermare o respingere.</p>
        ${tabella('conferme')}
    </dialog>
`);

PANNELLI.push(`
    <dialog class="apex-dialog dialogo-ampio" id="pannelloAssegnazioni">${testa('Assegnazioni', 'pannelloAssegnazioni')}
        <div class="header-actions-row">
            <div class="header-actions">
                <button type="button" class="btn btn-export" data-action="assegna"><span class="material-symbols-outlined">group_add</span> Assegna corso</button>
            </div>
            <div class="stats-container">
                <div class="stat-chip"><span class="stat-chip-label">Assegnazioni</span><span class="stat-chip-value" id="statAssegnazioni">0</span></div>
            </div>
        </div>
        <div class="filters-container">
            <div class="filter-group"><label for="assAnno">Anno del piano</label><select id="assAnno" class="standard-select"></select></div>
            <div class="filter-group"><label for="assPersona">Persona</label><select id="assPersona" class="standard-select"></select></div>
            <div class="filter-group"><label for="assCorso">Corso</label><select id="assCorso" class="standard-select"></select></div>
            <div class="filter-group"><label for="assStato">Stato</label><select id="assStato" class="standard-select"></select></div>
            <div class="filter-group filter-group-fine"><label>&nbsp;</label>
                <button type="button" class="btn btn-theme" data-action="azzera-assegnazioni"><span class="material-symbols-outlined">restart_alt</span> Resetta Filtri</button></div>
        </div>
        ${tabella('ass')}
    </dialog>
`);

PANNELLI.push(`
    <dialog class="apex-dialog dialogo-ampio" id="pannelloCatalogo">${testa('Catalogo dei corsi', 'pannelloCatalogo')}
        <div class="header-actions-row">
            <div class="header-actions">
                <button type="button" class="btn btn-export" data-action="nuovo-corso"><span class="material-symbols-outlined">add_box</span> Nuovo corso</button>
            </div>
            <div class="stats-container">
                <div class="stat-chip"><span class="stat-chip-label">Corsi</span><span class="stat-chip-value" id="statCorsi">0</span></div>
            </div>
        </div>
        <div class="filters-container">
            <div class="filter-group"><label for="catTipo">Tipo</label><select id="catTipo" class="standard-select"></select></div>
            <div class="filter-group"><label for="catAttivi">Mostra</label>
                <select id="catAttivi" class="standard-select"><option value="">Solo attivi</option><option value="tutti">Anche disattivati</option></select></div>
            <div class="filter-group filter-group-fine"><label>&nbsp;</label>
                <button type="button" class="btn btn-theme" data-action="azzera-catalogo"><span class="material-symbols-outlined">restart_alt</span> Resetta Filtri</button></div>
        </div>
        ${tabella('cat')}
    </dialog>
`);

PANNELLI.push(`
    <dialog class="apex-dialog dialogo-ampio" id="pannelloStatistiche">${testa('Statistiche', 'pannelloStatistiche')}
        <div class="pannello-scorre">
            <div class="header-actions-row">
                <div class="filters-container">
                    <div class="filter-group"><label for="statAnno">Anno</label><select id="statAnno" class="standard-select"></select></div>
                </div>
                <div class="stats-container">
                    <div class="stat-chip"><span class="stat-chip-label">Ore</span><span class="stat-chip-value" id="statOreTot">0 h</span></div>
                    <div class="stat-chip"><span class="stat-chip-label">Persone formate</span><span class="stat-chip-value" id="statPersone">0</span></div>
                    <div class="stat-chip"><span class="stat-chip-label">Costo sostenuto</span><span class="stat-chip-value" id="statCostoSostenuto">—</span></div>
                    <div class="stat-chip" title="Il costo di tutti i corsi assegnati nel piano di quest'anno, fatti o no"><span class="stat-chip-label">Costo previsto</span><span class="stat-chip-value" id="statCostoPrevisto">—</span></div>
                </div>
            </div>
            <p class="nota-pannello">Contano solo le ore confermate, nel mese in cui si è fatto il corso. Salute e sicurezza ha i suoi conti, nella sua scheda.</p>
            <div class="griglia-stat">
                <div>
                    <h2 class="titolo-sezione">Per mese</h2>
                    ${tabella('statMesi', '')}
                </div>
                <div>
                    <h2 class="titolo-sezione">Per tipo di corso</h2>
                    ${tabella('statTipi', '')}
                    <h2 class="titolo-sezione">Per reparto</h2>
                    ${tabella('statReparti', '')}
                </div>
            </div>
        </div>
    </dialog>
`);

export function montaPannelliFormazione() {
    document.body.insertAdjacentHTML('beforeend', PANNELLI.join(''));
}
