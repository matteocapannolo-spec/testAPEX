
import { toast } from '../core/ui.js';
import { albero, capitoloPerId } from './stato.js';
import { capitoloInVista } from './sommario.js';
import { STATI, nomeFile } from './config.js';
import { pulisciHtml } from './testo.js';

const LIBRERIA = {
    src: 'https://cdn.jsdelivr.net/npm/docx@9.9.0/dist/index.iife.js',
    integrity: 'sha384-Jv3EQWOGzvjff3U/jLCJqhQK7M1kRzmU/itNiAdOR+ceZSXk+LWzvphj9EerbgBo'
};

let caricamento = null;

function caricaLibreria() {
    if (window.docx) return Promise.resolve(window.docx);
    if (!caricamento) {
        caricamento = new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = LIBRERIA.src;
            s.integrity = LIBRERIA.integrity;
            s.crossOrigin = 'anonymous';
            s.onload = () => resolve(window.docx);
            s.onerror = () => { caricamento = null; reject(new Error('La libreria per il Word non si è caricata: controlla la connessione e riprova.')); };
            document.head.appendChild(s);
        });
    }
    return caricamento;
}

function runs(D, nodo, stile = {}) {
    const out = [];
    for (const n of nodo.childNodes) {
        if (n.nodeType === Node.TEXT_NODE) {
            if (n.nodeValue) out.push(new D.TextRun({ text: n.nodeValue, ...stile }));
        } else if (n.tagName === 'STRONG') {
            out.push(...runs(D, n, { ...stile, bold: true }));
        } else if (n.tagName === 'EM') {
            out.push(...runs(D, n, { ...stile, italics: true }));
        } else if (n.tagName === 'BR') {
            out.push(new D.TextRun({ text: '', break: 1 }));
        } else if (n.tagName === 'A') {
            out.push(new D.ExternalHyperlink({
                link: n.getAttribute('href') || '',
                children: runs(D, n, { ...stile, style: 'Hyperlink' })
            }));
        } else {
            out.push(...runs(D, n, stile));
        }
    }
    return out;
}

let istanzaElenco = 0;

function paragrafi(D, nodo, livello = 0, numerazione = null) {
    const out = [];
    for (const n of nodo.childNodes) {
        if (n.nodeType === Node.TEXT_NODE) {
            if (n.nodeValue.trim()) out.push(new D.Paragraph({ children: [new D.TextRun(n.nodeValue)] }));
        } else if (n.tagName === 'UL' || n.tagName === 'OL') {
            const riferimento = n.tagName === 'UL' ? 'punti' : 'numeri';
            istanzaElenco += 1;
            const num = { reference: riferimento, level: Math.min(livello, 2), instance: istanzaElenco };
            for (const li of n.children) {
                if (li.tagName !== 'LI') continue;
                const dentro = [...li.childNodes].filter(x => !(x.tagName === 'UL' || x.tagName === 'OL'));
                const contenitore = document.createElement('span');
                for (const x of dentro) contenitore.appendChild(x.cloneNode(true));
                out.push(new D.Paragraph({ children: runs(D, contenitore), numbering: num }));
                for (const sotto of li.children) {
                    if (sotto.tagName === 'UL' || sotto.tagName === 'OL') out.push(...paragrafi(D, { childNodes: [sotto] }, livello + 1));
                }
            }
        } else if (n.tagName === 'P') {
            out.push(new D.Paragraph({ children: runs(D, n) }));
        } else {
            out.push(...paragrafi(D, n, livello, numerazione));
        }
    }
    return out;
}

function nota(D, stato) {
    return stato && stato !== 'ok' ? [new D.TextRun({ text: ` [${STATI[stato] || stato}]`, italics: true, color: '53565A' })] : [];
}

