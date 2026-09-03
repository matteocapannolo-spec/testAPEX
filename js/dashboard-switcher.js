function pickDefaultDashboard() {
    const priorityOrder = ['visual_design', 'industrial', 'generic_assets'];
    for (const bu of priorityOrder) {
        if (DASHBOARDS[bu] && canAccessDashboard(bu)) return bu;
    }
    return 'visual_design';
}

function renderDashboardSwitcher() {
    const el = document.getElementById('dashboardSwitcher');
    if (!el) return;
    const visible = Object.keys(DASHBOARDS).filter(bu => canAccessDashboard(bu));
    el.innerHTML = visible.map(bu =>
        `<button class="dashboard-tab ${bu === currentDashboard ? 'active' : ''}" onclick="switchDashboard('${bu}')">${DASHBOARDS[bu].label}</button>`
    ).join('');
}

function updateDashboardViewMode() {
    const isAssetGrid = DASHBOARDS[currentDashboard].type === 'asset_grid';
    document.getElementById('productTableContainer').style.display = isAssetGrid ? 'none' : '';
    document.getElementById('assetGridsContainer').style.display = isAssetGrid ? '' : 'none';
    document.querySelector('.header-actions-row').style.display = isAssetGrid ? 'none' : '';
    document.querySelector('.filters-container').style.display = isAssetGrid ? 'none' : '';
}

async function enterDashboard(businessUnit) {
    applyDashboardConfig(businessUnit);
    historyStack = [];
    redoStack = [];
    renderDashboardSwitcher();
    updateDashboardViewMode();

    if (DASHBOARDS[currentDashboard].type === 'asset_grid') {
        renderAssetGrids();
    } else {
        document.getElementById('searchInput').value = '';
        document.getElementById('filterMissing').value = 'in_catalogo';
        initFilters();
        await Promise.all([loadPersonalColumnsSettings(), loadProductsFromSupabase()]);
        renderTable();
        updateGenericTicketsBadge();
    }
}

async function switchDashboard(businessUnit) {
    if (businessUnit === currentDashboard || !canAccessDashboard(businessUnit)) return;
    await enterDashboard(businessUnit);
}
