"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";

interface NotesTitleProps {
  initialTitle?: string;
  onTitleChange?: (title: string) => void;
  placeholder?: string;
  className?: string;
}

export function NotesTitle({ 
  initialTitle = "", 
  onTitleChange,
  placeholder = "Untitled",
  className = ""
}: NotesTitleProps) {
  const [title, setTitle] = useState(initialTitle);
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load saved title from localStorage on mount
  useEffect(() => {
    const savedTitle = localStorage.getItem('lumen-notes-title');
    if (savedTitle) {
      setTitle(savedTitle);
      onTitleChange?.(savedTitle);
    }
  }, [onTitleChange]);

  // Save title to localStorage whenever it changes
  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle);
    localStorage.setItem('lumen-notes-title', newTitle);
    onTitleChange?.(newTitle);
  }, [onTitleChange]);

  // Handle click to edit
  const handleClick = useCallback(() => {
    setIsEditing(true);
    // Focus input after state update
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  }, []);

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
  }, []);

  // Handle blur (finish editing)
  const handleBlur = useCallback(() => {
    setIsEditing(false);
    handleTitleChange(title);
  }, [title, handleTitleChange]);

  // Handle Enter key to finish editing
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    }
    if (e.key === 'Escape') {
      // Revert to saved title on escape
      const savedTitle = localStorage.getItem('lumen-notes-title') || '';
      setTitle(savedTitle);
      inputRef.current?.blur();
    }
  }, []);

  // Display title or placeholder
  const displayTitle = title.trim() || placeholder;
  const isUntitled = !title.trim();

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={title}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`text-4xl font-bold border-none shadow-none p-0 h-auto bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 ${className}`}
        placeholder={placeholder}
        style={{ fontSize: 'inherit', lineHeight: 'inherit' }}
      />
    );
  }

  return (
    <h1
      onClick={handleClick}
      className={`
        text-4xl font-bold cursor-text hover:bg-muted/30 px-2 py-1 -mx-2 -my-1 rounded-md transition-colors duration-200
        ${isUntitled ? 'text-muted-foreground' : 'text-foreground'}
        ${className}
      `}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick();
        }
      }}
      title="Click to edit title"
    >
      {displayTitle}
    </h1>
  );
}
