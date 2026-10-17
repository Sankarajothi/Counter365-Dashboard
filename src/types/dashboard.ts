export type DateFilterOption =
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'last_30_days'
  | 'last_90_days'
  | 'this_month'
  | 'previous_month'
  | 'this_year'
  | 'all_time'
  | 'custom';

export interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
  label: string;
}

export type NavView =
  | 'dashboard'
  | 'daily_user_metrics'
  | 'daily_bills'
  | 'revenue_trend'
  | 'overview'
  | 'customer_tracking'
  | 'incomplete_signups'
  | 'account_deletions'
  | 'app_telemetry'
  | 'diagnostic_logs'
  | 'platform_audit'
  | 'user_details'
  | 'purchases'
  | 'system_health'
  | 'reports_bi'
  | 'support_messages'
  | 'subscription_plans'
  | 'salons_360'
  | 'staff_access'
  | 'geography'
  | 'privacy'
  | 'product_analytics';

export interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  isDateFilterable?: boolean;
  isUnavailable?: boolean;
  unavailableReason?: string;
  icon?: any;
  trendData?: number[];
  onClick?: () => void;
  tone?: 'revenue' | 'usage' | 'brand' | 'signup' | 'conversion' | 'trial' | 'neutral' | 'order-good' | 'order-warn' | 'order-risk';
  size?: 'default' | 'sm' | 'xs';
}
