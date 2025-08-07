-- Drop blocks table
DROP INDEX IF EXISTS idx_blocks_data_gin;
DROP INDEX IF EXISTS idx_blocks_updated_at;
DROP INDEX IF EXISTS idx_blocks_created_at;
DROP INDEX IF EXISTS idx_blocks_block_type;
DROP INDEX IF EXISTS idx_blocks_parent_block_id;
DROP INDEX IF EXISTS idx_blocks_position;
DROP INDEX IF EXISTS idx_blocks_page_id;
DROP TABLE IF EXISTS public.blocks;