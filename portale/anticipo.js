const APERTURA_ANTICIPATA = new Set(['progetti', 'acquisti', 'marketing', 'task', 'admin']);

export function classeAnticipo(chiave) {
    return APERTURA_ANTICIPATA.has(chiave) ? ' apertura-anticipata' : '';
}

const giaPreparati = new Set();

async function preparaCodice(indirizzo) {
    if (giaPreparati.has(indirizzo)) return;
    giaPreparati.add(indirizzo);
    try {
        const risposta = await fetch(indirizzo);
        if (!risposta.ok) return;
        const pagina = new DOMParser().parseFromString(await risposta.text(), 'text/html');
        const file = [...pagina.querySelectorAll('link[rel="modulepreload"], link[rel="stylesheet"], script[src]')]
            .map(e => new URL(e.getAttribute('href') || e.getAttribute('src'), indirizzo))
            .filter(u => u.origin === window.location.origin);
        for (const u of file) {
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = u.href;
            document.head.append(link);
        }
    } catch (e) {
        console.warn("Preparazione anticipata del modulo non riuscita:", e);
    }
}

export function montaAnticipo(contenitore) {
    const suCard = ev => {
        const card = ev.target.closest('a.modulo-card');
        if (card) preparaCodice(card.href);
    };
    contenitore.addEventListener('pointerover', suCard);
    contenitore.addEventListener('focusin', suCard);
}
