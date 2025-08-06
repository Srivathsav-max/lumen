"use client";

import { useState, useEffect } from 'react';
import { Edit3, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AppFlowyEditorReact from '@/components/appflowy-editor/appflowy-editor-react';
import { nanoid } from 'nanoid';

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const SingleNoteEditor = () => {
  const [note, setNote] = useState<Note | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitle, setEditingTitle] = useState('');

  // Load note from localStorage on mount
  useEffect(() => {
    const savedNote = localStorage.getItem('lumen-single-note');
    if (savedNote) {
      const parsedNote = JSON.parse(savedNote);
      setNote({
        ...parsedNote,
        createdAt: new Date(parsedNote.createdAt),
        updatedAt: new Date(parsedNote.updatedAt),
      });
    } else {
      // Create initial note
      const initialNote: Note = {
        id: nanoid(),
        title: 'Untitled',
        content: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setNote(initialNote);
      localStorage.setItem('lumen-single-note', JSON.stringify(initialNote));
    }
  }, []);

  // Save note to localStorage whenever note changes
  useEffect(() => {
    if (note) {
      localStorage.setItem('lumen-single-note', JSON.stringify(note));
    }
  }, [note]);

  const updateNoteContent = (content: string) => {
    if (!note) return;
    
    const updatedNote = {
      ...note,
      content,
      updatedAt: new Date(),
    };
    
    setNote(updatedNote);
  };

  const updateNoteTitle = (title: string) => {
    if (!note) return;
    
    const updatedNote = {
      ...note,
      title: title.trim() || 'Untitled',
      updatedAt: new Date(),
    };
    
    setNote(updatedNote);
  };

  const startEditingTitle = () => {
    setIsEditingTitle(true);
    setEditingTitle(note?.title || '');
  };

  const saveTitle = () => {
    updateNoteTitle(editingTitle);
    setIsEditingTitle(false);
  };

  const cancelEditingTitle = () => {
    setIsEditingTitle(false);
    setEditingTitle(note?.title || '');
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return 'Today ' + new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } else if (days === 1) {
      return 'Yesterday';
    } else {
      return new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      }).format(date);
    }
  };

  if (!note) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="h-full bg-white flex flex-col">
      {/* Header */}
      <div className="px-12 py-8 border-b border-gray-100">
        {isEditingTitle ? (
          <div className="flex items-center space-x-4 max-w-4xl mx-auto">
            <input
              type="text"
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              className="text-4xl font-light bg-transparent border-0 focus:outline-none text-gray-900 placeholder-gray-400 w-full"
              placeholder="Untitled"
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveTitle();
                if (e.key === 'Escape') cancelEditingTitle();
              }}
              autoFocus
            />
            <div className="flex items-center space-x-2">
              <Button onClick={saveTitle} size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-full">
                <Save className="h-4 w-4" />
              </Button>
              <Button onClick={cancelEditingTitle} size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-full">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h1 className="text-4xl font-light text-gray-900">
                  {note.title}
                </h1>
                <Button 
                  onClick={startEditingTitle} 
                  size="sm" 
                  variant="ghost" 
                  className="h-8 w-8 p-0 rounded-full opacity-0 hover:opacity-100 transition-opacity"
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-gray-400">
                {formatDate(note.updatedAt)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Editor Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-12 py-8">
          <AppFlowyEditorReact
            content={note.content}
            onChange={updateNoteContent}
            placeholder="Start writing your thoughts..."
            className="border-0 shadow-none bg-transparent min-h-[70vh]"
          />
        </div>
      </div>
    </div>
  );
};

export default SingleNoteEditor;