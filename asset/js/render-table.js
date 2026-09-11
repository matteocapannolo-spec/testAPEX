function isValInCatalog(val) {
    if (val === undefined || val === null || val === "") return true;
    let str = val.toString().trim().toLowerCase();
    return (str === "sì" || str === "si" || str === "true" || str === "1" || val === true);
}

function isOriginaleColumn(col) {
    return ORIGINALE_COLUMNS.includes(col);
}

function originaleCompleto(valore) {
    const v = (valore || '').toString().trim().toLowerCase();
    return v === 'no' || v.startsWith('http');
}

function computeWebPresence(row) {
    let suSitoVal = row['Su sito'] ? row['Su sito'].toString().trim().toLowerCase() : "";
    let isSi = (suSitoVal === 'sì' || suSitoVal === 'si' || suSitoVal === 'true' || suSitoVal === '1');
    let isNo = (suSitoVal === 'no' || suSitoVal === 'false' || suSitoVal === '0');

    let urlIt = (row['Pagina Web ITA'] || "").toString().trim();
    let urlEn = (row['Pagina Web ENG'] || "").toString().trim();
    let metaIt = (row['Descrizione Meta ITA'] || "").toString().trim();
    let metaEn = (row['Descrizione Meta ENG'] || "").toString().trim();

    let hasIt = /^https?:\/\//i.test(urlIt);
    let hasEn = /^https?:\/\//i.test(urlEn);
    let hasMetaIt = metaIt !== "";
    let hasMetaEn = metaEn !== "";

    return { isSi, isNo, urlIt, urlEn, hasIt, hasEn, hasMetaIt, hasMetaEn };
}

function updateStats() {
    let inCatalogCount = 0, outCatalogCount = 0;
    let totalRequiredFields = 0, totalCompletedFields = 0;

    data.forEach((row, idx) => {
        let isCatBool = isValInCatalog(row['In Catalogo']);
        if (isCatBool) inCatalogCount++; else outCatalogCount++;

        if (isCatBool) {
            let { isSi, isNo, hasIt, hasEn, hasMetaIt, hasMetaEn } = computeWebPresence(row);

            totalRequiredFields++; if (isSi || isNo) totalCompletedFields++;

            if (isSi) {
                totalRequiredFields++; if (hasIt) totalCompletedFields++;
                totalRequiredFields++; if (hasEn) totalCompletedFields++;
                totalRequiredFields++; if (hasMetaIt) totalCompletedFields++;
                totalRequiredFields++; if (hasMetaEn) totalCompletedFields++;
            }

            sectionsConfig["sec_3"].childCols.forEach(c => {
                totalRequiredFields++;
                if (c === "QR CODE ITA") { if (hasIt) totalCompletedFields++; }
                else if (c === "QR CODE ENG") { if (hasEn) totalCompletedFields++; }
                else if (isOriginaleColumn(c)) { if (originaleCompleto(row[c])) totalCompletedFields++; }
                else { if ((row[c] || "").toString().trim() !== '') totalCompletedFields++; }
            });

            sectionsConfig["sec_4"].childCols.forEach(c => {
                totalRequiredFields++;
                let v = (row[c] || "").toString().trim();
                if (c === "Serigrafia") { if (v.toLowerCase() === 'no' || v.startsWith('http')) totalCompletedFields++; }
                else { if (v !== '') totalCompletedFields++; }
            });
        }
    });

    let percentage = totalRequiredFields > 0 ? Math.round((totalCompletedFields / totalRequiredFields) * 100) : 0;
    document.getElementById('statInCatalog').innerText = inCatalogCount;
    document.getElementById('statOutCatalog').innerText = outCatalogCount;

    let progressBar = document.getElementById('statProgressBar');
    progressBar.style.width = percentage + '%';
    let barColor;
    if (percentage <= 25) barColor = 'var(--color-error)';
    else if (percentage <= 50) barColor = 'var(--color-orange)';
    else if (percentage <= 75) barColor = 'var(--color-warning)';
    else if (percentage < 100) barColor = 'var(--color-green-acid)';
    else barColor = 'var(--color-success)';
    progressBar.style.backgroundColor = barColor;

    document.getElementById('statProgressText').innerText = percentage + '%';
}

