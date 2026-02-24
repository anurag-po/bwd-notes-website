
// Initialize Supabase Client
// Note: These keys should be replaced by the user or injected via env vars if building, 
// but for a vanilla app, we'll ask the user to input them or put placeholders.

const SUPABASE_URL = 'https://jrsktmimzgksabmjlcrl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_zstBbHtZ8B_HJnxq0SSh9A_8ntQKH7M';

// Check if window.supabase is available (loaded via CDN in index.html)
if (!window.supabase) {
    console.error('Supabase library not loaded');
}

const _supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

export const supabase = _supabase;
