"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export type FlashcardData = {
  question: string;
  answer: string;
  source_document_id?: string | null;
  source_page_number?: number | null;
};

type Props = {
  item: FlashcardData;
  onAgain?: () => void;
  onGood?: () => void;
  onEasy?: () => void;
};

export function Flashcard({ item, onAgain, onGood, onEasy }: Props) {
  const [revealed, setRevealed] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setRevealed(false);
  }, [item?.question]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setRevealed((r) => !r);
      } else if (e.key.toLowerCase() === "a") {
        onAgain?.();
      } else if (e.key.toLowerCase() === "g") {
        onGood?.();
      } else if (e.key.toLowerCase() === "e") {
        onEasy?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onAgain, onGood, onEasy]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        ref={cardRef}
        className="relative w-full max-w-3xl h-56 [perspective:1000px] select-none"
        role="group"
        aria-live="polite"
      >
        <Card
          className={
            "absolute inset-0 grid place-items-center rounded-2xl border bg-background p-6 text-center text-lg font-medium transition-transform duration-500 [transform-style:preserve-3d] " +
            (revealed ? "[transform:rotateY(180deg)]" : "")
          }
          onClick={() => setRevealed((r) => !r)}
        >
          {/* Front */}
          <div className="[backface-visibility:hidden]">
            {item?.question || "…"}
          </div>
          {/* Back */}
          <div className="absolute inset-0 grid place-items-center rounded-2xl p-6 text-muted-foreground [transform:rotateY(180deg)] [backface-visibility:hidden]">
            <div>
              <div className="text-foreground text-lg font-semibold mb-2">Answer</div>
              <div className="text-base">{item?.answer || "…"}</div>
              {(item?.source_document_id || item?.source_page_number) && (
                <div className="mt-3 text-xs text-muted-foreground">
                  {item?.source_document_id ? `ref:${item.source_document_id}` : null}
                  {item?.source_page_number ? ` p:${item.source_page_number}` : null}
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
      <div className="flex items-center gap-2">
        {!revealed ? (
          <Button onClick={() => setRevealed(true)}>Reveal</Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="destructive" onClick={onAgain} title="Again (A)">Again</Button>
            <Button variant="default" onClick={onGood} title="Good (G)">Good</Button>
            <Button variant="secondary" onClick={onEasy} title="Easy (E)">Easy</Button>
          </div>
        )}
      </div>
      <div className="text-xs text-muted-foreground">Tip: Space/Enter to flip. A/G/E for grading.</div>
    </div>
  );
}


