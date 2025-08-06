"use client";

import { useState, useEffect } from 'react';
import { Plus, Search, FileText, Trash2, Edit3, Save, X, ChevronDown, ChevronRight, Folder, Book } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MinimalEditor from '@/components/editor/minimal-editor';
import { nanoid } from 'nanoid';

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
}

const FreeFormNotes = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTitle, setEditingTitle] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Load notes from localStorage on mount
  useEffect(() => {
    const savedNotes = localStorage.getItem('lumen-notes');
    if (savedNotes) {
      const parsedNotes = JSON.parse(savedNotes).map((note: any) => ({
        ...note,
        createdAt: new Date(note.createdAt),
        updatedAt: new Date(note.updatedAt),
      }));
      setNotes(parsedNotes);
    }
  }, []);

  // Save notes to localStorage whenever notes change
  useEffect(() => {
    localStorage.setItem('lumen-notes', JSON.stringify(notes));
  }, [notes]);

  const createNewNote = () => {
    const newNote: Note = {
      id: nanoid(),
      title: 'Untitled',
      content: '',
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [],
    };
    setNotes(prev => [newNote, ...prev]);
    setSelectedNote(newNote);
    setIsEditing(true);
    setEditingTitle(newNote.title);
  };

  const deleteNote = (noteId: string) => {
    setNotes(prev => prev.filter(note => note.id !== noteId));
    if (selectedNote?.id === noteId) {
      setSelectedNote(null);
      setIsEditing(false);
    }
  };

  const updateNoteContent = (content: string) => {
    if (!selectedNote) return;
    
    const updatedNote = {
      ...selectedNote,
      content,
      updatedAt: new Date(),
    };
    
    setNotes(prev => prev.map(note => 
      note.id === selectedNote.id ? updatedNote : note
    ));
    setSelectedNote(updatedNote);
  };

  const updateNoteTitle = (title: string) => {
    if (!selectedNote) return;
    
    const updatedNote = {
      ...selectedNote,
      title: title.trim() || 'Untitled',
      updatedAt: new Date(),
    };
    
    setNotes(prev => prev.map(note => 
      note.id === selectedNote.id ? updatedNote : note
    ));
    setSelectedNote(updatedNote);
  };

  const startEditing = () => {
    setIsEditing(true);
    setEditingTitle(selectedNote?.title || '');
  };

  const saveTitle = () => {
    updateNoteTitle(editingTitle);
    setIsEditing(false);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditingTitle(selectedNote?.title || '');
  };

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
      }).format(date);
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-gray-50">
      {/* Sidebar */}
      <div className={`${sidebarCollapsed ? 'w-12' : 'w-72'} bg-white border-r border-gray-100 flex flex-col transition-all duration-300 ease-in-out`}>
        {/* Header */}
        <div className="p-6 border-b border-gray-50">
          {!sidebarCollapsed && (
            <>
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-xl font-medium text-gray-900">Your Journals</h1>
                <Button 
                  onClick={createNewNote} 
                  size="sm" 
                  className="h-8 w-8 p-0 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 border-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search journals..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-gray-50 border-0 rounded-lg text-sm focus:outline-none focus:bg-white focus:shadow-sm transition-all"
                />
              </div>
            </>
          )}
          
          <Button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            variant="ghost"
            size="sm"
            className="mt-4 w-full justify-start text-gray-500 hover:text-gray-700"
          >
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {!sidebarCollapsed && <span className="ml-2">View Spaces</span>}
          </Button>
        </div>

        {/* Notes List */}
        {!sidebarCollapsed && (
          <div className="flex-1 overflow-y-auto p-4">
            {filteredNotes.length === 0 ? (
              <div className="text-center py-12">
                <Book className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-sm text-gray-500 mb-4">No journals yet</p>
                <Button 
                  onClick={createNewNote}
                  variant="outline"
                  size="sm"
                  className="text-gray-600 border-gray-200 hover:bg-gray-50"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create your first journal
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredNotes.map((note) => (
                  <div
                    key={note.id}
                    onClick={() => {
                      setSelectedNote(note);
                      setIsEditing(false);
                    }}
                    className={`p-4 rounded-lg cursor-pointer transition-all duration-200 group hover:bg-gray-50 ${
                      selectedNote?.id === note.id
                        ? 'bg-blue-50 border border-blue-100 shadow-sm'
                        : 'border border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-gray-900 truncate pr-2 text-sm">
                        {note.title}
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNote(note.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">
                      {note.content.replace(/<[^>]*>/g, '').trim().substring(0, 100) || 'No content'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatDate(note.updatedAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedNote ? (
          <>
            {/* Minimal Header */}
            <div className="px-12 py-8 border-b border-gray-50">
              {isEditing ? (
                <div className="flex items-center space-x-4 max-w-4xl">
                  <input
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    className="text-3xl font-light bg-transparent border-0 focus:outline-none text-gray-900 placeholder-gray-400 w-full"
                    placeholder="Untitled"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveTitle();
                      if (e.key === 'Escape') cancelEditing();
                    }}
                    autoFocus
                  />
                  <div className="flex items-center space-x-2">
                    <Button onClick={saveTitle} size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-full">
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button onClick={cancelEditing} size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-full">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between max-w-4xl">
                  <div className="flex items-center space-x-4">
                    <h1 className="text-3xl font-light text-gray-900">
                      {selectedNote.title}
                    </h1>
                    <Button 
                      onClick={startEditing} 
                      size="sm" 
                      variant="ghost" 
                      className="h-8 w-8 p-0 rounded-full opacity-0 hover:opacity-100 transition-opacity"
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-gray-400">
                    Last edited {formatDate(selectedNote.updatedAt)}
                  </p>
                </div>
              )}
            </div>

            {/* Editor Area - Full canvas feel */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-4xl mx-auto px-12 py-8">
                <MinimalEditor
                  content={selectedNote.content}
                  onChange={updateNoteContent}
                  placeholder="Start writing..."
                  className="border-0 shadow-none bg-transparent min-h-[60vh]"
                />
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="w-24 h-24 mx-auto mb-8 bg-gray-50 rounded-full flex items-center justify-center">
                <FileText className="h-12 w-12 text-gray-300" />
              </div>
              <h2 className="text-2xl font-light text-gray-900 mb-4">
                Welcome to your space
              </h2>
              <p className="text-gray-500 mb-8 leading-relaxed">
                This is your personal canvas for thoughts, ideas, and everything in between. 
                Start by creating your first journal entry.
              </p>
              <Button 
                onClick={createNewNote}
                className="bg-gray-900 hover:bg-gray-800 text-white px-6 py-2 rounded-lg"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Journal Entry
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FreeFormNotes;