-- Create comments table for collaboration
CREATE TABLE public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
    block_id UUID REFERENCES public.blocks(id) ON DELETE CASCADE, -- Optional: comment on specific block
    parent_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE, -- For replies
    author_id INTEGER NOT NULL REFERENCES public.users(id),
    content TEXT NOT NULL,
    is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_by INTEGER REFERENCES public.users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_comments_page_id ON public.comments(page_id);
CREATE INDEX idx_comments_block_id ON public.comments(block_id);
CREATE INDEX idx_comments_parent_comment_id ON public.comments(parent_comment_id);
CREATE INDEX idx_comments_author_id ON public.comments(author_id);
CREATE INDEX idx_comments_is_resolved ON public.comments(is_resolved);
CREATE INDEX idx_comments_created_at ON public.comments(created_at);