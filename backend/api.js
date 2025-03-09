// Supabase client initialization
const supabaseUrl = 'https://pqnntdsdtzgibqwuegwc.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxbm50ZHNkdHpnaWJxd3VlZ3djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE0NDc1MzcsImV4cCI6MjA1NzAyMzUzN30.Wj0xa2UmZolk079DFzrstsBGzOAfgVlUMHJKDEqn8Jk'
const supabase = supabase.createClient(supabaseUrl, supabaseAnonKey)

// Profile Management
export const getProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return null

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

    if (error) throw error
    return data
}

export const updateProfile = async (updates) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Not authenticated')

    const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', session.user.id)
        .select()
        .single()

    if (error) throw error
    return data
}

// CRM Functions
export const createInvestor = async (investorData) => {
    const { data, error } = await supabase
        .from('investors')
        .insert([investorData])
        .select()
        .single()

    if (error) throw error
    return data
}

export const getInvestors = async (filters = {}) => {
    let query = supabase
        .from('investors')
        .select(`
            *,
            interactions:investor_interactions(*)
        `)

    if (filters.status) {
        query = query.eq('status', filters.status)
    }

    const { data, error } = await query

    if (error) throw error
    return data
}

export const updateInvestor = async (id, updates) => {
    const { data, error } = await supabase
        .from('investors')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return data
}

export const createInteraction = async (interactionData) => {
    const { data, error } = await supabase
        .from('investor_interactions')
        .insert([interactionData])
        .select()
        .single()

    if (error) throw error
    return data
}

// Fundraising Functions
export const createFundraisingRound = async (roundData) => {
    const { data, error } = await supabase
        .from('fundraising_rounds')
        .insert([roundData])
        .select()
        .single()

    if (error) throw error
    return data
}

export const getFundraisingRounds = async () => {
    const { data, error } = await supabase
        .from('fundraising_rounds')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) throw error
    return data
}

// Q&A Functions
export const createQuestion = async (questionData) => {
    const { data, error } = await supabase
        .from('questions')
        .insert([questionData])
        .select()
        .single()

    if (error) throw error
    return data
}

export const getQuestions = async (filters = {}) => {
    let query = supabase
        .from('questions')
        .select(`
            *,
            answers(*),
            tags:question_tags(tag:tags(*))
        `)

    if (filters.category) {
        query = query.eq('category', filters.category)
    }
    if (filters.is_private !== undefined) {
        query = query.eq('is_private', filters.is_private)
    }

    const { data, error } = await query

    if (error) throw error
    return data
}

export const createAnswer = async (answerData) => {
    const { data, error } = await supabase
        .from('answers')
        .insert([answerData])
        .select()
        .single()

    if (error) throw error
    return data
}

// Project Management Functions
export const createProject = async (projectData) => {
    const { data, error } = await supabase
        .from('projects')
        .insert([projectData])
        .select()
        .single()

    if (error) throw error
    return data
}

export const getProjects = async (type) => {
    const { data, error } = await supabase
        .from('projects')
        .select(`
            *,
            tasks(*)
        `)
        .eq('project_type', type)
        .order('created_at', { ascending: false })

    if (error) throw error
    return data
}

export const createTask = async (taskData) => {
    const { data, error } = await supabase
        .from('tasks')
        .insert([taskData])
        .select()
        .single()

    if (error) throw error
    return data
}

export const updateTask = async (id, updates) => {
    const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return data
}

// Comments and Activity Logs
export const createComment = async (commentData) => {
    const { data, error } = await supabase
        .from('comments')
        .insert([commentData])
        .select()
        .single()

    if (error) throw error
    return data
}

export const getComments = async (entityType, entityId) => {
    const { data, error } = await supabase
        .from('comments')
        .select(`
            *,
            profile:profiles(full_name, avatar_url)
        `)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: true })

    if (error) throw error
    return data
}

export const logActivity = async (activityData) => {
    const { data, error } = await supabase
        .from('activity_logs')
        .insert([activityData])
        .select()
        .single()

    if (error) throw error
    return data
}

// Document Management
export const uploadDocument = async (file, type, metadata) => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `${type}/${fileName}`

    const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file)

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

    const documentData = {
        name: file.name,
        type: type,
        url: publicUrl,
        ...metadata
    }

    const { data, error } = await supabase
        .from('documents')
        .insert([documentData])
        .select()
        .single()

    if (error) throw error
    return data
}

export const getDocuments = async (type, id) => {
    const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq(type === 'investor' ? 'investor_id' : 'round_id', id)
        .order('created_at', { ascending: false })

    if (error) throw error
    return data
} 