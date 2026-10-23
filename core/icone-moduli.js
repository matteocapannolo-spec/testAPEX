
export const ICONE_MODULI = {
    asset: 'i-asset',
    progetti: 'i-progetti',
    formazione: 'i-formazione',
    acquisti: 'i-acquisti',
    marketing: 'i-marketing',
    task: 'i-task',
    admin: 'i-admin'
};

export function iconaModulo(chiave) {
    return Object.hasOwn(ICONE_MODULI, chiave) ? ICONE_MODULI[chiave] : 'i-default';
}

export const ICONA_TASK = `<svg class="modulo-icona icona-task" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="1.5" y="2" width="5.8" height="20" rx="1.6"/>
    <rect x="9.1" y="2" width="5.8" height="13.5" rx="1.6"/>
    <rect x="16.7" y="2" width="5.8" height="8.5" rx="1.6"/>
</svg>`;

const DISEGNI = {
    asset: `
        <path d="M12 0.9c0.85 6.75 4.35 10.25 11.1 11.1 -6.75 0.85 -10.25 4.35 -11.1 11.1 -0.85 -6.75 -4.35 -10.25 -11.1 -11.1 6.75 -0.85 10.25 -4.35 11.1 -11.1Z"/>
    `,

    progetti: `
        <path d="M12 1.8A10.2 10.2 0 0 1 21.59 8.51L18.39 9.67A6.8 6.8 0 0 0 12 5.2Z"/>
        <path d="M12 1.8A10.2 10.2 0 0 1 21.59 8.51L18.39 9.67A6.8 6.8 0 0 0 12 5.2Z" transform="rotate(120 12 12)"/>
        <path d="M12 1.8A10.2 10.2 0 0 1 21.59 8.51L18.39 9.67A6.8 6.8 0 0 0 12 5.2Z" transform="rotate(240 12 12)"/>
    `,

    formazione: `
        <circle cx="12" cy="12" r="4.2"/>
        <circle cx="12" cy="3.4" r="2"/>
        <circle cx="18.08" cy="5.92" r="2"/>
        <circle cx="20.6" cy="12" r="2"/>
        <circle cx="18.08" cy="18.08" r="2"/>
        <circle cx="12" cy="20.6" r="2"/>
        <circle cx="5.92" cy="18.08" r="2"/>
        <circle cx="3.4" cy="12" r="2"/>
        <circle cx="5.92" cy="5.92" r="2"/>
    `,

    admin: `
        <rect x="9.85" y="0.9" width="4.3" height="4.8" rx="0.9"/>
        <rect x="9.85" y="0.9" width="4.3" height="4.8" rx="0.9" transform="rotate(45 12 12)"/>
        <rect x="9.85" y="0.9" width="4.3" height="4.8" rx="0.9" transform="rotate(90 12 12)"/>
        <rect x="9.85" y="0.9" width="4.3" height="4.8" rx="0.9" transform="rotate(135 12 12)"/>
        <rect x="9.85" y="0.9" width="4.3" height="4.8" rx="0.9" transform="rotate(180 12 12)"/>
        <rect x="9.85" y="0.9" width="4.3" height="4.8" rx="0.9" transform="rotate(225 12 12)"/>
        <rect x="9.85" y="0.9" width="4.3" height="4.8" rx="0.9" transform="rotate(270 12 12)"/>
        <rect x="9.85" y="0.9" width="4.3" height="4.8" rx="0.9" transform="rotate(315 12 12)"/>
        <path fill-rule="evenodd" d="M12 4.4a7.6 7.6 0 1 1 0 15.2 7.6 7.6 0 0 1 0-15.2Zm0 4.3a3.3 3.3 0 1 0 0 6.6 3.3 3.3 0 0 0 0-6.6Z"/>
    `,

    acquisti: `
        <path d="M12 12V1.6a5.2 5.2 0 0 1 0 10.4Z"/>
        <path d="M12 12V1.6a5.2 5.2 0 0 1 0 10.4Z" transform="rotate(90 12 12)"/>
        <path d="M12 12V1.6a5.2 5.2 0 0 1 0 10.4Z" transform="rotate(180 12 12)"/>
        <path d="M12 12V1.6a5.2 5.2 0 0 1 0 10.4Z" transform="rotate(270 12 12)"/>
    `,

    marketing: `
        <circle cx="12" cy="12" r="3.2"/>
        <path fill-rule="evenodd" d="M12 5.2a6.8 6.8 0 1 1 0 13.6 6.8 6.8 0 0 1 0-13.6Zm0 2.2a4.6 4.6 0 1 0 0 9.2 4.6 4.6 0 0 0 0-9.2Z"/>
        <path d="M12 0.9a11.1 11.1 0 0 1 11.1 11.1h-2.2A8.9 8.9 0 0 0 12 3.1Z"/>
        <path d="M12 0.9a11.1 11.1 0 0 1 11.1 11.1h-2.2A8.9 8.9 0 0 0 12 3.1Z" transform="rotate(120 12 12)"/>
        <path d="M12 0.9a11.1 11.1 0 0 1 11.1 11.1h-2.2A8.9 8.9 0 0 0 12 3.1Z" transform="rotate(240 12 12)"/>
    `,


    default: `
        <ellipse cx="12" cy="5.4" rx="1.9" ry="4.3"/>
        <ellipse cx="12" cy="5.4" rx="1.9" ry="4.3" transform="rotate(45 12 12)"/>
        <ellipse cx="12" cy="5.4" rx="1.9" ry="4.3" transform="rotate(90 12 12)"/>
        <ellipse cx="12" cy="5.4" rx="1.9" ry="4.3" transform="rotate(135 12 12)"/>
        <ellipse cx="12" cy="5.4" rx="1.9" ry="4.3" transform="rotate(180 12 12)"/>
        <ellipse cx="12" cy="5.4" rx="1.9" ry="4.3" transform="rotate(225 12 12)"/>
        <ellipse cx="12" cy="5.4" rx="1.9" ry="4.3" transform="rotate(270 12 12)"/>
        <ellipse cx="12" cy="5.4" rx="1.9" ry="4.3" transform="rotate(315 12 12)"/>
        <circle cx="12" cy="12" r="2.6"/>
    `
};

const SPRITE = '<svg id="sprite-icone-moduli" class="sprite-icone" aria-hidden="true" focusable="false">'
    + Object.entries(DISEGNI)
        .map(([nome, disegno]) => `<symbol id="i-${nome}" viewBox="0 0 24 24">${disegno}</symbol>`)
        .join('')
    + '</svg>';

export function montaSpriteModuli() {
    if (document.getElementById('sprite-icone-moduli')) return;
    document.body.insertAdjacentHTML('afterbegin', SPRITE);
}
