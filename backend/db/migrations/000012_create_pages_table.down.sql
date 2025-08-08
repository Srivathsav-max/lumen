-- Drop pages table
DROP INDEX IF EXISTS idx_pages_title_gin;
DROP INDEX IF EXISTS idx_pages_is_archived;
DROP INDEX IF EXISTS idx_pages_updated_at;
DROP INDEX IF EXISTS idx_pages_created_at;
DROP INDEX IF EXISTS idx_pages_parent_id;
DROP INDEX IF EXISTS idx_pages_owner_id;
DROP INDEX IF EXISTS idx_pages_workspace_id;
DROP TABLE IF EXISTS public.pages;