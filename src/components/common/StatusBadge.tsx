import React from 'react';

interface StatusBadgeProps {
  status: string | null | undefined;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
  if (!status) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
        Unknown
      </span>
    );
  }

  const normalized = status.toLowerCase().trim();

  let styles = 'bg-slate-100 text-slate-700 border-slate-200';

  if (['active', 'completed', 'paid', 'resolved', 'processed', 'done', 'confirmed', 'live', 'pro', 'successful'].includes(normalized)) {
    styles = 'bg-teal-600 text-white border-teal-700 font-semibold';
  } else if (['pending', 'in_progress', 'open', 'not confirmed', 'trial', 'trialing'].includes(normalized)) {
    styles = 'bg-teal-50 text-teal-800 border-teal-200 font-semibold';
  } else if (['cancelled', 'closed', 'expired', 'failed', 'deleted', 'suspended', 'churned', 'refunded'].includes(normalized)) {
    styles = 'bg-red-50 text-red-800 border-red-200';
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center rounded-md border capitalize font-medium transition-colors ${styles} ${sizeClasses}`}>
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-70" />
      {status}
    </span>
  );
};
