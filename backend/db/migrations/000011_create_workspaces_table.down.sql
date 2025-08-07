-- Drop workspaces table
DROP INDEX IF EXISTS idx_workspaces_created_at;
DROP INDEX IF EXISTS idx_workspaces_owner_id;
DROP TABLE IF EXISTS public.workspaces;