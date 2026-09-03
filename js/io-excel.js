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
            clean[c] = (c in PERSONAL_COLUMN_OWNERS && val && typeof val === 'object') ? JSON.stringify(val) : val;
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
            'Proprietario': PERSONAL_COLUMN_OWNERS[colName],
            'Titolo': settings.title
        };
        PERSONAL_COLUMN_LEGEND_KEYS.forEach(emoji => { row[emoji] = settings.legend[emoji] || ''; });
        return row;
    });
    const wsSettings = XLSX.utils.json_to_sheet(settingsRows, { header: settingsHeader });
    XLSX.utils.book_append_sheet(wb, wsSettings, PERSONAL_SETTINGS_SHEET_NAME);

    XLSX.writeFile(wb, exportFileName);
}

async function importExcel(event) {
    const file = event.target.files[0]; if (!file) return;
    lastImportedFileName = file.name;
    saveStateToHistory();

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const wb = XLSX.read(e.target.result, { type: 'array' });
            const sheet = wb.Sheets[wb.SheetNames[0]];

            for (let cellKey in sheet) {
                if (cellKey[0] === '!') continue;
                let cell = sheet[cellKey];
                if (cell && cell.l && cell.l.Target) cell.v = cell.l.Target;
            }

            let jsonData = XLSX.utils.sheet_to_json(sheet, { defval: "" });
            if (jsonData && jsonData.length > 0) {
                showToast("Sincronizzazione file Excel con Supabase...");
                const { error: deleteError } = await supabase.from('products').delete().eq('business_unit', currentDashboard);
                if (deleteError) throw deleteError;

                for (let row of jsonData) {
                    let cleanRow = {};
                    for (let key in row) {
                        let k = key.trim();
                        if (k === "Sul sito") k = "Su sito";
                        let v = row[key];
                        if (k in PERSONAL_COLUMN_OWNERS && typeof v === 'string' && v.trim() !== '') {
                            try {
                                const parsed = JSON.parse(v);
                                v = (parsed && typeof parsed === 'object') ? parsed : { text: v, tags: [] };
                            } catch {
                                v = { text: v, tags: [] };
                            }
                        }
                        cleanRow[k] = v;
                    }

                    delete cleanRow.id;
                    await updateProductInSupabase(cleanRow);
                }

                const dashLabel = DASHBOARDS[currentDashboard].label;
                const auditId = await writeAuditLog(dashLabel, 'Massivo', 'Importazione Excel', '', `Importato File Excel: ${file.name}`);
                trackAuditEntry(auditId, dashLabel, 'Massivo', 'Importazione Excel', '', `Importato File Excel: ${file.name}`);
                await loadProductsFromSupabase();

                await importPersonalColumnSettings(wb);

                showToast(`File "${file.name}" importato con successo su Supabase!`);
            }
        } catch (err) {
            console.error(err);
            showToast("Importazione non riuscita: " + err.message);
            await loadProductsFromSupabase();
        }
        event.target.value = "";
    };
    reader.readAsArrayBuffer(file);
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
