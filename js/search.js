import { auth } from '../js/auth.js';
import { supabase } from '../js/supabase.js';
import { utils } from '../js/utils.js';

let allNotes = [];
let user = null;

const input = document.getElementById('search-input');
const list = document.getElementById('results-list');
const loading = document.getElementById('loading-indicator');
const noResults = document.getElementById('no-results');

async function init() {
    const session = await auth.requireAuth();
    user = session.user;

    loading.style.display = 'block';

    // Fetch ALL notes for client-side search (assuming reasonable scale for Personal Vault)
    // For larger scale, use Supabase Full Text Search (server-side).
    // Spec asked for "Client-side indexing"
    const { data, error } = await supabase
        .from('notes')
        .select('id, title, content, updated_at, tags(name)');

    loading.style.display = 'none';

    if (error) {
        console.error(error);
        return;
    }

    allNotes = data || [];

    // Focus input
    input.focus();
    input.addEventListener('input', utils.debounce(handleSearch, 300));
}

function handleSearch(e) {
    const query = e.target.value.toLowerCase().trim();

    if (!query) {
        list.innerHTML = '';
        noResults.style.display = 'none';
        return;
    }

    const results = allNotes.filter(note => {
        const titleMatch = (note.title || '').toLowerCase().includes(query);
        const contentMatch = (note.content || '').toLowerCase().includes(query);
        // Note: tags is array of objects due to join: [{name: 'x'}, {name: 'y'}]
        const tagMatch = note.tags && note.tags.some(t => t.name.toLowerCase().includes(query));

        return titleMatch || contentMatch || tagMatch;
    });

    renderResults(results);
}

function renderResults(results) {
    list.innerHTML = '';

    if (results.length === 0) {
        noResults.style.display = 'block';
        return;
    }

    noResults.style.display = 'none';

    results.forEach(note => {
        const el = document.createElement('div');
        el.className = 'list-item card'; // Combine styles
        el.style.marginBottom = 'var(--space-sm)';

        // Highlight snippet could be added here

        el.innerHTML = `
            <div>
                <div style="font-weight: 600; font-size: 1.1rem; margin-bottom: 4px;">${utils.escapeHTML(note.title || 'Untitled')}</div>
                <div style="font-size: 0.9rem; color: var(--text-secondary); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                    ${utils.escapeHTML(note.content || '')}
                </div>
            </div>
        `;

        el.onclick = () => {
            window.location.href = `note.html?id=${note.id}`;
        };

        list.appendChild(el);
    });
}

init();
