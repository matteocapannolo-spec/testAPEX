
import { disegnaTabella } from '../../core/table.js';
import { colonneDellaDashboard, derivatiDiRiga } from './columns.js';
import { avviaSuoni } from '../../core/suoni.js';

window.apexTabella = { disegnaTabella, colonneDellaDashboard, derivatiDiRiga };

document.addEventListener('click', ev => {
    const pulsante = ev.target.closest('[data-action="sezione"]');
    if (pulsante) toggleSection(pulsante.dataset.sezione);
});

avviaSuoni();
initFilters();
checkSession();
