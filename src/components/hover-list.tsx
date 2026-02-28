'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface HoverListProps {
  children: React.ReactNode;
  className?: string;
}

export function HoverList({ children, className }: HoverListProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ top: number; height: number } | null>(null);
  const hasHovered = useRef(false);

  const handleMouseOver = useCallback((e: React.MouseEvent) => {
    const btn = (e.target as HTMLElement).closest('button');
    if (btn && ref.current && btn.parentElement === ref.current) {
      const containerRect = ref.current.getBoundingClientRect();
      const btnRect = btn.getBoundingClientRect();
      setHover({ top: btnRect.top - containerRect.top, height: btnRect.height });
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHover(null);
    hasHovered.current = false;
  }, []);

  useEffect(() => {
    if (hover) {
      const id = requestAnimationFrame(() => { hasHovered.current = true; });
      return () => cancelAnimationFrame(id);
    }
  }, [hover]);

  return (
    <div
      ref={ref}
      onMouseOver={handleMouseOver}
      onMouseLeave={handleMouseLeave}
      className={className}
      style={{ position: 'relative' }}
    >
      <div
        className="bg-zinc-100 dark:bg-zinc-800 rounded-lg"
        style={{
          position: 'absolute',
          top: hover?.top ?? 0,
          left: 0,
          width: '100%',
          height: hover?.height ?? 0,
          opacity: hover ? 1 : 0,
          pointerEvents: 'none',
          transition: hasHovered.current
            ? 'top 100ms linear, height 100ms linear, opacity 80ms linear'
            : 'opacity 80ms linear',
        }}
      />
      {children}
    </div>
  );
}
