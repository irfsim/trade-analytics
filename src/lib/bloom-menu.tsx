'use client';

// Patched version of bloom-menu that opens at the same position as the trigger
// Original: https://github.com/joshpuckett/bloom

import {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  useLayoutEffect,
  type ReactNode,
  type CSSProperties,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Types
interface BloomContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLDivElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
  animationConfig: AnimationConfig;
  closeOnClickOutside: boolean;
  closeOnEscape: boolean;
  modal: boolean;
  isOpenAnimationCompleteRef: React.MutableRefObject<boolean>;
  direction: Direction;
  anchor: Anchor;
  activeSubmenu: string | null;
  setActiveSubmenu: (id: string | null) => void;
  visualDuration: number;
  bounce: number;
}

interface AnimationConfig {
  morphStiffness: number;
  morphDamping: number;
  contentStiffness: number;
  contentDamping: number;
  contentDelay: number;
  triggerBlur: number;
  contentBlur: number;
}

type Direction = 'top' | 'bottom' | 'left' | 'right';
type Anchor = 'start' | 'center' | 'end';

// Context
const BloomContext = createContext<BloomContextValue | null>(null);

function useBloomContext() {
  const context = useContext(BloomContext);
  if (!context) {
    throw new Error('Bloom components must be used within a <Root> component');
  }
  return context;
}

// Hooks
function useControllable<T>(
  value: T | undefined,
  defaultValue: T,
  onChange?: (value: T) => void
): [T, (value: T) => void] {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internalValue;

  const setValue = useCallback(
    (newValue: T) => {
      if (!isControlled) {
        setInternalValue(newValue);
      }
      onChange?.(newValue);
    },
    [isControlled, onChange]
  );

  return [currentValue, setValue];
}

function useClickOutside(
  refs: React.RefObject<HTMLElement | null>[],
  callback: () => void,
  enabled = true
) {
  useEffect(() => {
    if (!enabled) return;

    function handleClick(event: MouseEvent | TouchEvent) {
      const target = event.target as HTMLElement;
      if (refs.every((ref) => !ref.current || !ref.current.contains(target))) {
        callback();
      }
    }

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);

    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [refs, callback, enabled]);
}

function useEscapeKey(callback: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        callback();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [callback, enabled]);
}

function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    function handleChange(event: MediaQueryListEvent) {
      setPrefersReducedMotion(event.matches);
    }

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}

// Constants
const transitionConfig = { type: 'spring' as const, visualDuration: 0.25, bounce: 0.2 };
const reducedMotionSpring = { stiffness: 1000, damping: 100 };

const defaultAnimationConfig: AnimationConfig = {
  morphStiffness: 382,
  morphDamping: 29,
  contentStiffness: 403,
  contentDamping: 36,
  contentDelay: 0.03,
  triggerBlur: 8,
  contentBlur: 10,
};

// Helper functions
function getPositionStyles(direction: Direction): CSSProperties {
  const styles: CSSProperties = { position: 'absolute' };
  switch (direction) {
    case 'top':
      styles.bottom = 0;
      styles.left = 0;
      break;
    case 'bottom':
      styles.top = 0;
      styles.left = 0;
      break;
    case 'left':
      styles.right = 0;
      styles.bottom = 0;
      break;
    case 'right':
      styles.left = 0;
      styles.bottom = 0;
      break;
  }
  return styles;
}

function getAnchorOffset(
  direction: Direction,
  anchor: Anchor,
  menuWidth: number,
  menuHeight: number,
  buttonWidth: number,
  buttonHeight: number
) {
  if (anchor === 'start') return { x: 0, y: 0 };

  const multiplier = anchor === 'center' ? 0.5 : 1;

  if (direction === 'top' || direction === 'bottom') {
    return { x: -(menuWidth - buttonWidth) * multiplier, y: 0 };
  }
  return { x: 0, y: (menuHeight - buttonHeight) * multiplier };
}

