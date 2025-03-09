-- Base tables
-- Create profiles table to store additional user information
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    full_name TEXT,
    company_name TEXT,
    email TEXT UNIQUE,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- CRM Tables
-- Create investors table for CRM
create table public.investors (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    email text,
    company text,
    position text,
    investment_focus text[],
    typical_check_size numeric,
    status text default 'prospect',
    owner_id uuid references public.profiles(id) on delete cascade not null,
    notes text,
    last_contact_date timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create fundraising_rounds table
create table public.fundraising_rounds (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    target_amount numeric not null,
    raised_amount numeric default 0,
    status text default 'active',
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    owner_id uuid references public.profiles(id) on delete cascade not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create investor_interactions table
create table public.investor_interactions (
    id uuid default uuid_generate_v4() primary key,
    investor_id uuid references public.investors(id) on delete cascade not null,
    interaction_type text not null,
    notes text,
    meeting_date timestamp with time zone,
    follow_up_date timestamp with time zone,
    status text default 'pending',
    created_by uuid references public.profiles(id) not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create documents table for CRM
create table public.documents (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    type text not null,
    url text not null,
    investor_id uuid references public.investors(id) on delete cascade,
    round_id uuid references public.fundraising_rounds(id) on delete cascade,
    created_by uuid references public.profiles(id) not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Q&A Management Tables
-- Create questions table
create table public.questions (
    id uuid default uuid_generate_v4() primary key,
    title text not null,
    content text not null,
    category text,
    status text default 'pending',
    is_private boolean default false,
    view_count integer default 0,
    created_by uuid references public.profiles(id) not null,
    assigned_to uuid references public.profiles(id),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create answers table
create table public.answers (
    id uuid default uuid_generate_v4() primary key,
    question_id uuid references public.questions(id) on delete cascade not null,
    content text not null,
    is_accepted boolean default false,
    created_by uuid references public.profiles(id) not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create tags table
create table public.tags (
    id uuid default uuid_generate_v4() primary key,
    name text unique not null,
    description text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create question_tags junction table
create table public.question_tags (
    question_id uuid references public.questions(id) on delete cascade not null,
    tag_id uuid references public.tags(id) on delete cascade not null,
    primary key (question_id, tag_id)
);

-- Project Management Tables (Shared between CRM and Q&A)
-- Create projects table
create table public.projects (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    description text,
    project_type text not null, -- 'crm' or 'qa'
    status text default 'active',
    owner_id uuid references public.profiles(id) on delete cascade not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create tasks table
create table public.tasks (
    id uuid default uuid_generate_v4() primary key,
    title text not null,
    description text,
    status text default 'pending',
    priority text default 'medium',
    due_date timestamp with time zone,
    project_id uuid references public.projects(id) on delete cascade not null,
    assigned_to uuid references public.profiles(id),
    created_by uuid references public.profiles(id) not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create comments table (shared between all entities)
create table public.comments (
    id uuid default uuid_generate_v4() primary key,
    content text not null,
    entity_type text not null, -- 'task', 'question', 'investor', 'project'
    entity_id uuid not null,
    created_by uuid references public.profiles(id) not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create activity_logs table
create table public.activity_logs (
    id uuid default uuid_generate_v4() primary key,
    action text not null,
    entity_type text not null,
    entity_id uuid not null,
    user_id uuid references public.profiles(id) not null,
    metadata jsonb default '{}',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.investors enable row level security;
alter table public.fundraising_rounds enable row level security;
alter table public.investor_interactions enable row level security;
alter table public.documents enable row level security;
alter table public.questions enable row level security;
alter table public.answers enable row level security;
alter table public.tags enable row level security;
alter table public.question_tags enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.comments enable row level security;
alter table public.activity_logs enable row level security;

-- Create security policies
-- Profiles
create policy "Users can view their own profile" on public.profiles
    for select using (auth.uid() = id);

create policy "Users can update their own profile" on public.profiles
    for update using (auth.uid() = id);

-- Investors
create policy "Investors are viewable by team members" 
    on public.investors for select using (
        auth.uid() = owner_id or
        exists (
            select 1 from public.projects p
            inner join public.tasks t on t.project_id = p.id
            where p.project_type = 'crm' and t.assigned_to = auth.uid()
        )
    );

create policy "Team members can create investors" 
    on public.investors for insert with check (
        exists (
            select 1 from public.projects p
            where p.project_type = 'crm' and p.owner_id = auth.uid()
        )
    );

-- Questions
create policy "Public questions are viewable by everyone" 
    on public.questions for select using (
        not is_private or auth.uid() = created_by or auth.uid() = assigned_to
    );

create policy "Authenticated users can create questions" 
    on public.questions for insert with check (auth.uid() = created_by);

-- Create functions and triggers
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Create updated_at triggers for all tables
create trigger handle_updated_at before update on public.profiles
    for each row execute function public.handle_updated_at();

create trigger handle_updated_at before update on public.investors
    for each row execute function public.handle_updated_at();

create trigger handle_updated_at before update on public.fundraising_rounds
    for each row execute function public.handle_updated_at();

create trigger handle_updated_at before update on public.investor_interactions
    for each row execute function public.handle_updated_at();

create trigger handle_updated_at before update on public.documents
    for each row execute function public.handle_updated_at();

create trigger handle_updated_at before update on public.questions
    for each row execute function public.handle_updated_at();

create trigger handle_updated_at before update on public.answers
    for each row execute function public.handle_updated_at();

create trigger handle_updated_at before update on public.projects
    for each row execute function public.handle_updated_at();

create trigger handle_updated_at before update on public.tasks
    for each row execute function public.handle_updated_at();

create trigger handle_updated_at before update on public.comments
    for each row execute function public.handle_updated_at();

-- Function to create profile after signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (id, full_name, email)
    values (
        new.id,
        new.raw_user_meta_data->>'full_name',
        new.email
    );
    return new;
end;
$$ language plpgsql SECURITY DEFINER;

-- Trigger to create profile after signup
create or replace trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user(); 