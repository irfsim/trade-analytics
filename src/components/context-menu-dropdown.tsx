'use client';

import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';

export function ContextMenuDropdown({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [highlight, setHighlight] = useState<{ top: number; height: number } | null>(null);
  const hasHighlighted = useRef(false);

  const handleMouseOver = useCallback((e: React.MouseEvent) => {
    const btn = (e.target as HTMLElement).closest('button');
    if (btn && ref.current) {
      const containerRect = ref.current.getBoundingClientRect();
      const btnRect = btn.getBoundingClientRect();
      setHighlight({ top: btnRect.top - containerRect.top + ref.current.scrollTop, height: btnRect.height });
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHighlight(null);
    hasHighlighted.current = false;
  }, []);

  useEffect(() => {
    if (highlight) {
      const id = requestAnimationFrame(() => { hasHighlighted.current = true; });
      return () => cancelAnimationFrame(id);
    }
  }, [highlight]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg z-10 p-1"
      style={{ position: 'absolute' }}
      onMouseOver={handleMouseOver}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className="bg-zinc-100 dark:bg-zinc-700/50 rounded-lg"
        style={{
          position: 'absolute',
          top: highlight?.top ?? 0,
          left: 4,
          right: 4,
          height: highlight?.height ?? 0,
          opacity: highlight ? 1 : 0,
          pointerEvents: 'none',
          transition: hasHighlighted.current
            ? 'top 100ms linear, height 100ms linear, opacity 80ms linear'
            : 'opacity 80ms linear',
        }}
      />
      <div style={{ position: 'relative' }}>
        {children}
      </div>
    </div>
  );
}
