'use client';

import React, { useState, useRef, useEffect } from 'react';
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

export function InfoTooltip({
  children,
  title,
  content,
  icon = 'none',
  iconSize = 13,
  iconClassName = 'text-slate-400 hover:text-slate-600 transition-colors',
  position = 'top',
  maxWidthClass = 'max-w-xs sm:max-w-sm',
  badge,
  badgeColor = 'teal',
}: InfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('click', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('click', handleOutsideClick);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isOpen]);

  const badgeColorMap: Record<string, string> = {
    emerald: 'bg-emerald-950 text-emerald-300 border-emerald-800/80',
    amber: 'bg-amber-950 text-amber-300 border-amber-800/80',
    indigo: 'bg-indigo-950 text-indigo-300 border-indigo-800/80',
    rose: 'bg-rose-950 text-rose-300 border-rose-800/80',
    teal: 'bg-teal-950 text-teal-300 border-teal-800/80',
    slate: 'bg-slate-800 text-slate-300 border-slate-700',
  };

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-slate-900 border-x-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-slate-900 border-x-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-slate-900 border-y-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-slate-900 border-y-transparent border-l-transparent',
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

  return (
    <div
      ref={containerRef}
      className="relative inline-flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClickToggle}
      role="tooltip"
    >
      {children}
      {icon !== 'none' && (
        <span
          className="inline-flex items-center justify-center p-0.5 rounded-full text-slate-400 hover:text-teal-700 hover:bg-slate-100 transition-colors cursor-pointer"
          title={title || "توضيح"}
        >
          {renderIcon()}
        </span>
      )}

      {/* Animated Popover Tooltip */}
      {isOpen && (
        <div
          className={`absolute ${positionClasses[position]} z-50 w-max ${maxWidthClass} pointer-events-auto transition-all duration-200 animate-in fade-in zoom-in-95`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-slate-900 text-slate-100 p-3 rounded-xl shadow-2xl border border-slate-700/80 text-xs leading-relaxed text-right backdrop-blur-xs">
            {title && (
              <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-slate-800">
                <span className="font-bold text-slate-100 text-[12px] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
                  {title}
                </span>
                {badge && (
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${badgeColorMap[badgeColor] || badgeColorMap.teal}`}
                  >
                    {badge}
                  </span>
                )}
              </div>
            )}
            <div className="text-slate-300 font-normal text-[11px] leading-5 space-y-1">
              {content}
            </div>
            {/* Arrow */}
            <div
              className={`absolute border-4 w-0 h-0 pointer-events-none ${arrowClasses[position]}`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
