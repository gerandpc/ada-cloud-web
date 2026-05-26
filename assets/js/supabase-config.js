// ADA Cloud - Configuración pública de Supabase
// Esta clave es ANON/PUBLIC. No poner acá service_role ni claves privadas.

const SUPABASE_URL = "https://ozqufgwydtzsefkvydwk.supabase.co";

const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96cXVmZ3d5ZHR6c2Vma3Z5ZHdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NzQ5ODYsImV4cCI6MjA5NTM1MDk4Nn0.XFhNAQJElNeuBzHG0136M57euBKpeLfwttt_hANf8xg";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
