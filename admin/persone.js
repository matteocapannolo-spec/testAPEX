
import { ORDINI, ordinaRighe, cognomeDiPersona } from './ordine.js';

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

export function fotoDiPersona(riga) {
    const scelta = String(riga.avatar_scelto || '').trim();
    if (/^https:\/\//i.test(scelta)) return scelta;
    const google = String(riga.avatar_google || '').trim();
    if (/^https:\/\//i.test(google)) return google;
    return '';
}

export function fonteDellaFoto(riga) {
    const scelta = String(riga.avatar_scelto || '').trim();
    if (/^https:\/\//i.test(scelta)) return 'scelta';
    const google = String(riga.avatar_google || '').trim();
    if (/^https:\/\//i.test(google)) return 'google';
    return 'nessuna';
}

export function componiRighe({ persone, abilitazioni }) {
    const perPersona = new Map();
    const scopePersona = new Map();
    for (const a of abilitazioni) {
        if (!perPersona.has(a.user_id)) { perPersona.set(a.user_id, {}); scopePersona.set(a.user_id, {}); }
        perPersona.get(a.user_id)[a.module] = a.role;
        scopePersona.get(a.user_id)[a.module] = a.scope || {};
    }

    const righe = persone
        .map(p => {
            const sue = perPersona.get(p.id) || {};
            return {
                ...p,
                nome: nomeDiPersona(p),
                fonteNome: fonteDelNome(p),
                foto: fotoDiPersona(p),
                fonteFoto: fonteDellaFoto(p),
                abilitazioni: sue,
                scope: scopePersona.get(p.id) || {},
                super_admin: sue.admin === 'SUPER_ADMIN',
                cognome: cognomeDiPersona({ email: p.email, nome: nomeDiPersona(p) })
            };
        });

    return ordinaRighe(righe, ORDINI[0].chiave);
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
