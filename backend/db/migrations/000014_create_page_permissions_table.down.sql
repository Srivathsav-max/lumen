-- Drop page permissions table
DROP INDEX IF EXISTS idx_page_permissions_granted_by;
DROP INDEX IF EXISTS idx_page_permissions_permission;
DROP INDEX IF EXISTS idx_page_permissions_user_id;
DROP INDEX IF EXISTS idx_page_permissions_page_id;
DROP TABLE IF EXISTS public.page_permissions;
DROP TYPE IF EXISTS permission_level;