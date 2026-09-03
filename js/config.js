var SUPABASE_URL = "https://pycbyruvojvcoadoaybj.supabase.co";
var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5Y2J5cnV2b2p2Y29hZG9heWJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1MzY1NTksImV4cCI6MjEwMzExMjU1OX0.dKDiZic_MZkS1kpBv5_w1VLW6idd8hXX_jMkP5RcX6Y";
var supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const TRELLO_PARAMS = {
    idBoard: "67221082a4321466c54fdd52",
    idList: "6a75d926d7344ea71ffb8199",
    idLabel: "678a7549e3fbef690d54d521",
    idLabelDashboard: { visual_design: "6a91a7e9c4b257f8c6e418e9", industrial: "67b5fda3de4610ae11abf2a7" },
    idLabelBug: "6a91a828e936afdd414bce47",
    idLabelFeature: "6a91a83ac40c5e66b94d3f84",
    idMembers: ["67221033f0e68a29c66161cf", "68ecebe25a55172816e4cc80"]
};

const GENERIC_TICKET_CATEGORIES = {
    prodotto_mancante: { label: 'Prodotto da inserire', usesProductLabel: true },
    modifiche_gruppo: { label: 'Modifiche gruppo di prodotti', usesProductLabel: true },
    bug: { label: "Bug dell'applicazione", usesProductLabel: false },
    feature: { label: 'Richiesta Feature / Suggerimento', usesProductLabel: false }
};

