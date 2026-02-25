import { auth } from '../js/auth.js';
import { supabase } from '../js/supabase.js';
import { utils } from '../js/utils.js';

let user = null;
const collectionId = new URLSearchParams(window.location.search).get('id');

async function init() {
    const session = await auth.requireAuth();
    user = session.user;

    if (!collectionId) {
        window.location.href = 'dashboard.html';
        return;
    }

    // Load Collection Details
    loadCollectionDetails();

    // Load Notes
    loadNotes();

    // Setup Actions
    document.getElementById('new-note-btn').onclick = () => {
        window.location.href = `note.html?collection_id=${collectionId}`; // Create new note page
    };

    document.getElementById('sort-select').onchange = () => loadNotes();

    // PDF Upload Logic
    const uploadBtn = document.getElementById('upload-pdf-btn');
    const fileInput = document.getElementById('pdf-upload');

    uploadBtn.onclick = () => fileInput.click();

    fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Visual feedback
        const originalText = uploadBtn.textContent;
        uploadBtn.textContent = 'Uploading...';
        uploadBtn.disabled = true;

        try {
            // 1. Upload to Supabase Storage (assuming bucket 'vault-files' exists)
            // If the bucket doesn't exist, this will throw an error, which the user needs to create.
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}/${Date.now()}.${fileExt}`;

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('vault-files')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            // 2. Get Public URL
            const { data: urlData } = supabase.storage
                .from('vault-files')
                .getPublicUrl(fileName);

            const publicUrl = urlData.publicUrl;

            // 3. Create Note for the PDF
            const notePayload = {
                title: file.name.replace('.pdf', ''),
                content: `Embedded PDF file: ${file.name}`,
                reference_url: publicUrl,
                collection_id: collectionId,
                user_id: user.id
            };

            const { data: noteData, error: noteError } = await supabase
                .from('notes')
                .insert([notePayload])
                .select()
                .single();

            if (noteError) throw noteError;

            // 4. Reload notes and go to the new note
            window.location.href = `note.html?id=${noteData.id}`;
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Upload failed. Please ensure the "vault-files" storage bucket exists and is public.');
        } finally {
            uploadBtn.textContent = originalText;
            uploadBtn.disabled = false;
            fileInput.value = ''; // Reset input
        }
    };
}

async function loadCollectionDetails() {
    const { data, error } = await supabase
        .from('collections')
        .select('name')
        .eq('id', collectionId)
        .single();

    if (data) {
        document.getElementById('collection-title').textContent = data.name;
    } else {
        document.getElementById('collection-title').textContent = 'Collection not found';
    }
}

async function loadNotes() {
    const sortValue = document.getElementById('sort-select').value;
    const [field, order] = sortValue.split('.');

    const list = document.getElementById('notes-list');
    const empty = document.getElementById('empty-state');

    // list.innerHTML = ''; // Keep previous or skeleton logic if preferred

    const { data: notes, error } = await supabase
        .from('notes')
        .select('*')
        .eq('collection_id', collectionId)
        .order(field, { ascending: order === 'asc' });

    if (error) {
        console.error(error);
        return;
    }

    list.innerHTML = '';

    if (notes.length === 0) {
        empty.style.display = 'block';
    } else {
        empty.style.display = 'none';
        notes.forEach(note => {
            const el = document.createElement('div');
            el.className = 'list-item';
            el.style.backgroundColor = 'var(--bg-panel)';
            el.style.border = '1px solid var(--border-subtle)';
            el.style.marginBottom = 'var(--space-sm)'; // Helper override

            el.innerHTML = `
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: var(--text-primary);">${utils.escapeHTML(note.title || 'Untitled')}</div>
                    <div style="font-size: 0.85rem; color: var(--text-tertiary);">
                        ${utils.formatDate(note.updated_at)}
                    </div>
                </div>
                <button class="btn-icon delete-btn" style="opacity: 0.5;">&times;</button>
            `;

            el.onclick = (e) => {
                if (e.target.closest('.delete-btn')) return;
                window.location.href = `note.html?id=${note.id}`;
            };

            el.querySelector('.delete-btn').onclick = async (e) => {
                e.preventDefault();
                if (confirm('Delete note?')) {
                    await supabase.from('notes').delete().eq('id', note.id);
                    loadNotes();
                }
            };

            list.appendChild(el);
        });
    }
}

init();
