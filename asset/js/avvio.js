
import { disegnaTabella } from '../../core/table.js';
import { colonneDellaDashboard, derivatiDiRiga } from './columns.js';
import { montaNotifiche } from '../../core/notifiche.js';

window.apexTabella = { disegnaTabella, colonneDellaDashboard, derivatiDiRiga };

document.addEventListener('click', ev => {
    const pulsante = ev.target.closest('[data-action="sezione"]');
    if (pulsante) toggleSection(pulsante.dataset.sezione);
});

initFilters();
checkSession().then(() => montaNotifiche(window.supabase));
