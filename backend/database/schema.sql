-- Enable RLS
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create custom types
CREATE TYPE investor_status AS ENUM ('lead', 'prospect', 'contacted', 'meeting_scheduled', 'in_discussion', 'due_diligence', 'negotiation', 'committed', 'closed', 'passed');
CREATE TYPE meeting_status AS ENUM ('scheduled', 'completed', 'cancelled', 'rescheduled');
CREATE TYPE document_type AS ENUM ('pitch_deck', 'financial_model', 'contract', 'report', 'other');
CREATE TYPE qa_status AS ENUM ('draft', 'published', 'archived');

-- Create tables
CREATE TABLE IF NOT EXISTS public.investors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    company_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    status investor_status DEFAULT 'prospect',
    investment_range TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE IF NOT EXISTS public.meetings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    investor_id UUID REFERENCES public.investors(id),
    title TEXT NOT NULL,
    description TEXT,
    meeting_date TIMESTAMP WITH TIME ZONE NOT NULL,
    duration INTEGER, -- in minutes
    location TEXT,
    status meeting_status DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    title TEXT NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    document_type document_type NOT NULL,
    version TEXT,
    is_template BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE IF NOT EXISTS public.document_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES public.documents(id),
    investor_id UUID REFERENCES public.investors(id),
    shared_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    expires_at TIMESTAMP WITH TIME ZONE,
    access_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.qa_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category TEXT,
    tags TEXT[],
    status qa_status DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE IF NOT EXISTS public.templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    title TEXT NOT NULL,
    description TEXT,
    content TEXT NOT NULL,
    category TEXT,
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE IF NOT EXISTS public.investor_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    investor_id UUID REFERENCES public.investors(id),
    user_id UUID REFERENCES auth.users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE IF NOT EXISTS public.activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    action_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE IF NOT EXISTS public.qa_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Add foreign key to qa_items table
ALTER TABLE public.qa_items ADD COLUMN category_id UUID REFERENCES public.qa_categories(id);

-- Create index for qa_categories
CREATE INDEX idx_qa_categories_user_id ON public.qa_categories(user_id);

-- Add RLS policies for qa_categories
ALTER TABLE public.qa_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own categories" ON public.qa_categories
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create categories" ON public.qa_categories
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories" ON public.qa_categories
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories" ON public.qa_categories
    FOR DELETE USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_investors_user_id ON public.investors(user_id);
CREATE INDEX idx_investors_status ON public.investors(status);
CREATE INDEX idx_meetings_user_id ON public.meetings(user_id);
CREATE INDEX idx_meetings_investor_id ON public.meetings(investor_id);
CREATE INDEX idx_meetings_date ON public.meetings(meeting_date);
CREATE INDEX idx_documents_user_id ON public.documents(user_id);
CREATE INDEX idx_qa_items_user_id ON public.qa_items(user_id);
CREATE INDEX idx_qa_items_status ON public.qa_items(status);
CREATE INDEX idx_templates_user_id ON public.templates(user_id);
CREATE INDEX idx_activity_log_user_id ON public.activity_log(user_id);
CREATE INDEX idx_activity_log_created_at ON public.activity_log(created_at);

-- Create RLS policies
ALTER TABLE public.investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own investors" ON public.investors
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create investors" ON public.investors
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own investors" ON public.investors
    FOR UPDATE USING (auth.uid() = user_id);

-- Similar policies for other tables
-- ... (create similar policies for meetings, documents, qa_items, etc.)

-- Create functions
CREATE OR REPLACE FUNCTION public.handle_new_activity()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.activity_log (user_id, action_type, entity_type, entity_id, description)
    VALUES (
        NEW.user_id,
        TG_OP,
        TG_TABLE_NAME,
        NEW.id,
        CASE
            WHEN TG_OP = 'INSERT' THEN 'Created new ' || TG_TABLE_NAME
            WHEN TG_OP = 'UPDATE' THEN 'Updated ' || TG_TABLE_NAME
            WHEN TG_OP = 'DELETE' THEN 'Deleted ' || TG_TABLE_NAME
        END
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
CREATE TRIGGER on_investor_change
    AFTER INSERT OR UPDATE OR DELETE ON public.investors
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_activity();

CREATE TRIGGER on_meeting_change
    AFTER INSERT OR UPDATE OR DELETE ON public.meetings
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_activity();

CREATE TRIGGER on_document_change
    AFTER INSERT OR UPDATE OR DELETE ON public.documents
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_activity();

CREATE TRIGGER on_qa_change
    AFTER INSERT OR UPDATE OR DELETE ON public.qa_items
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_activity(); 