/** @type {string} Base API (sans slash final). Vide = chemins relatifs /api (même origine). */
export const apiBaseUrl = String(import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');

/** @type {string} Hôte Supabase public (sans slash final). */
export const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL ?? '').replace(/\/+$/, '');

const DEFAULT_SUPABASE = 'https://zuvzpcfrbheqeqbiottv.supabase.co';

/** URL Supabase pour le build (fallback si variable CI absente). */
export function getSupabaseOrigin() {
  return supabaseUrl || DEFAULT_SUPABASE;
}
