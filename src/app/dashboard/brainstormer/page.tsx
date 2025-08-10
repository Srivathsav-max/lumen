"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flashcard, type FlashcardData } from "@/components/brainstormer/flashcard";
import { MCQ, type MCQData } from "@/components/brainstormer/mcqs";

export default function BrainstormerPage() {
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [numItems, setNumItems] = useState<number>(10);
  const [loading, setLoading] = useState(false);
  const [flashcards, setFlashcards] = useState<FlashcardData[]>([]);
  const [mcqs, setMcqs] = useState<MCQData[]>([]);
  const [cloze, setCloze] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-assign a workspace for the user (create default if needed)
  useEffect(() => {
    (async () => {
      try {
        // Try stored id
        const stored = typeof window !== 'undefined' ? localStorage.getItem("lumen-current-workspace-id") : null;
        if (stored && stored !== "0") {
          setWorkspaceId(stored);
          return;
        }
        // Fetch list
        const res = await api.get("/notes/workspaces");
        const list = res?.data?.data || [];
        if (Array.isArray(list) && list.length > 0) {
          const id = String(list[0].id ?? "");
          if (id) {
            setWorkspaceId(id);
            if (typeof window !== 'undefined') localStorage.setItem("lumen-current-workspace-id", id);
            return;
          }
        }
        // Create default if none
        const created = await api.post("/notes/workspaces", { name: "My Knowledge Base", description: "Default workspace for knowledge management" });
        const ws = created?.data?.data;
        if (ws?.id) {
          const id = String(ws.id);
          setWorkspaceId(id);
          if (typeof window !== 'undefined') localStorage.setItem("lumen-current-workspace-id", id);
        }
      } catch (e) {
        // Leave empty; upload/generate will no-op until available
      }
    })();
  }, []);

  async function uploadFiles(files: FileList | File[]) {
    if (!workspaceId) return;
    const list = Array.from(files);
    setLoading(true);
    try {
      for (const f of list) {
        const fd = new FormData();
        fd.append("workspace_id", workspaceId);
        fd.append("file", f);
        await api.post(`/noteslm/files`, fd, { headers: {} });
      }
    } finally {
      setLoading(false);
    }
  }

  async function call(endpoint: string, setter: (x: any[]) => void) {
    setLoading(true);
    try {
      const { data } = await api.post(`/brainstrommer/${endpoint}`, {
        workspace_id: parseInt(workspaceId, 10),
        num_items: numItems,
      });
      if ((data as any)?.data?.items) setter((data as any).data.items);
    } finally {
      setLoading(false);
    }
  }

  // SSE stream helper for auto-updating results without reload
  async function stream(endpoint: string, setter: (x: any[]) => void) {
    if (!workspaceId) return;
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1'}/brainstrommer/stream/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        workspace_id: parseInt(workspaceId, 10),
        num_items: numItems,
      }),
    });
    if (!res.ok || !res.body) return;
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() || '';
      for (const part of parts) {
        const lines = part.split("\n");
        const type = lines.find(l => l.startsWith('event:'))?.slice(6).trim();
        const dataLine = lines.find(l => l.startsWith('data:'))?.slice(5).trim();
        if (type === 'data' && dataLine) {
          try {
            const parsed = JSON.parse(dataLine);
            if (parsed?.items) setter(parsed.items);
          } catch {}
        }
      }
    }
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Brainstrommer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="hidden" />
            <div className="hidden" />
            <div>
              <Input aria-label="# Items" placeholder="# Items" type="number" min={1} value={numItems} onChange={(e) => setNumItems(parseInt(e.target.value || "0", 10))} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2">
            <span className="text-sm text-muted-foreground">Upload documents</span>
            <Input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={(e) => e.target.files && uploadFiles(e.target.files)}
            />
          </div>
          <div className="flex gap-2">
            <Button disabled={loading} onClick={() => call("flashcards", setFlashcards)}>Generate Flashcards</Button>
            <Button disabled={loading} onClick={() => call("mcqs", setMcqs)}>Generate MCQs</Button>
            <Button disabled={loading} onClick={() => call("cloze", setCloze)}>Generate Fill-in-the-Blanks</Button>
            <Button variant="secondary" disabled={loading} onClick={() => stream('flashcards', setFlashcards)}>Stream Flashcards</Button>
            <Button variant="secondary" disabled={loading} onClick={() => stream('mcqs', setMcqs)}>Stream MCQs</Button>
            <Button variant="secondary" disabled={loading} onClick={() => stream('cloze', setCloze)}>Stream Fill-in-the-Blanks</Button>
          </div>
        </CardContent>
      </Card>

      {flashcards.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Flashcards</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Flashcard item={flashcards[0]} />
            {flashcards.length > 1 && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {flashcards.slice(1, 7).map((fc, i) => (
                  <Card key={i} className="p-4">
                    <div className="font-medium mb-2">{fc.question}</div>
                    <div className="text-sm text-muted-foreground">{fc.answer}</div>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {mcqs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>MCQs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <MCQ item={mcqs[0]} />
            {mcqs.length > 1 && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {mcqs.slice(1, 7).map((q, i) => (
                  <Card key={i} className="p-4">
                    <div className="font-medium mb-2">{q.question}</div>
                    <div className="text-sm text-muted-foreground">{q.options?.join(" • ")}</div>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {cloze.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Fill-in-the-Blanks</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {cloze.map((c, i) => (
                <li key={i} className="p-3 rounded border">
                  <div className="font-medium">{c.text}</div>
                  <div className="text-muted-foreground">Answer: {c.answer}</div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
