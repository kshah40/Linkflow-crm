import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Investor Management
export async function createInvestor(userData) {
    const { data, error } = await supabase
        .from('investors')
        .insert([userData]);
    return { data, error };
}

export async function updateInvestor(id, updates) {
    const { data, error } = await supabase
        .from('investors')
        .update(updates)
        .eq('id', id);
    return { data, error };
}

export async function getInvestors(filters = {}) {
    let query = supabase.from('investors').select('*');
    
    if (filters.status) {
        query = query.eq('status', filters.status);
    }
    
    const { data, error } = await query;
    return { data, error };
}

// Meeting Management
export async function scheduleMeeting(meetingData) {
    const { data, error } = await supabase
        .from('meetings')
        .insert([meetingData]);
    return { data, error };
}

export async function updateMeeting(id, updates) {
    const { data, error } = await supabase
        .from('meetings')
        .update(updates)
        .eq('id', id);
    return { data, error };
}

export async function getMeetings(filters = {}) {
    let query = supabase
        .from('meetings')
        .select(`
            *,
            investor:investors(company_name, contact_name)
        `);
    
    if (filters.startDate) {
        query = query.gte('meeting_date', filters.startDate);
    }
    if (filters.endDate) {
        query = query.lte('meeting_date', filters.endDate);
    }
    
    const { data, error } = await query;
    return { data, error };
}

// Document Management
export async function uploadDocument(file, metadata) {
    // Upload file to storage
    const fileName = `${Date.now()}-${file.name}`;
    const { data: fileData, error: fileError } = await supabase.storage
        .from('documents')
        .upload(fileName, file);

    if (fileError) return { error: fileError };

    // Create document record
    const { data: docData, error: docError } = await supabase
        .from('documents')
        .insert([{
            ...metadata,
            file_url: fileData.path
        }]);

    return { data: docData, error: docError };
}

export async function shareDocument(documentId, investorId, expiresAt) {
    const { data, error } = await supabase
        .from('document_shares')
        .insert([{
            document_id: documentId,
            investor_id: investorId,
            expires_at: expiresAt
        }]);
    return { data, error };
}

export async function getDocuments(filters = {}) {
    let query = supabase
        .from('documents')
        .select('*');
    
    if (filters.type) {
        query = query.eq('document_type', filters.type);
    }
    
    const { data, error } = await query;
    return { data, error };
}

// Q&A Management
export async function createQA(qaData) {
    const { data, error } = await supabase
        .from('qa_items')
        .insert([qaData]);
    return { data, error };
}

export async function updateQA(id, updates) {
    const { data, error } = await supabase
        .from('qa_items')
        .update(updates)
        .eq('id', id);
    return { data, error };
}

export async function getQAItems(filters = {}) {
    let query = supabase
        .from('qa_items')
        .select('*');
    
    if (filters.status) {
        query = query.eq('status', filters.status);
    }
    if (filters.category) {
        query = query.eq('category', filters.category);
    }
    
    const { data, error } = await query;
    return { data, error };
}

// Template Management
export async function createTemplate(templateData) {
    const { data, error } = await supabase
        .from('templates')
        .insert([templateData]);
    return { data, error };
}

export async function updateTemplate(id, updates) {
    const { data, error } = await supabase
        .from('templates')
        .update(updates)
        .eq('id', id);
    return { data, error };
}

export async function getTemplates(filters = {}) {
    let query = supabase
        .from('templates')
        .select('*');
    
    if (filters.category) {
        query = query.eq('category', filters.category);
    }
    
    const { data, error } = await query;
    return { data, error };
}

// Notes Management
export async function addInvestorNote(noteData) {
    const { data, error } = await supabase
        .from('investor_notes')
        .insert([noteData]);
    return { data, error };
}

export async function getInvestorNotes(investorId) {
    const { data, error } = await supabase
        .from('investor_notes')
        .select('*')
        .eq('investor_id', investorId)
        .order('created_at', { ascending: false });
    return { data, error };
}