const PERSONAL_COLUMN_OWNERS = {
    PersonalCol1: 'matteo.capannolo@tt-group.it',
    PersonalCol2: 'daniele.ubaldi@tt-group.it',
    PersonalCol3: 'michelle.arrigoni@tt-group.it'
};
const PERSONAL_COLUMN_SLOTS = { PersonalCol1: 1, PersonalCol2: 2, PersonalCol3: 3 };
const PERSONAL_COLUMN_LEGEND_KEYS = ['🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '🟤', '⭐', '⛔', '✅', '❌', '❓', '♾️'];

const STICKY_COLUMN_WIDTHS = {
    'Brand Prodotto': 96,
    'Nome Prodotto': 138,
    'Stato Globale': 69,
    'Tickets': 69,
    'Miniatura': 69,
    'Versione Prodotto': 138
};

const DASHBOARDS = {
    visual_design: {
        label: 'Visual Design',
        type: 'product_table',
        columns: [
            'Nome Prodotto', 'Stato Globale', 'Tickets', 'Miniatura', 'Versione Prodotto', 'Codice Univoco', 'Categoria Prodotto', 'Applicazioni',
            'Su sito', 'Pagina Web ITA', 'Pagina Web ENG', 'Descrizione Meta ITA', 'Descrizione Meta ENG', 'Note/WebSite',
            'Docs', 'Folder Datasheet', 'Datasheet Doc [ENG]', 'PDF Datasheet [ENG]', 'Datasheet Doc [ITA]', 'PDF Datasheet [ITA]', 'QR CODE ITA', 'QR CODE ENG', 'CE', 'RoHS',
            'Visual', 'Immagini Prodotto', 'Foto Principale', 'foto formato Webp', 'Render Ambientali', 'Serigrafia',
            'Versioni Alternative', 'PersonalCol1', 'PersonalCol2', 'PersonalCol3', 'In Catalogo'
        ],
        sectionsConfig: {
            "sec_1": { motherCols: ['Nome Prodotto', 'Stato Globale', 'Tickets', 'Miniatura', 'Versione Prodotto'], childCols: ['Codice Univoco', 'Categoria Prodotto', 'Applicazioni'], isExpanded: false },
            "sec_2": { motherCols: ['Su sito'], childCols: ['Pagina Web ITA', 'Pagina Web ENG', 'Descrizione Meta ITA', 'Descrizione Meta ENG', 'Note/WebSite'], isExpanded: false },
            "sec_3": { motherCols: ['Docs'], childCols: ['Folder Datasheet', 'Datasheet Doc [ENG]', 'PDF Datasheet [ENG]', 'Datasheet Doc [ITA]', 'PDF Datasheet [ITA]', 'QR CODE ITA', 'QR CODE ENG', 'CE', 'RoHS'], isExpanded: false },
            "sec_4": { motherCols: ['Visual'], childCols: ['Immagini Prodotto', 'Foto Principale', 'foto formato Webp', 'Render Ambientali', 'Serigrafia'], isExpanded: false }
        },
        stickyColumns: ['Nome Prodotto', 'Stato Globale', 'Tickets', 'Miniatura', 'Versione Prodotto'],
        categoryColors: {
            "Distribuzione AV/IP": { bg: "#4A90E2", text: "#FFFFFF" },
            "Technological Forniture": { bg: "#9013FE", text: "#FFFFFF" },
            "LEDwall e Display": { bg: "#E67E22", text: "#FFFFFF" },
            "Accessori": { bg: "#2ECC71", text: "#000000" },
            "Software": { bg: "#EC4899", text: "#FFFFFF" }
        },
        defaultCatColor: { bg: "#9EB4D4", text: "#000000" },
        applicationColors: {
            "Sale controllo": { bg: "#FFB703", text: "#000000" },
            "Sale riunioni": { bg: "#00B4D8", text: "#000000" },
            "Sale conferenza": { bg: "#023E8A", text: "#FFFFFF" },
            "Digital Sinage": { bg: "#D90429", text: "#FFFFFF" }
        },
        defaultAppColor: { bg: "#F5D777", text: "#000000" },
        singleSelectFields: { 'Su sito': ['Sì', 'No'] },
        sortPriorityField: null,
        sortPriorityOrder: []
    },

    industrial: {
        label: 'Industrial',
        type: 'product_table',
        columns: [
            'Brand Prodotto', 'Nome Prodotto', 'Stato Globale', 'Tickets', 'Miniatura', 'Versione Prodotto', 'Codice Univoco', 'Categoria Prodotto', 'Applicazioni', 'Originale',
            'Su sito', 'Pagina Web ITA', 'Pagina Web ENG', 'Descrizione Meta ITA', 'Descrizione Meta ENG', 'Note/WebSite',
            'Docs', 'Folder Datasheet', 'Datasheet Doc [ENG]', 'PDF Datasheet [ENG]', 'Datasheet Doc [ITA]', 'PDF Datasheet [ITA]', 'QR CODE ITA', 'QR CODE ENG', 'CE', 'RoHS',
            'Visual', 'Immagini Prodotto', 'Foto Principale', 'foto formato Webp', 'Render Ambientali', 'Serigrafia',
            'Versioni Alternative', 'PersonalCol1', 'PersonalCol2', 'PersonalCol3', 'In Catalogo'
        ],
        sectionsConfig: {
            "sec_1": { motherCols: ['Brand Prodotto', 'Nome Prodotto', 'Stato Globale', 'Tickets', 'Miniatura', 'Versione Prodotto'], childCols: ['Codice Univoco', 'Categoria Prodotto', 'Applicazioni', 'Originale'], isExpanded: false },
            "sec_2": { motherCols: ['Su sito'], childCols: ['Pagina Web ITA', 'Pagina Web ENG', 'Descrizione Meta ITA', 'Descrizione Meta ENG', 'Note/WebSite'], isExpanded: false },
            "sec_3": { motherCols: ['Docs'], childCols: ['Folder Datasheet', 'Datasheet Doc [ENG]', 'PDF Datasheet [ENG]', 'Datasheet Doc [ITA]', 'PDF Datasheet [ITA]', 'QR CODE ITA', 'QR CODE ENG', 'CE', 'RoHS'], isExpanded: false },
            "sec_4": { motherCols: ['Visual'], childCols: ['Immagini Prodotto', 'Foto Principale', 'foto formato Webp', 'Render Ambientali', 'Serigrafia'], isExpanded: false }
        },
        stickyColumns: ['Brand Prodotto', 'Nome Prodotto', 'Stato Globale', 'Tickets', 'Miniatura', 'Versione Prodotto'],
        categoryColors: {
            "Misura di Torbidità": { bg: "#2E86AB", text: "#FFFFFF" },
            "Clororesiduometri": { bg: "#A23B72", text: "#FFFFFF" },
            "Colorimetria": { bg: "#F0A202", text: "#000000" },
            "Analisi chimico-fisica dell'acqua": { bg: "#379683", text: "#FFFFFF" },
            "Analisi Batteriologica dell'acqua": { bg: "#7B506F", text: "#FFFFFF" },
            "Sensoristica Tunnel": { bg: "#D64933", text: "#FFFFFF" },
            "Analisi Oil-In-Water": { bg: "#1B998B", text: "#000000" },
            "Sincronizzazione oraria": { bg: "#B0A990", text: "#000000" }
        },
        defaultCatColor: { bg: "#9EB4D4", text: "#000000" },
        applicationColors: {
            "Trattamento delle acque": { bg: "#118AB2", text: "#FFFFFF" },
            "Food & Beverage": { bg: "#EF7B45", text: "#000000" },
            "Trasporti e Ambiente": { bg: "#06A77D", text: "#FFFFFF" },
            "Power utilities": { bg: "#FFD23F", text: "#000000" },
            "Oil & Gas": { bg: "#4A4E69", text: "#FFFFFF" },
            "Chimico e Farmaceutico": { bg: "#C9184A", text: "#FFFFFF" }
        },
        defaultAppColor: { bg: "#F5D777", text: "#000000" },
        singleSelectFields: {
            'Su sito': ['Sì', 'No'],
            'Brand Prodotto': ['tt group', 'bNovate', 'Microlan', 'Sigrist', 'Kuntze', 'Hopf']
        },
        sortPriorityField: 'Brand Prodotto',
        sortPriorityOrder: ['tt group', 'bNovate', 'Microlan', 'Sigrist', 'Kuntze', 'Hopf']
    },

    generic_assets: {
        label: 'Asset Digitali Corporate',
        type: 'asset_grid',
        assetTypes: ['Logo', 'Font', 'Brand Manual', 'Website', 'Social', 'Certificazioni', 'Partner', 'Clienti']
    }
};

let currentDashboard = 'visual_design';
let columns, sectionsConfig, stickyColumns, categoryColors, defaultCatColor,
    applicationColors, defaultAppColor, categoriePossibili, applicazioniPossibili,
    singleSelectFields, sortPriorityField, sortPriorityOrder;

function applyDashboardConfig(businessUnit) {
    const cfg = DASHBOARDS[businessUnit];
    if (!cfg) return;
    currentDashboard = businessUnit;
    columns = cfg.columns || [];
    sectionsConfig = cfg.sectionsConfig || {};
    stickyColumns = cfg.stickyColumns || [];
    categoryColors = cfg.categoryColors || {};
    defaultCatColor = cfg.defaultCatColor || { bg: "#9EB4D4", text: "#000000" };
    applicationColors = cfg.applicationColors || {};
    defaultAppColor = cfg.defaultAppColor || { bg: "#F5D777", text: "#000000" };
    categoriePossibili = Object.keys(categoryColors);
    applicazioniPossibili = Object.keys(applicationColors);
    singleSelectFields = cfg.singleSelectFields || {};
    sortPriorityField = cfg.sortPriorityField || null;
    sortPriorityOrder = cfg.sortPriorityOrder || [];
}
applyDashboardConfig(currentDashboard);
