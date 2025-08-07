"use client";

import { 
  Calendar,
  Home, 
  Inbox, 
  Search, 
  Settings, 
  BookOpen, 
  BarChart2, 
  LogOut,
  Bell,
  UserPlus,
  User,
  GalleryVerticalEnd,
  ChevronUp,
  User2,
  FileText,
  Plus,
  Edit,
  MoreHorizontal
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useAuth } from "@/hooks/use-auth";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { NotesAPI, WorkspaceManager, type Page } from "@/app/dashboard/notes/api";

// Navigation items
const navigationItems = [
  {
    title: "Home",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Notes",
    url: "/dashboard/notes",
    icon: FileText,
  },
];

// Admin/Developer only items
const adminItems = [
  {
    title: "Waitlist",
    url: "/dashboard/waitlist",
    icon: UserPlus,
  },
];

export function AppSidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [pages, setPages] = useState<Page[]>([]);
  const [isLoadingPages, setIsLoadingPages] = useState(false);
  const [pagesError, setPagesError] = useState<string | null>(null);

  // Check if user is admin or developer
  const isAdminOrDeveloper = user?.is_admin || user?.roles?.includes('admin') || user?.roles?.includes('developer');

  // Combine navigation items based on user role
  const allItems = isAdminOrDeveloper ? [...navigationItems, ...adminItems] : navigationItems;

  // Check if we're on the notes page
  const isNotesPage = pathname?.startsWith('/dashboard/notes');

  // Load pages when on notes page
  useEffect(() => {
    if (isNotesPage) {
      loadPages();
    }
    // Listen for external page creations to update list smoothly
    const handleCreated = (e: Event) => {
      const { page } = (e as CustomEvent<{ page: Page }>).detail || ({} as any);
      if (!page) return;
      setPages((prev) => {
        const exists = prev?.some((p) => p.id === page.id);
        if (exists) return prev;
        return [page, ...(prev || [])];
      });
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('lumen:notes-page-created', handleCreated as EventListener);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('lumen:notes-page-created', handleCreated as EventListener);
      }
    };
  }, [isNotesPage]);

  const loadPages = async () => {
    try {
      setIsLoadingPages(true);
      setPagesError(null);
      const workspace = await WorkspaceManager.ensureDefaultWorkspace();
      const workspacePages = await NotesAPI.getWorkspacePages(workspace.id, false);
      setPages(workspacePages || []);
    } catch (error) {
      console.error('Failed to load pages:', error);
      setPagesError('Failed to load notes');
      setPages([]);
    } finally {
      setIsLoadingPages(false);
    }
  };

  const handleCreateNewNote = async () => {
    try {
      const workspace = await WorkspaceManager.ensureDefaultWorkspace();
      const newPage = await NotesAPI.createPage({
        title: "Untitled",
        workspace_id: workspace.id
      });
      // Optimistically add to sidebar without refetch
      setPages((prev) => [newPage, ...(prev || [])]);
      
      // Navigate to the notes route only if we're not already there
      if (!isNotesPage) {
        router.push('/dashboard/notes');
      }
      
      // Store the new page ID for the notes editor to load
      localStorage.setItem(`lumen-current-page-${workspace.id}`, newPage.id);
      
      // Notify the notes editor to load the new page without a full reload
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('lumen:notes-page-created', {
          detail: { workspaceId: workspace.id, page: newPage }
        }));
        window.dispatchEvent(new CustomEvent('lumen:notes-page-selected', {
          detail: { workspaceId: workspace.id, pageId: newPage.id }
        }));
      }
    } catch (error) {
      console.error('Failed to create new note:', error);
    }
  };

  const handleDeletePage = async (pageId: string) => {
    try {
      const confirmed = window.confirm("Delete this note? This action cannot be undone.");
      if (!confirmed) return;

      const workspace = WorkspaceManager.getCurrentWorkspace();
      await NotesAPI.deletePage(pageId);

      // Refresh list
      await loadPages();

      if (workspace) {
        const key = `lumen-current-page-${workspace.id}`;
        const currentId = localStorage.getItem(key);
        if (currentId === pageId) {
          // If we deleted the currently open page, pick another or create new
          const updatedPages = await NotesAPI.getWorkspacePages(workspace.id, false);
          setPages(updatedPages || []);
          if (updatedPages && updatedPages.length > 0) {
            const next = updatedPages[0];
            localStorage.setItem(key, next.id);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('lumen:notes-page-selected', {
                detail: { workspaceId: workspace.id, pageId: next.id }
              }));
            }
          } else {
            localStorage.removeItem(key);
            // No notes remain; notify editor to show placeholder
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('lumen:notes-cleared', {
                detail: { workspaceId: workspace.id }
              }));
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to delete note:', error);
      alert('Failed to delete note. Please try again.');
    }
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <GalleryVerticalEnd className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Lumen</span>
                  <span className="truncate text-xs">Learning Platform</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {allItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Notes Section - only show when on notes page */}
        {isNotesPage && (
          <SidebarGroup>
            <div className="flex items-center justify-between px-2 py-1">
              <SidebarGroupLabel>Notes</SidebarGroupLabel>
              <button
                onClick={handleCreateNewNote}
                className="h-6 w-6 rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex items-center justify-center transition-colors"
                title="Create new note"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <SidebarGroupContent>
              <SidebarMenu>
                {/* Create New Note Button at the top */}
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={handleCreateNewNote} className="text-muted-foreground">
                    <div className="flex items-center justify-center w-4 h-4 rounded border border-dashed border-current">
                      <Plus className="h-3 w-3" />
                    </div>
                    <span>New Note</span>
                    <Edit className="ml-auto h-3 w-3" />
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                {/* Existing notes */}
                {isLoadingPages ? (
                  <SidebarMenuItem>
                    <SidebarMenuButton disabled>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      <span>Loading notes...</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ) : pagesError ? (
                  <SidebarMenuItem>
                    <SidebarMenuButton disabled className="text-red-500">
                      <FileText className="h-4 w-4" />
                      <span>{pagesError}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ) : !pages || pages.length === 0 ? (
                  <SidebarMenuItem>
                    <SidebarMenuButton disabled className="text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span>No notes yet</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ) : (
                  pages.map((page) => (
                    <SidebarMenuItem key={page.id}>
                      <SidebarMenuButton asChild>
                        <div className="w-full flex items-center gap-2 justify-between">
                          <button
                            onClick={() => {
                              const workspace = WorkspaceManager.getCurrentWorkspace();
                              if (workspace) {
                                localStorage.setItem(`lumen-current-page-${workspace.id}`, page.id);
                                if (typeof window !== 'undefined') {
                                  window.dispatchEvent(new CustomEvent('lumen:notes-page-selected', {
                                    detail: { workspaceId: workspace.id, pageId: page.id }
                                  }));
                                }
                              }
                            }}
                            className="flex items-center gap-2 flex-1 text-left overflow-hidden"
                          >
                            <FileText className="h-4 w-4" />
                            <span className="truncate">{page.title || 'Untitled'}</span>
                          </button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                onClick={(e) => { e.stopPropagation(); }}
                                className="p-1 rounded hover:bg-sidebar-accent"
                                aria-label="More options"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" sideOffset={4} onClick={(e) => e.stopPropagation()}>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleDeletePage(page.id);
                                }}
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <User2 className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {(user?.first_name && user?.last_name) 
                        ? `${user.first_name} ${user.last_name}` 
                        : (user?.username || 'User')}
                    </span>
                    <span className="truncate text-xs">{user?.email}</span>
                  </div>
                  <ChevronUp className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile">
                    <User />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings">
                    <Settings />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout}>
                  <LogOut />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
