"use client";

import { useState } from 'react';
import SingleNoteEditor from '@/components/notes/single-note-editor';
import { AppFlowyEditorReact } from '@/components/appflowy-editor/appflowy-editor-react';
import { Button } from '@/components/ui/button';
import { FileText, Settings, Save, Download, Upload } from 'lucide-react';

export default function NotesPage() {
  const [editorMode, setEditorMode] = useState<'single' | 'appflowy'>('single');
  const [showSettings, setShowSettings] = useState(false);

  const handleExport = () => {
    // Export functionality - could export as markdown, HTML, etc.
    console.log('Export notes');
  };

  const handleImport = () => {
    // Import functionality
    console.log('Import notes');
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header with controls */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-gray-600" />
            <h1 className="text-lg font-semibold text-gray-900">Notes</h1>
          </div>
          
          {/* Editor mode toggle */}
          <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
            <Button
              variant={editorMode === 'appflowy' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setEditorMode('appflowy')}
              className="h-7 text-xs"
            >
              Advanced
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleImport}
            className="h-8 text-gray-600 hover:text-gray-900"
          >
            <Upload className="h-4 w-4 mr-1" />
            Import
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExport}
            className="h-8 text-gray-600 hover:text-gray-900"
          >
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className="h-8 text-gray-600 hover:text-gray-900"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="bg-gray-50 border-b border-gray-200 p-4">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Editor Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded" defaultChecked />
                  <span>Auto-save</span>
                </label>
              </div>
              <div>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded" defaultChecked />
                  <span>Spell check</span>
                </label>
              </div>
              <div>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded" />
                  <span>Dark mode</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Editor content */}
      <div className="flex-1">
        {editorMode === 'single' ? (
          <SingleNoteEditor />
        ) : (
          <div className="h-full p-6">
            <div className="max-w-4xl mx-auto h-full">
              <AppFlowyEditorReact
                placeholder="Start writing with the advanced editor..."
                className="h-full border-0"
              />
            </div>
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="bg-gray-50 border-t border-gray-200 px-6 py-2">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-4">
            <span>Auto-saved 2 minutes ago</span>
            <span>•</span>
            <span>1,247 words</span>
            <span>•</span>
            <span>6 min read</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>
              {editorMode === 'single' ? 'Simple Editor' : 'AppFlowy Editor'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
} 