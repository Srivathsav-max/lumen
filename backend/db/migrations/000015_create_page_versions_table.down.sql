-- Drop page versions table
DROP INDEX IF EXISTS idx_page_versions_created_by;
DROP INDEX IF EXISTS idx_page_versions_created_at;
DROP INDEX IF EXISTS idx_page_versions_version_number;
DROP INDEX IF EXISTS idx_page_versions_page_id;
DROP TABLE IF EXISTS public.page_versions;