function blocco(D, b) {
    const out = [];
    const c = b.contenuto || {};
    if (b.tipo === 'link') {
        out.push(new D.Paragraph({
            children: [
                ...(b.numero ? [new D.TextRun({ text: b.numero + ' ', color: '53565A' })] : []),
                new D.ExternalHyperlink({ link: c.url || '', children: [new D.TextRun({ text: b.titolo || c.url || '', style: 'Hyperlink' })] }),
                ...(c.descrizione ? [new D.TextRun({ text: ' — ' + c.descrizione })] : []),
                ...nota(D, b.stato)
            ]
        }));
        return out;
    }
    if (b.titolo) out.push(new D.Paragraph({ heading: D.HeadingLevel.HEADING_3, children: [new D.TextRun([b.numero, b.titolo].filter(Boolean).join(' ')), ...nota(D, b.stato)] }));
    else if (b.stato !== 'ok') out.push(new D.Paragraph({ children: nota(D, b.stato) }));

    if (b.tipo === 'tabella') {
        out.push(...testoHtml(D, c.prima));
        const colonne = c.colonne || [];
        if (!colonne.length) return out.concat(testoHtml(D, c.dopo));
        const larghezza = Math.floor(9026 / colonne.length);
        const cella = (testo, testa) => new D.TableCell({
            width: { size: larghezza, type: D.WidthType.DXA },
            shading: testa ? { type: D.ShadingType.CLEAR, fill: '000000' } : undefined,
            children: [new D.Paragraph({ children: [new D.TextRun({ text: String(testo ?? ''), bold: testa, color: testa ? 'FFFFFF' : undefined })] })]
        });
        const righe = [new D.TableRow({ tableHeader: true, children: colonne.map(x => cella(x, true)) })];
        for (const r of (c.righe || [])) righe.push(new D.TableRow({ children: colonne.map((_, i) => cella(r[i], false)) }));
        out.push(new D.Table({ rows: righe, width: { size: 9026, type: D.WidthType.DXA }, columnWidths: colonne.map(() => larghezza) }));
        out.push(new D.Paragraph({ text: '' }));
        out.push(...testoHtml(D, c.dopo));
        return out;
    }

    out.push(...testoHtml(D, c.html));
    return out;
}

function testoHtml(D, html) {
    const doc = new DOMParser().parseFromString(pulisciHtml(html), 'text/html');
    return paragrafi(D, doc.body);
}

function documento(D, capitoli) {
    const figli = [new D.Paragraph({ heading: D.HeadingLevel.TITLE, text: 'Marketing Playbook' })];
    for (const c of capitoli) {
        figli.push(new D.Paragraph({ heading: D.HeadingLevel.HEADING_1, text: `${c.numero}. ${c.titolo}`, pageBreakBefore: true }));
        for (const s of c.sezioni) {
            figli.push(new D.Paragraph({ heading: D.HeadingLevel.HEADING_2, text: `${s.numero} ${s.titolo}`.trim() }));
            for (const b of s.blocchi) figli.push(...blocco(D, b));
        }
    }
    const livelli = (formato, testo) => [0, 1, 2].map(l => ({
        level: l, format: formato, text: testo(l), alignment: D.AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720 * (l + 1), hanging: 360 } } }
    }));
    return new D.Document({
        creator: 'APEX',
        title: 'Marketing Playbook',
        numbering: {
            config: [
                { reference: 'punti', levels: livelli(D.LevelFormat.BULLET, () => '•') },
                { reference: 'numeri', levels: livelli(D.LevelFormat.DECIMAL, l => `%${l + 1}.`) }
            ]
        },
        sections: [{ properties: {}, children: figli }]
    });
}

function scarica(blob, nome) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export async function esportaWord(elemento) {
    let capitoli = albero();
    let nome = nomeFile();
    if (elemento.dataset.ambito === 'capitolo') {
        const id = capitoloInVista();
        const c = id && capitoloPerId(id);
        if (!c) {
            toast('Nessun capitolo in vista da esportare.');
            return;
        }
        capitoli = capitoli.filter(x => x.id === id);
        nome += ` - ${c.numero}. ${c.titolo}`;
    }
    try {
        const D = await caricaLibreria();
        istanzaElenco = 0;
        const blob = await D.Packer.toBlob(documento(D, capitoli));
        scarica(blob, nome.replace(/[\\/:*?"<>|]/g, '-') + '.docx');
        toast('Word scaricato');
    } catch (e) {
        console.error('Esportazione Word fallita:', e);
        toast('Esportazione Word fallita: ' + e.message);
    }
}
