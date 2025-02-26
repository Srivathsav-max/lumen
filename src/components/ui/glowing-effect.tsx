"use client";

import React, { useEffect, useRef } from "react";

interface GlowingEffectProps {
  spread?: number;
  glow?: boolean;
  disabled?: boolean;
  proximity?: number;
  inactiveZone?: number;
}

export const GlowingEffect = ({
  spread = 40,
  glow = true,
  disabled = false,
  proximity = 64,
  inactiveZone = 0.01,
}: GlowingEffectProps) => {
  const element = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (disabled || !element.current) return;

    const handleMove = (event: MouseEvent) => {
      if (!element.current) return;
      
      const rect = element.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      const maxDistance = Math.min(rect.width, rect.height) * proximity / 100;
      const inactiveRadius = maxDistance * inactiveZone;
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const distanceFromCenter = Math.sqrt(
        Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
      );

      if (distanceFromCenter < inactiveRadius) {
        element.current.style.setProperty("--_glow-x", "50%");
        element.current.style.setProperty("--_glow-y", "50%");
        element.current.style.setProperty("--_glow-opacity", "0");
        return;
      }

      const percentX = (x / rect.width) * 100;
      const percentY = (y / rect.height) * 100;
      
      element.current.style.setProperty("--_glow-x", `${percentX}%`);
      element.current.style.setProperty("--_glow-y", `${percentY}%`);
      element.current.style.setProperty("--_glow-opacity", "1");
    };

    const handleLeave = () => {
      if (!element.current) return;
      element.current.style.setProperty("--_glow-x", "50%");
      element.current.style.setProperty("--_glow-y", "50%");
      element.current.style.setProperty("--_glow-opacity", "0");
    };

    const el = element.current;
    el.addEventListener("mousemove", handleMove);
    el.addEventListener("mouseleave", handleLeave);

    return () => {
      el.removeEventListener("mousemove", handleMove);
      el.removeEventListener("mouseleave", handleLeave);
    };
  }, [disabled, proximity, inactiveZone]);

  return (
    <div
      ref={element}
      style={
        {
          "--_glow-x": "50%",
          "--_glow-y": "50%",
          "--_glow-opacity": "0",
          "--_glow-spread": `${spread}px`,
        } as React.CSSProperties
      }
      className="pointer-events-none absolute -inset-px rounded-[inherit] transition duration-300"
    >
      {glow && (
        <div
          className="absolute inset-px rounded-[inherit] bg-[radial-gradient(circle_at_var(--_glow-x)_var(--_glow-y),rgba(76,29,149,var(--_glow-opacity)),transparent_var(--_glow-spread))]"
          style={{
            WebkitMask: "linear-gradient(black, black) content-box content-box, linear-gradient(black, black)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
          }}
        />
      )}
    </div>
  );
};
