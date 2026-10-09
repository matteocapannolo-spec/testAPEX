
import { escapeHtml } from '../core/ui.js';
import { INDIRIZZO_VALIDO } from './config.js';

const AMMESSI = {
    P: 'p', BR: 'br',
    STRONG: 'strong', B: 'strong',
    EM: 'em', I: 'em',
    UL: 'ul', OL: 'ol', LI: 'li',
    A: 'a'
};

const SCARTATI = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'TEMPLATE', 'NOSCRIPT', 'SVG', 'MATH', 'HEAD', 'TITLE']);

export function pulisciHtml(html) {
    const doc = new DOMParser().parseFromString('<body>' + String(html ?? '') + '</body>', 'text/html');
    return figli(doc.body);
}

function figli(nodo) {
    let out = '';
    for (const f of nodo.childNodes) out += uno(f);
    return out;
}

function uno(n) {
    if (n.nodeType === Node.TEXT_NODE) return escapeHtml(n.nodeValue);
    if (n.nodeType !== Node.ELEMENT_NODE) return '';
    if (SCARTATI.has(n.tagName)) return '';

    const tag = AMMESSI[n.tagName];
    if (!tag) {
        if (n.tagName === 'DIV') return paragrafo(figli(n));
        return figli(n);
    }
    if (tag === 'br') return '<br>';
    if (tag === 'p') return paragrafo(figli(n));
    if (tag === 'a') {
        const href = (n.getAttribute('href') || '').trim();
        if (!INDIRIZZO_VALIDO.test(href)) return figli(n);
        return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${figli(n)}</a>`;
    }
    return `<${tag}>${figli(n)}</${tag}>`;
}

function paragrafo(dentro) {
    return dentro.replace(/<br>/g, '').trim() ? `<p>${dentro}</p>` : '';
}

export function testoPiano(html) {
    const doc = new DOMParser().parseFromString(String(html ?? ''), 'text/html');
    return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
}

export function cellaConLink(testo) {
    const s = String(testo ?? '');
    const pezzi = s.split(/(https?:\/\/[^\s]+)/g);
    return pezzi.map(p => INDIRIZZO_VALIDO.test(p)
        ? `<a href="${escapeHtml(p)}" target="_blank" rel="noopener noreferrer">${escapeHtml(p)}</a>`
        : escapeHtml(p)).join('');
}
