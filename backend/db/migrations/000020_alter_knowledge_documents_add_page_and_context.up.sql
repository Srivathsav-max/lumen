-- Add page_id and context to knowledge_documents for per-space segregation
ALTER TABLE public.knowledge_documents
    ADD COLUMN IF NOT EXISTS page_id UUID NULL REFERENCES public.pages(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS context VARCHAR(32) NOT NULL DEFAULT 'notes';

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_page ON public.knowledge_documents(page_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_workspace_context ON public.knowledge_documents(workspace_id, context);


