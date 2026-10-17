import React from 'react';

interface StatusBadgeProps {
  status: string | null | undefined;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
  if (!status) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#F8F3F0] text-slate-600 border border-slate-200">
        Unknown
      </span>
    );
  }

  const normalized = status.toLowerCase().trim();

  let styles = 'bg-[#F8F3F0] text-slate-800 border-[#D4621A]/20';

  if (['active', 'completed', 'paid', 'resolved', 'processed', 'done', 'confirmed', 'live', 'pro', 'successful'].includes(normalized)) {
    styles = 'bg-[#D4621A] text-white border-[#D4621A] font-semibold';
  } else if (['pending', 'in_progress', 'open', 'not confirmed', 'trial', 'trialing'].includes(normalized)) {
    styles = 'bg-[#D4621A]/10 text-[#D4621A] border-[#D4621A]/25 font-semibold';
  } else if (['cancelled', 'closed', 'expired', 'failed', 'deleted', 'suspended', 'churned', 'refunded'].includes(normalized)) {
    styles = 'bg-[#F8F3F0] text-slate-600 border-slate-300';
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center rounded-md border capitalize font-medium transition-colors ${styles} ${sizeClasses}`}>
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-70" />
      {status}
    </span>
  );
};
