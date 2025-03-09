import { supabase } from './supabaseClient'

// Authentication Functions
export const signUp = async ({ email, password, full_name, company_name, role }) => {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name,
                company_name,
                role
            }
        }
    })
    
    if (error) throw error
    return data
}

export const signIn = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    })
    
    if (error) throw error
    return data
}

export const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
}

export const resetPassword = async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
    })
    
    if (error) throw error
    return data
}

export const updatePassword = async (new_password) => {
    const { data, error } = await supabase.auth.updateUser({
        password: new_password
    })
    
    if (error) throw error
    return data
}

// Session Management
export const getSession = async () => {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) throw error
    return session
}

export const onAuthStateChange = (callback) => {
    return supabase.auth.onAuthStateChange((event, session) => {
        callback(event, session)
    })
}

// Role-based Authorization
export const checkRole = async (requiredRole) => {
    const session = await getSession()
    if (!session) return false
    
    const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()
        
    if (error) throw error
    return data.role === requiredRole
}

// Auth Guards
export const requireAuth = async (requiredRole = null) => {
    const session = await getSession()
    if (!session) {
        throw new Error('Authentication required')
    }
    
    if (requiredRole) {
        const hasRole = await checkRole(requiredRole)
        if (!hasRole) {
            throw new Error('Unauthorized access')
        }
    }
    
    return session
} 