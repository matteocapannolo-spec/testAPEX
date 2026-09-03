function auditStringify(v) {
    if (v === null || v === undefined) return '';
    return (typeof v === 'object' ? JSON.stringify(v) : String(v)).trim();
}

async function writeAuditLog(nomeProd, verProd, campo, valVecchio, valNuovo) {
    let strOld = auditStringify(valVecchio);
    let strNew = auditStringify(valNuovo);

    if (strOld === strNew) return null;

    const { data: { session } } = await supabase.auth.getSession();
    const userEmail = session?.user?.email || 'Utente Sconosciuto';

    const { data: inserted, error } = await supabase.from('audit_logs').insert([{
        user_email: userEmail,
        business_unit: currentDashboard,
        nome_prodotto: nomeProd || 'N/D',
        versione_prodotto: verProd || 'N/D',
        campo: campo,
        valore_vecchio: strOld,
        valore_nuovo: strNew
    }]).select('id').single();

    if (error) {
        console.error("Errore salvataggio Audit Log:", error);
        showToast("⚠️ Errore storico: " + error.message);
        return null;
    }
    return inserted ? inserted.id : null;
}

async function loadUserAvatars() {
    const { data: rows, error } = await supabase.from('user_avatars').select('email, avatar_url');
    if (!error && rows) {
        userAvatarsByEmail = {};
        rows.forEach(r => { userAvatarsByEmail[r.email] = r.avatar_url; });
    }
}

async function loadPersonalColumnsSettings() {
    const { data: rows, error } = await supabase.from('personal_columns').select('*').eq('business_unit', currentDashboard);
    if (!error && rows) {
        personalColumnsSettings = {};
        rows.forEach(r => { personalColumnsSettings[r.slot] = { title: r.title, legend: r.legend || {} }; });
    }
}

async function loadProductsFromSupabase() {
    showToast("Caricamento prodotti...");
    const { data: productsData, error } = await supabase.from('products').select('*').eq('business_unit', currentDashboard).order('id', { ascending: true });
    if (!error && productsData) {
        data = productsData.map(item => ({
            id: item.id,
            lastReviewedAt: item.last_reviewed_at,
            'Nome Prodotto': item.nome_prodotto,
            'Versione Prodotto': item.versione_prodotto,
            'In Catalogo': item.in_catalogo ? 'Sì' : 'No',
            ...item.data
        }));
        renderTable();
    }
}

async function loadTicketsFromSupabase() {
    const { data: ticketsData, error } = await supabase.from('tickets').select('*');
    if (!error && ticketsData) {
        localTickets = {};
        genericTickets = [];
        ticketsData.forEach(t => {
            const mapped = {
                id: t.id,
                trelloCardId: t.trello_card_id,
                trelloShortUrl: t.trello_short_url,
                title: t.title,
                author: t.author,
                desc: t.description,
                link: t.link,
                date: new Date(t.created_at).toLocaleString('it-IT'),
                rawDate: t.created_at,
                status: t.status,
                category: t.category,
                businessUnit: t.business_unit,
                dueDate: t.due_date,
                dueComplete: t.due_complete
            };
            if (t.product_key) {
                if (!localTickets[t.product_key]) localTickets[t.product_key] = [];
                localTickets[t.product_key].push(mapped);
            } else {
                genericTickets.push(mapped);
            }
        });
        renderTable();
        if (typeof updateGenericTicketsBadge === 'function') updateGenericTicketsBadge();
    }
}

async function updateProductInSupabase(rowObj) {
    const rowId = rowObj.id;
    const nome = rowObj['Nome Prodotto'];
    const versione = rowObj['Versione Prodotto'];
    const inCat = isValInCatalog(rowObj['In Catalogo']);

    let extraData = { ...rowObj };
    delete extraData.id;
    delete extraData.lastReviewedAt;
    delete extraData['Nome Prodotto'];
    delete extraData['Versione Prodotto'];
    delete extraData['In Catalogo'];

    if (rowId) {
        const { error } = await supabase.from('products').update({
            nome_prodotto: nome,
            versione_prodotto: versione,
            in_catalogo: inCat,
            data: extraData,
            updated_at: new Date()
        }).eq('id', rowId);
        if (error) throw error;
    } else {
        const { data: newRow, error } = await supabase.from('products').insert([{
            nome_prodotto: nome,
            versione_prodotto: versione,
            in_catalogo: inCat,
            business_unit: currentDashboard,
            last_reviewed_at: new Date(),
            data: extraData
        }]).select().single();
        if (error) throw error;
        if (newRow) {
            rowObj.id = newRow.id;
            rowObj.lastReviewedAt = newRow.last_reviewed_at;
        }
    }
}
