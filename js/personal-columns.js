
function buildPersonalColumnHeader(col) {
    const slot = PERSONAL_COLUMN_SLOTS[col];
    const owner = PERSONAL_COLUMN_OWNERS[col];
    const settings = personalColumnsSettings[slot] || { title: 'Colonna Personale', legend: {} };
    const isOwner = currentUserEmail === owner;
    const avatarUrl = userAvatarsByEmail[owner];
    const namePart = owner.split('@')[0];
    const initials = namePart.split('.').map(p => p.charAt(0).toUpperCase()).join('');

    const avatarHtml = avatarUrl
        ? `<img src="${escapeHtml(avatarUrl)}" class="personal-col-avatar" alt="">`
        : `<span class="personal-col-avatar personal-col-avatar-fallback">${escapeHtml(initials)}</span>`;

    const titleHtml = isOwner
        ? `<span class="personal-col-title" contenteditable="true" onclick="event.stopPropagation()" onblur="renamePersonalColumn(${slot}, this)" onkeydown="if(event.key==='Enter'){event.preventDefault(); this.blur();}">${escapeHtml(settings.title)}</span>`
        : `<span class="personal-col-title">${escapeHtml(settings.title)}</span>`;

    return `<div class="personal-col-header" title="${escapeHtml(owner)}">
        ${avatarHtml}
        ${titleHtml}
        <button class="action-btn personal-col-legend-btn" title="Imposta Legenda" onclick="event.stopPropagation(); openLegendModal(${slot})"><span class="material-symbols-outlined">palette</span></button>
    </div>`;
}

function buildPersonalColumnCell(col, cellValue, originalIndex) {
    const owner = PERSONAL_COLUMN_OWNERS[col];
    const slot = PERSONAL_COLUMN_SLOTS[col];
    const isOwner = currentUserEmail === owner;
    const legend = ((personalColumnsSettings[slot] || {}).legend) || {};
    const cellData = (cellValue && typeof cellValue === 'object') ? cellValue : { text: '', tags: [] };
    const tags = Array.isArray(cellData.tags) ? cellData.tags : [];

    const tagsHtml = tags.map(emoji => `<span class="personal-col-tag" title="${escapeHtml(legend[emoji] || '')}">${escapeHtml(emoji)}</span>`).join('');
    const textHtml = cellData.text ? `<div class="personal-col-text">${escapeHtml(cellData.text)}</div>` : '';
    const displayContent = `<div class="personal-col-cell">${tagsHtml ? `<div class="personal-col-tags">${tagsHtml}</div>` : ''}${textHtml}</div>`;

    const safeCopyText = escapeForJsAttr(cellData.text || '');
    const copyBtn = `<button class="action-btn" title="Copia" onclick="copyText('${safeCopyText}')"><span class="material-symbols-outlined">content_copy</span></button>`;
    const editBtn = isOwner ? `<button class="action-btn" title="Modifica" onclick="editCell(this, ${originalIndex}, '${col}')"><span class="material-symbols-outlined">edit</span></button>` : '';
    const actionsHtml = `<div class="cell-actions">${copyBtn}${editBtn}</div>`;

    return { displayContent, actionsHtml };
}

function buildPersonalColumnEditor(rowIndex, colName, currentValue) {
    const slot = PERSONAL_COLUMN_SLOTS[colName];
    const legend = ((personalColumnsSettings[slot] || {}).legend) || {};
    const cellData = (currentValue && typeof currentValue === 'object') ? currentValue : { text: '', tags: [] };
    const currentTags = Array.isArray(cellData.tags) ? cellData.tags : [];

    const listId = `personalTagsList-${rowIndex}`;
    const labeledKeys = PERSONAL_COLUMN_LEGEND_KEYS.filter(emoji => (legend[emoji] || '').trim() !== '');
    const tagsListHtml = labeledKeys.length > 0
        ? labeledKeys.map(emoji => {
            const checked = currentTags.includes(emoji) ? 'checked' : '';
            return `<label class="dropdown-item" onclick="event.stopPropagation()">
                <input type="checkbox" value="${escapeHtml(emoji)}" ${checked}>
                <span style="margin-right:4px;">${emoji}</span>${escapeHtml(legend[emoji])}
            </label>`;
        }).join('')
        : `<div style="padding: 8px; font-size: 0.78rem; color: var(--text-muted);">Nessuna voce ancora nella legenda.</div>`;

    return `<div class="personal-col-editor" onclick="event.stopPropagation()">
        <textarea class="form-textarea" id="personalColText-${rowIndex}" rows="2" placeholder="Testo...">${escapeHtml(cellData.text || '')}</textarea>
        <div class="custom-dropdown" style="margin-top: 6px; width: 100%;">
            <div class="dropdown-header" onclick="toggleDropdown('${listId}', event)">Tag legenda</div>
            <div class="dropdown-list" id="${listId}">${tagsListHtml}</div>
        </div>
        <button class="btn btn-export" style="margin-top: 6px; width: 100%; justify-content: center;" onclick="savePersonalColumnCell(${rowIndex}, '${colName}', '${listId}')">Salva</button>
    </div>`;
}

