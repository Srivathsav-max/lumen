-- Create page versions table for version history
CREATE TABLE public.page_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    title VARCHAR(500),
    content JSONB NOT NULL, -- Complete EditorJS data snapshot
    change_summary TEXT, -- Optional description of changes
    created_by INTEGER NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(page_id, version_number)
);

-- Add indexes for performance
CREATE INDEX idx_page_versions_page_id ON public.page_versions(page_id);
CREATE INDEX idx_page_versions_version_number ON public.page_versions(page_id, version_number);
CREATE INDEX idx_page_versions_created_at ON public.page_versions(created_at);
CREATE INDEX idx_page_versions_created_by ON public.page_versions(created_by);