// Activity Log
export async function getActivityLog(filters = {}) {
    let query = supabase
        .from('activity_log')
        .select(`
            *,
            user:profiles(full_name, email)
        `)
        .order('created_at', { ascending: false });
    
    if (filters.entityType) {
        query = query.eq('entity_type', filters.entityType);
    }
    if (filters.limit) {
        query = query.limit(filters.limit);
    }
    
    const { data, error } = await query;
    return { data, error };
}

// Analytics
export async function getInvestorStats() {
    const { data, error } = await supabase
        .from('investors')
        .select('status')
        .then(({ data }) => {
            return data.reduce((acc, curr) => {
                acc[curr.status] = (acc[curr.status] || 0) + 1;
                return acc;
            }, {});
        });
    return { data, error };
}

export async function getMeetingStats(startDate, endDate) {
    const { data, error } = await supabase
        .from('meetings')
        .select('status')
        .gte('meeting_date', startDate)
        .lte('meeting_date', endDate)
        .then(({ data }) => {
            return data.reduce((acc, curr) => {
                acc[curr.status] = (acc[curr.status] || 0) + 1;
                return acc;
            }, {});
        });
    return { data, error };
}

// Q&A Category Management
const createCategory = async (name, description) => {
  try {
    const { data, error } = await supabase
      .from('qa_categories')
      .insert([{ name, description }])
      .select();
    
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error creating category:', error);
    return { success: false, error: error.message };
  }
};

const updateCategory = async (categoryId, updates) => {
  try {
    const { data, error } = await supabase
      .from('qa_categories')
      .update(updates)
      .eq('id', categoryId)
      .select();
    
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error updating category:', error);
    return { success: false, error: error.message };
  }
};

const deleteCategory = async (categoryId) => {
  try {
    const { error } = await supabase
      .from('qa_categories')
      .delete()
      .eq('id', categoryId);
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deleting category:', error);
    return { success: false, error: error.message };
  }
};

const getCategories = async () => {
  try {
    const { data, error } = await supabase
      .from('qa_categories')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching categories:', error);
    return { success: false, error: error.message };
  }
};

// Q&A Item Management
const createQAItem = async (question, answer, categoryId, status = 'published') => {
  try {
    const { data, error } = await supabase
      .from('qa_items')
      .insert([{
        question,
        answer,
        category_id: categoryId,
        status
      }])
      .select();
    
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error creating Q&A item:', error);
    return { success: false, error: error.message };
  }
};

const updateQAItem = async (itemId, updates) => {
  try {
    const { data, error } = await supabase
      .from('qa_items')
      .update(updates)
      .eq('id', itemId)
      .select();
    
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error updating Q&A item:', error);
    return { success: false, error: error.message };
  }
};

const deleteQAItem = async (itemId) => {
  try {
    const { error } = await supabase
      .from('qa_items')
      .delete()
      .eq('id', itemId);
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deleting Q&A item:', error);
    return { success: false, error: error.message };
  }
};

const getQAItems = async (filters = {}) => {
  try {
    let query = supabase
      .from('qa_items')
      .select(`
        *,
        qa_categories (
          id,
          name
        )
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.search) {
      query = query.or(`question.ilike.%${filters.search}%,answer.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;
    
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching Q&A items:', error);
    return { success: false, error: error.message };
  }
};

// Export all functions
export const api = {
    investors: {
        create: createInvestor,
        update: updateInvestor,
        get: getInvestors
    },
    meetings: {
        schedule: scheduleMeeting,
        update: updateMeeting,
        get: getMeetings
    },
    documents: {
        upload: uploadDocument,
        share: shareDocument,
        get: getDocuments
    },
    qa: {
        create: createQA,
        update: updateQA,
        get: getQAItems
    },
    templates: {
        create: createTemplate,
        update: updateTemplate,
        get: getTemplates
    },
    notes: {
        add: addInvestorNote,
        get: getInvestorNotes
    },
    activity: {
        get: getActivityLog
    },
    analytics: {
        getInvestorStats,
        getMeetingStats
    },
    createCategory,
    updateCategory,
    deleteCategory,
    getCategories,
    createQAItem,
    updateQAItem,
    deleteQAItem,
    getQAItems
}; 