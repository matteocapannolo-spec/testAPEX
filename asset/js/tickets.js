let currentTicketRowIndex = null;
let currentOpenTicket = null;
let newTicketIsGeneric = false;

function getRowProductKey(rowIndex) {
    const r = data[rowIndex];
    if (!r) return "unknown";
    if (r.id) return `id:${r.id}`;
    const p = (r['Nome Prodotto'] || 'Prod').toString().trim();
    const v = (r['Versione Prodotto'] || 'Ver').toString().trim();
    return `${p}__${v}`;
}

function getOpenTicketsCount(rowIndex) {
    let key = getRowProductKey(rowIndex);
    return (localTickets[key] || []).filter(t => t.status === 'open').length;
}

function renderTicketDeadlineLine(ticket) {
    if (!ticket.dueDate) {
        return `<div class="t-deadline t-deadline-none">Non in carico</div>`;
    }
    const formatted = new Date(ticket.dueDate).toLocaleString('it-IT', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    return `<div class="t-deadline"><span class="t-deadline-status">In carico</span> - deadline <span class="t-deadline-date">${escapeHtml(formatted)}</span></div>`;
}

function getTicketVisualMeta(ticket) {
    if (ticket.productKey) return { emoji: '📦', tintClass: 'tint-product' };
    if (ticket.category === 'prodotto_mancante') return { emoji: '📦', tintClass: 'tint-newproduct' };
    if (ticket.category === 'modifiche_gruppo') return { emoji: '📦', tintClass: 'tint-group' };
    if (ticket.category === 'bug') return { emoji: '🐛', tintClass: '' };
    if (ticket.category === 'feature') return { emoji: '➕', tintClass: 'tint-feature' };
    return { emoji: '💬', tintClass: '' };
}

function getAllOpenTicketsCountForDashboard() {
    let productKeys = new Set(data.map((row, idx) => getRowProductKey(idx)));
    let productCount = 0;
    productKeys.forEach(key => {
        productCount += (localTickets[key] || []).filter(t => t.status === 'open').length;
    });
    let genericCount = genericTickets.filter(t => t.status === 'open' && t.businessUnit === currentDashboard).length;
    let orfaniCount = orphanTickets.filter(t => t.status === 'open' && (t.businessUnit === currentDashboard || !t.businessUnit)).length;
    return productCount + genericCount + orfaniCount;
}

function updateGenericTicketsBadge() {
    const badge = document.getElementById('genericTicketsBadge');
    if (!badge) return;
    const count = getAllOpenTicketsCountForDashboard();
    badge.innerText = count;
    badge.classList.toggle('zero', count === 0);
}

function openTicketListModal(rowIndex) {
    currentTicketRowIndex = rowIndex;
    let key = getRowProductKey(rowIndex);
    document.getElementById('ticketListProdVersion').innerText = `${data[rowIndex]['Nome Prodotto'] || ''} | ${data[rowIndex]['Versione Prodotto'] || ''}`;
    renderTicketsListItems(key);
    document.getElementById('ticketListModal').classList.add('show');
    syncTrelloTickets().then(() => renderTicketsListItems(key));
}

function closeTicketListModal() { document.getElementById('ticketListModal').classList.remove('show'); }

function renderTicketsListItems(key) {
    const container = document.getElementById('ticketItemsContainer');
    container.innerHTML = '';
    let list = (localTickets[key] || []).filter(t => t.status === 'open');

    if (list.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 20px;">Nessun ticket aperto.</p>`;
        return;
    }

    list.forEach(t => {
        const { emoji, tintClass } = getTicketVisualMeta({ ...t, productKey: key });
        const item = document.createElement('div');
        item.className = 'ticket-card-item' + (tintClass ? ' ' + tintClass : '');
        item.onclick = () => openTicketDetailModal(t);
        item.innerHTML = `
            <div class="t-header">
                <span>${emoji} ${escapeHtml(t.title)}</span>
                <span style="font-size: 0.75rem; color: var(--color-info);">Trello</span>
            </div>
            <div class="t-meta">Autore: <b>${escapeHtml(t.author)}</b> | Data: ${escapeHtml(t.date)}</div>
            ${renderTicketDeadlineLine(t)}
        `;
        container.appendChild(item);
    });
}

let genericTicketsListCache = [];

function openGenericTicketsModal() {
    currentTicketRowIndex = null;
    document.getElementById('genericTicketFilterFrom').value = '';
    document.getElementById('genericTicketFilterTo').value = '';
    document.getElementById('genericTicketFilterUser').value = '';
    renderGenericTicketsList();
    document.getElementById('genericTicketsModal').classList.add('show');
    syncTrelloTickets().then(() => renderGenericTicketsList());
}

function closeGenericTicketsModal() { document.getElementById('genericTicketsModal').classList.remove('show'); }

function renderGenericTicketsList() {
    let genericOpen = genericTickets.filter(t => t.status === 'open' && t.businessUnit === currentDashboard)
        .map(t => ({ ...t, productKey: null }));

    let productOpen = [];
    data.forEach((row, idx) => {
        let key = getRowProductKey(idx);
        (localTickets[key] || []).filter(t => t.status === 'open').forEach(t => {
            productOpen.push({ ...t, productKey: key, productLabel: `${row['Nome Prodotto'] || ''} | ${row['Versione Prodotto'] || ''}` });
        });
    });

    let orfaniOpen = orphanTickets
        .filter(t => t.status === 'open' && (t.businessUnit === currentDashboard || !t.businessUnit))
        .map(t => ({ ...t, productKey: t.productKeyStorica, productLabel: `⚠️ prodotto non più collegato — era: ${String(t.productKeyStorica || '').replace('__', ' | ')}` }));

    genericTicketsListCache = [...genericOpen, ...productOpen, ...orfaniOpen].sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate));
    applyGenericTicketFilters();
}

