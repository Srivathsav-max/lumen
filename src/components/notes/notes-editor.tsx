"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type EditorJS from "@editorjs/editorjs";
import type { OutputData } from "@editorjs/editorjs";
import { EditorLoading } from "./editor-loading";
import { NotesTitle } from "./notes-title";
import { FloatingWordCount, type FloatingWordCountRef } from "./floating-word-count";
import { NotesSettingsMenu } from "./notes-settings-menu";
import { ExportMenu } from "@/components/editor/export-menu/export-menu";
import { FindReplaceWidget } from "@/components/editor/find-replace/find-replace-widget";
import { NotesAPI, WorkspaceManager, type Page, type Workspace } from "@/app/dashboard/notes/api";
import { SearchService } from "@/components/editor/services/search-service";

// Helper function to sanitize content and remove HTML entities
const sanitizeContent = (data: any): any => {
  if (!data || !data.blocks) return data;
  
  return {
    ...data,
    blocks: data.blocks.map((block: any) => {
      if (block.data && typeof block.data.text === 'string') {
        // Remove HTML entities like &nbsp;, &amp;, etc.
        block.data.text = block.data.text
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .trim();
      }
      return block;
    })
  };
};

// Dynamically import the EditorCore component to avoid SSR issues
const EditorCore = dynamic(
  () => import("@/components/editor/core/editor").then((mod) => ({ default: mod.EditorCore })),
  {
    ssr: false,
    loading: () => <EditorLoading />,
  }
);

