-- Create blocks table for EditorJS-compatible content storage
CREATE TABLE public.blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
    block_type VARCHAR(50) NOT NULL, -- paragraph, heading, quote, image, code, table, etc.
    block_data JSONB NOT NULL DEFAULT '{}', -- EditorJS block data
    position INTEGER NOT NULL DEFAULT 0, -- Order within the page
    parent_block_id UUID REFERENCES public.blocks(id) ON DELETE CASCADE, -- For nested blocks
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by INTEGER NOT NULL REFERENCES public.users(id),
    last_edited_by INTEGER REFERENCES public.users(id)
);

-- Add indexes for performance
CREATE INDEX idx_blocks_page_id ON public.blocks(page_id);
CREATE INDEX idx_blocks_position ON public.blocks(page_id, position);
CREATE INDEX idx_blocks_parent_block_id ON public.blocks(parent_block_id);
CREATE INDEX idx_blocks_block_type ON public.blocks(block_type);
CREATE INDEX idx_blocks_created_at ON public.blocks(created_at);
CREATE INDEX idx_blocks_updated_at ON public.blocks(updated_at);
CREATE INDEX idx_blocks_data_gin ON public.blocks USING gin(block_data);