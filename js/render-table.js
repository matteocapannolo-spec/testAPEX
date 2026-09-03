function isValInCatalog(val) {
    if (val === undefined || val === null || val === "") return true;
    let str = val.toString().trim().toLowerCase();
    return (str === "sì" || str === "si" || str === "true" || str === "1" || val === true);
}

function getColumnClasses(col, stickyLeftOffsets, borderRightColumns) {
    let classes = [];
    let isMotherCol = Object.values(sectionsConfig).some(s => s.motherCols.includes(col));
    if (isMotherCol) classes.push("mother-col");

    if (col === "Brand Prodotto") classes.push("col-brand");
    if (col === "Nome Prodotto") classes.push("col-nome-prodotto");
    if (col === "Stato Globale") classes.push("col-icon");
    if (col === "Tickets") classes.push("col-tickets");
    if (col === "Miniatura") classes.push("col-miniatura");
    if (col === "Versione Prodotto") classes.push("col-versione");
    if (col === "Codice Univoco") classes.push("col-codice");

    let stickyLeft = null;
    if (col in stickyLeftOffsets) { classes.push("sticky-col"); stickyLeft = stickyLeftOffsets[col]; }

    if (col === "QR CODE ITA" || col === "QR CODE ENG") classes.push("col-narrow");
    if (col === "Su sito" || col === "Docs" || col === "Visual") classes.push("col-x1");
    if (col === "Pagina Web ITA" || col === "Pagina Web ENG") classes.push("col-web-lang");
    if (col.includes("Datasheet Doc") || col.includes("PDF Datasheet") || col === "Folder Datasheet" || col === "CE" || col === "RoHS" || col === "Immagini Prodotto" || col === "Foto Principale" || col === "foto formato Webp" || col === "Render Ambientali" || col === "Serigrafia") classes.push("col-btn-cell");
    if (col === "Descrizione Meta ITA" || col === "Descrizione Meta ENG" || col === "Note/WebSite") classes.push("col-meta-desc");
    if (col === "Categoria Prodotto" || col === "Applicazioni") classes.push("col-pills");
    if (col in PERSONAL_COLUMN_OWNERS) classes.push("col-personal");
    if (borderRightColumns.has(col)) classes.push("section-border-right");

    return { classes, stickyLeft };
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
    thead.innerHTML = ''; tbody.innerHTML = '';

    let visibleColumns = [];
    let borderRightColumns = new Set();
    let toggleButtons = {};

    let stickyLeftOffsets = {};
    {
        let acc = 0;
        (stickyColumns || []).forEach(c => { stickyLeftOffsets[c] = acc; acc += STICKY_COLUMN_WIDTHS[c] || 0; });
    }

    for (let col of columns) {
        let isMother = false, isChild = false, secId = null;

        for (const [id, secData] of Object.entries(sectionsConfig)) {
            if (secData.motherCols.includes(col)) { isMother = true; secId = id; break; }
            if (secData.childCols.includes(col)) { isChild = true; secId = id; break; }
        }

        if (secId) {
            const secData = sectionsConfig[secId];
            if (isMother) {
                visibleColumns.push(col);
                if (col === secData.motherCols[secData.motherCols.length - 1]) {
                    toggleButtons[col] = secId;
                    if (!secData.isExpanded) borderRightColumns.add(col);
                }
            } else if (isChild) {
                if (secData.isExpanded) {
                    visibleColumns.push(col);
                    if (col === secData.childCols[secData.childCols.length - 1]) borderRightColumns.add(col);
                }
            }
        } else if (col === 'In Catalogo') {
        } else if (col in PERSONAL_COLUMN_OWNERS && !isAdmin()) {
        } else { visibleColumns.push(col); }
    }

    const trHead = document.createElement('tr');
    visibleColumns.forEach(col => {
        const th = document.createElement('th');
        const { classes: thClasses, stickyLeft: thStickyLeft } = getColumnClasses(col, stickyLeftOffsets, borderRightColumns);
        th.classList.add(...thClasses);
        if (thStickyLeft !== null) th.style.left = thStickyLeft + "px";

        let headerLabel = col === 'Su sito' ? 'Web' : (col === 'Pagina Web ITA' ? 'Web 🇮🇹' : (col === 'Pagina Web ENG' ? 'Web 🇬🇧' : (col === 'foto formato Webp' ? 'Webp' : col)));
        let contentHtml = `<span class="th-label">${col === 'Stato Globale' || col === 'Miniatura' ? '' : (col === 'Tickets' ? '<span style="font-size: 0.72rem; text-transform: uppercase;">Ticket</span>' : headerLabel)}</span>`;
        if (col === "QR CODE ITA") contentHtml = `<span class="th-label">QR CODE ITA <img src="https://flagcdn.com/w20/it.png" class="flag-icon" alt="ITA"></span>`;
        if (col === "QR CODE ENG") contentHtml = `<span class="th-label">QR CODE ENG <img src="https://flagcdn.com/w20/gb.png" class="flag-icon" alt="ENG"></span>`;
        if (col === "Originale") th.title = "Gli asset originali creati dal produttore per il prodotto.";
        if (col in PERSONAL_COLUMN_OWNERS) contentHtml = buildPersonalColumnHeader(col);

        if (toggleButtons[col]) {
            let secId = toggleButtons[col];
            let isExp = sectionsConfig[secId].isExpanded;
            let icon = isExp ? 'keyboard_double_arrow_left' : 'keyboard_double_arrow_right';
            let btnHtml = `<button class="toggle-section-btn" onclick="toggleSection('${secId}')" title="${isExp ? 'Comprimi Sezione' : 'Espandi Sezione'}"><span class="material-symbols-outlined">${icon}</span></button>`;
            contentHtml = `<div class="th-content-wrapper">${contentHtml}${btnHtml}</div>`;
        }

        th.innerHTML = contentHtml;
        trHead.appendChild(th);
    });
    thead.appendChild(trHead);

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

    let spans = new Array(filteredList.length).fill(1);
    let skips = new Array(filteredList.length).fill(false);

    for (let i = 0; i < filteredList.length; i++) {
        if (skips[i]) continue;
        let count = 1;
        let currentName = (filteredList[i].row['Nome Prodotto'] || "").toString().trim().toLowerCase();
        for (let j = i + 1; j < filteredList.length; j++) {
            let nextName = (filteredList[j].row['Nome Prodotto'] || "").toString().trim().toLowerCase();
            if (currentName !== "" && currentName === nextName) { count++; skips[j] = true; } else { break; }
        }
        spans[i] = count;
    }

    filteredList.forEach((item, rIdx) => {
        let row = item.row;
        let originalIndex = item.originalIndex;

        const tr = document.createElement('tr');
        tr.setAttribute('data-index', originalIndex);

        let { isSi, isNo, urlIt, urlEn, hasIt, hasEn, hasMetaIt, hasMetaEn } = computeWebPresence(row);

        let pVer = (row['Versione Prodotto'] || row['Nome Prodotto'] || '').toString().trim().replace(/\s+/g, '_');

        let isDocsMissing = false;
        sectionsConfig["sec_3"].childCols.forEach(c => {
            if (c === "QR CODE ITA") { if (!hasIt) isDocsMissing = true; }
            else if (c === "QR CODE ENG") { if (!hasEn) isDocsMissing = true; }
            else { if (!row[c] || row[c].toString().trim() === '') isDocsMissing = true; }
        });

        let isVisualMissing = sectionsConfig["sec_4"].childCols.some(c => {
            let v = (row[c] || "").toString().trim();
            if(c === "Serigrafia") return v.toLowerCase() !== 'no' && !v.startsWith('http');
            return v === '';
        });

        visibleColumns.forEach(col => {
            if (col === "Nome Prodotto" && skips[rIdx]) return;

            const td = document.createElement('td');
            td.setAttribute('data-col', col);

            const { classes: tdClasses, stickyLeft: tdStickyLeft } = getColumnClasses(col, stickyLeftOffsets, borderRightColumns);
            td.classList.add(...tdClasses);
            if (tdStickyLeft !== null) td.style.left = tdStickyLeft + "px";
            if (col === "Nome Prodotto" && spans[rIdx] > 1) td.rowSpan = spans[rIdx];

            let cellValue = row[col] || "";
            let displayContent = escapeHtml(cellValue);

            let extraAction = (isAdmin() && col === "Versione Prodotto") ? `<button class="action-btn" title="Opzioni" onclick="openOptions(${originalIndex})"><span class="material-symbols-outlined">settings</span></button>` : "";
            let safeCopyValue = escapeForJsAttr(cellValue);

            let copyBtnHtml = (col === "Su sito") ? "" : `<button class="action-btn" title="Copia" onclick="copyText('${safeCopyValue}')"><span class="material-symbols-outlined">content_copy</span></button>`;
            let editBtnHtml = (isAdmin() && col !== "Nome Prodotto") ? `<button class="action-btn" title="Modifica" onclick="editCell(this, ${originalIndex}, '${col}')"><span class="material-symbols-outlined">edit</span></button>` : "";

            let actionsHtml = `
                <div class="cell-actions">
                    ${copyBtnHtml}
                    ${editBtnHtml}
                    ${extraAction}
                </div>
            `;

            let isCatBool = isValInCatalog(row['In Catalogo']);

            if (col === "Tickets") {
                actionsHtml = "";
                let openCount = getOpenTicketsCount(originalIndex);
                let badgeClass = openCount > 0 ? "" : "zero";
                if (openCount > 0) td.classList.add('bg-error-ticket');

                displayContent = `<div class="ticket-btn-container"><button class="ticket-btn" onclick="openTicketListModal(${originalIndex})" title="Gestisci Ticket">💬<span class="ticket-badge ${badgeClass}">${openCount}</span></button></div>`;
            } else if (col === "Stato Globale") {
                actionsHtml = "";
                if (!isCatBool) displayContent = `<div title="Fuori catalogo" class="led-dot led-gray"></div>`;
                else {
                    let hasRowError = (isSi && (!hasIt || !hasEn || !hasMetaIt || !hasMetaEn)) || isDocsMissing || isVisualMissing || (!isSi && !isNo);
                    if (hasRowError) {
                        displayContent = `<div title="Incompleto" class="led-dot led-red"></div>`;
                    } else {
                        let daysSinceReview = row.lastReviewedAt ? (Date.now() - new Date(row.lastReviewedAt).getTime()) / 86400000 : Infinity;
                        if (daysSinceReview >= 45) {
                            let clickAttr = isAdmin() ? ` onclick="confirmProductReview(${originalIndex})"` : '';
                            displayContent = `<div title="Da rivedere" class="led-dot led-purple"${clickAttr}></div>`;
                        } else {
                            displayContent = `<div title="Completo" class="led-dot led-green"></div>`;
                        }
                    }
                }
            } else if (col === "Miniatura") {
                actionsHtml = "";
                let fotoLink = row['Foto Principale'] || "";
                displayContent = fotoLink.startsWith('http') ? `<div style="display:flex; justify-content:center; align-items:center; width:100%; height:100%; overflow: hidden;"><img src="${escapeHtml(fotoLink)}" alt="Miniatura" style="width: 48px; height: 48px; object-fit: contain; pointer-events: none;"></div>` : `<div style="width: 32px; height: 32px; background: var(--surface-color); border-radius: 4px; border: 1px dashed var(--border-color); margin: auto;"></div>`;
            } else if (col === "Categoria Prodotto" && cellValue) {
                displayContent = cellValue.split(',').map(cat => {
                    let cleanName = cat.trim(); let style = categoryColors[cleanName] || defaultCatColor;
                    return `<span class="pill pill-cat" style="background-color: ${style.bg}; color: ${style.text};">${escapeHtml(cleanName)}</span>`;
                }).join('');
            } else if (col === "Applicazioni" && cellValue) {
                displayContent = cellValue.split(',').map(app => {
                    let cleanName = app.trim(); let style = applicationColors[cleanName] || defaultAppColor;
                    return `<span class="pill pill-app" style="background-color: ${style.bg}; color: ${style.text};">${escapeHtml(cleanName)}</span>`;
                }).join('');
            } else if (col === "Folder Datasheet") {
                let valStr = cellValue ? cellValue.toString().trim() : "";
                if (!valStr.startsWith("http")) { td.classList.add('bg-error'); displayContent = `<span class="pulse-warning">⚠️</span>`; }
                else displayContent = `<a href="${escapeHtml(valStr)}" target="_blank" rel="noopener noreferrer" title="FOLDER_DATASHEET_${escapeHtml(pVer)}" class="btn-link-pill">📂📃</a>`;
            } else if (col.includes("Datasheet Doc") || col.includes("PDF Datasheet")) {
                let valStr = cellValue ? cellValue.toString().trim() : "";
                if (!valStr.startsWith("http")) { td.classList.add('bg-error'); displayContent = `<span class="pulse-warning">⚠️</span>`; }
                else displayContent = `<a href="${escapeHtml(valStr)}" target="_blank" rel="noopener noreferrer" class="btn-link-pill">${col.includes("PDF") ? "📑" : "📝"}<img src="https://flagcdn.com/w20/${col.includes("[ITA]") ? "it" : "gb"}.png" class="flag-icon"></a>`;
            } else if (col === "CE" || col === "RoHS") {
                let valStr = cellValue ? cellValue.toString().trim() : "";
                if (!valStr.startsWith("http")) { td.classList.add('bg-error'); displayContent = `<span class="pulse-warning">⚠️</span>`; }
                else displayContent = `<a href="${escapeHtml(valStr)}" target="_blank" rel="noopener noreferrer" title="${col}_${escapeHtml(pVer)}" class="btn-link-pill">${col === "CE" ? "🇪🇺" : "♻️"}</a>`;
            } else if (col === "Immagini Prodotto" || col === "Foto Principale" || col === "foto formato Webp" || col === "Render Ambientali") {
                let valStr = cellValue ? cellValue.toString().trim() : "";
                if (!valStr.startsWith("http")) { td.classList.add('bg-error'); displayContent = `<span class="pulse-warning">⚠️</span>`; }
                else {
                    let icon = col === "Foto Principale" ? "📷" : (col === "foto formato Webp" ? "🖼️" : "🎨");
                    displayContent = `<a href="${escapeHtml(valStr)}" target="_blank" rel="noopener noreferrer" class="btn-link-pill">${icon}</a>`;
                }
            } else if (col === "Serigrafia") {
                let valStr = cellValue ? cellValue.toString().trim() : "";
                if (valStr.toLowerCase() === 'no') displayContent = `<div style="text-align: center; font-weight: bold; opacity: 0.5;">/</div>`;
                else if (valStr.startsWith('http')) displayContent = `<a href="${escapeHtml(valStr)}" target="_blank" rel="noopener noreferrer" class="btn-link-pill">📄</a>`;
                else { displayContent = `<span class="pulse-warning">⚠️</span>`; td.classList.add('bg-error'); }
            } else if (col === "Originale") {
                let valStr = cellValue ? cellValue.toString().trim() : "";
                if (valStr.toLowerCase() === 'no') displayContent = `<div style="text-align: center; font-weight: bold; opacity: 0.5;">/</div>`;
                else if (valStr.startsWith('http')) displayContent = `<a href="${escapeHtml(valStr)}" target="_blank" rel="noopener noreferrer" class="btn-link-pill">🏭</a>`;
                else { displayContent = `<span class="pulse-warning">⚠️</span>`; td.classList.add('bg-error'); }
            } else if (col === "Docs" || col === "Visual") {
                actionsHtml = "";
                let isMissing = col === "Docs" ? isDocsMissing : isVisualMissing;
                displayContent = `<div class="status-icon"><span class="material-symbols-outlined" style="color: var(--color-${isMissing ? 'error' : 'success'});">${isMissing ? 'cancel' : 'check_circle'}</span></div>`;
            } else if (col === "Su sito") {
                if (isSi) displayContent = (hasIt && hasEn && hasMetaIt && hasMetaEn) ? `<div class="status-icon"><span class="material-symbols-outlined" style="color: var(--color-success);">check_circle</span></div>` : `<div class="status-icon"><span class="material-symbols-outlined" style="color: var(--color-error);">cancel</span></div>`;
                else if (isNo) displayContent = `<div style="text-align: center; opacity: 0.6;">No</div>`;
                else { displayContent = `<span class="pulse-warning">⚠️</span>`; td.classList.add('bg-error'); }
            } else if (col === "Pagina Web ITA" || col === "Pagina Web ENG") {
                let hasLink = col === "Pagina Web ITA" ? hasIt : hasEn;
                if (isNo) displayContent = `<div style="text-align: center; opacity: 0.5;">/</div>`;
                else if (isSi && !hasLink) { td.classList.add('bg-error'); displayContent = `<span class="pulse-warning">⚠️</span>`; }
                else if (hasLink) displayContent = `<a href="${escapeHtml(cellValue)}" target="_blank" rel="noopener noreferrer" class="btn-link-pill">🌐<img src="https://flagcdn.com/w20/${col === "Pagina Web ITA" ? "it" : "gb"}.png" class="flag-icon"></a>`;
            } else if (col === "Descrizione Meta ITA" || col === "Descrizione Meta ENG") {
                let hasMeta = col === "Descrizione Meta ITA" ? hasMetaIt : hasMetaEn;
                if (isNo) displayContent = `<div style="text-align: center; opacity: 0.5;">/</div>`;
                else if (isSi && !hasMeta) { td.classList.add('bg-error'); displayContent = `<span class="pulse-warning">⚠️</span>`; }
            } else if (col === "QR CODE ITA" || col === "QR CODE ENG") {
                actionsHtml = "";
                let urlTarget = col === "QR CODE ITA" ? urlIt : urlEn;
                if (/^https?:\/\//i.test(urlTarget)) {
                    displayContent = `<div style="display:flex; justify-content:center; align-items:center; cursor: pointer;" onclick="openQrModal('${escapeForJsAttr(urlTarget)}', '${col}', ${originalIndex})"><img src="https://api.qrserver.com/v1/create-qr-code/?size=48x48&data=${encodeURIComponent(urlTarget)}&format=png&bgcolor=transparent" alt="QR" style="width: 38px; height: 38px; border-radius: 4px;"></div>`;
                } else { displayContent = `<span class="pulse-warning">⚠️</span>`; td.classList.add('bg-error'); }
            } else if (col in PERSONAL_COLUMN_OWNERS) {
                const personalCol = buildPersonalColumnCell(col, cellValue, originalIndex);
                displayContent = personalCol.displayContent;
                actionsHtml = personalCol.actionsHtml;
            }

            if (td.classList.contains('bg-error') && (displayContent === "" || displayContent === undefined)) displayContent = `<span class="pulse-warning">⚠️</span>`;

            td.innerHTML = `<div class="cell-content">${displayContent}</div>${actionsHtml}`;
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });

    updateStats();
}