async function savePersonalColumnCell(rowIndex, colName, listId) {
    const textEl = document.getElementById(`personalColText-${rowIndex}`);
    const text = textEl ? textEl.value.trim() : '';
    const checkedBoxes = Array.from(document.querySelectorAll(`#${listId} input:checked`));
    const tags = checkedBoxes.map(cb => cb.value);

    const ok = await commitFieldEdit(rowIndex, colName, { text: text, tags: tags });
    renderTable();
    if (!ok) showToast("Salvataggio non riuscito.");
}

async function renamePersonalColumn(slot, el) {
    const current = personalColumnsSettings[slot] || { title: 'Colonna Personale', legend: {} };
    const newTitle = el.innerText.trim() || 'Colonna Personale';
    if (newTitle === current.title) return;

    try {
        const { error } = await supabase.from('personal_columns').update({ title: newTitle }).eq('business_unit', currentDashboard).eq('slot', slot);
        if (error) throw error;
        personalColumnsSettings[slot] = { ...current, title: newTitle };
        showToast("Titolo aggiornato.");
    } catch (err) {
        console.error(err);
        showToast("Rinomina non riuscita: " + err.message);
        el.innerText = current.title;
    }
}

let currentLegendSlot = null;

function openLegendModal(slot) {
    currentLegendSlot = slot;
    renderLegendModalContent();
    document.getElementById('legendModal').classList.add('show');
}

function closeLegendModal() {
    document.getElementById('legendModal').classList.remove('show');
    currentLegendSlot = null;
}

function renderLegendModalContent() {
    const slot = currentLegendSlot;
    const ownerCol = Object.keys(PERSONAL_COLUMN_SLOTS).find(k => PERSONAL_COLUMN_SLOTS[k] === slot);
    const isOwner = currentUserEmail === PERSONAL_COLUMN_OWNERS[ownerCol];
    const legend = ((personalColumnsSettings[slot] || {}).legend) || {};

    const rowsHtml = PERSONAL_COLUMN_LEGEND_KEYS.map(emoji => {
        const value = escapeHtml(legend[emoji] || '');
        return `<div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
            <span style="font-size:1.3rem; width:28px; text-align:center;">${emoji}</span>
            <input type="text" class="edit-input" style="flex:1;" placeholder="Etichetta..." value="${value}" ${isOwner ? '' : 'disabled'} data-emoji="${escapeHtml(emoji)}" onblur="saveLegendEntry(this)">
        </div>`;
    }).join('');

    document.getElementById('legendModalContainer').innerHTML = rowsHtml;
    document.getElementById('btnResetLegend').style.display = isOwner ? '' : 'none';
}

async function saveLegendEntry(inputEl) {
    const slot = currentLegendSlot;
    const emoji = inputEl.dataset.emoji;
    const newLabel = inputEl.value.trim();
    const current = personalColumnsSettings[slot] || { title: 'Colonna Personale', legend: {} };
    if ((current.legend[emoji] || '') === newLabel) return;

    const newLegend = { ...current.legend, [emoji]: newLabel };
    try {
        const { error } = await supabase.from('personal_columns').update({ legend: newLegend }).eq('business_unit', currentDashboard).eq('slot', slot);
        if (error) throw error;
        personalColumnsSettings[slot] = { ...current, legend: newLegend };
        renderTable();
    } catch (err) {
        console.error(err);
        showToast("Salvataggio legenda non riuscito: " + err.message);
        inputEl.value = current.legend[emoji] || '';
    }
}

async function resetLegend() {
    const slot = currentLegendSlot;
    if (!confirm("Resettare la legenda di questa colonna? Tutte le etichette verranno cancellate.")) return;
    const current = personalColumnsSettings[slot] || { title: 'Colonna Personale', legend: {} };

    try {
        const { error } = await supabase.from('personal_columns').update({ legend: {} }).eq('business_unit', currentDashboard).eq('slot', slot);
        if (error) throw error;
        personalColumnsSettings[slot] = { ...current, legend: {} };
        renderLegendModalContent();
        renderTable();
        showToast("Legenda resettata.");
    } catch (err) {
        console.error(err);
        showToast("Reset non riuscito: " + err.message);
    }
}
