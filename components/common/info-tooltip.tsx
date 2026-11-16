'use client';

import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle, Info, Sparkles } from 'lucide-react';

interface InfoTooltipProps {
  children?: React.ReactNode;
  title?: string;
  content: React.ReactNode;
  icon?: 'info' | 'help' | 'sparkles' | 'none';
  iconSize?: number;
  iconClassName?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  maxWidthClass?: string;
  badge?: string;
  badgeColor?: 'emerald' | 'amber' | 'indigo' | 'rose' | 'teal' | 'slate';
}

interface TooltipCoords {
  top: number;
  left: number;
  arrowLeft: number;
  arrowTop: number;
  placedSide: 'top' | 'bottom' | 'left' | 'right';
}

export function InfoTooltip({
  children,
  title,
  content,
  icon = 'none',
  iconSize = 13,
  iconClassName = 'text-slate-400 hover:text-slate-600 transition-colors',
  position = 'top',
  maxWidthClass = 'max-w-[calc(100vw-24px)] sm:max-w-sm',
  badge,
  badgeColor = 'teal',
}: InfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<TooltipCoords | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updatePosition = useCallback(() => {
    const triggerEl = containerRef.current;
    const tooltipEl = tooltipRef.current;
    if (!triggerEl || !tooltipEl) return;

    const triggerRect = triggerEl.getBoundingClientRect();
    const tooltipRect = tooltipEl.getBoundingClientRect();
    const vwWidth = window.innerWidth;
    const vwHeight = window.innerHeight;
    const margin = 12;
    const gap = 8;

    const triggerCenterX = triggerRect.left + triggerRect.width / 2;
    const triggerCenterY = triggerRect.top + triggerRect.height / 2;

    let placedSide: 'top' | 'bottom' | 'left' | 'right' = position;

    // On narrow viewports, convert side placements to top/bottom if horizontal space is insufficient
    if (
      (placedSide === 'left' || placedSide === 'right') &&
      vwWidth < tooltipRect.width + triggerRect.width + margin * 2 + gap
    ) {
      placedSide = 'top';
    }

    // Auto-flip vertically or horizontally when overflowing viewport edges
    if (
      placedSide === 'top' &&
      triggerRect.top - tooltipRect.height - gap < margin &&
      vwHeight - triggerRect.bottom - gap >= tooltipRect.height + margin
    ) {
      placedSide = 'bottom';
    } else if (
      placedSide === 'bottom' &&
      triggerRect.bottom + tooltipRect.height + gap > vwHeight - margin &&
      triggerRect.top - gap >= tooltipRect.height + margin
    ) {
      placedSide = 'top';
    } else if (
      placedSide === 'left' &&
      triggerRect.left - tooltipRect.width - gap < margin &&
      vwWidth - triggerRect.right - gap >= tooltipRect.width + margin
    ) {
      placedSide = 'right';
    } else if (
      placedSide === 'right' &&
      triggerRect.right + tooltipRect.width + gap > vwWidth - margin &&
      triggerRect.left - gap >= tooltipRect.width + margin
    ) {
      placedSide = 'left';
    }

    let left = 0;
    let top = 0;
    let arrowLeft = tooltipRect.width / 2;
    let arrowTop = tooltipRect.height / 2;

    if (placedSide === 'top' || placedSide === 'bottom') {
      const idealLeft = triggerCenterX - tooltipRect.width / 2;
      const maxLeft = Math.max(margin, vwWidth - tooltipRect.width - margin);
      left = Math.max(margin, Math.min(idealLeft, maxLeft));

      const rawTop =
        placedSide === 'top'
          ? triggerRect.top - tooltipRect.height - gap
          : triggerRect.bottom + gap;
      const maxTop = Math.max(margin, vwHeight - tooltipRect.height - margin);
      top = Math.max(margin, Math.min(rawTop, maxTop));

      arrowLeft = Math.max(14, Math.min(triggerCenterX - left, tooltipRect.width - 14));
    } else {
      const idealTop = triggerCenterY - tooltipRect.height / 2;
      const maxTop = Math.max(margin, vwHeight - tooltipRect.height - margin);
      top = Math.max(margin, Math.min(idealTop, maxTop));

      const rawLeft =
        placedSide === 'left'
          ? triggerRect.left - tooltipRect.width - gap
          : triggerRect.right + gap;
      const maxLeft = Math.max(margin, vwWidth - tooltipRect.width - margin);
      left = Math.max(margin, Math.min(rawLeft, maxLeft));

      arrowTop = Math.max(14, Math.min(triggerCenterY - top, tooltipRect.height - 14));
    }

    setCoords({
      top: Math.round(top),
      left: Math.round(left),
      arrowLeft: Math.round(arrowLeft),
      arrowTop: Math.round(arrowTop),
      placedSide,
    });
  }, [position]);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  const handleClickToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  };

  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }
    updatePosition();
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      const clickedInTrigger = containerRef.current?.contains(target);
      const clickedInTooltip = tooltipRef.current?.contains(target);
      if (!clickedInTrigger && !clickedInTooltip) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleViewportChange = () => {
      updatePosition();
    };

    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleViewportChange, { passive: true, capture: true });
    window.addEventListener('resize', handleViewportChange, { passive: true });

    return () => {
      document.removeEventListener('click', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleViewportChange, { capture: true });
      window.removeEventListener('resize', handleViewportChange);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const badgeColorMap: Record<string, string> = {
    emerald: 'bg-emerald-950 text-emerald-300 border-emerald-800/80',
    amber: 'bg-amber-950 text-amber-300 border-amber-800/80',
    indigo: 'bg-indigo-950 text-indigo-300 border-indigo-800/80',
    rose: 'bg-rose-950 text-rose-300 border-rose-800/80',
    teal: 'bg-teal-950 text-teal-300 border-teal-800/80',
    slate: 'bg-slate-800 text-slate-300 border-slate-700',
  };

  const renderIcon = () => {
    switch (icon) {
      case 'info':
        return <Info size={iconSize} className={iconClassName} />;
      case 'help':
        return <HelpCircle size={iconSize} className={iconClassName} />;
      case 'sparkles':
        return <Sparkles size={iconSize} className={iconClassName} />;
      default:
        return null;
    }
  };

  const activeSide = coords?.placedSide ?? position;

  const arrowStyle: React.CSSProperties =
    activeSide === 'top' || activeSide === 'bottom'
      ? { left: coords ? `${coords.arrowLeft}px` : '50%', transform: 'translateX(-50%)' }
      : { top: coords ? `${coords.arrowTop}px` : '50%', transform: 'translateY(-50%)' };

  const arrowSideClass = {
    top: 'top-full border-t-slate-900 border-x-transparent border-b-transparent',
    bottom: 'bottom-full border-b-slate-900 border-x-transparent border-t-transparent',
    left: 'left-full border-l-slate-900 border-y-transparent border-r-transparent',
    right: 'right-full border-r-slate-900 border-y-transparent border-l-transparent',
  }[activeSide];

  const popoverNode =
    isOpen && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={tooltipRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={(e) => e.stopPropagation()}
            style={
              coords
                ? { top: `${coords.top}px`, left: `${coords.left}px` }
                : { top: '-9999px', left: '-9999px', visibility: 'hidden' }
            }
            className={`fixed z-70 w-max ${maxWidthClass} max-w-[calc(100vw-24px)] pointer-events-auto transition-opacity duration-150 ${
              coords ? 'opacity-100' : 'opacity-0'
            }`}
            role="tooltip"
          >
            <div className="relative bg-slate-900 text-slate-100 p-3 rounded-xl shadow-2xl border border-slate-700/80 text-xs leading-relaxed text-right break-words backdrop-blur-xs">
              {title && (
                <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-slate-800">
                  <span className="font-bold text-slate-100 text-[12px] flex items-center gap-1.5 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />
                    <span className="truncate">{title}</span>
                  </span>
                  {badge && (
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full border shrink-0 ${
                        badgeColorMap[badgeColor] || badgeColorMap.teal
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                </div>
              )}
              <div className="text-slate-300 font-normal text-[11px] leading-5 space-y-1 break-words">
                {content}
              </div>
              <div
                style={arrowStyle}
                className={`absolute border-4 w-0 h-0 pointer-events-none ${arrowSideClass}`}
              />
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div
      ref={containerRef}
      className="relative inline-flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClickToggle}
    >
      {children}
      {icon !== 'none' && (
        <button
          type="button"
          aria-expanded={isOpen}
          aria-label={title || 'توضيح'}
          className="inline-flex items-center justify-center p-0.5 rounded-full text-slate-400 hover:text-teal-700 hover:bg-slate-100 transition-colors cursor-pointer"
          title={title || 'توضيح'}
        >
          {renderIcon()}
        </button>
      )}
      {popoverNode}
    </div>
  );
}
