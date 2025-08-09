DROP INDEX IF EXISTS idx_knowledge_embeddings_ann;
DROP TABLE IF EXISTS public.knowledge_embeddings;
DROP INDEX IF EXISTS idx_knowledge_chunks_document_idx;
DROP TABLE IF EXISTS public.knowledge_chunks;
DROP INDEX IF EXISTS idx_knowledge_documents_status;
DROP INDEX IF EXISTS idx_knowledge_documents_user;
DROP INDEX IF EXISTS idx_knowledge_documents_workspace;
DROP TABLE IF EXISTS public.knowledge_documents;
-- do not drop extension vector as others may rely on it

