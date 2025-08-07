-- Drop workspace members table
DROP INDEX IF EXISTS idx_workspace_members_role;
DROP INDEX IF EXISTS idx_workspace_members_user_id;
DROP INDEX IF EXISTS idx_workspace_members_workspace_id;
DROP TABLE IF EXISTS public.workspace_members;
DROP TYPE IF EXISTS workspace_role;