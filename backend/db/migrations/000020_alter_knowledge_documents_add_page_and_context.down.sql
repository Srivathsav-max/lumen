DROP INDEX IF EXISTS idx_knowledge_documents_workspace_context;
DROP INDEX IF EXISTS idx_knowledge_documents_page;
ALTER TABLE public.knowledge_documents
    DROP COLUMN IF EXISTS page_id,
    DROP COLUMN IF EXISTS context;


