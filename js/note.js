import { auth } from '../js/auth.js';
import { supabase } from '../js/supabase.js';
import { utils } from '../js/utils.js';

let user = null;
const params = new URLSearchParams(window.location.search);
const noteId = params.get('id');
const collectionId = params.get('collection_id');
let currentNoteId = noteId;
const statusEl = document.getElementById('save-status');

// Elements
const titleEl = document.getElementById('note-title');
const contentEl = document.getElementById('note-content');
const refEl = document.getElementById('note-ref');

// PDF Viewer Elements
const pdfViewerContainer = document.getElementById('pdf-viewer-container');
const pdfFrame = document.getElementById('pdf-frame');

function updatePDFViewer(url) {
    if (url && url.toLowerCase().includes('.pdf')) {
        // Use #toolbar=0&view=FitH for better default PDF embedding experience
        pdfFrame.src = url.includes('#') ? url : url + '#toolbar=0&view=FitH';
        pdfViewerContainer.style.display = 'block';
    } else {
        pdfFrame.src = '';
        pdfViewerContainer.style.display = 'none';
    }
}

async function init() {
    const session = await auth.requireAuth();
    user = session.user;

    if (currentNoteId) {
        loadNote();
    } else {
        // New note state
        if (!collectionId) {
            alert('No collection specified');
            window.location.href = 'dashboard.html';
        }
        statusEl.textContent = 'New Note';
    }

    // Auto-save setup
    const debouncedSave = utils.debounce(saveNote, 1000);

    [titleEl, contentEl].forEach(el => {
        el.addEventListener('input', () => {
            statusEl.textContent = 'Saving...';
            statusEl.className = 'status-indicator saving';
            debouncedSave();
        });
    });

    refEl.addEventListener('input', () => {
        statusEl.textContent = 'Saving...';
        statusEl.className = 'status-indicator saving';
        updatePDFViewer(refEl.value);
        debouncedSave();
    });

    // Tag Input
    document.getElementById('tag-input').addEventListener('keydown', handleTagInput);
}

async function loadNote() {
    const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('id', currentNoteId)
        .single();

    if (error) {
        console.error(error);
        return;
    }

    titleEl.value = data.title || '';
    contentEl.value = data.content || '';
    refEl.value = data.reference_url || '';

    updatePDFViewer(refEl.value);

    statusEl.textContent = 'Saved';
    statusEl.className = 'status-indicator saved';

    loadTags();
}

async function saveNote() {
    const payload = {
        title: titleEl.value,
        content: contentEl.value,
        reference_url: refEl.value,
        updated_at: new Date().toISOString()
    };

    let error = null;

    if (currentNoteId) {
        // Update
        const res = await supabase
            .from('notes')
            .update(payload)
            .eq('id', currentNoteId);
        error = res.error;
    } else {
        // Create
        payload.collection_id = collectionId;
        payload.user_id = user.id;
        const res = await supabase
            .from('notes')
            .insert([payload])
            .select() // return the new record
            .single();

        if (res.data) {
            currentNoteId = res.data.id;
            // Update URL without reload
            const newUrl = new URL(window.location);
            newUrl.searchParams.set('id', currentNoteId);
            newUrl.searchParams.delete('collection_id');
            window.history.replaceState({}, '', newUrl);
        }
        error = res.error;
    }

    if (error) {
        console.error(error);
        statusEl.textContent = 'Error saving';
        statusEl.className = 'status-indicator error';
    } else {
        statusEl.textContent = 'Saved';
        statusEl.className = 'status-indicator saved';
    }
}

// Minimal Tag Logic (Simplified for MVP)
// Ideally: Fetch user tags, match string, create if new.
async function handleTagInput(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        const tagName = e.target.value.trim();
        if (!tagName) return;

        // 1. Find or Create Tag
        let tagId;

        // Check existing
        const { data: existing } = await supabase
            .from('tags')
            .select('id')
            .eq('name', tagName)
            .eq('user_id', user.id)
            .single();

        if (existing) {
            tagId = existing.id;
        } else {
            const { data: newTag, error } = await supabase
                .from('tags')
                .insert([{ name: tagName, user_id: user.id }])
                .select()
                .single();
            if (error) return console.error(error);
            tagId = newTag.id;
        }

        // 2. Link to Note (if note exists)
        if (currentNoteId && tagId) {
            await supabase
                .from('note_tags')
                .insert([{ note_id: currentNoteId, tag_id: tagId }]);

            e.target.value = '';
            loadTags();
        } else {
            alert('Please type in the note first to save it before adding tags.');
        }
    }
}

async function loadTags() {
    if (!currentNoteId) return;

    // Supabase join query to get tags for this note
    const { data: noteTags } = await supabase
        .from('note_tags')
        .select('tag_id, tags(name)')
        .eq('note_id', currentNoteId);

    const container = document.getElementById('tags-container');
    container.innerHTML = '';

    if (noteTags) {
        noteTags.forEach(nt => {
            const span = document.createElement('span');
            span.className = 'tag-pill';
            span.textContent = nt.tags.name;
            container.appendChild(span);
        });
    }
}

init();
