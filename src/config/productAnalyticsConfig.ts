/**
 * Product Analytics Engine Configuration for Counter365 / StyleFleet
 * Centralizes thresholds, scoring weights, funnel definitions, and configurable domain labels.
 */

export interface FunnelStepConfig {
  id: string;
  label: string;
  description?: string;
}

export interface EngagementBucketConfig {
  id: 'highly_engaged' | 'moderately_engaged' | 'at_risk' | 'inactive';
  label: string;
  minScore: number;
  maxScore: number;
  badgeColor: string;
  barColor: string;
}

export const PRODUCT_ANALYTICS_CONFIG = {
  // Domain & Terminology Labels
  labels: {
    appName: 'Counter365',
    entityName: 'Salon / Merchant',
    entityNamePlural: 'Salons',
    coreActionName: 'Bill / Order',
    coreActionNamePlural: 'Bills',
    catalogItemName: 'Service / Menu Item',
    customerName: 'Customer',
  },

  // Alert Thresholds
  alerts: {
    // Screen exit rate threshold triggering high drop-off warning (e.g. 50%)
    highDropOffExitRateThreshold: 0.50,
    // Days of zero activity triggering an inactivity warning
    inactiveDaysThreshold: 7,
    // Days since registration without completing a core action
    stalledOnboardingDaysThreshold: 3,
  },

  // User Journey Funnel Steps
  userJourneyFunnel: [
    { id: 'registered', label: 'Registered' },
    { id: 'profile_completed', label: 'Profile completed' },
    { id: 'catalog_created', label: 'Catalog / Menu created' },
    { id: 'first_core_action', label: 'First bill created' },
    { id: 'multiple_core_actions', label: 'Multiple bills (5+)' },
  ] as FunnelStepConfig[],

  // Subscription Funnel Steps (strict ordering enforced)
  subscriptionFunnel: [
    { id: 'viewed_pricing', label: 'Viewed pricing' },
    { id: 'selected_plan', label: 'Selected plan' },
    { id: 'clicked_subscribe', label: 'Clicked subscribe' },
    { id: 'payment_started', label: 'Payment started' },
    { id: 'payment_processed', label: 'Payment success / failed' },
    { id: 'subscribed', label: 'Subscribed' },
  ] as FunnelStepConfig[],

  // Core Action Funnel Steps (POS Billing Journey)
  coreActionFunnel: [
    { id: 'pos_opened', label: 'Opened POS / Terminal' },
    { id: 'items_added', label: 'Added items to cart' },
    { id: 'customer_selected', label: 'Added customer details' },
    { id: 'payment_mode_tendered', label: 'Tendered payment mode' },
    { id: 'bill_completed', label: 'Completed bill & printed' },
  ] as FunnelStepConfig[],

  // Engagement Score Weights (Must sum to 100)
  engagementScoring: {
    weights: {
      recency: 35, // Days since last billing or app event
      frequency: 35, // Total volume of bills/events in the last 30 days
      coreActionDepth: 30, // Volume of completed orders/bills
    },
    recencyRules: [
      { maxDays: 2, score: 35 },
      { maxDays: 5, score: 25 },
      { maxDays: 10, score: 15 },
      { maxDays: 30, score: 5 },
      { maxDays: Infinity, score: 0 },
    ],
    frequencyRules: [
      { minEvents: 25, score: 35 },
      { minEvents: 12, score: 25 },
      { minEvents: 5, score: 15 },
      { minEvents: 1, score: 5 },
      { minEvents: 0, score: 0 },
    ],
    coreActionRules: [
      { minActions: 10, score: 30 },
      { minActions: 5, score: 20 },
      { minActions: 1, score: 10 },
      { minActions: 0, score: 0 },
    ],
    buckets: [
      {
        id: 'highly_engaged',
        label: 'Highly engaged',
        minScore: 70,
        maxScore: 100,
        badgeColor: 'text-[#D4621A] bg-[#F8F3F0] border-[#D4621A]/25',
        barColor: 'bg-[#D4621A]',
      },
      {
        id: 'moderately_engaged',
        label: 'Moderately engaged',
        minScore: 40,
        maxScore: 69,
        badgeColor: 'text-[#D4621A] bg-[#F8F3F0] border-blue-200',
        barColor: 'bg-[#F8F3F0]0',
      },
      {
        id: 'at_risk',
        label: 'At risk',
        minScore: 15,
        maxScore: 39,
        badgeColor: 'text-amber-700 bg-amber-50 border-amber-200',
        barColor: 'bg-amber-500',
      },
      {
        id: 'inactive',
        label: 'Inactive',
        minScore: 0,
        maxScore: 14,
        badgeColor: 'text-rose-700 bg-rose-50 border-rose-200',
        barColor: 'bg-rose-500',
      },
    ] as EngagementBucketConfig[],
  },

  // Known App Screens for Screen Analytics & Scroll Tracking
  trackedScreens: [
    { id: 'pos_terminal', name: 'POS Quick Billing Terminal' },
    { id: 'catalog_menu', name: 'Catalog & Services Manager' },
    { id: 'orders_history', name: 'Daily Bills & Invoice History' },
    { id: 'customers_directory', name: 'Customer Database' },
    { id: 'pricing_plans', name: 'Subscription & Pro Plans' },
    { id: 'reports_dashboard', name: 'Daily Reports & Sales' },
    { id: 'shop_settings', name: 'Salon Settings & Printers' },
  ],

  // Cache Duration (5 minutes)
  cacheTTLMs: 5 * 60 * 1000,
};
