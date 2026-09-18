function renderAssetGrids() {
    const container = document.getElementById('assetGridsContainer');
    if (!container) return;

    const assetTypes = (DASHBOARDS[currentDashboard] && DASHBOARDS[currentDashboard].assetTypes) || [];

    container.innerHTML = assetTypes.map(type => `
        <div class="asset-library">
            <div class="asset-library-title">Libreria ${type}</div>
            <table class="asset-library-table">
                <tbody>
                    <tr><td></td><td></td></tr>
                    <tr><td></td><td></td></tr>
                </tbody>
            </table>
        </div>
    `).join('');
}
