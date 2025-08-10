"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export type MCQData = {
  question: string;
  options: string[];
  correct_index: number;
  explanation?: string;
  source_document_id?: string | null;
  source_page_number?: number | null;
};

type Props = {
  item: MCQData;
  onNext?: () => void;
};

export function MCQ({ item, onNext }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  const isCorrect = selected !== null && selected === item.correct_index;

  return (
    <div className="w-full max-w-3xl space-y-3">
      <Card className="p-5">
        <div className="text-base md:text-lg font-medium mb-3">{item.question}</div>
        <div className="space-y-2">
          {item.options?.map((opt, i) => {
            const chosen = selected === i;
            const correct = revealed && i === item.correct_index;
            const wrong = revealed && chosen && !correct;
            return (
              <button
                key={i}
                className={
                  "w-full text-left rounded-lg border px-3 py-2 hover:bg-muted transition-colors " +
                  (chosen ? "border-primary" : "") +
                  (correct ? " bg-green-50 border-green-500" : "") +
                  (wrong ? " bg-red-50 border-red-500" : "")
                }
                onClick={() => setSelected(i)}
                disabled={revealed}
              >
                <span className="mr-2 text-xs rounded-full border px-2 py-0.5 align-middle">{String.fromCharCode(65 + i)}</span>
                <span>{opt}</span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 mt-4">
          {!revealed ? (
            <Button onClick={() => setRevealed(true)} disabled={selected === null}>Check</Button>
          ) : (
            <Button onClick={() => { setSelected(null); setRevealed(false); onNext?.(); }}>Next</Button>
          )}
        </div>
        {revealed && (
          <div className="mt-3 text-sm text-muted-foreground">
            {isCorrect ? "Correct!" : "Incorrect."}
            {item.explanation ? <div className="mt-1">{item.explanation}</div> : null}
            {(item.source_document_id || item.source_page_number) && (
              <div className="mt-2 text-xs">
                {item.source_document_id ? `ref:${item.source_document_id}` : null}
                {item.source_page_number ? ` p:${item.source_page_number}` : null}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}


