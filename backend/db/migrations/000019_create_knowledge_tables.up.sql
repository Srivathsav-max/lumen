-- Enable pgvector and create knowledge (documents/chunks/embeddings) tables

-- pgvector extension for similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Knowledge documents are source files (stored in Appwrite) associated with a workspace (notebook)
CREATE TABLE public.knowledge_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    workspace_id INTEGER NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    appwrite_bucket_id TEXT NOT NULL,
    appwrite_file_id TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'uploaded', -- uploaded | parsing | indexed | failed
    page_count INTEGER,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_knowledge_documents_workspace ON public.knowledge_documents(workspace_id);
CREATE INDEX idx_knowledge_documents_user ON public.knowledge_documents(user_id);
CREATE INDEX idx_knowledge_documents_status ON public.knowledge_documents(status);

-- Chunks of normalized text extracted from documents (for retrieval)
CREATE TABLE public.knowledge_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.knowledge_documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    text TEXT NOT NULL,
    page_number INTEGER,
    start_char INTEGER,
    end_char INTEGER,
    token_count INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_knowledge_chunks_document_idx ON public.knowledge_chunks(document_id, chunk_index);

-- Embeddings for each chunk (using Google text-embedding-004 default 768 dims)
CREATE TABLE public.knowledge_embeddings (
    chunk_id UUID PRIMARY KEY REFERENCES public.knowledge_chunks(id) ON DELETE CASCADE,
    embedding VECTOR(768) NOT NULL
);

-- Approximate nearest neighbor index for cosine similarity
CREATE INDEX idx_knowledge_embeddings_ann ON public.knowledge_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);


