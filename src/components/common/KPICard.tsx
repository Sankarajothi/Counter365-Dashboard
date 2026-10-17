import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { KPICardProps } from '../../types/dashboard';

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  change,
  changeType = 'neutral',
  isDateFilterable = true,
  isUnavailable = false,
  unavailableReason,
  icon: Icon,
  onClick,
  size = 'default',
}) => {
  const isXs = size === 'xs';
  const isSm = size === 'sm' || isXs;

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-[#D4621A]/15 p-4 shadow-2xs transition-all ${
        onClick ? 'cursor-pointer hover:border-[#D4621A]/40 hover:shadow-xs' : ''
      }`}
    >
      {/* Top row: Label */}
      <div className={`flex items-center justify-between gap-1.5 ${isXs ? 'mb-0' : isSm ? 'mb-0.5' : 'mb-1'}`}>
        <span
          className={`${
            isXs ? 'text-[9.5px]' : isSm ? 'text-[10px]' : 'text-[11px]'
          } font-bold uppercase tracking-wider text-slate-500 font-mono truncate`}
        >
          {title}
        </span>
        {Icon && <Icon className="w-4 h-4 text-[#D4621A]" />}
      </div>

      {/* Main Metric Value */}
      <div className={isXs ? 'my-0' : isSm ? 'my-0' : 'my-0.5'}>
        {isUnavailable ? (
          <div className="text-xs font-medium text-[#D4621A] bg-[#D4621A]/10 px-2 py-0.5 rounded inline-block">
            Unavailable
          </div>
        ) : (
          <div
            className={`${
              isXs
                ? 'text-base sm:text-[17px]'
                : isSm
                ? 'text-lg sm:text-xl'
                : 'text-2xl sm:text-[28px]'
            } font-black tracking-tight text-slate-900 font-sans tabular-nums leading-tight`}
          >
            {value}
          </div>
        )}
      </div>

      {/* Footer: Subtitle and Trend */}
      <div className={`${isXs ? 'mt-0' : isSm ? 'mt-0.5' : 'mt-1'} flex items-center justify-between gap-1.5 text-xs`}>
        {isUnavailable ? (
          <span className="text-slate-400 text-[9.5px]">
            {unavailableReason || 'Source unavailable'}
          </span>
        ) : (
          <>
            <span className={`text-slate-500 ${isXs ? 'text-[9.5px]' : isSm ? 'text-[10px]' : 'text-[11px]'} truncate`}>
              {subtitle || (isDateFilterable ? 'Filtered period' : 'All-time')}
            </span>

            {change && (
              <div
                className={`inline-flex items-center gap-1 font-semibold ${
                  isXs ? 'text-[9px]' : isSm ? 'text-[10px]' : 'text-[11px]'
                } shrink-0 ${
                  changeType === 'positive'
                    ? 'text-[#D4621A]'
                    : changeType === 'negative'
                    ? 'text-slate-600'
                    : 'text-slate-500'
                }`}
              >
                {changeType === 'positive' && <TrendingUp className="w-2.5 h-2.5 stroke-[2.2]" />}
                {changeType === 'negative' && <TrendingDown className="w-2.5 h-2.5 stroke-[2.2]" />}
                {changeType === 'neutral' && <Minus className="w-2.5 h-2.5 stroke-[2.2]" />}
                <span>{change}</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
