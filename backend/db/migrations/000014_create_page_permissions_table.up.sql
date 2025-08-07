-- Create page permissions table for access control
CREATE TYPE permission_level AS ENUM ('view', 'comment', 'edit', 'admin');

CREATE TABLE public.page_permissions (
    id SERIAL PRIMARY KEY,
    page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    permission permission_level NOT NULL DEFAULT 'view',
    granted_by INTEGER NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(page_id, user_id)
);

-- Add indexes for performance
CREATE INDEX idx_page_permissions_page_id ON public.page_permissions(page_id);
CREATE INDEX idx_page_permissions_user_id ON public.page_permissions(user_id);
CREATE INDEX idx_page_permissions_permission ON public.page_permissions(permission);
CREATE INDEX idx_page_permissions_granted_by ON public.page_permissions(granted_by);