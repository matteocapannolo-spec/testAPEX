const EXPORT_EXCLUDED_COLUMNS = ['Stato Globale', 'Tickets', 'Miniatura', 'Docs', 'Visual'];

const PERSONAL_SETTINGS_SHEET_NAME = 'Colonne Personali';

function buildExportDefaultFileName() {
    const prefix = currentDashboard === 'industrial' ? 'Industrial' : 'VisualDesign';
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const timeStr = `${pad(now.getHours())}-${pad(now.getMinutes())}`;
    return `${prefix}_productasset_${dateStr}_${timeStr}`;
}

function exportExcel() {
    let fileNamePrompt = prompt("Nome del file per l'esportazione:", buildExportDefaultFileName());
    if (!fileNamePrompt || fileNamePrompt.trim() === "") return;
    let exportFileName = fileNamePrompt.trim();
    if (!exportFileName.toLowerCase().endsWith('.xlsx')) exportFileName += '.xlsx';

    const exportColumns = columns.filter(c => !EXPORT_EXCLUDED_COLUMNS.includes(c));
    const exportRows = data.map(row => {
        let clean = {};
        exportColumns.forEach(c => {
            const val = row[c] ?? '';
            clean[c] = (c in PERSONAL_COLUMN_SLOTS && val && typeof val === 'object') ? JSON.stringify(val) : val;
        });
        return clean;
    });

    const ws = XLSX.utils.json_to_sheet(exportRows, { header: exportColumns });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Prodotti");

    const settingsHeader = ['Colonna', 'Proprietario', 'Titolo', ...PERSONAL_COLUMN_LEGEND_KEYS];
    const settingsRows = Object.keys(PERSONAL_COLUMN_SLOTS).map(colName => {
        const slot = PERSONAL_COLUMN_SLOTS[colName];
        const settings = personalColumnsSettings[slot] || { title: 'Colonna Personale', legend: {} };
        const row = {
            'Colonna': colName,
            'Proprietario': personalColumnOwner(colName),
            'Titolo': settings.title
        };
        PERSONAL_COLUMN_LEGEND_KEYS.forEach(emoji => { row[emoji] = settings.legend[emoji] || ''; });
        return row;
    });
    const wsSettings = XLSX.utils.json_to_sheet(settingsRows, { header: settingsHeader });
    XLSX.utils.book_append_sheet(wb, wsSettings, PERSONAL_SETTINGS_SHEET_NAME);

    XLSX.writeFile(wb, exportFileName);
}

let pendingImport = null;

function normalizeImportHeader(key) {
    const trimmed = String(key).trim();
    return trimmed === "Sul sito" ? "Su sito" : trimmed;
}

function importRowKey(nome, versione) {
    return String(nome ?? '').trim().toLowerCase() + '||' + String(versione ?? '').trim().toLowerCase();
}

async function importExcel(event) {
    const file = event.target.files[0]; if (!file) return;
    lastImportedFileName = file.name;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const wb = XLSX.read(e.target.result, { type: 'array' });
            const sheet = wb.Sheets[wb.SheetNames[0]];

            for (let cellKey in sheet) {
                if (cellKey[0] === '!') continue;
                let cell = sheet[cellKey];
                if (cell && cell.l && cell.l.Target) cell.v = cell.l.Target;
            }

            const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: "" });
            openImportConfirmModal(wb, jsonData, file.name);
        } catch (err) {
            console.error(err);
            showToast("Lettura del file non riuscita: " + err.message);
        }
        event.target.value = "";
    };
    reader.readAsArrayBuffer(file);
}

