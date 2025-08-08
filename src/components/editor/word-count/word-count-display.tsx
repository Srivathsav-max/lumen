"use client";

import { useEffect, useState, useImperativeHandle, forwardRef } from "react";
import type EditorJS from "@editorjs/editorjs";
import { WordCountService, type Counters } from "../services/word-count";

interface WordCountDisplayProps {
  editor: EditorJS | null;
  className?: string;
}

export interface WordCountDisplayRef {
  updateCounts: () => void;
}

export const WordCountDisplay = forwardRef<WordCountDisplayRef, WordCountDisplayProps>(
  ({ editor, className = "" }, ref) => {
    const [counters, setCounters] = useState<Counters>({ wordCount: 0, charCount: 0 });
    const [wordCountService, setWordCountService] = useState<WordCountService | null>(null);

    useEffect(() => {
      if (!editor) return;

      const service = new WordCountService(editor, {
        debounceDuration: 300,
      });

      service.addListener(setCounters);
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

    if (!editor || !wordCountService) {
      return null;
    }

    return (
      <div className={`flex items-center gap-4 text-xs text-muted-foreground ${className}`}>
        <span>
          {counters.wordCount} {counters.wordCount === 1 ? "word" : "words"}
        </span>
        <span>
          {counters.charCount} {counters.charCount === 1 ? "character" : "characters"}
        </span>
      </div>
    );
  }
);

WordCountDisplay.displayName = "WordCountDisplay";