function getTransformOrigin(direction: Direction, anchor: Anchor): string {
  const vertical = direction === 'top' ? 'bottom' : direction === 'bottom' ? 'top' : 'center';
  const horizontal = direction === 'left' ? 'right' : direction === 'right' ? 'left' : 'center';

  if (direction === 'top' || direction === 'bottom') {
    return `${anchor === 'start' ? 'left' : anchor === 'end' ? 'right' : 'center'} ${vertical}`;
  }
  return `${horizontal} ${anchor === 'start' ? 'bottom' : anchor === 'end' ? 'top' : 'center'}`;
}

// PATCHED: Removed the directional offset so menu opens at same position as trigger
function getDirectionOffset(_direction: Direction, _offset: number) {
  // Original code offset the menu by 75% of button height
  // We return 0 to make the menu open at the same position
  return { x: 0, y: 0 };
}

// Components
interface RootProps {
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
  animationConfig?: Partial<AnimationConfig>;
  closeOnClickOutside?: boolean;
  closeOnEscape?: boolean;
  modal?: boolean;
  direction?: Direction;
  anchor?: Anchor;
  visualDuration?: number;
  bounce?: number;
}

export function Root({
  children,
  open,
  onOpenChange,
  defaultOpen = false,
  animationConfig,
  closeOnClickOutside = true,
  closeOnEscape = true,
  modal = false,
  direction = 'top',
  anchor = 'start',
  visualDuration = transitionConfig.visualDuration,
  bounce = transitionConfig.bounce,
}: RootProps) {
  const resolvedAnchor = direction === 'left' || direction === 'right' ? 'center' : anchor;
  const [isOpen, setIsOpen] = useControllable(open, defaultOpen, onOpenChange);

  const triggerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isOpenAnimationCompleteRef = useRef(false);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);

  const handleSetOpen = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        isOpenAnimationCompleteRef.current = false;
        setActiveSubmenu(null);
      }
      setIsOpen(newOpen);
    },
    [setIsOpen]
  );

  useClickOutside([triggerRef, contentRef], () => handleSetOpen(false), isOpen && closeOnClickOutside);
  useEscapeKey(() => handleSetOpen(false), isOpen && closeOnEscape);

  const mergedAnimationConfig = useMemo(
    () => ({ ...defaultAnimationConfig, ...animationConfig }),
    [animationConfig]
  );

  const contextValue = useMemo(
    () => ({
      open: isOpen,
      setOpen: handleSetOpen,
      triggerRef,
      contentRef,
      animationConfig: mergedAnimationConfig,
      closeOnClickOutside,
      closeOnEscape,
      modal,
      isOpenAnimationCompleteRef,
      direction,
      anchor: resolvedAnchor,
      activeSubmenu,
      setActiveSubmenu,
      visualDuration,
      bounce,
    }),
    [
      isOpen,
      handleSetOpen,
      mergedAnimationConfig,
      closeOnClickOutside,
      closeOnEscape,
      modal,
      direction,
      resolvedAnchor,
      activeSubmenu,
      visualDuration,
      bounce,
    ]
  );

  return <BloomContext.Provider value={contextValue}>{children}</BloomContext.Provider>;
}

interface ContainerProps {
  children: ReactNode;
  buttonSize?: number | { width: number; height: number };
  menuWidth?: number;
  menuRadius?: number;
  buttonRadius?: number;
  className?: string;
  style?: CSSProperties;
}