function openImportConfirmModal(wb, rows, fileName) {
    const body = document.getElementById('importConfirmBody');
    const btn = document.getElementById('btnConfirmImport');
    const blocca = motivo => {
        pendingImport = null;
        btn.style.display = 'none';
        body.innerHTML = `<p style="margin:0; color: var(--color-error);"><b>Importazione bloccata.</b></p>
            <p style="margin:8px 0 0 0;">${motivo}</p>
            <p style="margin:12px 0 0 0; color: var(--text-muted); font-size: 0.85rem;">Nessun dato è stato toccato.</p>`;
        document.getElementById('importConfirmModal').classList.add('show');
    };

    if (!rows || rows.length === 0) {
        blocca(`Il file <b>${escapeHtml(fileName)}</b> non contiene nessuna riga di prodotto.`);
        return;
    }

    const headers = Object.keys(rows[0]).map(normalizeImportHeader);
    const obbligatorie = ['Nome Prodotto', 'Versione Prodotto'].filter(h => !headers.includes(h));
    if (obbligatorie.length > 0) {
        blocca(`Nel file mancano le colonne <b>${escapeHtml(obbligatorie.join(', '))}</b>: senza non è possibile
            riconoscere i prodotti. Controlla di aver scelto un file esportato da APEX.`);
        return;
    }

    const chiaviFile = new Set(rows.map(r => importRowKey(r['Nome Prodotto'], r['Versione Prodotto'])));
    const chiaviDb = new Set(data.map(r => importRowKey(r['Nome Prodotto'], r['Versione Prodotto'])));
    const spariscono = data.filter(r => !chiaviFile.has(importRowKey(r['Nome Prodotto'], r['Versione Prodotto'])));
    const nuove = rows.filter(r => !chiaviDb.has(importRowKey(r['Nome Prodotto'], r['Versione Prodotto'])));
    const sconosciute = headers.filter(h => !columns.includes(h));

    pendingImport = { wb, rows, fileName };
    btn.style.display = '';

    const elenco = spariscono.slice(0, 25).map(r =>
        `<li>${escapeHtml(r['Nome Prodotto'])} <span style="color: var(--text-muted);">(${escapeHtml(r['Versione Prodotto'])})</span></li>`
    ).join('');
    const altre = spariscono.length > 25 ? `<li style="color: var(--text-muted);">e altre ${spariscono.length - 25}…</li>` : '';

    let html = `<p style="margin:0;">Dal file <b>${escapeHtml(fileName)}</b> nella dashboard
        <b>${escapeHtml(DASHBOARDS[currentDashboard].label)}</b>:</p>
        <ul style="margin:10px 0 0 0; padding-left: 20px;">
            <li><b>${rows.length}</b> ${rows.length === 1 ? 'riga' : 'righe'} nel file</li>
            <li><b>${nuove.length}</b> ${nuove.length === 1 ? 'versione nuova che verrà aggiunta' : 'versioni nuove che verranno aggiunte'}</li>
            <li><b>${spariscono.length}</b> ${spariscono.length === 1 ? 'versione presente oggi che <b>sparirà</b>' : 'versioni presenti oggi che <b>spariranno</b>'}</li>
        </ul>`;

    if (spariscono.length > 0) {
        html += `<p style="margin:14px 0 4px 0; color: var(--color-error);"><b>${spariscono.length === 1 ? 'Verrà eliminata definitivamente:' : 'Verranno eliminate definitivamente:'}</b></p>
            <ul style="margin:0; padding-left: 20px;">${elenco}${altre}</ul>
            <p style="margin:10px 0 0 0; color: var(--text-muted); font-size: 0.85rem;">
                Se non è quello che vuoi, annulla ed esporta prima il catalogo attuale in Excel.</p>`;
    }

    if (sconosciute.length > 0) {
        html += `<p style="margin:14px 0 0 0; color: var(--text-muted); font-size: 0.85rem;">
            ${sconosciute.length === 1 ? 'Colonna non riconosciuta, verrà salvata' : 'Colonne non riconosciute, verranno salvate'}
            così com${sconosciute.length === 1 ? "'è" : 'e sono'}: <b>${escapeHtml(sconosciute.join(', '))}</b>.</p>`;
    }

    html += `<p style="margin:14px 0 0 0; color: var(--color-error); font-size: 0.85rem;">
        L'importazione riscrive tutti i prodotti della dashboard e <b>non è annullabile</b>:
        Annulla/Ripristina non la recupera.</p>`;

    body.innerHTML = html;
    document.getElementById('importConfirmModal').classList.add('show');
}

function closeImportConfirmModal() {
    document.getElementById('importConfirmModal').classList.remove('show');
    pendingImport = null;
}

async function confirmImportExcel() {
    if (!pendingImport) return;
    const { wb, rows: jsonData, fileName } = pendingImport;
    pendingImport = null;
    closeImportConfirmModal();

    try {
        showToast("Sincronizzazione file Excel con Supabase...");
        clearHistory();

        const righe = jsonData.map(row => {
            const cleanRow = {};
            for (let key in row) {
                const k = normalizeImportHeader(key);
                let v = row[key];
                if (k in PERSONAL_COLUMN_SLOTS && typeof v === 'string' && v.trim() !== '') {
                    try {
                        const parsed = JSON.parse(v);
                        v = (parsed && typeof parsed === 'object') ? parsed : { text: v, tags: [] };
                    } catch (e) {
                        v = { text: v, tags: [] };
                    }
                }
                cleanRow[k] = v;
            }
            delete cleanRow.id;
            return cleanRow;
        });

        const { data: esito, error } = await supabase.rpc('import_products', {
            p_bu: currentDashboard,
            p_rows: righe
        });
        if (error) throw error;

        const dashLabel = DASHBOARDS[currentDashboard].label;
        const riepilogo = `${esito.inserted} nuovi, ${esito.updated} aggiornati, ${esito.deleted} eliminati`;
        await writeAuditLog(dashLabel, 'Massivo', 'Importazione Excel', '', `Importato File Excel: ${fileName} (${riepilogo})`);
        await loadProductsFromSupabase();

        await importPersonalColumnSettings(wb);

        showToast(`"${fileName}" importato: ${riepilogo}.`);
    } catch (err) {
        console.error(err);
        showToast("Importazione non riuscita: " + err.message);
        await loadProductsFromSupabase();
    }
}

async function importPersonalColumnSettings(wb) {
    if (!wb.SheetNames.includes(PERSONAL_SETTINGS_SHEET_NAME)) return;

    const sheet = wb.Sheets[PERSONAL_SETTINGS_SHEET_NAME];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    for (let row of rows) {
        const colName = (row['Colonna'] || '').trim();
        const slot = PERSONAL_COLUMN_SLOTS[colName];
        if (!slot) continue;

        const title = (row['Titolo'] || '').trim() || 'Colonna Personale';
        const legend = {};
        PERSONAL_COLUMN_LEGEND_KEYS.forEach(emoji => {
            const label = (row[emoji] || '').toString().trim();
            if (label) legend[emoji] = label;
        });

        try {
            const { error } = await supabase.rpc('restore_personal_column_settings', {
                p_business_unit: currentDashboard, p_slot: slot, p_title: title, p_legend: legend
            });
            if (error) throw error;
            personalColumnsSettings[slot] = { title, legend };
        } catch (err) {
            console.error(`Ripristino impostazioni ${colName} non riuscito:`, err);
            showToast(`⚠️ Titolo/legenda di ${colName} non ripristinati: ${err.message}`);
        }
    }

    renderTable();
}
