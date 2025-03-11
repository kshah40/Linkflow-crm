import { supabase } from './supabase-config.js';

let currentUser = null;

export async function getCurrentUser() {
    // Check session storage first
    const sessionUser = sessionStorage.getItem('user');
    if (sessionUser) {
        currentUser = JSON.parse(sessionUser);
        return currentUser;
    }

    // Only check with Supabase if no user in session storage
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
        console.error('Error getting user:', error.message);
        return null;
    }

    if (user) {
        currentUser = user;
        // Store in session storage
        sessionStorage.setItem('user', JSON.stringify(user));
    }

    return currentUser;
}

export async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        throw error;
    }

    if (data.user) {
        currentUser = data.user;
        // Store in session storage
        sessionStorage.setItem('user', JSON.stringify(data.user));
    }

    return data;
}

export async function signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password
    });

    if (error) {
        throw error;
    }

    return data;
}

export async function signOut() {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
        throw error;
    }

    // Clear session storage and current user
    sessionStorage.removeItem('user');
    currentUser = null;
}

// Subscribe to auth changes
supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') {
        window.location.href = '/qa-dashboard.html';
    } else if (event === 'SIGNED_OUT') {
        window.location.href = '/login.html';
    }
}); 