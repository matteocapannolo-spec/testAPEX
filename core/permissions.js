import { supabase } from './supabase.js';
import { portalUrl } from './auth.js';

export async function myModules() {
    const { data, error } = await supabase.rpc('my_modules');
    if (error) {
        console.error("Lettura dei moduli abilitati fallita:", error);
        throw error;
    }
    return data || [];
}

export async function moduleRole(modulo) {
    const { data, error } = await supabase.rpc('module_role', { p_module: modulo });
    if (error) {
        console.error(`Lettura del ruolo su "${modulo}" fallita:`, error);
        throw error;
    }
    return data;
}

export async function requireModule(modulo) {
    const ruolo = await moduleRole(modulo);
    if (!ruolo) {
        window.location.replace(portalUrl());
        await new Promise(() => { });
    }
    return ruolo;
}

export function isAdmin(ruolo) {
    return ruolo === 'ADMIN';
}

export async function isSuperAdmin() {
    const { data, error } = await supabase.rpc('is_super_admin');
    if (error) {
        console.error("Verifica del super admin fallita:", error);
        return false;
    }
    return data === true;
}