function applyGenericTicketFilters() {
    const fromEl = document.getElementById('genericTicketFilterFrom');
    const toEl = document.getElementById('genericTicketFilterTo');
    const userEl = document.getElementById('genericTicketFilterUser');
    if (!fromEl) return;

    const from = fromEl.value;
    const to = toEl.value;
    const userQuery = userEl.value.trim().toLowerCase();

    const filtered = genericTicketsListCache.filter(t => {
        const tDate = (t.rawDate || '').slice(0, 10);
        if (from && tDate < from) return false;
        if (to && tDate > to) return false;
        if (userQuery && !(t.author || '').toLowerCase().includes(userQuery)) return false;
        return true;
    });
    renderGenericTicketItems(filtered);
}

function resetGenericTicketFilters() {
    document.getElementById('genericTicketFilterFrom').value = '';
    document.getElementById('genericTicketFilterTo').value = '';
    document.getElementById('genericTicketFilterUser').value = '';
    renderGenericTicketItems(genericTicketsListCache);
}

function renderGenericTicketItems(combined) {
    const container = document.getElementById('genericTicketItemsContainer');
    if (!container) return;
    container.innerHTML = '';

    if (genericTicketsListCache.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 20px;">Nessun ticket aperto.</p>`;
        return;
    }
    if (combined.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 20px;">Nessun ticket corrisponde ai filtri.</p>`;
        return;
    }

    combined.forEach(t => {
        const tagText = t.productKey ? t.productLabel : (GENERIC_TICKET_CATEGORIES[t.category]?.label || 'Generico');
        const { emoji, tintClass } = getTicketVisualMeta(t);
        const item = document.createElement('div');
        item.className = 'ticket-card-item' + (tintClass ? ' ' + tintClass : '');
        item.onclick = () => openTicketDetailModal(t);
        item.innerHTML = `
            <div class="t-header">
                <span>${emoji} ${escapeHtml(t.title)}</span>
                <span style="font-size: 0.75rem; color: var(--color-info);">Trello</span>
            </div>
            <div class="t-meta">${escapeHtml(tagText)} · Autore: <b>${escapeHtml(t.author)}</b> | Data: ${escapeHtml(t.date)}</div>
            ${renderTicketDeadlineLine(t)}
        `;
        container.appendChild(item);
    });
}

function openNewTicketModal(generic) {
    newTicketIsGeneric = !!generic;
    document.getElementById('newTicketForm').reset();
    document.getElementById('tAuthor').value = document.getElementById('profileName').innerText || '';
    const catField = document.getElementById('tCategoryField');
    catField.style.display = newTicketIsGeneric ? 'block' : 'none';
    document.getElementById('tCategory').required = newTicketIsGeneric;
    document.getElementById('newTicketModal').classList.add('show');
}

function closeNewTicketModal() { document.getElementById('newTicketModal').classList.remove('show'); }

async function invokeTrelloProxy(action, payload) {
    const { data: res, error } = await supabase.functions.invoke('trello-proxy', { body: { action, payload } });
    if (error) {
        let messaggio = error.message;
        try {
            const corpo = await error.context.json();
            if (corpo && corpo.error) messaggio = corpo.error;
        } catch (e) { }
        throw new Error(messaggio);
    }
    return res;
}

