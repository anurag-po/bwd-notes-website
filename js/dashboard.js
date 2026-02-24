import { auth } from '../js/auth.js';
import { supabase } from '../js/supabase.js';
import { utils } from '../js/utils.js';

let user = null;

async function init() {
    // 1. Auth Check
    const session = await auth.requireAuth();
    user = session.user;

    // 2. Setup UI
    document.getElementById('user-display').textContent = user.email;
    document.getElementById('logout-btn').addEventListener('click', auth.signOut);
    document.getElementById('new-collection-btn').addEventListener('click', createCollection);

    // 3. Load Data
    fetchCollections();
}

async function fetchCollections() {
    const grid = document.getElementById('collections-grid');
    const emptyState = document.getElementById('empty-state');

    // Keep skeletons for a moment or clear them
    // grid.innerHTML = ''; // Don't clear immediately to avoid flicker if we had real skeletons, but here we replace.

    const { data: collections, error } = await supabase
        .from('collections')
        .select('*, notes(count)')
        .order('updated_at', { ascending: false });

    if (error) {
        console.error('Error fetching collections:', error);
        grid.innerHTML = `<div style="color: var(--danger)">Failed to load collections.</div>`;
        return;
    }

    grid.innerHTML = '';

    if (collections.length === 0) {
        emptyState.style.display = 'block';
        return;
    } else {
        emptyState.style.display = 'none';
    }

    collections.forEach(col => {
        const card = document.createElement('div');
        card.className = 'card';
        card.style.cursor = 'pointer';
        card.onclick = (e) => {
            if (e.target.closest('.actions')) return;
            window.location.href = `collection.html?id=${col.id}`;
        };

        const noteCount = col.notes ? col.notes[0].count : 0; // supabase count query format might vary, usually it's {count: n} if using head or similar, but here we used select check. 
        // Actually select('*, notes(count)') returns notes: [{count: x}] if exact count is set? 
        // Supabase select count is tricky. Let's stick to simple select for now and maybe separate count or just ignore count for v1 MVP reliability.
        // Correction: '*, notes(count)' is correct if foreign key exists. It returns array.

        // Let's assume just showing title for now to be safe.

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: var(--space-md);">
                <h3 style="font-size: 1.2rem; font-weight: 600;">${utils.escapeHTML(col.name)}</h3>
                <div class="actions">
                    <button class="btn-icon delete-btn" data-id="${col.id}" style="color: var(--text-tertiary);">&times;</button>
                </div>
            </div>
            <div style="font-size: 0.9rem; color: var(--text-secondary);">
                Last updated ${utils.formatDate(col.updated_at)}
            </div>
        `;

        card.querySelector('.delete-btn').onclick = (e) => {
            e.stopPropagation();
            deleteCollection(col.id);
        };

        grid.appendChild(card);
    });
}

async function createCollection() {
    const name = prompt("Enter collection name:");
    if (!name) return;

    const { error } = await supabase
        .from('collections')
        .insert([{ name: name, user_id: user.id }]);

    if (error) {
        alert('Error creating collection: ' + error.message);
    } else {
        fetchCollections();
    }
}

async function deleteCollection(id) {
    if (!confirm("Are you sure? This will delete all notes in this collection.")) return;

    const { error } = await supabase
        .from('collections')
        .delete()
        .eq('id', id);

    if (error) {
        alert('Error deleting: ' + error.message);
    } else {
        fetchCollections();
    }
}

init();
