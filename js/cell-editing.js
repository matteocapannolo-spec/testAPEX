let currentOptionsRow = null;

async function commitFieldEdit(rowIndex, colName, newVal, errorPrefix = "Salvataggio non riuscito", beforePersist) {
    saveStateToHistory();
    let oldVal = data[rowIndex][colName];
    data[rowIndex][colName] = newVal;
    if (beforePersist) beforePersist();

    try {
        const nomeProd = data[rowIndex]['Nome Prodotto'], verProd = data[rowIndex]['Versione Prodotto'];
        const auditId = await writeAuditLog(nomeProd, verProd, colName, oldVal, newVal);
        trackAuditEntry(auditId, nomeProd, verProd, colName, oldVal, newVal);
        await updateProductInSupabase(data[rowIndex]);
        return true;
    } catch (err) {
        console.error(err);
        data[rowIndex][colName] = oldVal;
        showToast(errorPrefix + ": " + err.message);
        return false;
    }
}

function openOptions(rowIndex) {
    currentOptionsRow = rowIndex;
    const row = data[rowIndex];
    document.getElementById('modalProdName').value = row['Nome Prodotto'] || '';
    document.getElementById('modalVerName').innerText = row['Versione Prodotto'] || '';
    document.getElementById('catalogToggle').checked = isValInCatalog(row['In Catalogo']);
    document.getElementById('optionsModal').classList.add('show');
}

function closeModal() {
    document.getElementById('optionsModal').classList.remove('show');
    currentOptionsRow = null;
}

async function saveModalProdName(inputEl) {
    if (currentOptionsRow === null) return;
    const newVal = inputEl.value.trim();
    const oldVal = data[currentOptionsRow]['Nome Prodotto'];
    if (newVal === oldVal) return;

    const ok = await commitFieldEdit(currentOptionsRow, 'Nome Prodotto', newVal);
    if (ok) renderTable(); else inputEl.value = oldVal;
}

function deleteCurrentVersion() {
    if (currentOptionsRow === null) return;
    const row = data[currentOptionsRow];
    const label = `${row['Nome Prodotto'] || ''} (${row['Versione Prodotto'] || ''})`;
    document.getElementById('deleteConfirmLabel').innerText = label;
    document.getElementById('deleteConfirmModal').classList.add('show');
}

function closeDeleteConfirmModal() {
    document.getElementById('deleteConfirmModal').classList.remove('show');
}

async function confirmDeleteVersion() {
    if (currentOptionsRow === null) { closeDeleteConfirmModal(); return; }
    const row = data[currentOptionsRow];

    try {
        if (row.id) {
            const { error } = await supabase.from('products').delete().eq('id', row.id);
            if (error) throw error;
        }
        await writeAuditLog(row['Nome Prodotto'], row['Versione Prodotto'], 'Eliminazione Prodotto', 'Presente nel catalogo', 'Prodotto eliminato definitivamente');
        data.splice(currentOptionsRow, 1);
        closeDeleteConfirmModal();
        closeModal();
        renderTable();
        showToast("Versione eliminata.");
    } catch (err) {
        console.error(err);
        closeDeleteConfirmModal();
        showToast("Eliminazione non riuscita: " + err.message);
    }
}

async function confirmProductReview(rowIndex) {
    if (!isAdmin()) return;
    if (!confirm("Hai davvero svolto la revisione di questo prodotto?")) return;

    const row = data[rowIndex];
    const oldLabel = row.lastReviewedAt ? new Date(row.lastReviewedAt).toLocaleDateString('it-IT') : 'mai';
    const newDate = new Date();
    const newLabel = newDate.toLocaleDateString('it-IT');

    try {
        const { error } = await supabase.from('products').update({ last_reviewed_at: newDate }).eq('id', row.id);
        if (error) throw error;
        row.lastReviewedAt = newDate.toISOString();
        await writeAuditLog(row['Nome Prodotto'], row['Versione Prodotto'], 'Revisione Prodotto', oldLabel, newLabel);
        renderTable();
        showToast("Prodotto segnato come revisionato.");
    } catch (err) {
        console.error(err);
        showToast("Revisione non riuscita: " + err.message);
    }
}

async function handleCatalogToggle(e) {
    if (currentOptionsRow === null) return;
    const isChecked = e.target.checked;
    const ok = await commitFieldEdit(currentOptionsRow, 'In Catalogo', isChecked ? "Sì" : "No", "Operazione non consentita");
    if (!ok) e.target.checked = !isChecked;
    renderTable();
}

function copyText(text) { navigator.clipboard.writeText(text).then(() => showToast("Copiato negli appunti!")); }
function showToast(msg) { const toast = document.getElementById('toast'); toast.innerText = msg; toast.style.display = 'block'; setTimeout(() => toast.style.display = 'none', 2500); }

