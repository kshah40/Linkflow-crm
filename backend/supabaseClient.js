import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || 'https://pqnntdsdtzgibqwuegwc.supabase.co'
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxbm50ZHNkdHpnaWJxd3VlZ3djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE0NDc1MzcsImV4cCI6MjA1NzAyMzUzN30.Wj0xa2UmZolk079DFzrstsBGzOAfgVlUMHJKDEqn8Jk'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    },
    realtime: {
        params: {
            eventsPerSecond: 10
        }
    }
}) 