"use client";
import React from "react";
import { cn } from "@/lib/utils";

type GridOverlayProps = {
  className?: string;
  columns?: number; // visual guide only
  columnWidth?: number; // px on desktop
  rowHeight?: number; // px
  showCrosshairs?: boolean;
};

/**
 * A lightweight, purely visual grid overlay inspired by Vercel's homepage.
 * It renders performant CSS grid guides without affecting layout or flow.
 *
 * Notes:
 * - Uses CSS variables so we can adapt across breakpoints.
 * - Crosshairs are optional (off by default to avoid visual noise on small screens).
 * - Keeps DOM minimal to preserve performance.
 */
export function GridOverlay({
  className,
  columns = 12,
  columnWidth = 360,
  rowHeight = 80,
  showCrosshairs = false,
}: GridOverlayProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 z-0",
        "[--grid-col:360px] [--grid-row:80px]",
        "[background-image:linear-gradient(to_right,rgba(0,0,0,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.06)_1px,transparent_1px)]",
        "[background-size:var(--grid-col)_var(--grid-row)] dark:[background-image:linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)]",
        className
      )}
      style={
        {
          // @ts-ignore CSS var for runtime control
          "--grid-col": `${columnWidth}px`,
          // @ts-ignore
          "--grid-row": `${rowHeight}px`,
        } as React.CSSProperties
      }
    >
      {showCrosshairs && (
        <div
          className={cn(
            "absolute inset-0",
            "[background-image:radial-gradient(circle_at_center,transparent_95%,transparent),linear-gradient(transparent_calc(50%-1px),rgba(0,0,0,0.14)_calc(50%-1px),rgba(0,0,0,0.14)_calc(50%+1px),transparent_calc(50%+1px)),linear-gradient(90deg,transparent_calc(50%-1px),rgba(0,0,0,0.14)_calc(50%-1px),rgba(0,0,0,0.14)_calc(50%+1px),transparent_calc(50%+1px))]",
            "[background-size:var(--grid-col)_var(--grid-row),var(--grid-col)_var(--grid-row),var(--grid-col)_var(--grid-row)]",
            "dark:[background-image:radial-gradient(circle_at_center,transparent_95%,transparent),linear-gradient(transparent_calc(50%-1px),rgba(255,255,255,0.18)_calc(50%-1px),rgba(255,255,255,0.18)_calc(50%+1px),transparent_calc(50%+1px)),linear-gradient(90deg,transparent_calc(50%-1px),rgba(255,255,255,0.18)_calc(50%-1px),rgba(255,255,255,0.18)_calc(50%+1px),transparent_calc(50%+1px))]"
          )}
          style={
            {
              // @ts-ignore CSS var for runtime control
              "--grid-col": `${columnWidth}px`,
              // @ts-ignore
              "--grid-row": `${rowHeight}px`,
            } as React.CSSProperties
          }
        />
      )}
    </div>
  );
}

type ColumnsProps = {
  className?: string;
  maxWidth?: number; // container width constraint
  paddingX?: string; // ex: "1rem"
};

/**
 * A content container that aligns with the visual grid. Keeps a consistent
 * reading width and center alignment across sections.
 */
export function Columns({ className, maxWidth = 1280, paddingX = "1.25rem", children }: React.PropsWithChildren<ColumnsProps>) {
  return (
    <div
      className={cn("relative mx-auto w-full", className)}
      style={{ maxWidth, paddingLeft: paddingX, paddingRight: paddingX }}
    >
      {children}
    </div>
  );
}


