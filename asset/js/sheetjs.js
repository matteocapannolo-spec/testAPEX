const SHEETJS_URL = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
const SHEETJS_INTEGRITY = 'sha384-EnyY0/GSHQGSxSgMwaIPzSESbqoOLSexfnSMN2AP+39Ckmn92stwABZynq1JyzdT';

let sheetJSInArrivo = null;

function loadSheetJS() {
    if (window.XLSX) return Promise.resolve();
    if (sheetJSInArrivo) return sheetJSInArrivo;
    sheetJSInArrivo = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = SHEETJS_URL;
        script.integrity = SHEETJS_INTEGRITY;
        script.crossOrigin = 'anonymous';
        script.onload = () => resolve();
        script.onerror = () => {
            sheetJSInArrivo = null;
            script.remove();
            reject(new Error("la libreria Excel non si e' scaricata. Controlla la connessione e riprova."));
        };
        document.head.appendChild(script);
    });
    return sheetJSInArrivo;
}