export function NotesEditor() {
  const editorRef = useRef<EditorJS | null>(null);
  const wordCountRef = useRef<FloatingWordCountRef>(null);
  const [data, setData] = useState<OutputData | undefined>();
  const [isClient, setIsClient] = useState(false);
  const [isFindReplaceOpen, setIsFindReplaceOpen] = useState(false);
  const [notesTitle, setNotesTitle] = useState("");
  const [currentPage, setCurrentPage] = useState<Page | null>(null);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEmptyState, setIsEmptyState] = useState(false);
  
  // Export menu functionality
  const exportMenuRef = useRef<any>(null);
  // Regex preview service (for inline /pattern/flags highlighting)
  const regexPreviewServiceRef = useRef<SearchService | null>(null);
  
  // Auto-save timeout
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize editor with workspace and page data
  useEffect(() => {
    setIsClient(true);
    initializeEditor();
    
    // Cleanup timeout on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const initializeEditor = async () => {
    try {
      setIsLoading(true);
      
      // Ensure we have a default workspace
      const workspace = await WorkspaceManager.ensureDefaultWorkspace();
      setCurrentWorkspace(workspace);

      // Try to load current page for this workspace; do not auto-create
      await loadCurrentPageIfAny(workspace.id);
      
    } catch (error) {
      console.error('Failed to initialize editor:', error);
      // Fallback to empty editor
      setData(undefined);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCurrentPageIfAny = async (workspaceId: number) => {
    try {
      // Try to get the current page from localStorage or create a new one
      const pageIdKey = `lumen-current-page-${workspaceId}`;
      const savedPageId = localStorage.getItem(pageIdKey);
      
      let page: Page | null = null;
      
      if (savedPageId) {
        try {
          page = await NotesAPI.getPage(savedPageId, true);
        } catch (error) {
          console.log('Saved page not found.');
        }
      }

      if (!page) {
        // No page selected; show empty state
        setCurrentPage(null);
        setNotesTitle("");
        setData(undefined);
        setIsEmptyState(true);
        return;
      }

      setCurrentPage(page);
      setNotesTitle(page.title);
      
      // Convert blocks to EditorJS format
      if (page.blocks && page.blocks.length > 0) {
        const editorData = NotesAPI.formatEditorJSContent(
          page.blocks.map(block => ({
            id: block.id,
            type: block.block_type,
            data: block.block_data
          }))
        );
        // Sanitize content to remove HTML entities
        const sanitizedData = sanitizeContent(editorData);
        setData(sanitizedData);
      } else {
        setData(undefined);
      }
      setIsEmptyState(false);
      
    } catch (error) {
      console.error('Failed to load or create page:', error);
      throw error;
    }
  };

  // Listen for page selection events from the sidebar to update the editor without reload
  useEffect(() => {
    const handlePageSelected = async (event: Event) => {
      const customEvent = event as CustomEvent<{ workspaceId: number; pageId: string }>;
      const { workspaceId, pageId } = customEvent.detail || ({} as any);
      if (!workspaceId || !pageId) return;
      try {
        setIsLoading(true);
        // Persist selection
        localStorage.setItem(`lumen-current-page-${workspaceId}`, pageId);
        // Fetch page with blocks
        const page = await NotesAPI.getPage(pageId, true);
        setCurrentPage(page);
        setNotesTitle(page.title || "Untitled");
        // Prepare editor data
        if (page.blocks && page.blocks.length > 0) {
          const editorData = NotesAPI.formatEditorJSContent(
            page.blocks.map(block => ({
              id: block.id,
              type: block.block_type,
              data: block.block_data
            }))
          );
          const sanitizedData = sanitizeContent(editorData);
          setData(sanitizedData);
          // If editor instance exists, render immediately
          if (editorRef.current) {
            await editorRef.current.clear();
            await editorRef.current.render(sanitizedData as any);
          }
        } else {
          setData(undefined);
          if (editorRef.current) {
            await editorRef.current.clear();
          }
        }
        setIsEmptyState(false);
      } catch (error) {
        console.error('Failed to switch page:', error);
      } finally {
        setIsLoading(false);
      }
    };
    const handleNotesCleared = async () => {
      try {
        setCurrentPage(null);
        setNotesTitle("");
        setData(undefined);
        setIsEmptyState(true);
        if (editorRef.current) {
          await editorRef.current.clear();
        }
      } catch (_) {}
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('lumen:notes-page-selected', handlePageSelected as EventListener);
      window.addEventListener('lumen:notes-cleared', handleNotesCleared as EventListener);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('lumen:notes-page-selected', handlePageSelected as EventListener);
        window.removeEventListener('lumen:notes-cleared', handleNotesCleared as EventListener);
      }
    };
  }, []);

  const handleCreateFromEmpty = useCallback(async () => {
    if (!currentWorkspace) return;
    try {
      setIsLoading(true);
      const newPage = await NotesAPI.createPage({
        title: "Untitled",
        workspace_id: currentWorkspace.id,
      });
      localStorage.setItem(`lumen-current-page-${currentWorkspace.id}`, newPage.id);
      // Notify sidebar and self
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('lumen:notes-page-created', {
          detail: { workspaceId: currentWorkspace.id, page: newPage }
        }));
        window.dispatchEvent(new CustomEvent('lumen:notes-page-selected', {
          detail: { workspaceId: currentWorkspace.id, pageId: newPage.id }
        }));
      }
    } catch (error) {
      console.error('Failed to create note from empty state:', error);
      alert('Failed to create note. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace]);

  const saveHandler = useCallback(async (output: OutputData) => {
    if (!currentPage) return;
    
    // Debounce saves to avoid too many API calls
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        setIsSaving(true);
        
        await NotesAPI.savePageContent(currentPage.id, {
          title: notesTitle || "Untitled",
          content: output
        });
        
        console.log('Notes saved to backend');
      } catch (error) {
        console.error('Failed to save notes:', error);
        // Fallback to localStorage if API fails
        localStorage.setItem(`lumen-notes-backup-${currentPage.id}`, JSON.stringify(output));
      } finally {
        setIsSaving(false);
      }
    }, 1000); // Debounce by 1 second
  }, [currentPage, notesTitle]);

  const handleImport = useCallback(async (importedData: OutputData) => {
    // Update the local state with imported data (sanitize first)
    const sanitizedData = sanitizeContent(importedData);
    setData(sanitizedData);
    
    if (currentPage) {
      try {
        await NotesAPI.savePageContent(currentPage.id, {
          title: notesTitle || "Untitled",
          content: sanitizedData
        });
        console.log('Notes imported and saved to backend');
      } catch (error) {
        console.error('Failed to save imported data:', error);
        // Fallback to localStorage
        localStorage.setItem(`lumen-notes-backup-${currentPage.id}`, JSON.stringify(sanitizedData));
      }
    }
  }, [currentPage, notesTitle]);

  // Get current title for exports
  const getCurrentTitle = useCallback(() => {
    return notesTitle || "Untitled";
  }, [notesTitle]);

  // Handle export from settings menu
  const handleExport = useCallback(async (format: "html" | "markdown" | "json" | "pdf") => {
    if (!editorRef.current) return;
    
    try {
      const data = await editorRef.current.save();
      const title = getCurrentTitle().replace(/[^a-zA-Z0-9-_\s]/g, '').trim() || 'Untitled';
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `${title}-${timestamp}`;

      // Import the plugins dynamically
      const { HTMLImportExportPlugin } = await import("@/components/editor/plugins/html-import-export");
      const { MarkdownImportExportPlugin } = await import("@/components/editor/plugins/markdown-import-export");
      const { PDFExportPlugin } = await import("@/components/editor/plugins/pdf-export");
      const { ExportImportService } = await import("@/components/editor/services/export-import");

      switch (format) {
        case "html":
          HTMLImportExportPlugin.exportToFile(data, `${filename}.html`, getCurrentTitle());
          break;
        case "markdown":
          MarkdownImportExportPlugin.exportToFile(data, `${filename}.md`);
          break;
        case "pdf":
          await PDFExportPlugin.exportToPDF(data, `${filename}.pdf`);
          break;
        case "json":
          const jsonContent = JSON.stringify(data, null, 2);
          ExportImportService.downloadFile(
            jsonContent,
            `${filename}.json`,
            "application/json"
          );
          break;
      }
    } catch (error) {
      console.error("Export failed:", error);
      alert("Export failed. Please try again.");
    }
  }, [getCurrentTitle]);

  // Handle import from settings menu
  const handleImportFromSettings = useCallback(async (type: 'html' | 'markdown' | 'json') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = type === 'html' ? '.html' : type === 'markdown' ? '.md' : '.json';
    
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file || !editorRef.current) return;

      try {
        let data;
        
        switch (type) {
          case 'html':
            const { HTMLImportExportPlugin } = await import("@/components/editor/plugins/html-import-export");
            data = await HTMLImportExportPlugin.importFromFile(file);
            break;
          case 'markdown':
            const { MarkdownImportExportPlugin } = await import("@/components/editor/plugins/markdown-import-export");
            data = await MarkdownImportExportPlugin.importFromFile(file);
            break;
          case 'json':
            const text = await file.text();
            data = JSON.parse(text);
            break;
          default:
            throw new Error('Unsupported import type');
        }

        // Clear the editor and load new data
        await editorRef.current.clear();
        await editorRef.current.render(data);
        handleImport(data);
        
      } catch (error) {
        console.error("Import failed:", error);
        alert("Import failed. Please check the file format and try again.");
      }
    };

    input.click();
  }, [handleImport]);

  const readyHandler = useCallback((editor: EditorJS | null) => {
    if (!editor) return;
    editorRef.current = editor;
    // Initialize a background search service to listen for inline regex events
    try {
      regexPreviewServiceRef.current?.dispose();
      regexPreviewServiceRef.current = new SearchService(editor);
    } catch (_) {}
  }, []);

  const changeHandler = useCallback(async (api: any, event: any) => {
    // Auto-save on changes with debounce
    if (event && !Array.isArray(event)) {
      const isEmpty = event.detail?.target?.isEmpty;
      const isAdded = event.type === "block-added";
      if (isAdded && isEmpty) return;
      
      try {
        const output = await api.saver.save();
        saveHandler(output);
        // Trigger word count update
        wordCountRef.current?.updateCounts();
      } catch (error) {
        console.error('Failed to save notes:', error);
      }
    }
  }, [saveHandler]);

  const handleTitleChange = useCallback(async (newTitle: string) => {
    setNotesTitle(newTitle);
    
    if (currentPage && newTitle !== currentPage.title) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        try {
          await NotesAPI.updatePage(currentPage.id, { title: newTitle });
          setCurrentPage({ ...currentPage, title: newTitle });
        } catch (error) {
          console.error('Failed to save title:', error);
        }
      }, 1000);
    }
  }, [currentPage]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+F or Cmd+F to open find/replace
      if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
        event.preventDefault();
        setIsFindReplaceOpen(true);
      }
      // Escape to close find/replace
      if (event.key === 'Escape' && isFindReplaceOpen) {
        setIsFindReplaceOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFindReplaceOpen]);

  // Don't render anything on server side or while loading
  if (!isClient || isLoading) {
    return <EditorLoading />;
  }

  if (isEmptyState) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-2xl font-semibold mb-2">No notes yet</div>
          <p className="text-muted-foreground mb-4">Create your first note to get started.</p>
          <button
            onClick={handleCreateFromEmpty}
            className="inline-flex items-center px-3 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90"
          >
            + Create note
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Notes Title with Settings */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex-1">
          <NotesTitle
            initialTitle={notesTitle}
            onTitleChange={handleTitleChange}
            placeholder="Untitled"
          />
          {isSaving && (
            <div className="text-xs text-gray-500 mt-1 flex items-center">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-500 mr-1"></div>
              Saving...
            </div>
          )}
        </div>
        <div className="ml-4 mt-2">
          <NotesSettingsMenu
            editor={editorRef.current}
            onOpenFindReplace={() => setIsFindReplaceOpen(true)}
            onExport={handleExport}
            onImport={handleImportFromSettings}
          />
        </div>
      </div>

      {/* Editor */}
      <EditorCore
        onReadyHandler={readyHandler}
        onSaveHandler={saveHandler}
        onChangeHandler={changeHandler}
        data={data}
        placeholder=""
        readOnly={false}
      />

      {/* Floating Word Count */}
      <FloatingWordCount
        ref={wordCountRef}
        editor={editorRef.current}
      />

      {/* Find & Replace Widget */}
      <FindReplaceWidget
        editor={editorRef.current}
        isOpen={isFindReplaceOpen}
        onClose={() => setIsFindReplaceOpen(false)}
      />

      {/* Hidden ExportMenu for backward compatibility */}
      <div className="hidden">
        <ExportMenu 
          editor={editorRef.current} 
          onImport={handleImport}
          getTitle={getCurrentTitle}
        />
      </div>
    </div>
  );
}
