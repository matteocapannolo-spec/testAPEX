let currentQrUrl = '';
let currentQrFilename = '';

function openQrModal(urlTarget, colName, rowIndex) {
    let pName = (data[rowIndex]['Nome Prodotto'] || 'Prodotto').replace(/\s+/g, '_');
    let vName = (data[rowIndex]['Versione Prodotto'] || 'Versione').replace(/\s+/g, '_');
    let lang = colName.includes('ITA') ? 'ita' : 'eng';
    const d = new Date();
    let dateStr = `${String(d.getDate()).padStart(2, '0')}${String(d.getMonth() + 1).padStart(2, '0')}${d.getFullYear()}`;

    currentQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(urlTarget)}&format=png&bgcolor=transparent`;
    currentQrFilename = `qr_${lang}_${pName}.${vName}_${dateStr}.png`;

    document.getElementById('qrModalImg').src = currentQrUrl;
    document.getElementById('qrModalVerName').innerText = data[rowIndex]['Versione Prodotto'] || '';
    document.getElementById('qrModal').classList.add('show');
}

function closeQrModal() { document.getElementById('qrModal').classList.remove('show'); }

async function downloadQrImage() {
    try {
        const response = await fetch(currentQrUrl);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl; a.download = currentQrFilename;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
    } catch (e) {
        const a = document.createElement('a');
        a.href = currentQrUrl; a.download = currentQrFilename; a.target = '_blank'; a.click();
    }
}

async function copyQrImage() {
    try {
        const response = await fetch(currentQrUrl);
        const blob = await response.blob();
        await navigator.clipboard.write([ new ClipboardItem({ [blob.type]: blob }) ]);
        showToast("Immagine QR copiata negli appunti!");
    } catch (e) {
        alert("Browser non compatibile con la copia diretta dell'immagine.");
    }
}
