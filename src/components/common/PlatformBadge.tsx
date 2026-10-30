'use client';

import React from 'react';
import { Apple } from 'lucide-react';
import {
  isIosPlatform,
  setShopPlatformOverride,
  PlatformType,
} from '@/utils/platformTracker';

interface PlatformBadgeProps {
  platform: string;
  shopId?: string;
  size?: 'sm' | 'md';
  allowToggle?: boolean;
  className?: string;
  onPlatformChange?: (newPlatform: PlatformType) => void;
}

export const PlatformBadge: React.FC<PlatformBadgeProps> = ({
  platform,
  shopId,
  size = 'md',
  allowToggle = false,
  className = '',
  onPlatformChange,
}) => {
  const isIos = isIosPlatform(platform);

  const handleToggle = (e: React.MouseEvent) => {
    if (!allowToggle || !shopId) return;
    e.stopPropagation();
    const nextPlatform: PlatformType = isIos ? 'Android' : 'iOS';
    setShopPlatformOverride(shopId, nextPlatform);
    if (onPlatformChange) {
      onPlatformChange(nextPlatform);
    }
  };

  const isSmall = size === 'sm';

  return (
    <div
      onClick={allowToggle && shopId ? handleToggle : undefined}
      title={
        allowToggle && shopId
          ? `Click to toggle platform (Current: ${isIos ? 'iOS' : 'Android'})`
          : undefined
      }
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md font-semibold transition-all ${
        allowToggle && shopId ? 'cursor-pointer hover:opacity-85 select-none' : ''
      } ${
        isSmall ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1'
      } ${
        isIos
          ? 'bg-slate-900 text-white border border-slate-800 shadow-2xs'
          : 'bg-[#FFF7ED] text-[#C2410C] border border-[#FFEDD5]'
      } ${className}`}
    >
      {isIos ? (
        <Apple className={`${isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-white fill-current shrink-0`} />
      ) : (
        <svg
          className={`${isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-[#D4621A] fill-current shrink-0`}
          viewBox="0 0 24 24"
        >
          <path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v6c0 .83.67 1.5 1.5 1.5S5 16.33 5 15.5v-6C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v6c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-6c0-.83-.67-1.5-1.5-1.5zm-4.97-5.84l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48C13.85 1.23 12.95 1 12 1c-.96 0-1.86.23-2.66.63L7.85.15c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.31 1.31C6.97 3.26 6 5.01 6 7h12c0-1.99-.97-3.75-2.47-4.84zM10 5H9V4h1v1zm5 0h-1V4h1v1z" />
        </svg>
      )}
      <span>{isIos ? 'iOS' : 'Android'}</span>
      {allowToggle && shopId && (
        <span className="text-[9px] opacity-70 underline ml-0.5 font-normal">switch</span>
      )}
    </div>
  );
};
