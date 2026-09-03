let currentUserProfile = null;

function isAdmin() {
    return !!(currentUserProfile && currentUserProfile.role === 'ADMIN');
}

function canAccessDashboard(businessUnit) {
    if (businessUnit === 'generic_assets') return true;
    if (isAdmin()) return true;
    return !!(currentUserProfile && currentUserProfile.allowed_dashboards && currentUserProfile.allowed_dashboards.includes(businessUnit));
}

function applyRolePermissionsToUI() {
    const admin = isAdmin();
    const adminOnlyIds = [
        'btnNewProduct', 'btnAuditHistory', 'btnImportExcel', 'btnExportExcel',
        'btnUndo', 'btnRedo',
        'catalogToggleRow', 'btnResolveTicket'
    ];
    adminOnlyIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('admin-only-hidden', !admin);
    });

    const roleBadge = document.getElementById('profileRoleBadge');
    if (roleBadge) {
        roleBadge.innerText = admin ? 'Amministratore' : 'Utente Speciale';
        roleBadge.classList.toggle('admin', admin);
        roleBadge.classList.toggle('base', !admin);
    }
}
