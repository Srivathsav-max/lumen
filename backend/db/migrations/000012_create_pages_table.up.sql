-- Create pages table for Notion-like documents
CREATE TABLE public.pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) DEFAULT 'Untitled',
    workspace_id INTEGER NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    owner_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.pages(id) ON DELETE CASCADE, -- For hierarchical pages
    icon TEXT, -- Emoji or icon identifier
    cover_url TEXT, -- Cover image URL
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    is_template BOOLEAN NOT NULL DEFAULT FALSE,
    properties JSONB DEFAULT '{}', -- Custom properties
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_edited_by INTEGER REFERENCES public.users(id)
);

-- Add indexes for performance
CREATE INDEX idx_pages_workspace_id ON public.pages(workspace_id);
CREATE INDEX idx_pages_owner_id ON public.pages(owner_id);
CREATE INDEX idx_pages_parent_id ON public.pages(parent_id);
CREATE INDEX idx_pages_created_at ON public.pages(created_at);
CREATE INDEX idx_pages_updated_at ON public.pages(updated_at);
CREATE INDEX idx_pages_is_archived ON public.pages(is_archived);
CREATE INDEX idx_pages_title_gin ON public.pages USING gin(to_tsvector('english', title));