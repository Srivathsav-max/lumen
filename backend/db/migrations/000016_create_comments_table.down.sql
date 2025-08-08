-- Drop comments table
DROP INDEX IF EXISTS idx_comments_created_at;
DROP INDEX IF EXISTS idx_comments_is_resolved;
DROP INDEX IF EXISTS idx_comments_author_id;
DROP INDEX IF EXISTS idx_comments_parent_comment_id;
DROP INDEX IF EXISTS idx_comments_block_id;
DROP INDEX IF EXISTS idx_comments_page_id;
DROP TABLE IF EXISTS public.comments;