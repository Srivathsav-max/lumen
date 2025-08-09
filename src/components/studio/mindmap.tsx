"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type MindMapNode = string | { id?: string; text: string; type?: string; children?: Array<{ id?: string; text: string }> };

export function MindMap({ data }: { data: { title?: string; nodes: MindMapNode[] } }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const items = useMemo(() => (data?.nodes || []), [data]);
  const itemTexts = useMemo(() => items.map((n) => (typeof n === 'string' ? n : (n?.text ?? ''))), [items]);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 640, h: 480 });

  // Resize canvas to container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => {
      const rect = container.getBoundingClientRect();
      setSize({ w: Math.max(320, Math.floor(rect.width)), h: Math.max(260, Math.floor(rect.height)) });
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [itemTexts, data?.title]);

  return (
    <div className="w-full h-full flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <div className="text-sm font-medium truncate">{data?.title || "Mind Map"}</div>
        <Badge variant="outline" className="text-[10px] px-2 py-0">{(data?.nodes?.length ?? 0)} nodes</Badge>
      </div>
      <Card className="w-full h-full p-0 overflow-hidden">
        <div ref={containerRef} className="relative w-full h-[min(640px,60vh)]">
          {/* Edges layer */}
          <svg ref={svgRef} className="absolute inset-0 w-full h-full" width={size.w} height={size.h} viewBox={`0 0 ${size.w} ${size.h}`}
            preserveAspectRatio="none">
            {renderEdges(size, itemTexts)}
          </svg>
          {/* Nodes layer (shadcn blocks) */}
          {renderNodes(size, data?.title || "Mind Map", itemTexts)}
        </div>
      </Card>
    </div>
  );
}

function polarLayout(size: { w: number; h: number }, count: number) {
  const cx = size.w / 2;
  const cy = size.h / 2;
  const radius = Math.min(size.w, size.h) * 0.38;
  const positions = [] as Array<{ x: number; y: number }>;
  const n = Math.max(count, 1);
  for (let i = 0; i < count; i++) {
    const angle = (i / n) * Math.PI * 2;
    positions.push({ x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) });
  }
  return { cx, cy, positions };
}

function renderEdges(size: { w: number; h: number }, items: string[]) {
  const { cx, cy, positions } = polarLayout(size, items.length);
  return (
    <g stroke="#cbd5e1" strokeWidth={1.2}>
      {positions.map((p, i) => (
        <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} />
      ))}
    </g>
  );
}

function renderNodes(size: { w: number; h: number }, title: string, items: string[]) {
  const { cx, cy, positions } = polarLayout(size, items.length);
  const node = (text: string, x: number, y: number, key: React.Key) => (
    <div
      key={key}
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: x, top: y }}
    >
      <Block text={text} />
    </div>
  );
  return (
    <>
      {node(title, cx, cy, 'root')}
      {items.map((t, i) => node(t, positions[i].x, positions[i].y, i))}
    </>
  );
}

function Block({ text }: { text: string }) {
  return (
    <Card className="px-3 py-2 max-w-[220px] shadow-sm border-muted-foreground/20 text-xs">
      <div className="text-[11px] leading-snug whitespace-pre-wrap break-words">{text}</div>
    </Card>
  );
}

function drawBubble(ctx: CanvasRenderingContext2D, x: number, y: number, text: string) {
  const paddingX = 10;
  const paddingY = 6;
  const maxWidth = 180;
  const lines = wrapText(ctx, text, maxWidth);
  const lineHeight = 16;
  const contentWidth = Math.min(maxWidth, Math.max(...lines.map(l => ctx.measureText(l).width), 40));
  const contentHeight = lines.length * lineHeight;
  const w = contentWidth + paddingX * 2;
  const h = contentHeight + paddingY * 2;
  const rx = x - w / 2;
  const ry = y - h / 2;
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 1;
  roundRect(ctx, rx, ry, w, h, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#111";
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], rx + paddingX, ry + paddingY + (i + 1) * lineHeight - 4);
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = (text || "").split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? line + " " + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 6);
}


