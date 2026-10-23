
import { escapeHtml, pillolaRuolo } from '../core/ui.js';
import { ORDINI, ordineDi, ordineSuccessivo, nomeInvertito } from './ordine.js';
import { iniziali } from './persone.js';
import { emailDaMostrare } from './azienda.js';
import { iconaModulo, ICONA_TASK } from '../core/icone-moduli.js';

function avatar(riga) {
    const sigla = escapeHtml(iniziali(riga.nome));
    const immagine = riga.foto
        ? `<img src="${escapeHtml(riga.foto)}" alt="" referrerpolicy="no-referrer">`
        : '';
    return `<div class="persona-avatar">${sigla}${immagine}</div>`;
}

function cosaVede(riga, modulo) {
    const ruolo = riga.abilitazioni[modulo.key];

    const spento = !modulo.attivo;

    if (riga.super_admin && !spento) {
        return pillolaRuolo('ADMIN', {
            implicito: true,
            motivo: 'Il super admin è amministratore di ogni modulo, senza bisogno di un\'abilitazione'
        });
    }

    if (ruolo) return pillolaRuolo(ruolo);

    if (modulo.aperto_a_tutti && modulo.ruolo_default && !spento) {
        return pillolaRuolo(modulo.ruolo_default, {
            implicito: true,
            motivo: modulo.label + ' è aperto a tutti: chiunque entri nella piattaforma vi accede come '
                + modulo.ruolo_default + ', senza abilitazione'
        });
    }

    return '<span class="niente">—</span>';
}

function classeTinta(chiave) {
    return 'modulo-' + String(chiave ?? '').toLowerCase().replace(/[^a-z0-9_]/g, '');
}

export function colonneDi(moduli, chiaveOrdine) {
    const ordine = ordineDi(chiaveOrdine);

    const colonne = [
        {
            key: 'persona',
            label: 'Persona',
            classes: ['col-persona'],
            sticky: true,
            width: 260,
            header: () => {
                const dopo = ordineDi(ordineSuccessivo(ordine.chiave));
                const attivo = ordine.chiave === ORDINI[0].chiave ? '' : ' attivo';
                return `<div class="th-content-wrapper">` +
                    `<span class="th-label">Persona</span>` +
                    `<button type="button" class="ordina-btn${attivo}" data-action="ordina"` +
                    ` title="${escapeHtml(ordine.breve + ' — premi per: ' + dopo.breve)}">` +
                    `<span class="material-symbols-outlined">${escapeHtml(ordine.icona)}</span>` +
                    `</button></div>`;
            },
            render: (v, riga) => {
                const dubbio = riga.fonteNome === 'dedotto'
                    ? ' <span class="nome-dedotto" title="Nome ricavato dall\'indirizzo: potrebbe non essere quello giusto. Clicca per correggerlo.">?</span>'
                    : '';

                const scritto = ordine.campo === 'cognome' ? nomeInvertito(riga) : riga.nome;

                return `<button type="button" class="cella-persona" data-action="nome"` +
                    ` data-persona="${escapeHtml(riga.id)}"` +
                    ` title="Nome, foto e azienda di ${escapeHtml(riga.nome)}">
                    <div class="persona">
                        ${avatar(riga)}
                        <div class="persona-testo">
                            <div class="persona-nome">${escapeHtml(scritto)}${dubbio}</div>
                            <div class="persona-email">${escapeHtml(emailDaMostrare(riga))}</div>
                        </div>
                    </div>
                </button>`;
            }
        },
        {
            key: 'stato',
            label: 'Stato',
            classes: ['col-stato'],
            render: (v, riga) => {
                const bottone = dentro => `<button type="button" class="cella-stato" data-action="stato"` +
                    ` data-persona="${escapeHtml(riga.id)}"` +
                    ` title="Attiva o disattiva l'account di ${escapeHtml(riga.nome)}">${dentro}</button>`;

                if (!riga.attivo) {
                    return { html: bottone('<span class="stato stato-ko">Disattivato</span>'), classes: ['riga-inattiva'] };
                }
                if (!riga.ha_profilo) return bottone('<span class="stato stato-attesa">Da abilitare</span>');
                return bottone('<span class="stato stato-ok">Attivo</span>');
            }
        },
        {
            key: 'ultimo_utilizzo',
            label: 'Ultimo utilizzo',
            classes: ['col-data'],
            render: (v, riga) => {
                if (!v) return '<span class="mai">mai</span>';
                const quando = new Date(v).toLocaleDateString('it-IT');
                const login = riga.ultimo_login
                    ? 'Ultima autenticazione: ' + new Date(riga.ultimo_login).toLocaleDateString('it-IT')
                    : 'Non si è mai autenticata';
                return `<span title="${escapeHtml(login)}">${escapeHtml(quando)}</span>`;
            }
        }
    ];

    for (const modulo of moduli) {
        colonne.push({
            key: 'mod:' + modulo.key,
            label: modulo.label,
            classes: ['col-modulo', 'modulo-tinta', classeTinta(modulo.key)],
            title: modulo.attivo ? modulo.label : modulo.label + ' — modulo non attivo nel portale',
            header: () => {
                const simbolo = iconaModulo(modulo.key);
                const dentro = simbolo === 'i-task'
                    ? ICONA_TASK
                    : `<svg aria-hidden="true"><use href="#${escapeHtml(simbolo)}"/></svg>`;

                return `<div class="testata-modulo">` +
                    `<span class="icona-modulo-testata">${dentro}</span>` +
                    `<span class="th-label">${escapeHtml(modulo.label)}</span></div>`;
            },
            render: (v, riga) => {
                const dentro = cosaVede(riga, modulo);

                return `<button type="button" class="cella-permesso" data-action="permesso"` +
                    ` data-persona="${escapeHtml(riga.id)}" data-modulo="${escapeHtml(modulo.key)}"` +
                    ` title="Cambia l'accesso di ${escapeHtml(riga.nome)} a ${escapeHtml(modulo.label)}">${dentro}</button>`;
            }
        });
    }

    return colonne;
}

