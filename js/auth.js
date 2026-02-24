import { supabase } from './supabase.js';

export const auth = {
    async signInWithGoogle() {
        if (!supabase) return;
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + '/pages/dashboard.html'
            }
        });
        if (error) console.error('Login error:', error);
        return { data, error };
    },

    async signOut() {
        if (!supabase) return;
        const { error } = await supabase.auth.signOut();
        if (!error) {
            window.location.href = '../index.html';
        }
        return { error };
    },

    async getSession() {
        if (!supabase) return null;
        const { data, error } = await supabase.auth.getSession();
        return data.session;
    },

    async getUser() {
        if (!supabase) return null;
        const { data: { user } } = await supabase.auth.getUser();
        return user;
    },

    // Guard for protected pages
    async requireAuth() {
        const session = await this.getSession();
        if (!session) {
            window.location.href = '../index.html';
        }
        return session;
    }
};
