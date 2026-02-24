import { auth } from '../js/auth.js';
import { supabase } from '../js/supabase.js';
import { utils } from '../js/utils.js';

async function init() {
    const session = await auth.requireAuth();
    const user = session.user;

    // Email
    document.getElementById('user-email').textContent = user.email;

    // Logout
    document.getElementById('logout-btn').addEventListener('click', auth.signOut);

    // Stats
    loadStats();

    // Theme (Initialize Toggle State)
    initTheme();
}

async function loadStats() {
    // We can't use .count() easily with RLS sometimes depending on permissions, but select count should work.
    // However, head: true is cleaner.

    const { count: colCount } = await supabase
        .from('collections')
        .select('*', { count: 'exact', head: true });

    const { count: noteCount } = await supabase
        .from('notes')
        .select('*', { count: 'exact', head: true });

    document.getElementById('stat-collections').textContent = colCount || 0;
    document.getElementById('stat-notes').textContent = noteCount || 0;
}

function initTheme() {
    const toggle = document.getElementById('theme-toggle');
    const currentTheme = utils.getTheme();

    // Set initial state based on global utils result
    toggle.checked = currentTheme === 'dark';

    toggle.addEventListener('change', (e) => {
        const newTheme = e.target.checked ? 'dark' : 'light';
        utils.setTheme(newTheme);
    });
}

init();
