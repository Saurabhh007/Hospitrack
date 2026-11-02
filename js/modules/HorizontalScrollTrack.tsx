import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Hospitrack — Unified Horizontal Scroll & Timeline Progress Architecture
 * 
 * Provides:
 * - Reactive ref-driven scroll listener (scrollLeft, scrollWidth, clientWidth)
 * - Mathematically synchronized progress indicator: (scrollLeft / (scrollWidth - clientWidth)) * 100
 * - Edge boundary detection with smooth-fading chevron buttons
 * - Subtle gradient edge fade masks
 * - Momentum drag support & smooth snap navigation
 */

export interface HorizontalScrollTrackProps {
  children: React.ReactNode;
  showProgressLine?: boolean;
  showNavigationButtons?: boolean;
  progressLinePosition?: 'top' | 'bottom';
  scrollStep?: number;
  className?: string;
  containerClassName?: string;
  fadeMask?: boolean;
  snapAlign?: 'start' | 'center' | 'none';
  activeColor?: string;
  trackColor?: string;
  customScrollbar?: boolean;
  onScrollChange?: (progress: number, scrollLeft: number) => void;
  ariaLabel?: string;
}

export const HorizontalScrollTrack: React.FC<HorizontalScrollTrackProps> = ({
  children,
  showProgressLine = true,
  showNavigationButtons = true,
  progressLinePosition = 'bottom',
  scrollStep = 240,
  className = '',
  containerClassName = '',
  fadeMask = true,
  snapAlign = 'start',
  activeColor = 'bg-teal-600',
  trackColor = 'bg-slate-200/80',
  customScrollbar = false,
  onScrollChange,
  ariaLabel = 'Horizontal scrollable content'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollPercentage, setScrollPercentage] = useState<number>(0);
  const [canScrollLeft, setCanScrollLeft] = useState<boolean>(false);
  const [canScrollRight, setCanScrollRight] = useState<boolean>(false);
  const [isOverflowing, setIsOverflowing] = useState<boolean>(false);

  // Drag-to-scroll interaction state
  const isDraggingRef = useRef<boolean>(false);
  const startXRef = useRef<number>(0);
  const scrollStartRef = useRef<number>(0);

  const updateScrollState = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;
    const maxScroll = Math.max(0, scrollWidth - clientWidth);

    if (maxScroll <= 2) {
      setScrollPercentage(100);
      setCanScrollLeft(false);
      setCanScrollRight(false);
      setIsOverflowing(false);
      onScrollChange?.(100, 0);
      return;
    }

    setIsOverflowing(true);
    const progress = Math.min(100, Math.max(0, (scrollLeft / maxScroll) * 100));
    setScrollPercentage(progress);
    setCanScrollLeft(scrollLeft > 2);
    setCanScrollRight(scrollLeft < maxScroll - 2);
    onScrollChange?.(progress, scrollLeft);
  }, [onScrollChange]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    updateScrollState();

    const handleScroll = () => {
      requestAnimationFrame(updateScrollState);
    };

    el.addEventListener('scroll', handleScroll, { passive: true });

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        updateScrollState();
      });
      resizeObserver.observe(el);
      // Also observe first child if present to track content width changes
      if (el.firstElementChild) {
        resizeObserver.observe(el.firstElementChild);
      }
    }

    const handleWindowResize = () => {
      updateScrollState();
    };
    window.addEventListener('resize', handleWindowResize, { passive: true });

    return () => {
      el.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleWindowResize);
      resizeObserver?.disconnect();
    };
  }, [updateScrollState]);

  const handleScrollLeft = () => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ left: -scrollStep, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ left: scrollStep, behavior: 'smooth' });
    }
  };

  // Mouse drag-to-scroll handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    // Don't initiate drag on buttons or links
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('input')) return;

    isDraggingRef.current = true;
    startXRef.current = e.pageX - containerRef.current.offsetLeft;
    scrollStartRef.current = containerRef.current.scrollLeft;
    containerRef.current.style.cursor = 'grabbing';
    containerRef.current.style.userSelect = 'none';
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !containerRef.current) return;
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.5; // Drag sensitivity
    containerRef.current.scrollLeft = scrollStartRef.current - walk;
  };

  const handleMouseUpOrLeave = () => {
    if (!containerRef.current) return;
    isDraggingRef.current = false;
    containerRef.current.style.cursor = '';
    containerRef.current.style.removeProperty('user-select');
  };

  const snapClass = snapAlign === 'start' ? 'snap-x snap-mandatory' : snapAlign === 'center' ? 'snap-x snap-mandatory' : '';
  const scrollbarClass = customScrollbar ? 'custom-horizontal-scrollbar' : 'no-scrollbar';

  return (
    <div className={`relative w-full max-w-full min-w-0 ${className}`}>
      {/* Top Progress Line Indicator */}
      {showProgressLine && progressLinePosition === 'top' && isOverflowing && (
        <div className={`relative w-full h-[3px] ${trackColor} rounded-full overflow-hidden mb-2.5`}>
          <div
            className={`absolute left-0 top-0 bottom-0 ${activeColor} rounded-full transition-all duration-150 ease-out`}
            style={{ width: `${scrollPercentage}%` }}
            role="progressbar"
            aria-valuenow={Math.round(scrollPercentage)}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      )}

      {/* Main Container Wrapper */}
      <div className="relative group w-full max-w-full min-w-0">
        {/* Floating Scroll Left Button */}
        {showNavigationButtons && isOverflowing && (
          <button
            type="button"
            onClick={handleScrollLeft}
            disabled={!canScrollLeft}
            className={`absolute left-1 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/95 border border-slate-200/90 shadow-md flex items-center justify-center text-slate-700 transition-all duration-200 hover:bg-slate-50 hover:text-teal-600 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-teal-500/20 active:scale-95 disabled:opacity-0 disabled:pointer-events-none disabled:scale-90`}
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
          </button>
        )}

        {/* Scrollable Container */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          className={`w-full max-w-full min-w-0 overflow-x-auto ${scrollbarClass} scroll-smooth ${snapClass} ${
            fadeMask && isOverflowing ? 'scroll-fade-mask' : ''
          } ${containerClassName}`}
          aria-label={ariaLabel}
          role="region"
        >
          {children}
        </div>

        {/* Floating Scroll Right Button */}
        {showNavigationButtons && isOverflowing && (
          <button
            type="button"
            onClick={handleScrollRight}
            disabled={!canScrollRight}
            className={`absolute right-1 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/95 border border-slate-200/90 shadow-md flex items-center justify-center text-slate-700 transition-all duration-200 hover:bg-slate-50 hover:text-teal-600 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-teal-500/20 active:scale-95 disabled:opacity-0 disabled:pointer-events-none disabled:scale-90`}
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        )}
      </div>

      {/* Bottom Progress Line Indicator (Default Position) */}
      {showProgressLine && progressLinePosition === 'bottom' && isOverflowing && (
        <div className={`relative w-full h-[3px] ${trackColor} rounded-full overflow-hidden mt-2.5`}>
          <div
            className={`absolute left-0 top-0 bottom-0 ${activeColor} rounded-full transition-all duration-150 ease-out`}
            style={{ width: `${scrollPercentage}%` }}
            role="progressbar"
            aria-valuenow={Math.round(scrollPercentage)}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      )}
    </div>
  );
};

