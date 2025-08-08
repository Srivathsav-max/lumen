-- Create workspace members table for workspace access
CREATE TYPE workspace_role AS ENUM ('member', 'admin', 'owner');

CREATE TABLE public.workspace_members (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role workspace_role NOT NULL DEFAULT 'member',
    added_by INTEGER NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(workspace_id, user_id)
);

-- Add indexes for performance
CREATE INDEX idx_workspace_members_workspace_id ON public.workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user_id ON public.workspace_members(user_id);
CREATE INDEX idx_workspace_members_role ON public.workspace_members(role);