export interface Shop {
  id: string;
  name: string;
  shop_type: string;
  phone: string;
  email: string | null;
  address: string | null;
  city: string;
  state: string;
  country: string;
  currency_code: string;
  timezone: string;
  gst_enabled: boolean;
  gst_rate: number;
  gst_number: string | null;
  round_off_enabled: boolean;
  daily_backup_enabled: boolean;
  printer_enabled: boolean;
  printer_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  phone: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShopMember {
  id: string;
  shop_id: string;
  user_id: string;
  role: 'Owner' | 'Supervisor' | 'Biller' | string;
  is_active: boolean;
  joined_at: string;
  created_at: string;
  updated_at: string;
}

export interface Bill {
  id: string;
  shop_id: string;
  bill_number: string;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  status: 'draft' | 'completed' | 'cancelled' | 'refunded' | string;
  subtotal: number;
  gst_rate: number;
  gst_amount: number;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  payment_mode: string;
  client_operation_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface BillItem {
  id: string;
  shop_id: string;
  bill_id: string;
  menu_item_id: string | null;
  item_name: string;
  is_half: boolean;
  unit_price: number;
  quantity: number;
  line_total: number;
  created_at: string;
}

export interface Payment {
  id: string;
  shop_id: string;
  bill_id: string;
  payment_method: string;
  amount: number;
  status: 'successful' | 'pending' | 'failed' | 'refunded' | string;
  client_operation_id: string | null;
  paid_at: string;
  created_by: string | null;
  created_at: string;
}

export interface MenuItem {
  id: string;
  shop_id: string;
  category_id: string;
  name: string;
  price: number;
  half_price: number | null;
  has_half: boolean;
  is_favorite: boolean;
  is_available: boolean;
  image_url: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface MenuCategory {
  id: string;
  shop_id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  shop_id: string;
  description: string;
  amount: number;
  expense_date: string;
  vendor_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  shop_id: string;
  plan: 'free' | 'pro' | string;
  plan_name?: string;
  status: 'active' | 'trialing' | 'past_due' | 'cancelled' | 'expired' | string;
  amount: number;
  interval: string;
  currency?: string;
  payment_method?: string;
  payment_reference?: string | null;
  cashfree_order_id?: string | null;
  duration_months?: number;
  current_period_start: string;
  current_period_end: string;
  subscription_start_at?: string | null;
  subscription_end_at?: string | null;
  activated_by_admin_id?: string | null;
  admin_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  shop_id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  shop_id: string;
  actor_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata: any;
  created_at: string;
}

export interface AccountDeletion {
  id: string;
  user_id: string;
  shop_id: string | null;
  shop_name: string | null;
  owner_name: string | null;
  phone: string | null;
  reason: string | null;
  feedback: string | null;
  deleted_at: string;
  metadata: Record<string, any> | null;
}
