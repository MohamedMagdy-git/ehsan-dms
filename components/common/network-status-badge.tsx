'use client';

import React from 'react';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { CloudUpload } from 'lucide-react';

interface NetworkStatusBadgeProps {
  className?: string;
  onTriggerSync?: () => void;
  isSyncing?: boolean;
}

export function NetworkStatusBadge({
  className = '',
  onTriggerSync,
  isSyncing = false,
}: NetworkStatusBadgeProps) {
  const { isOnline, syncQueueCount, mounted } = useOnlineStatus();

  // In normal online state with no pending items, keep header clean
  if (!mounted || (isOnline && syncQueueCount === 0)) {
    return null;
  }

  // If there are offline forms pending sync, show clear sync action button
  if (syncQueueCount > 0) {
    return (
      <div className={`inline-flex items-center gap-1.5 text-xs ${className}`} suppressHydrationWarning>
        <button
          type="button"
          onClick={onTriggerSync}
          disabled={isSyncing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#005756] hover:bg-[#004241] text-white text-[11px] font-semibold shadow-xs shadow-teal-950/15 transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer"
          title="يوجد استمارات وبحوث ميدانية مسجلة محلياً بانتظار المزامنة مع الخادم"
        >
          <CloudUpload size={13} className={isSyncing ? 'animate-bounce text-teal-200' : 'text-teal-200'} />
          <span>{isSyncing ? 'جاري المزامنة...' : `مزامنة المسودات (${syncQueueCount})`}</span>
        </button>
      </div>
    );
  }

  // When offline without queue, the floating slide-down banner handles notifications
  return null;
}
