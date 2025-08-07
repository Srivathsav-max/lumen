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
  
  // Export menu functionality
  const exportMenuRef = useRef<any>(null);

  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true);
    
    // Load saved data from localStorage on mount
    const savedData = localStorage.getItem('lumen-notes-data');
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        setData(parsedData);
      } catch (error) {
        console.error('Failed to parse saved notes data:', error);
      }
    }
  }, []);

  const saveHandler = useCallback((output: OutputData) => {
    // Save to localStorage for now (no backend needed)
    localStorage.setItem('lumen-notes-data', JSON.stringify(output));
    console.log('Notes saved to localStorage');
  }, []);

  const handleImport = useCallback((importedData: OutputData) => {
    // Update the local state with imported data
    setData(importedData);
    // Save to localStorage
    localStorage.setItem('lumen-notes-data', JSON.stringify(importedData));
    console.log('Notes imported and saved');
  }, []);

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

  // Don't render anything on server side
  if (!isClient) {
    return <EditorLoading />;
  }

  return (
    <div className="relative">
      {/* Notes Title with Settings */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex-1">
          <NotesTitle
            initialTitle={notesTitle}
            onTitleChange={setNotesTitle}
            placeholder="Untitled"
          />
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
