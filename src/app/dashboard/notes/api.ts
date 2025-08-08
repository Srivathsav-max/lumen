import { api } from '@/lib/api-client';

export interface Workspace {
  id: number;
  name: string;
  description?: string;
  owner_id: number;
  created_at: string;
  updated_at: string;
  member_count: number;
  role: string;
}

export interface Page {
  id: string;
  title: string;
  workspace_id: number;
  owner_id: number;
  parent_id?: string;
  icon?: string;
  cover_url?: string;
  is_archived: boolean;
  is_template: boolean;
  properties: Record<string, any>;
  created_at: string;
  updated_at: string;
  last_edited_by?: number;
  permission: string;
  children_count: number;
  blocks?: Block[];
}

export interface Block {
  id: string;
  page_id: string;
  block_type: string;
  block_data: Record<string, any>;
  position: number;
  parent_block_id?: string;
  created_at: string;
  updated_at: string;
  created_by: number;
  last_edited_by?: number;
}

export interface CreateWorkspaceRequest {
  name: string;
  description?: string;
}

export interface CreatePageRequest {
  title?: string;
  workspace_id: number;
  parent_id?: string;
  icon?: string;
  cover_url?: string;
  is_template?: boolean;
  properties?: Record<string, any>;
}

export interface SavePageContentRequest {
  title?: string;
  content: any; // EditorJS format
}

export interface SearchPagesRequest {
  workspace_id: number;
  query: string;
  limit?: number;
  offset?: number;
}

export class NotesAPI {
  // Workspace methods
  static async createWorkspace(data: CreateWorkspaceRequest): Promise<Workspace> {
    const response = await api.post('/notes/workspaces', data);
    return response.data.data;
  }

  static async getUserWorkspaces(): Promise<Workspace[]> {
    const response = await api.get('/notes/workspaces');
    return response.data.data;
  }

  static async getWorkspace(workspaceId: number): Promise<Workspace> {
    const response = await api.get(`/notes/workspaces/${workspaceId}`);
    return response.data.data;
  }

  static async updateWorkspace(workspaceId: number, data: Partial<CreateWorkspaceRequest>): Promise<Workspace> {
    const response = await api.put(`/notes/workspaces/${workspaceId}`, data);
    return response.data.data;
  }

  static async deleteWorkspace(workspaceId: number): Promise<void> {
    await api.delete(`/notes/workspaces/${workspaceId}`);
  }

  // Page methods
  static async createPage(data: CreatePageRequest): Promise<Page> {
    const response = await api.post('/notes/pages', data);
    return response.data.data;
  }

  static async getPage(pageId: string, includeBlocks = false): Promise<Page> {
    const params = includeBlocks ? '?include_blocks=true' : '';
    const response = await api.get(`/notes/pages/${pageId}${params}`);
    return response.data.data;
  }

  static async getWorkspacePages(workspaceId: number, includeArchived = false): Promise<Page[]> {
    const params = includeArchived ? '?include_archived=true' : '';
    const response = await api.get(`/notes/workspaces/${workspaceId}/pages${params}`);
    return response.data.data;
  }

  static async getRootPages(workspaceId: number, includeArchived = false): Promise<Page[]> {
    const params = includeArchived ? '?include_archived=true' : '';
    const response = await api.get(`/notes/workspaces/${workspaceId}/pages/root${params}`);
    return response.data.data;
  }

  static async getChildPages(pageId: string, includeArchived = false): Promise<Page[]> {
    const params = includeArchived ? '?include_archived=true' : '';
    const response = await api.get(`/notes/pages/${pageId}/children${params}`);
    return response.data.data;
  }

  static async updatePage(pageId: string, data: Partial<CreatePageRequest>): Promise<Page> {
    const response = await api.put(`/notes/pages/${pageId}`, data);
    return response.data.data;
  }

  static async savePageContent(pageId: string, data: SavePageContentRequest): Promise<Page> {
    const response = await api.post(`/notes/pages/${pageId}/content`, data);
    return response.data.data;
  }

  // AI helpers routed through backend
  static async generateWithAI(query: string, context?: any): Promise<{ text: string }> {
    const response = await api.post(`/ai/generate`, { query, context });
    const data = response?.data?.data;
    return { text: data?.text ?? data?.Text ?? "" };
  }

  static async deletePage(pageId: string): Promise<void> {
    await api.delete(`/notes/pages/${pageId}`);
  }

  static async archivePage(pageId: string): Promise<void> {
    await api.post(`/notes/pages/${pageId}/archive`, {});
  }

  static async restorePage(pageId: string): Promise<void> {
    await api.post(`/notes/pages/${pageId}/restore`, {});
  }

  // Search and recent pages
  static async searchPages(data: SearchPagesRequest): Promise<{ pages: Page[]; total: number; limit: number; offset: number }> {
    const response = await api.post('/notes/search', data);
    return response.data.data;
  }

  static async getRecentPages(limit = 20): Promise<Page[]> {
    const response = await api.get(`/notes/recent?limit=${limit}`);
    return response.data.data;
  }

  // Utility methods for EditorJS integration
  static formatEditorJSContent(blocks: any[]): any {
    return {
      time: Date.now(),
      blocks: blocks.map((block, index) => ({
        id: block.id || `block_${Date.now()}_${index}`,
        type: block.type || 'paragraph',
        data: block.data || {},
        ...block
      })),
      version: "2.28.2"
    };
  }

  static parseEditorJSContent(content: any): any[] {
    if (!content || !content.blocks) {
      return [];
    }
    return content.blocks;
  }
}

// Default workspace management
export class WorkspaceManager {
  private static CURRENT_WORKSPACE_KEY = 'lumen-current-workspace';

  static getCurrentWorkspace(): Workspace | null {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(this.CURRENT_WORKSPACE_KEY);
    return stored ? JSON.parse(stored) : null;
  }

  static setCurrentWorkspace(workspace: Workspace): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.CURRENT_WORKSPACE_KEY, JSON.stringify(workspace));
  }

  static clearCurrentWorkspace(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.CURRENT_WORKSPACE_KEY);
  }

  static async ensureDefaultWorkspace(): Promise<Workspace> {
    let workspaces = await NotesAPI.getUserWorkspaces();
    
    if (workspaces.length === 0) {
      // Create default workspace
      const defaultWorkspace = await NotesAPI.createWorkspace({
        name: "My Workspace",
        description: "Default workspace for your notes"
      });
      workspaces = [defaultWorkspace];
    }

    const currentWorkspace = this.getCurrentWorkspace();
    const validWorkspace = currentWorkspace && workspaces.find(w => w.id === currentWorkspace.id);
    
    if (!validWorkspace) {
      this.setCurrentWorkspace(workspaces[0]);
      return workspaces[0];
    }

    return validWorkspace;
  }
}