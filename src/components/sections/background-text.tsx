"use client";

import { TextHoverEffect } from "../ui/text-hover-effect";

export function BackgroundText() {
  return (
    <div className="fixed bottom-0 w-full h-[40rem] pointer-events-none opacity-10">
      <TextHoverEffect text="Start Your Learning Journey Today" />
    </div>
  );
}