function editCell(btn, rowIndex, colName) {
    if (["Nome Prodotto", "Stato Globale", "Miniatura", "QR CODE ITA", "QR CODE ENG", "Docs", "Visual", "Tickets"].includes(colName)) return;

    let td = btn ? btn.closest('td') : null;
    const existing = document.querySelector('.editing-cell');
    if (existing && existing !== td) renderTable();
    if (!td) return;

    const contentDiv = td.querySelector('.cell-content');
    let currentValue = data[rowIndex][colName] || "";
    td.classList.add('editing-cell');

    if (singleSelectFields[colName]) {
        let optionsHtml = singleSelectFields[colName].map(opt => `<option value="${opt}" ${opt.toLowerCase() === currentValue.toLowerCase() ? 'selected' : ''}>${opt}</option>`).join('');
        contentDiv.innerHTML = `<select class="standard-select" onblur="saveSimpleCell(this, ${rowIndex}, '${colName}')"><option value="">-- Seleziona --</option>${optionsHtml}</select>`;
        setTimeout(() => contentDiv.querySelector('select').focus(), 50);
    } else if (colName in PERSONAL_COLUMN_OWNERS) {
        if (currentUserEmail !== PERSONAL_COLUMN_OWNERS[colName]) { td.classList.remove('editing-cell'); return; }
        contentDiv.innerHTML = buildPersonalColumnEditor(rowIndex, colName, currentValue);
        setTimeout(() => contentDiv.querySelector('textarea')?.focus(), 50);
    } else if (colName === "Categoria Prodotto" || colName === "Applicazioni") {
        const isCat = colName === "Categoria Prodotto";
        const listId = `editList-${rowIndex}-${isCat ? 'Cat' : 'App'}`;
        const headId = `editHead-${rowIndex}-${isCat ? 'Cat' : 'App'}`;
        const optionsList = isCat ? categoriePossibili : applicazioniPossibili;
        const colorsDict = isCat ? categoryColors : applicationColors;
        const currentValues = currentValue.split(',').map(s => s.trim()).filter(s => s !== "");
        let currentHeadText = currentValues.length > 0 ? (currentValues.length === 1 ? currentValues[0] : currentValues.length + " selezionati") : "Seleziona...";

        let listHtml = optionsList.map(item => {
            let isSelected = currentValues.includes(item) ? 'checked' : '';
            let c = colorsDict[item] || (isCat ? defaultCatColor : defaultAppColor);
            return `<label class="dropdown-item" onclick="event.stopPropagation()">
                <input type="checkbox" value="${item}" ${isSelected} onchange="updateCustomEdit('${listId}', '${headId}', 'Seleziona...', ${rowIndex}, '${colName}')">
                <span class="color-dot" style="background-color: ${c.bg};"></span> ${item}
            </label>`;
        }).join('');

        contentDiv.innerHTML = `<div class="custom-dropdown" style="width: 250px;">
            <div class="dropdown-header" id="${headId}" onclick="toggleDropdown('${listId}', event)">${currentHeadText}</div>
            <div class="dropdown-list show" id="${listId}" style="border: 2px solid var(--color-info);">${listHtml}</div>
        </div>`;
    } else {
        contentDiv.innerHTML = `<input type="text" class="edit-input" value="${escapeHtml(currentValue)}" onblur="saveSimpleCell(this, ${rowIndex}, '${colName}')" onkeypress="if(event.key === 'Enter') this.blur()">`;
        setTimeout(() => contentDiv.querySelector('input').focus(), 50);
    }
    if (td.querySelector('.cell-actions')) td.querySelector('.cell-actions').style.display = 'none';
}

async function updateCustomEdit(listId, headId, defaultText, rowIndex, colName) {
    const checkedBoxes = Array.from(document.querySelectorAll(`#${listId} input:checked`));
    const newVal = checkedBoxes.map(cb => cb.value).join(', ');

    updateFilterHeader(listId, headId, defaultText);

    const ok = await commitFieldEdit(rowIndex, colName, newVal);
    if (!ok) renderTable();
}

async function saveSimpleCell(inputElement, rowIndex, colName) {
    let val = inputElement.value;
    let oldVal = data[rowIndex][colName];

    if (oldVal !== val) {
        await commitFieldEdit(rowIndex, colName, val, "Salvataggio non riuscito", () => {
            if (colName === "Su sito" && val.toLowerCase() === "no") {
                data[rowIndex]['Pagina Web ITA'] = ""; data[rowIndex]['Pagina Web ENG'] = "";
                data[rowIndex]['Descrizione Meta ITA'] = ""; data[rowIndex]['Descrizione Meta ENG'] = "";
            }
        });
    }
    renderTable();
}
