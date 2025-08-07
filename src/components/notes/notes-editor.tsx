"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type EditorJS from "@editorjs/editorjs";
import type { OutputData } from "@editorjs/editorjs";
import { EditorLoading } from "./editor-loading";

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
  const [data, setData] = useState<OutputData | undefined>();
  const [isClient, setIsClient] = useState(false);

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
      } catch (error) {
        console.error('Failed to save notes:', error);
      }
    }
  }, [saveHandler]);

  // Don't render anything on server side
  if (!isClient) {
    return <EditorLoading />;
  }

  return (
    <div className="relative">
      <EditorCore
        onReadyHandler={readyHandler}
        onSaveHandler={saveHandler}
        onChangeHandler={changeHandler}
        data={data}
        placeholder=""
        readOnly={false}
      />
    </div>
  );
}
