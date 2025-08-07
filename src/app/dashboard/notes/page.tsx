"use client";

import { NotesEditor } from "@/components/notes/notes-editor";

export default function NotesPage() {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">My Notes</h1>
            <p className="text-muted-foreground">
              Create and organize your thoughts with our powerful note editor.
            </p>
          </div>
          <NotesEditor />
        </div>
      </div>
    </div>
  );
}
