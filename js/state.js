function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

function formatNameFromEmail(email) {
    if (!email) return '';
    const namePart = email.split('@')[0];
    return namePart.split('.').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
}

function escapeForJsAttr(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/\r?\n/g, '\\n');
}

let currentUserEmail = null;
let userAvatarsByEmail = {};
let personalColumnsSettings = {};
let localTickets = {};
let genericTickets = [];
let data = [];
let lastImportedFileName = "APEX_Export.xlsx";

let historyStack = [];
let redoStack = [];
let historyAuditEntries = [];
let redoAuditEntries = [];
const MAX_HISTORY = 40;

function saveStateToHistory() {
    historyStack.push(JSON.parse(JSON.stringify(data)));
    historyAuditEntries.push([]);
    if (historyStack.length > MAX_HISTORY) { historyStack.shift(); historyAuditEntries.shift(); }
    redoStack = [];
    redoAuditEntries = [];
}

function trackAuditEntry(auditId, nomeProd, verProd, campo, valVecchio, valNuovo) {
    if (!auditId || historyAuditEntries.length === 0) return;
    historyAuditEntries[historyAuditEntries.length - 1].push({ id: auditId, nomeProd, verProd, campo, valVecchio, valNuovo });
}

async function undo() {
    if (historyStack.length === 0) {
        showToast("Nessuna azione da annullare.");
        return;
    }
    redoStack.push(JSON.parse(JSON.stringify(data)));
    const entries = historyAuditEntries.pop() || [];
    redoAuditEntries.push(entries);

    await applyHistorySnapshot(historyStack.pop());
    showToast("Azione annullata (Undo)");
    await removeAuditEntries(entries);
}

async function redo() {
    if (redoStack.length === 0) {
        showToast("Nessuna azione da ripristinare.");
        return;
    }
    historyStack.push(JSON.parse(JSON.stringify(data)));
    const entries = redoAuditEntries.pop() || [];

    await applyHistorySnapshot(redoStack.pop());
    showToast("Azione ripristinata (Redo)");
    const restored = await restoreAuditEntries(entries);
    historyAuditEntries.push(restored);
}

async function removeAuditEntries(entries) {
    for (const e of entries) {
        try {
            const { error } = await supabase.from('audit_logs').delete().eq('id', e.id);
            if (error) throw error;
        } catch (err) { console.error("Rimozione voce storico fallita:", err); }
    }
}

async function restoreAuditEntries(entries) {
    const restored = [];
    for (const e of entries) {
        try {
            const newId = await writeAuditLog(e.nomeProd, e.verProd, e.campo, e.valVecchio, e.valNuovo);
            if (newId) restored.push({ ...e, id: newId });
        } catch (err) { console.error("Ripristino voce storico fallito:", err); }
    }
    return restored;
}

function historyRowKey(row) {
    return row.id != null ? `id:${row.id}` : `tmp:${row['Nome Prodotto']}__${row['Versione Prodotto']}`;
}

async function applyHistorySnapshot(targetData) {
    const beforeData = data;
    data = targetData;
    renderTable();

    const beforeMap = new Map(beforeData.map(r => [historyRowKey(r), r]));
    const afterMap = new Map(targetData.map(r => [historyRowKey(r), r]));

    for (const [key, oldRow] of beforeMap) {
        if (afterMap.has(key)) continue;
        if (!oldRow.id) continue;
        try {
            const { error } = await supabase.from('products').delete().eq('id', oldRow.id);
            if (error) throw error;
        } catch (err) { console.error("Rollback (rimozione riga) fallito:", err); }
    }

    for (const [key, newRow] of afterMap) {
        const oldRow = beforeMap.get(key);
        if (!oldRow) {
            try { await updateProductInSupabase(newRow); }
            catch (err) { console.error("Rollback (creazione riga) fallito:", err); }
            continue;
        }

        const fields = new Set([...Object.keys(oldRow), ...Object.keys(newRow)]);
        let changed = false;
        for (const field of fields) {
            if (field === 'id') continue;
            if (String(oldRow[field] ?? '') !== String(newRow[field] ?? '')) { changed = true; break; }
        }
        if (changed) {
            try { await updateProductInSupabase(newRow); }
            catch (err) { console.error("Rollback (aggiornamento riga) fallito:", err); }
        }
    }
}
