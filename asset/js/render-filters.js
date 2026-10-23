function toggleSection(secId) {
    sectionsConfig[secId].isExpanded = !sectionsConfig[secId].isExpanded;
    renderTable();
}

document.addEventListener('click', (e) => {
    if (!e.target.closest('.custom-dropdown')) {
        document.querySelectorAll('.dropdown-list').forEach(el => el.classList.remove('show'));
    }
    if (!e.target.closest('.user-profile-wrapper')) {
        const profileDropdown = document.getElementById('profileDropdown');
        if (profileDropdown) profileDropdown.classList.remove('show');
    }
    const isEditingCell = e.target.closest('.editing-cell');
    const isActionBtn = e.target.closest('.action-btn');
    if (!isEditingCell && !isActionBtn && document.querySelector('.editing-cell')) {
        renderTable();
    }
});

function toggleDropdown(listId, event) {
    event.stopPropagation();
    document.querySelectorAll('.dropdown-list').forEach(el => { if(el.id !== listId) el.classList.remove('show'); });
    const list = document.getElementById(listId);
    if(list) {
        list.classList.toggle('show');
        if (!list.classList.contains('show') && listId.startsWith('editList-')) renderTable();
    }
}

function resetFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('filterMissing').value = 'in_catalogo';
    document.querySelectorAll('#list-filterCat input[type="checkbox"]').forEach(cb => cb.checked = false);
    document.querySelectorAll('#list-filterApp input[type="checkbox"]').forEach(cb => cb.checked = false);
    updateFilterHeader('list-filterCat', 'head-filterCat', 'Tutte le Categorie');
    updateFilterHeader('list-filterApp', 'head-filterApp', 'Tutte le Applicazioni');
    renderTable();
    showToast("Filtri resettati");
}

function initFilters() {
    const catList = document.getElementById('list-filterCat');
    catList.innerHTML = '';
    categoriePossibili.forEach(cat => {
        let c = categoryColors[cat];
        catList.innerHTML += `<label class="dropdown-item" onclick="event.stopPropagation()"><input type="checkbox" value="${cat}" onchange="updateFilterHeader('list-filterCat', 'head-filterCat', 'Tutte le Categorie'); renderTable();"><span class="color-dot" style="background-color: ${c.bg};"></span> ${cat}</label>`;
    });
    const appList = document.getElementById('list-filterApp');
    appList.innerHTML = '';
    applicazioniPossibili.forEach(app => {
        let c = applicationColors[app];
        appList.innerHTML += `<label class="dropdown-item" onclick="event.stopPropagation()"><input type="checkbox" value="${app}" onchange="updateFilterHeader('list-filterApp', 'head-filterApp', 'Tutte le Applicazioni'); renderTable();"><span class="color-dot" style="background-color: ${c.bg};"></span> ${app}</label>`;
    });
}

function updateFilterHeader(listId, headerId, defaultText) {
    const checked = Array.from(document.querySelectorAll(`#${listId} input:checked`));
    const header = document.getElementById(headerId);
    if (!header) return;
    if (checked.length === 0) header.textContent = defaultText;
    else if (checked.length === 1) header.textContent = checked[0].value;
    else header.textContent = checked.length + " selezionati";
}