function renderTable() {
    const thead = document.getElementById('tableHeader');
    const tbody = document.getElementById('tableBody');

    const motore = window.apexTabella;
    if (!motore) {
        thead.innerHTML = '';
        tbody.innerHTML = '<tr><td>Componente tabella non caricato. Ricarica la pagina.</td></tr>';
        console.error('window.apexTabella assente: il modulo di collegamento non è stato eseguito.');
        return;
    }

    const searchVal = document.getElementById('searchInput').value.trim().toLowerCase();
    const fCatSelected = Array.from(document.querySelectorAll(`#list-filterCat input:checked`)).map(cb => cb.value);
    const fAppSelected = Array.from(document.querySelectorAll(`#list-filterApp input:checked`)).map(cb => cb.value);
    const fMissing = document.getElementById('filterMissing').value;

    let filteredList = [];
    data.forEach((row, originalIndex) => {
        let isCatBool = isValInCatalog(row['In Catalogo']);

        if (fMissing === 'fuori_catalogo' && isCatBool) return;
        if (fMissing !== '' && fMissing !== 'fuori_catalogo' && !isCatBool) return;

        if (fCatSelected.length > 0) {
            let rowCats = (row['Categoria Prodotto'] || "").split(',').map(s => s.trim());
            if (!fCatSelected.some(c => rowCats.includes(c))) return;
        }

        if (fAppSelected.length > 0) {
            let rowApps = (row['Applicazioni'] || "").split(',').map(s => s.trim());
            if (!fAppSelected.some(a => rowApps.includes(a))) return;
        }

        let hasMissingData = columns.some(col => {
            if(col === 'In Catalogo' || col === 'Docs' || col === 'Visual' || col === 'Miniatura' || col === 'Tickets') return false;
            let v = (row[col] || "").toString().trim();
            if(col === "Serigrafia") return v.toLowerCase() !== 'no' && !v.startsWith('http');
            if (isOriginaleColumn(col)) return !originaleCompleto(v);
            return v === '';
        });

        if (fMissing === 'missing' && !hasMissingData) return;
        if (fMissing === 'complete' && hasMissingData) return;

        if (searchVal !== "") {
            let name = (row['Nome Prodotto'] || "").toString().toLowerCase();
            let ver = (row['Versione Prodotto'] || "").toString().toLowerCase();
            let code = (row['Codice Univoco'] || "").toString().toLowerCase();
            let metaIt = (row['Descrizione Meta ITA'] || "").toString().toLowerCase();
            let metaEn = (row['Descrizione Meta ENG'] || "").toString().toLowerCase();
            if (!(name.includes(searchVal) || ver.includes(searchVal) || code.includes(searchVal) || metaIt.includes(searchVal) || metaEn.includes(searchVal))) return;
        }

        filteredList.push({ row, originalIndex });
    });

    filteredList.sort((a, b) => {
        if (sortPriorityField) {
            let valA = (a.row[sortPriorityField] || "").toString().trim();
            let valB = (b.row[sortPriorityField] || "").toString().trim();
            let pA = sortPriorityOrder.indexOf(valA); if (pA === -1) pA = 999;
            let pB = sortPriorityOrder.indexOf(valB); if (pB === -1) pB = 999;
            if (pA !== pB) return pA - pB;
        }
        let firstCatA = (a.row['Categoria Prodotto'] || "").split(',')[0].trim();
        let firstCatB = (b.row['Categoria Prodotto'] || "").split(',')[0].trim();
        let idxA = categoriePossibili.indexOf(firstCatA);
        let idxB = categoriePossibili.indexOf(firstCatB);
        if (idxA === -1) idxA = 999; if (idxB === -1) idxB = 999;
        if (idxA !== idxB) return idxA - idxB;
        return (a.row['Nome Prodotto'] || "").toString().trim().toLowerCase().localeCompare((b.row['Nome Prodotto'] || "").toString().trim().toLowerCase());
    });

    const indici = new Map(filteredList.map(x => [x.row, x.originalIndex]));
    const indiceDi = riga => indici.get(riga);

    motore.disegnaTabella({
        thead, tbody,
        colonne: motore.colonneDellaDashboard(columns),
        sezioni: sectionsConfig,
        righe: filteredList.map(x => x.row),
        raggruppaPer: 'Nome Prodotto',
        indiceDi,
        perRiga: motore.derivatiDiRiga,
        ctx: {
            indiceDi,
            sezioni: sectionsConfig,
            coloriCategoria: categoryColors,
            coloreCategoriaDefault: defaultCatColor,
            coloriApplicazione: applicationColors,
            coloreApplicazioneDefault: defaultAppColor
        }
    });

    updateStats();
}
