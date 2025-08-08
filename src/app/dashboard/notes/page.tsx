"use client";

import { NotesEditor } from "@/components/notes/notes-editor";

export default function NotesPage() {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6">
          <NotesEditor />
        </div>
      </div>
    </div>
  );
}
