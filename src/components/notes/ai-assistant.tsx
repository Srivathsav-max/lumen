"use client";

import { useState } from "react";
import { useAI } from "@/providers/ai-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  onInsert: (text: string) => void;
  onInsertBlocks?: (blocks: Array<{ type: string; data: any }>) => void;
  getContext?: () => any | undefined;
};

export function AIAssistant({ onInsert, onInsertBlocks, getContext }: Props) {
  const { ask, isGenerating } = useAI();
  const [question, setQuestion] = useState("");

  const handleAsk = async () => {
    if (!question.trim()) return;
    const ctx = (await getContext?.()) ?? undefined;
    const { text, actions } = await ask(question, { context: ctx, formatHint: "markdown for EditorJS" });

    // If the model returned explicit blocks, insert them as blocks
    const insertAction = actions?.find((a) => a.type === "insert_editorjs_blocks");
    if (insertAction?.payload?.blocks && onInsertBlocks) {
      try {
        const blocks = insertAction.payload.blocks as Array<{ type: string; data: any }>;
        onInsertBlocks(blocks);
        return;
      } catch {
        // Ignore and fallback to text
      }
    }

    // Otherwise, convert markdown to EditorJS blocks, then insert
    if (text?.trim() && onInsertBlocks) {
      try {
        const mod = await import("@/components/editor/plugins/markdown-import-export");
        const data = await mod.MarkdownImportExportPlugin.importFromMarkdown(text);
        const blocks = (data?.blocks ?? []).map((b: any) => ({ type: b.type, data: b.data }));
        if (blocks.length > 0) {
          onInsertBlocks(blocks);
          return;
        }
      } catch {
        // Fallback to text paragraph
      }
    }

    if (text) onInsert(text);
  };

  return (
    <div className="border rounded-md p-3 bg-muted/30">
      <div className="text-sm font-medium mb-2">Ask AI to add to your note</div>
      <Textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Ask a question or describe what to generate..."
        className="mb-2"
      />
      <div className="flex gap-2">
        <Button disabled={isGenerating || !question.trim()} onClick={handleAsk}>
          {isGenerating ? "Generating..." : "Generate and Insert"}
        </Button>
      </div>
    </div>
  );
}


