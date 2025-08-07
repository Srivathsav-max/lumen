"use client";

import { forwardRef, useImperativeHandle, useEffect, useState } from "react";
import type EditorJS from "@editorjs/editorjs";
import { WordCountService, type Counters } from "@/components/editor/services/word-count";

interface FloatingWordCountProps {
  editor: EditorJS | null;
  className?: string;
}

export interface FloatingWordCountRef {
  updateCounts: () => void;
}

export const FloatingWordCount = forwardRef<FloatingWordCountRef, FloatingWordCountProps>(
  ({ editor, className = "" }, ref) => {
    const [counters, setCounters] = useState<Counters>({ wordCount: 0, charCount: 0 });
    const [wordCountService, setWordCountService] = useState<WordCountService | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
      if (!editor) return;

      const service = new WordCountService(editor, {
        debounceDuration: 300,
      });

      service.addListener((newCounters) => {
        setCounters(newCounters);
        // Show the floating counter when there's content
        setIsVisible(newCounters.wordCount > 0 || newCounters.charCount > 0);
      });
      
      setWordCountService(service);

      return () => {
        service.removeListener(setCounters);
        service.destroy();
      };
    }, [editor]);

    // Expose update method to parent component
    useImperativeHandle(ref, () => ({
      updateCounts: () => {
        if (wordCountService) {
          wordCountService.triggerUpdate();
        }
      },
    }), [wordCountService]);

    if (!editor || !wordCountService || !isVisible) {
      return null;
    }

    return (
      <div className={`
        fixed bottom-4 right-4 z-40
        bg-background/95 backdrop-blur-sm
        border border-border rounded-lg shadow-lg
        px-3 py-2
        transition-all duration-200 ease-in-out
        hover:bg-background/100 hover:shadow-xl
        ${className}
      `}>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <span className="font-medium">{counters.wordCount}</span>
            <span>{counters.wordCount === 1 ? "word" : "words"}</span>
          </div>
          <div className="w-px h-3 bg-border" />
          <div className="flex items-center gap-1">
            <span className="font-medium">{counters.charCount}</span>
            <span>{counters.charCount === 1 ? "char" : "chars"}</span>
          </div>
        </div>
      </div>
    );
  }
);