export default HorizontalScrollTrack;

/**
 * Reusable Scroll Item for smooth snap alignment
 */
export interface HorizontalScrollItemProps {
  children: React.ReactNode;
  className?: string;
  snapAlign?: 'start' | 'center' | 'end';
}

export const HorizontalScrollItem: React.FC<HorizontalScrollItemProps> = ({
  children,
  className = '',
  snapAlign = 'start'
}) => {
  const alignClass = snapAlign === 'start' ? 'snap-start' : snapAlign === 'center' ? 'snap-center' : 'snap-end';
  return (
    <div className={`flex-shrink-0 ${alignClass} ${className}`}>
      {children}
    </div>
  );
};

/**
 * TableScrollWrapper
 * Wraps large clinical data tables with responsive horizontal scrolling,
 * custom thin scrollbars, and pinned identifier column support.
 */
export interface TableScrollWrapperProps {
  children: React.ReactNode;
  className?: string;
  showProgressLine?: boolean;
}

export const TableScrollWrapper: React.FC<TableScrollWrapperProps> = ({
  children,
  className = '',
  showProgressLine = true
}) => {
  return (
    <HorizontalScrollTrack
      showProgressLine={showProgressLine}
      showNavigationButtons={true}
      progressLinePosition="bottom"
      customScrollbar={true}
      fadeMask={false}
      snapAlign="none"
      className={className}
      containerClassName="rounded-xl border border-slate-200/80 shadow-sm bg-white"
    >
      {children}
    </HorizontalScrollTrack>
  );
};

