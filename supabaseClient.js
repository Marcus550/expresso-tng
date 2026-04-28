// Shared Supabase client
// IMPORTANT: em app 100% front-end, qualquer chave aqui fica pública.
// Para não versionar as chaves no GitHub, use `config.js` (gitignored).
const cfg = window.__APP_CONFIG__ || {};
const supabaseUrl = cfg.SUPABASE_URL;
const supabaseAnonKey = cfg.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Config ausente. Crie `config.js` a partir de `config.example.js` e preencha SUPABASE_URL e SUPABASE_ANON_KEY."
  );
} else {
  window._supabase = supabase.createClient(supabaseUrl, supabaseAnonKey);
}

