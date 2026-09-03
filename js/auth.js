async function handleGoogleLogin() {
    const errorMsg = document.getElementById('loginError');
    errorMsg.style.display = 'none';

    if (!supabase) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }

    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.href.split('#')[0],
            queryParams: { hd: 'tt-group.it', prompt: 'select_account' }
        }
    });

    if (error) {
        errorMsg.innerText = "Errore nell'avvio dell'accesso Google: " + error.message;
        errorMsg.style.display = 'block';
    }
}

async function loadUserProfile(userId) {
    const { data: profile, error } = await supabase.from('user_profiles').select('*').eq('id', userId).single();
    if (error || !profile) return null;
    currentUserProfile = profile;
    applyRolePermissionsToUI();
    return profile;
}

async function rejectUnauthorizedSession(message) {
    await supabase.auth.signOut();
    const errorMsg = document.getElementById('loginError');
    errorMsg.innerText = message;
    errorMsg.style.display = 'block';
    const loginScreen = document.getElementById('loginScreen');
    loginScreen.style.display = 'flex';
    loginScreen.style.opacity = '1';
}

async function checkSession() {
    if (!supabase && window.supabase) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    if (!supabase) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const profile = await loadUserProfile(session.user.id);
    if (!profile) {
        await rejectUnauthorizedSession("Il tuo account Google non è abilitato per questa applicazione. Contatta un amministratore.");
        return;
    }

    const loginScreen = document.getElementById('loginScreen');
    if (loginScreen) loginScreen.style.display = 'none';

    currentUserEmail = session.user.email;
    updateUserAvatar(session.user.email, session.user?.user_metadata?.avatar_url);
    await loadUserAvatars();
    await enterDashboard(pickDefaultDashboard());
    await loadTicketsFromSupabase();
}

async function handleLogout() {
    if (supabase) await supabase.auth.signOut();
    location.reload();
}

function getPastelColorFromEmail(email) {
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
        hash = email.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 75%, 82%)`;
}

function updateUserAvatar(email, avatarUrl = null) {
    if (!email) return;

    const namePart = email.split('@')[0];
    const nameParts = namePart.split('.');
    let formattedName = formatNameFromEmail(email);

    let initials = "";
    if (nameParts.length >= 2) {
        initials = (nameParts[0].charAt(0) + nameParts[1].charAt(0)).toUpperCase();
    } else {
        initials = namePart.substring(0, 2).toUpperCase();
    }

    const pastelBg = getPastelColorFromEmail(email);

    const avatarBtn = document.getElementById('userAvatar');
    const dropdownAvatar = document.getElementById('dropdownAvatar');
    const initialsEl = document.getElementById('avatarInitials');
    const dropdownInitials = document.getElementById('dropdownInitials');
    const profileNameEl = document.getElementById('profileName');
    const profileEmailEl = document.getElementById('profileEmail');

    profileNameEl.innerText = formattedName;
    profileEmailEl.innerText = email;

    if (avatarUrl) {
        avatarBtn.style.backgroundImage = `url('${avatarUrl}')`;
        dropdownAvatar.style.backgroundImage = `url('${avatarUrl}')`;
        initialsEl.innerText = "";
        dropdownInitials.innerText = "";
    } else {
        avatarBtn.style.backgroundImage = "none";
        dropdownAvatar.style.backgroundImage = "none";
        avatarBtn.style.backgroundColor = pastelBg;
        dropdownAvatar.style.backgroundColor = pastelBg;
        initialsEl.innerText = initials;
        dropdownInitials.innerText = initials;
    }
}

function toggleProfileDropdown(e) {
    e.stopPropagation();
    const dropdown = document.getElementById('profileDropdown');
    dropdown.classList.toggle('show');
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const icon = document.getElementById('theme-icon-menu');
    const text = document.getElementById('theme-text-menu');
    const isDark = document.body.classList.contains('dark-mode');
    icon.textContent = isDark ? 'light_mode' : 'dark_mode';
    text.textContent = isDark ? 'Modalità Chiara' : 'Modalità Scura';
    localStorage.setItem('apexTheme', isDark ? 'dark' : 'light');
}

function applyStoredTheme() {
    const isDark = localStorage.getItem('apexTheme') === 'dark';
    document.body.classList.toggle('dark-mode', isDark);
    const icon = document.getElementById('theme-icon-menu');
    const text = document.getElementById('theme-text-menu');
    if (icon) icon.textContent = isDark ? 'light_mode' : 'dark_mode';
    if (text) text.textContent = isDark ? 'Modalità Chiara' : 'Modalità Scura';
}
applyStoredTheme();
