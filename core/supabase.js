const SUPABASE_URL = "https://pycbyruvojvcoadoaybj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5Y2J5cnV2b2p2Y29hZG9heWJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1MzY1NTksImV4cCI6MjEwMzExMjU1OX0.dKDiZic_MZkS1kpBv5_w1VLW6idd8hXX_jMkP5RcX6Y";

export const URL_INGRESSO = {
    hash: window.location.hash,
    query: window.location.search
};

if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    throw new Error("supabase-js non è stato caricato: manca lo <script> con integrity nella pagina.");
}

export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export { SUPABASE_URL };
