export interface Profile {
  id: string;
  full_name?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  avatar_path?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Shop {
  id: string;
  name: string;
  shop_type?: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  currency_code?: string;
  timezone?: string;
  gst_enabled?: boolean;
  gst_rate?: number;
  gst_number?: string | null;
  gstin?: string | null;
  round_off_enabled?: boolean;
  daily_backup_enabled?: boolean;
  printer_enabled?: boolean;
  printer_name?: string | null;
  is_active?: boolean;
  owner_profile_id?: string | null;
  logo_path?: string | null;
  pin_code?: string | null;
  accent_color?: string;
  invoice_prefix?: string;
  free_sales_limit?: number | null;
  created_at: string;
  updated_at?: string;

  // Joined relational fields
  owner_profile?: Profile | null;
  staff_count?: number;
  customer_count?: number;
  bill_count?: number;
  appointment_count?: number;
  duplicate_count?: number;
  duplicate_ids?: string[];
}

export interface ShopMember {
  id: string;
  shop_id: string;
  user_id?: string;
  profile_id?: string;
  role: 'Owner' | 'Supervisor' | 'Biller' | 'owner' | 'manager' | 'staff' | string;
  is_active: boolean;
  joined_at?: string;
  created_at: string;
  updated_at?: string;
  profile?: Profile;
  shop?: Shop;
}

export interface StylistPermissions {
  customers: boolean;
  sales: boolean;
  appointments: boolean;
  expenses: boolean;
  reports: boolean;
  team: boolean;
  reminders: boolean;
  profile: boolean;
}

export const DEFAULT_STYLIST_PERMISSIONS: StylistPermissions = {
  customers: true,
  sales: true,
  appointments: true,
  expenses: false,
  reports: false,
  team: false,
  reminders: true,
  profile: false,
};

export interface Staff {
  id: string;
  shop_id: string;
  profile_id?: string | null;
  name: string;
  role: string;
  phone?: string | null;
  is_active: boolean;
  target_amount_minor?: number;
  permissions?: StylistPermissions;
  invitation_status?: 'not_invited' | 'invited' | 'active' | string;
  invited_at?: string | null;
  created_at: string;
  updated_at?: string;
  shop?: Shop;
}

export interface ServiceCategory {
  id: string;
  shop_id: string;
  name: string;
  sort_order?: number;
  is_active?: boolean;
  created_at?: string;
}

export interface Service {
  id: string;
  shop_id: string;
  category_id?: string | null;
  name: string;
  price_minor?: number;
  duration_minutes?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  category?: ServiceCategory;
}

export interface Customer {
  id: string;
  shop_id: string;
  name: string;
  phone?: string;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  preferred_staff_id?: string | null;
  is_starred?: boolean;
  is_active?: boolean;
  created_at: string;
  updated_at?: string;
  shop?: Shop;
}

export interface BillItem {
  id: string;
  shop_id?: string;
  bill_id: string;
  menu_item_id?: string | null;
  service_id?: string | null;
  item_name?: string;
  service_name_snapshot?: string;
  is_half?: boolean;
  unit_price?: number;
  unit_price_minor?: number;
  quantity: number;
  discount_minor?: number;
  tax_minor?: number;
  line_total?: number;
  line_total_minor?: number;
  staff_id?: string | null;
  created_at?: string;
}

export interface Bill {
  id: string;
  shop_id: string;
  bill_number?: string;
  invoice_number?: string;
  customer_id?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  staff_id?: string | null;
  status: 'draft' | 'completed' | 'cancelled' | 'refunded' | 'pending' | 'paid' | 'deleted' | string;
  subtotal?: number;
  subtotal_minor?: number;
  discount_minor?: number;
  gst_rate?: number;
  gst_amount?: number;
  tax_minor?: number;
  total_amount?: number;
  total_minor?: number;
  paid_amount?: number;
  pending_amount?: number;
  due_amount_minor?: number | null;
  payment_mode?: string;
  notes?: string | null;
  client_operation_id?: string | null;
  issued_at?: string;
  completed_at?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at?: string;
  shop?: Shop;
  customer?: Customer;
  bill_items?: BillItem[];
}

export interface Payment {
  id: string;
  shop_id: string;
  bill_id?: string;
  payment_method?: string;
  method?: string;
  amount?: number;
  amount_minor?: number;
  status: 'successful' | 'pending' | 'failed' | 'refunded' | 'completed' | string;
  client_operation_id?: string | null;
  reference?: string | null;
  paid_at?: string;
  created_by?: string | null;
  created_at: string;
  shop?: Shop;
  bill?: Bill;
}

export interface MenuItem {
  id: string;
  shop_id: string;
  category_id: string;
  name: string;
  price: number;
  half_price?: number | null;
  has_half?: boolean;
  is_favorite?: boolean;
  is_available?: boolean;
  image_url?: string | null;
  sort_order?: number;
  created_at: string;
  updated_at?: string;
}

export interface MenuCategory {
  id: string;
  shop_id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface ExpenseCategory {
  id: string;
  shop_id?: string | null;
  name: string;
  is_active: boolean;
}

export interface Expense {
  id: string;
  shop_id: string;
  category_id?: string | null;
  description?: string;
  note?: string;
  amount?: number;
  amount_minor?: number;
  payment_method?: string;
  expense_date?: string;
  vendor_id?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at?: string;
  category?: ExpenseCategory;
}

export interface Subscription {
  id: string;
  shop_id: string;
  plan: 'free' | 'pro' | string;
  plan_name?: string;
  status: 'active' | 'trialing' | 'past_due' | 'cancelled' | 'expired' | string;
  amount: number;
  amount_minor?: number;
  interval?: string;
  currency?: string;
  payment_method?: string;
  payment_reference?: string | null;
  cashfree_order_id?: string | null;
  duration_months?: number;
  current_period_start?: string;
  current_period_end?: string;
  subscription_start_at?: string | null;
  subscription_end_at?: string | null;
  activated_by_admin_id?: string | null;
  admin_notes?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Appointment {
  id: string;
  shop_id: string;
  customer_id?: string | null;
  staff_id?: string | null;
  service_id?: string | null;
  starts_at: string;
  duration_minutes?: number;
  status?: 'Not confirmed' | 'Confirmed' | 'Done' | 'Cancelled' | string;
  notes?: string | null;
  confirmation_sent_at?: string | null;
  created_at: string;
  updated_at?: string;
  shop?: Shop;
  customer?: Customer;
  staff?: Staff;
  service?: Service;
}

export interface ShopSettings {
  shop_id: string;
  appointment_reminder_enabled?: boolean;
  payment_followup_enabled?: boolean;
  daily_closing_enabled?: boolean;
  daily_closing_time?: string;
  appointment_reminder_minutes?: number;
  payment_followup_interval_days?: number;
  updated_at?: string;
}

export interface SupportMessageAnswer {
  id: string;
  shop_id: string;
  message_id?: string | null;
  admin_name?: string | null;
  answer: string;
  is_read: boolean;
  created_at: string;
}

export interface SupportMessage {
  id: string;
  shop_id?: string | null;
  user_id?: string | null;
  message: string;
  contact_info?: string | null;
  status: 'open' | 'in_progress' | 'resolved' | 'closed' | string;
  created_at: string;
  updated_at?: string;
  shop?: Shop;
  shop_name?: string;
  profile?: Profile;
  answers?: SupportMessageAnswer[];
}

export interface AccountDeletion {
  id: string;
  user_id?: string;
  shop_id?: string | null;
  shop_name?: string | null;
  owner_name?: string | null;
  phone?: string | null;
  reason?: string | null;
  feedback?: string | null;
  status?: 'pending' | 'processed' | 'cancelled' | string;
  deleted_at?: string | null;
  created_at: string;
  metadata?: Record<string, any> | null;
}

export interface AuditLog {
  id: string;
  shop_id: string;
  actor_profile_id?: string | null;
  actor_user_id?: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface TelemetryRecord {
  id: string;
  shop_id?: string | null;
  device_id: string;
  device_name?: string | null;
  platform: string;
  os_name?: string | null;
  os_version?: string | null;
  app_version: string;
  battery_level?: number | null;
  is_charging?: boolean | null;
  network_type?: string | null;
  screen_resolution?: string | null;
  memory_usage?: Record<string, any> | null;
  metadata?: Record<string, any> | null;
  recorded_at?: string | null;
  created_at: string;
  shop?: Shop;
}

export interface SystemHealthRecord {
  id: string;
  shop_id?: string | null;
  component: string;
  status: string;
  details?: any;
  latency_ms?: number | null;
  error_count?: number | null;
  timestamp?: string | null;
  created_at: string;
  shop?: Shop;
}

export interface SystemLogRecord {
  id: string;
  shop_id?: string | null;
  device_id?: string | null;
  level: 'info' | 'warn' | 'error' | 'fatal' | 'debug' | string;
  tag: string;
  message: string;
  stack_trace?: string | null;
  device_info?: Record<string, any> | null;
  context?: Record<string, any> | null;
  created_at: string;
  shop?: Shop;
}
