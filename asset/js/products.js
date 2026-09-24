function openNewProductModal() {
    document.getElementById('newProductForm').reset();
    document.getElementById('newProductModal').classList.add('show');
}

function closeNewProductModal() {
    document.getElementById('newProductModal').classList.remove('show');
}

async function submitNewProduct(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSubmitProduct');
    btn.disabled = true;
    btn.innerText = "Salvataggio...";

    const pName = document.getElementById('npName').value.trim();
    const pVersion = document.getElementById('npVersion').value.trim();
    const pCode = document.getElementById('npCode').value.trim();

    saveStateToHistory();

    let newProd = {
        'Nome Prodotto': pName,
        'Versione Prodotto': pVersion,
        'Codice Univoco': pCode,
        'In Catalogo': 'Sì'
    };

    data.push(newProd);

    try {
        await updateProductInSupabase(newProd);
        const auditId = await writeAuditLog(pName, pVersion, 'Creazione Prodotto', '', `Nuovo Prodotto Creato (Codice: ${pCode})`);
        trackAuditEntry(auditId, pName, pVersion, 'Creazione Prodotto', '', `Nuovo Prodotto Creato (Codice: ${pCode})`);
        renderTable();
        showToast("Nuovo prodotto creato con successo!");
        closeNewProductModal();
    } catch (err) {
        console.error(err);
        alert("Errore durante il salvataggio del prodotto: " + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<span class="material-symbols-outlined">check</span> Conferma`;
    }
}