export function Container({
  children,
  buttonSize = 40,
  menuWidth = 200,
  menuRadius = 24,
  buttonRadius,
  className = '',
  style,
}: ContainerProps) {
  const { open, setOpen, direction, anchor, activeSubmenu, visualDuration, bounce } = useBloomContext();
  const prefersReducedMotion = useReducedMotion();

  const containerRef = useRef<HTMLDivElement>(null);
  const contentMeasureRef = useRef<HTMLDivElement>(null);

  const buttonWidth = typeof buttonSize === 'number' ? buttonSize : buttonSize.width;
  const buttonHeight = typeof buttonSize === 'number' ? buttonSize : buttonSize.height;

  const [menuHeight, setMenuHeight] = useState(buttonHeight);
  const [hasActiveSubmenu, setHasActiveSubmenu] = useState(false);
  const hadSubmenuRef = useRef(false);

  useEffect(() => {
    if (activeSubmenu) {
      hadSubmenuRef.current = true;
      setHasActiveSubmenu(true);
    } else if (hadSubmenuRef.current) {
      const timeout = setTimeout(() => {
        setHasActiveSubmenu(false);
        hadSubmenuRef.current = false;
      }, visualDuration * 1000);
      return () => clearTimeout(timeout);
    }
  }, [activeSubmenu, visualDuration]);

  const transition = prefersReducedMotion
    ? { type: 'spring' as const, ...reducedMotionSpring }
    : { type: 'spring' as const, visualDuration, bounce };

  // Measure content height when menu opens and when content changes
  useLayoutEffect(() => {
    if (open && contentMeasureRef.current) {
      const height = contentMeasureRef.current.offsetHeight;
      setMenuHeight(height);
    }
  }, [open]);

  // Use ResizeObserver to handle dynamic content height changes
  useEffect(() => {
    if (!open || !contentMeasureRef.current) return;

    const element = contentMeasureRef.current;
    const observer = new ResizeObserver(() => {
      // Use offsetHeight for consistency (includes padding/border)
      const height = element.offsetHeight;
      if (height > 0) {
        setMenuHeight(height);
      }
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [open]);

  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      if (!open) {
        event.preventDefault();
        setOpen(true);
      }
    },
    [open, setOpen]
  );

  const resolvedButtonRadius = buttonRadius ?? Math.min(buttonWidth, buttonHeight) / 2;
  const positionStyles = getPositionStyles(direction);
  const transformOrigin = getTransformOrigin(direction, anchor);

  // PATCHED: No directional offset - menu opens at same position as trigger
  const directionOffset = getDirectionOffset(direction, 0);
  const anchorOffset = getAnchorOffset(direction, anchor, menuWidth, menuHeight, buttonWidth, buttonHeight);

  const targetPosition = {
    x: directionOffset.x + anchorOffset.x,
    y: directionOffset.y + anchorOffset.y,
  };

  return (
    <div style={{ position: 'relative', width: buttonWidth, height: buttonHeight }}>
      <motion.div
        ref={containerRef}
        onClick={handleClick}
        initial={false}
        animate={{
          width: open ? menuWidth : buttonWidth,
          height: open ? menuHeight : buttonHeight,
          borderRadius: open ? menuRadius : resolvedButtonRadius,
          x: open ? targetPosition.x : 0,
          y: open ? targetPosition.y : 0,
          scale: activeSubmenu ? 0.96 : 1,
          boxShadow: open
            ? '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
            : '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        }}
        transition={transition}
        className={className}
        style={{
          ...positionStyles,
          overflow: hasActiveSubmenu ? 'visible' : 'hidden',
          cursor: open ? 'default' : 'pointer',
          transformOrigin: hasActiveSubmenu ? 'center center' : transformOrigin,
          zIndex: open ? 50 : 'auto',
          willChange: 'transform',
          ...style,
        }}
      >
        <div ref={contentMeasureRef}>{children}</div>
      </motion.div>
    </div>
  );
}

interface TriggerProps {
  children: ReactNode;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function Trigger({ children, disabled = false, className = '', style }: TriggerProps) {
  const { open, setOpen, triggerRef, animationConfig, visualDuration, bounce } = useBloomContext();
  const prefersReducedMotion = useReducedMotion();

  const transition = prefersReducedMotion
    ? { type: 'spring' as const, ...reducedMotionSpring }
    : { type: 'spring' as const, visualDuration: visualDuration * 0.85, bounce };

  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      if (disabled) return;
      event.preventDefault();
      event.stopPropagation();
      setOpen(!open);
    },
    [disabled, setOpen, open]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (disabled) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        setOpen(!open);
      }
      if (event.key === 'ArrowDown' && !open) {
        event.preventDefault();
        setOpen(true);
      }
    },
    [disabled, setOpen, open]
  );

  const variants = {
    visible: { opacity: 1, filter: 'blur(0px)' },
    hidden: {
      opacity: 0,
      filter: prefersReducedMotion ? 'blur(0px)' : `blur(${animationConfig.triggerBlur}px)`,
    },
  };

  return (
    <AnimatePresence initial={false}>
      {!open && (
        <motion.div
          ref={triggerRef}
          layout={false}
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={variants}
          transition={transition}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-disabled={disabled}
          className={className}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: disabled ? 'not-allowed' : 'pointer',
            ...style,
          }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface ContentProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onAnimationComplete?: () => void;
}

export function Content({ children, className = '', style, onAnimationComplete }: ContentProps) {
  const { open, contentRef, animationConfig, isOpenAnimationCompleteRef, direction, visualDuration, bounce } =
    useBloomContext();
  const prefersReducedMotion = useReducedMotion();
  const localRef = useRef<HTMLDivElement>(null);
  const [highlight, setHighlight] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const hasHighlighted = useRef(false);
  const lastMousePos = useRef<{ x: number; y: number } | null>(null);

  const transition = prefersReducedMotion
    ? { type: 'spring' as const, ...reducedMotionSpring }
    : { type: 'spring' as const, visualDuration: visualDuration * 0.85, bounce };

  const getOffset = (amount: number) => {
    switch (direction) {
      case 'top':
        return { x: 0, y: amount };
      case 'bottom':
        return { x: 0, y: -amount };
      case 'left':
        return { x: amount, y: 0 };
      case 'right':
        return { x: -amount, y: 0 };
    }
  };

  const smallOffset = getOffset(8);
  const largeOffset = getOffset(30);

  const variants = {
    visible: {
      opacity: 1,
      scale: 1,
      x: 0,
      y: 0,
      filter: 'blur(0px)',
      transition: {
        ...transition,
        delay: prefersReducedMotion ? 0 : animationConfig.contentDelay,
      },
    },
    hidden: {
      opacity: 0,
      scale: 0.95,
      ...smallOffset,
      filter: prefersReducedMotion ? 'blur(0px)' : `blur(${animationConfig.contentBlur}px)`,
    },
    exit: {
      opacity: 0,
      scale: 0.9,
      ...largeOffset,
      filter: prefersReducedMotion ? 'blur(0px)' : `blur(${animationConfig.contentBlur}px)`,
      transition: { duration: 0.2, ease: [0.4, 0, 1, 1] as const },
    },
  };

  const setRef = useCallback(
    (node: HTMLDivElement | null) => {
      (contentRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      localRef.current = node;
    },
    [contentRef]
  );

  const handleAnimationComplete = useCallback(
    (definition: string) => {
      if (definition === 'visible') {
        isOpenAnimationCompleteRef.current = true;
      }
      onAnimationComplete?.();
    },
    [isOpenAnimationCompleteRef, onAnimationComplete]
  );

  const updateHighlightFromElement = useCallback((item: Element) => {
    if (!localRef.current) return;
    const containerRect = localRef.current.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    setHighlight({
      top: itemRect.top - containerRect.top + localRef.current.scrollTop,
      left: itemRect.left - containerRect.left + localRef.current.scrollLeft,
      width: itemRect.width,
      height: itemRect.height,
    });
  }, []);

  const handleMouseOver = useCallback((e: React.MouseEvent) => {
    if (!isOpenAnimationCompleteRef.current) return;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    const item = (e.target as HTMLElement).closest('[role="menuitem"]');
    if (item) updateHighlightFromElement(item);
  }, [isOpenAnimationCompleteRef, updateHighlightFromElement]);

  const handleMouseLeave = useCallback(() => {
    setHighlight(null);
    hasHighlighted.current = false;
    lastMousePos.current = null;
  }, []);

  const handleScroll = useCallback(() => {
    if (!lastMousePos.current || !isOpenAnimationCompleteRef.current) return;
    const el = document.elementFromPoint(lastMousePos.current.x, lastMousePos.current.y);
    if (!el) return;
    const item = el.closest('[role="menuitem"]');
    if (item && localRef.current?.contains(item)) {
      updateHighlightFromElement(item);
    } else {
      setHighlight(null);
      hasHighlighted.current = false;
    }
  }, [isOpenAnimationCompleteRef, updateHighlightFromElement]);

  // Reset when menu closes
  useEffect(() => {
    if (!open) {
      setHighlight(null);
      hasHighlighted.current = false;
    }
  }, [open]);

  // Track whether we've already highlighted (for enter vs move transitions)
  useEffect(() => {
    if (highlight) {
      // After first highlight renders, mark as having highlighted
      // so subsequent moves get the sliding transition
      const id = requestAnimationFrame(() => {
        hasHighlighted.current = true;
      });
      return () => cancelAnimationFrame(id);
    }
  }, [highlight]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={setRef}
          role="menu"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={variants}
          transition={{
            ...transition,
            delay: prefersReducedMotion ? 0 : animationConfig.contentDelay,
          }}
          onAnimationComplete={handleAnimationComplete}
          onMouseOver={handleMouseOver}
          onMouseMove={(e) => { lastMousePos.current = { x: e.clientX, y: e.clientY }; }}
          onMouseLeave={handleMouseLeave}
          onScroll={handleScroll}
          className={className}
          style={{ position: 'relative', ...style }}
        >
          {/* Sliding highlight */}
          <div
            className="bg-zinc-100 dark:bg-zinc-800 rounded-lg"
            style={{
              position: 'absolute',
              top: highlight?.top ?? 0,
              left: highlight?.left ?? 0,
              width: highlight?.width ?? 0,
              height: highlight?.height ?? 0,
              opacity: highlight ? 1 : 0,
              pointerEvents: 'none',
              transition: prefersReducedMotion
                ? 'none'
                : hasHighlighted.current
                  ? 'top 100ms linear, left 100ms linear, width 100ms linear, height 100ms linear, opacity 80ms linear'
                  : 'opacity 80ms linear',
            }}
          />
          {/* Items render above the highlight */}
          <div style={{ position: 'relative' }}>
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface ItemProps {
  children: ReactNode;
  onSelect?: () => void;
  disabled?: boolean;
  closeOnSelect?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function Item({
  children,
  onSelect,
  disabled = false,
  closeOnSelect = true,
  className = '',
  style,
}: ItemProps) {
  const { setOpen, isOpenAnimationCompleteRef, activeSubmenu } = useBloomContext();
  const [isHighlighted, setIsHighlighted] = useState(false);

  const isInActiveSubmenu = activeSubmenu !== null;

  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      if (disabled) return;
      event.preventDefault();
      onSelect?.();
      if (closeOnSelect) {
        setOpen(false);
      }
    },
    [disabled, onSelect, closeOnSelect, setOpen]
  );

  const handleMouseEnter = useCallback(() => {
    if (isOpenAnimationCompleteRef.current && !disabled) {
      setIsHighlighted(true);
    }
  }, [disabled, isOpenAnimationCompleteRef]);

  const handleMouseLeave = useCallback(() => {
    setIsHighlighted(false);
  }, []);

  return (
    <div
      role="menuitem"
      aria-disabled={disabled}
      data-disabled={disabled || undefined}
      data-highlighted={isHighlighted || undefined}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={className}
      style={{
        cursor: disabled ? 'not-allowed' : 'pointer',
        userSelect: 'none',
        opacity: isInActiveSubmenu ? 0.5 : 1,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// Re-export for compatibility
export const Menu = {
  Root,
  Container,
  Trigger,
  Content,
  Item,
};
