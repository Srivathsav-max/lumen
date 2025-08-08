"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { api } from "@/lib/api-client";

type GenerateOptions = {
  context?: any;
  formatHint?: string;
};

export type AIMessage = {
  role: "user" | "assistant";
  content: string;
  pageId?: string;
};

type AIContextType = {
  messages: AIMessage[];
  isGenerating: boolean;
  ask: (question: string, opts?: GenerateOptions) => Promise<{ text: string; actions?: Array<{ type: string; payload: any }> }>;
  reset: (pageId?: string) => void;
  hydrate: (pageId: string, items: AIMessage[]) => void;
};

const AIContext = createContext<AIContextType | undefined>(undefined);

export function AIProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const ask = useCallback(async (question: string, opts?: GenerateOptions) => {
    setIsGenerating(true);
    let pageId = (opts?.context && (opts?.context as any).page_id) || undefined;
    // Fallback: attempt to read from editor context if not provided
    if (!pageId && typeof window !== "undefined") {
      try {
        const ctx2 = await (window as any)?.lumenGetEditorContext?.();
        if (ctx2?.page_id) pageId = ctx2.page_id as string;
      } catch {}
    }
    setMessages((m) => [...m, { role: "user", content: question, pageId }]);
    try {
      const resp = await api.post("/ai/generate", {
        query: question,
        context: {
          ...(opts?.context ?? {}),
          page_id: pageId ?? null,
        },
        page_id: pageId ?? null,
        format: opts?.formatHint ?? "markdown for EditorJS blocks",
      });
      const text: string = resp?.data?.data?.text ?? resp?.data?.data?.Text ?? "";
      let actions: any[] = resp?.data?.data?.actions ?? [];
      if (actions && !Array.isArray(actions)) {
        actions = [actions];
      }
      const assistantMsg: AIMessage = { role: "assistant", content: text, pageId };
      setMessages((m) => [...m, assistantMsg]);

      // Debounced persistence to backend
      schedulePersist({ type: "notes", pageId, user: question, assistant: text });
      return { text, actions };
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const reset = useCallback((pageId?: string) => {
    if (!pageId) {
      setMessages([]);
      return;
    }
    setMessages((prev) => prev.filter((m) => m.pageId !== pageId));
  }, []);

  const hydrate = useCallback((pageId: string, items: AIMessage[]) => {
    setMessages((prev) => {
      const filtered = prev.filter((m) => m.pageId !== pageId);
      const withPage = items.map((m) => ({ ...m, pageId }));
      return [...filtered, ...withPage];
    });
  }, []);

  // Simple debounce for persisting chat exchanges
  type PersistItem = { type: string; pageId?: string; user: string; assistant: string };
  const persistQueue = React.useRef<PersistItem[]>([]);
  const persistTimer = React.useRef<any>(null);
  const flushPersist = useCallback(async () => {
    const batch = persistQueue.current.splice(0, persistQueue.current.length);
    for (const item of batch) {
      try {
        await api.post("/ai/chat/exchange", {
          type: item.type,
          page_id: item.pageId ?? null,
          user: item.user,
          assistant: item.assistant,
        }, { requiresAuth: true });
      } catch {}
    }
  }, []);
  const schedulePersist = useCallback((item: PersistItem) => {
    persistQueue.current.push(item);
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(flushPersist, 400);
  }, [flushPersist]);

  const value = useMemo(() => ({ messages, isGenerating, ask, reset, hydrate }), [messages, isGenerating, ask, reset, hydrate]);

  return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
}

export function useAI() {
  const ctx = useContext(AIContext);
  if (!ctx) throw new Error("useAI must be used within AIProvider");
  return ctx;
}

export function usePageAI(pageId?: string) {
  const ctx = useAI();
  const scopedMessages = useMemo(() => {
    if (!pageId) return [] as AIMessage[];
    return ctx.messages.filter((m) => m.pageId === pageId);
  }, [ctx.messages, pageId]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!pageId) return;
      try {
        const res = await api.get<{ data: Array<{ role: 'user'|'assistant'; content: string }> }>(`/ai/chat/history?type=notes&page_id=${encodeURIComponent(pageId)}`);
        const items = (res.data as any)?.data as Array<{ role: 'user'|'assistant'; content: string }> | undefined;
        if (!cancelled && items && Array.isArray(items)) {
          const mapped: AIMessage[] = items.map((m) => ({ role: m.role, content: m.content, pageId }));
          ctx.hydrate(pageId, mapped);
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [pageId]);
  return {
    messages: scopedMessages,
    isGenerating: ctx.isGenerating,
    ask: ctx.ask,
    reset: (id?: string) => ctx.reset(id ?? pageId),
  } as const;
}


