
import { escapeHtml, pillolaRuolo } from '../core/ui.js';

export function nomeDaEmail(email) {
    if (!email) return '(senza email)';
    return email.split('@')[0].split('.')
        .map(p => p.charAt(0).toUpperCase() + p.slice(1))
        .join(' ');
}

export function nomeDiPersona(riga) {
    const scritto = (riga.nome_scritto || '').trim();
    if (scritto) return scritto;
    const google = (riga.nome_google || '').trim();
    if (google) return google;
    return nomeDaEmail(riga.email);
}

export function fonteDelNome(riga) {
    if ((riga.nome_scritto || '').trim()) return 'scritto';
    if ((riga.nome_google || '').trim()) return 'google';
    return 'dedotto';
}

export function iniziali(nome) {
    return String(nome || '').split(' ').map(p => p.charAt(0)).join('').slice(0, 2).toUpperCase();
}

function avatar(riga) {
    const sigla = escapeHtml(iniziali(riga.nome));
    const url = String(riga.avatar_url || '');
    const immagine = /^https:\/\//i.test(url)
        ? `<img src="${escapeHtml(url)}" alt="" referrerpolicy="no-referrer">`
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

export function colonneDi(moduli) {
    const colonne = [
        {
            key: 'persona',
            label: 'Persona',
            classes: ['col-persona'],
            sticky: true,
            width: 260,
            render: (v, riga) => {
                const dubbio = riga.fonteNome === 'dedotto'
                    ? ' <span class="nome-dedotto" title="Nome ricavato dall\'indirizzo: potrebbe non essere quello giusto. Clicca per correggerlo.">?</span>'
                    : '';

                return `<button type="button" class="cella-persona" data-action="nome"` +
                    ` data-persona="${escapeHtml(riga.id)}"` +
                    ` title="Correggi il nome di ${escapeHtml(riga.nome)}">
                    <div class="persona">
                        ${avatar(riga)}
                        <div class="persona-testo">
                            <div class="persona-nome">${escapeHtml(riga.nome)}${dubbio}</div>
                            <div class="persona-email">${escapeHtml(riga.email || '')}</div>
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
            classes: ['col-modulo'],
            title: modulo.attivo ? '' : 'Modulo non attivo nel portale',
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

export function componiRighe({ persone, abilitazioni }) {
    const perPersona = new Map();
    const scopePersona = new Map();
    for (const a of abilitazioni) {
        if (!perPersona.has(a.user_id)) { perPersona.set(a.user_id, {}); scopePersona.set(a.user_id, {}); }
        perPersona.get(a.user_id)[a.module] = a.role;
        scopePersona.get(a.user_id)[a.module] = a.scope || {};
    }

    return persone
        .map(p => {
            const sue = perPersona.get(p.id) || {};
            return {
                ...p,
                nome: nomeDiPersona(p),
                fonteNome: fonteDelNome(p),
                abilitazioni: sue,
                scope: scopePersona.get(p.id) || {},
                super_admin: sue.admin === 'SUPER_ADMIN'
            };
        })
        .sort((a, b) => {
            const priorita = r => (!r.attivo ? 0 : (!r.ha_profilo ? 1 : 2));
            const pa = priorita(a), pb = priorita(b);
            if (pa !== pb) return pa - pb;
            return a.nome.localeCompare(b.nome);
        });
}

export function riepilogaConteggi(righe, moduli) {
    const attive = righe.filter(r => r.attivo && r.ha_profilo).length;
    const daAbilitare = righe.filter(r => r.attivo && !r.ha_profilo).length;
    const disattivate = righe.filter(r => !r.attivo).length;

    const pezzi = [`${righe.length} persone`, `${attive} attive`];
    if (daAbilitare) pezzi.push(`${daAbilitare} da abilitare`);
    if (disattivate) pezzi.push(`${disattivate} disattivate`);
    pezzi.push(`${moduli.filter(m => m.attivo).length} moduli attivi`);
    return pezzi.join(' · ');
}
