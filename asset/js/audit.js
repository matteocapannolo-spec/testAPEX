let auditLogsCache = [];

async function openAuditModal() {
    document.getElementById('auditModal').classList.add('show');
    document.getElementById('auditDashboardLabel').innerText = DASHBOARDS[currentDashboard]?.label || '';
    document.getElementById('auditFilterFrom').value = '';
    document.getElementById('auditFilterTo').value = '';
    document.getElementById('auditFilterUser').value = '';

    const container = document.getElementById('auditLogsContainer');
    container.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 20px;">Caricamento storico in corso...</p>';

    const { data: logs, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('business_unit', currentDashboard)
        .order('created_at', { ascending: false })
        .limit(300);

    if (error) {
        container.innerHTML = `<p style="color: var(--color-error); text-align: center; padding: 20px;">Errore nel recupero dello storico: ${escapeHtml(error.message)}</p>`;
        return;
    }

    auditLogsCache = logs || [];
    renderAuditLogs(auditLogsCache);
}

function applyAuditFilters() {
    const from = document.getElementById('auditFilterFrom').value;
    const to = document.getElementById('auditFilterTo').value;
    const userQuery = document.getElementById('auditFilterUser').value.trim().toLowerCase();

    const filtered = auditLogsCache.filter(log => {
        const logDate = (log.created_at || '').slice(0, 10);
        if (from && logDate < from) return false;
        if (to && logDate > to) return false;
        if (userQuery && !formatNameFromEmail(log.user_email).toLowerCase().includes(userQuery)) return false;
        return true;
    });
    renderAuditLogs(filtered);
}

function resetAuditFilters() {
    document.getElementById('auditFilterFrom').value = '';
    document.getElementById('auditFilterTo').value = '';
    document.getElementById('auditFilterUser').value = '';
    renderAuditLogs(auditLogsCache);
}

function renderAuditLogs(logs) {
    const container = document.getElementById('auditLogsContainer');

    if (!auditLogsCache.length) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 20px;">Nessuna modifica registrata finora nello storico.</p>';
        return;
    }
    if (!logs.length) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 20px;">Nessuna modifica corrisponde ai filtri.</p>';
        return;
    }

    let html = '';
    logs.forEach(log => {
        const dateObj = new Date(log.created_at);
        const dateFormatted = dateObj.toLocaleString('it-IT', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        let oldDisplay = log.valore_vecchio ? escapeHtml(log.valore_vecchio) : '<i style="opacity:0.5;">vuoto</i>';
        let newDisplay = log.valore_nuovo ? escapeHtml(log.valore_nuovo) : '<i style="opacity:0.5;">vuoto</i>';

        html += `
            <div class="audit-log-entry">
                <div class="a-meta"><span>${escapeHtml(formatNameFromEmail(log.user_email))}</span><span>${dateFormatted}</span></div>
                <div class="a-field">${escapeHtml(log.nome_prodotto)} <span class="a-ver">(${escapeHtml(log.versione_prodotto)})</span> · ${escapeHtml(log.campo)}</div>
                <div class="a-diff"><span class="a-old">${oldDisplay}</span><span class="a-arrow">→</span><span class="a-new">${newDisplay}</span></div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function closeAuditModal() {
    document.getElementById('auditModal').classList.remove('show');
}