async function submitNewTicket(e) {
    e.preventDefault();
    if (!newTicketIsGeneric && currentTicketRowIndex === null) return;

    const btn = document.getElementById('btnSubmitTicket');
    btn.disabled = true; btn.innerText = "Invio...";

    const title = document.getElementById('tTitle').value.trim();
    const desc = document.getElementById('tDesc').value.trim();
    const link = document.getElementById('tLink').value.trim();

    const payload = newTicketIsGeneric
        ? {
            category: document.getElementById('tCategory').value,
            businessUnit: currentDashboard,
            title, desc, link
        }
        : {
            category: 'prodotto',
            businessUnit: currentDashboard,
            title, desc, link,
            productName: data[currentTicketRowIndex]['Nome Prodotto'] || '',
            productVersion: data[currentTicketRowIndex]['Versione Prodotto'] || ''
        };

    try {
        await invokeTrelloProxy('createCard', payload);

        await loadTicketsFromSupabase();
        showToast("Ticket salvato e inviato su Trello!");
        closeNewTicketModal();
        if (!newTicketIsGeneric) renderTicketsListItems(getRowProductKey(currentTicketRowIndex));
        renderGenericTicketsList();
        renderTable();
        updateGenericTicketsBadge();
    } catch (err) {
        console.error(err);
        alert("Errore nella creazione del ticket: " + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<span class="material-symbols-outlined">send</span> Invia su Trello`;
    }
}

function openTicketDetailModal(ticket) {
    currentOpenTicket = ticket;

    let contextLabel = ticket.productKey ? ticket.productLabel : (GENERIC_TICKET_CATEGORIES[ticket.category]?.label || 'Generico');

    let html = `
        <div style="background: var(--surface-color); padding: 12px; border-radius: 4px; margin-bottom: 12px; border: 1px solid var(--border-color);">
            <h4 style="margin: 0 0 6px 0; color: var(--text-main); font-size: 1.1rem;">${escapeHtml(ticket.title)}</h4>
            <p style="margin: 0 0 4px 0; font-size: 0.78rem; color: var(--color-info); font-weight: bold;">${escapeHtml(contextLabel)}</p>
            <p style="margin: 0 0 4px 0; font-size: 0.8rem; color: var(--text-muted);">Scritto da <b>${escapeHtml(ticket.author)}</b> il ${escapeHtml(ticket.date)}</p>
            ${renderTicketDeadlineLine(ticket)}
        </div>
        <div style="margin-bottom: 12px;">
            <label style="font-size: 0.75rem; font-weight: bold; color: var(--text-muted); display: block; margin-bottom: 4px;">DESCRIZIONE / BUG</label>
            <div style="background: var(--input-bg); padding: 10px; border-radius: 4px; border: 1px solid var(--border-color); white-space: pre-wrap;">${escapeHtml(ticket.desc)}</div>
        </div>
    `;
    if (ticket.link && /^https?:\/\//i.test(ticket.link)) {
        const safeLink = escapeHtml(ticket.link);
        html += `<div style="margin-bottom: 12px;"><label style="font-size: 0.75rem; font-weight: bold; color: var(--text-muted); display: block; margin-bottom: 4px;">LINK</label><a href="${safeLink}" target="_blank" rel="noopener noreferrer">${safeLink}</a></div>`;
    }
    if (ticket.trelloShortUrl && isAdmin() && /^https:\/\/trello\.com\//i.test(ticket.trelloShortUrl)) {
        const safeTrello = escapeHtml(ticket.trelloShortUrl);
        html += `<div style="margin-bottom: 12px;"><a href="${safeTrello}" target="_blank" rel="noopener noreferrer" class="btn-link-pill" style="font-size: 0.85rem; padding: 6px 12px;">🔗 Apri Scheda Trello</a></div>`;
    }

    document.getElementById('ticketDetailContent').innerHTML = html;
    document.getElementById('ticketDetailModal').classList.add('show');
}

function closeTicketDetailModal() { document.getElementById('ticketDetailModal').classList.remove('show'); }

async function resolveCurrentTicket() {
    if (!currentOpenTicket) return;
    if (!confirm("Segnare il ticket come RISOLTO? La scheda verrà spuntata come completata su Trello (si sposterà in \"Done\") e risolta su Supabase.")) return;

    try {
        if (currentOpenTicket.trelloCardId) {
            await invokeTrelloProxy('completeCard', { cardId: currentOpenTicket.trelloCardId });
        } else {
            const { error } = await supabase.from('tickets').update({ status: 'resolved', due_complete: true }).eq('id', currentOpenTicket.id);
            if (error) throw error;
        }
    } catch (err) {
        console.error(err);
        showToast("Risoluzione non riuscita: " + err.message);
        return;
    }

    await loadTicketsFromSupabase();
    showToast("Ticket Risolto!");
    closeTicketDetailModal();
    if (currentTicketRowIndex !== null) renderTicketsListItems(getRowProductKey(currentTicketRowIndex));
    renderGenericTicketsList();
    renderTable();
    updateGenericTicketsBadge();
}

async function syncTrelloTickets() {
    try {
        await invokeTrelloProxy('syncDueDates', {});

        await loadTicketsFromSupabase();
    } catch (e) {
        console.warn("Sincronizzazione Trello fallita:", e.message);
    }
}
