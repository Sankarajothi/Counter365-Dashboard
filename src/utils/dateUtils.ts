import { DateFilterOption, DateRange } from '../types/dashboard';

/**
 * Calculates start and end timestamps based on selected filter option
 */
export function getDateRangeFromOption(
  option: DateFilterOption,
  customStart?: Date | null,
  customEnd?: Date | null
): DateRange {
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

  switch (option) {
    case 'today':
      return {
        startDate: startOfDay(now),
        endDate: endOfDay(now),
        label: 'Today',
      };

    case 'yesterday': {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      return {
        startDate: startOfDay(yesterday),
        endDate: endOfDay(yesterday),
        label: 'Yesterday',
      };
    }

    case 'last_7_days': {
      const start = new Date(now);
      start.setDate(now.getDate() - 6);
      return {
        startDate: startOfDay(start),
        endDate: endOfDay(now),
        label: 'Last 7 Days',
      };
    }

    case 'last_30_days': {
      const start = new Date(now);
      start.setDate(now.getDate() - 29);
      return {
        startDate: startOfDay(start),
        endDate: endOfDay(now),
        label: 'Last 30 Days',
      };
    }

    case 'last_90_days': {
      const start = new Date(now);
      start.setDate(now.getDate() - 89);
      return {
        startDate: startOfDay(start),
        endDate: endOfDay(now),
        label: 'Last 90 Days',
      };
    }

    case 'this_week': {
      const dayOfWeek = now.getDay();
      const diffToMonday = (dayOfWeek + 6) % 7;
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - diffToMonday);
      return {
        startDate: startOfDay(startOfWeek),
        endDate: endOfDay(now),
        label: 'This Week',
      };
    }

    case 'this_month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        startDate: startOfDay(start),
        endDate: endOfDay(now),
        label: 'This Month',
      };
    }

    case 'last_month':
    case 'previous_month': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        startDate: startOfDay(start),
        endDate: endOfDay(end),
        label: 'Last Month',
      };
    }

    case 'this_year': {
      const start = new Date(now.getFullYear(), 0, 1);
      return {
        startDate: startOfDay(start),
        endDate: endOfDay(now),
        label: 'This Year',
      };
    }

    case 'custom':
      return {
        startDate: customStart ? startOfDay(customStart) : null,
        endDate: customEnd ? endOfDay(customEnd) : null,
        label: 'Custom Range',
      };

    case 'all_time':
    default:
      return {
        startDate: null,
        endDate: null,
        label: 'All Time',
      };
  }
}

/**
 * Consistent date formatting: e.g. "25 Sep 2026, 11:42 PM"
 */
export function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return '—';
  }
}

/**
 * Short date formatting: e.g. "25 Sep 2026"
 */
export function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return '—';
  }
}

/**
 * Relative time: e.g. "2 hours ago", "Yesterday"
 */
export function formatRelativeTime(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '—';
    const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 172800) return 'Yesterday';
    return `${Math.floor(diffSec / 86400)}d ago`;
  } catch {
    return '—';
  }
}

/**
 * Filter items by date range against a date field
 */
export function filterByDateRange<T>(
  items: T[],
  dateField: keyof T,
  range: DateRange
): T[] {
  if (!range.startDate && !range.endDate) return items;
  return items.filter((item) => {
    const val =
      item[dateField] ||
      (item as any)['created_at'] ||
      (item as any)['issued_at'] ||
      (item as any)['completed_at'] ||
      (item as any)['paid_at'];
    if (!val) return false;
    const itemDate = val instanceof Date ? val.getTime() : new Date(val).getTime();
    if (isNaN(itemDate)) return false;

    if (range.startDate && itemDate < range.startDate.getTime()) return false;
    if (range.endDate && itemDate > range.endDate.getTime()) return false;
    return true;
  });
}
