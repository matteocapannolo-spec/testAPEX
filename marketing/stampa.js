
import { toast } from '../core/ui.js';
import { capitoloInVista } from './sommario.js';

export function esportaPdf(elemento) {
    const ambito = elemento.dataset.ambito;
    const documento = document.getElementById('documento');

    for (const c of documento.querySelectorAll('.capitolo')) c.classList.remove('in-stampa');

    if (ambito === 'capitolo') {
        const id = capitoloInVista();
        const cap = id && documento.querySelector(`.capitolo[data-id="${CSS.escape(id)}"]`);
        if (!cap) {
            toast('Nessun capitolo in vista da stampare.');
            return;
        }
        cap.classList.add('in-stampa');
        document.body.dataset.stampa = 'capitolo';
    } else {
        document.body.dataset.stampa = 'tutto';
    }

    const filtri = ['ricerca', 'filtroCapitolo', 'filtroStato'].some(id => document.getElementById(id).value);
    if (filtri) toast('Il PDF contiene solo i blocchi che passano i filtri attivi.');

    window.addEventListener('afterprint', () => { delete document.body.dataset.stampa; }, { once: true });
    window.print();
}
