# Event Tracking Instrumentation Guide

This guide defines the client telemetry and product analytics events for **Counter365 / StyleFleet** (Mobile POS, Tablet, and Web).

---

## 1. Events Database Schema

Events are ingested into the Supabase `public.events` table:

```sql
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  shop_id UUID REFERENCES public.shops(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  screen TEXT,
  element TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  city TEXT,
  state TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 2. Standard Client Instrumentation Helper

### TypeScript / JavaScript (React Native / Web):

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function trackEvent(
  eventName: string,
  properties?: {
    screen?: string;
    element?: string;
    shopId?: string;
    userId?: string;
    metadata?: Record<string, any>;
    city?: string;
    state?: string;
  }
) {
  try {
    await supabase.from('events').insert({
      event_name: eventName,
      screen: properties?.screen,
      element: properties?.element,
      shop_id: properties?.shopId,
      user_id: properties?.userId,
      metadata: properties?.metadata || {},
      city: properties?.city,
      state: properties?.state,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('[Analytics] Failed to send telemetry event:', error);
  }
}
```

---

## 3. Mandatory Telemetry Events

### A. Lifecycle & Screen Navigation
| Event Name | Screen | Element | Description & Metadata |
|---|---|---|---|
| `app_open` | `splash` | — | Fired on cold or warm app launch. Metadata: `{ platform: 'android' \| 'ios', version: '1.2.0' }` |
| `screen_view` | `<screen_name>` | — | Fired when screen mounts or comes into focus. Metadata: `{ route: '/pos' }` |
| `screen_exit` | `<screen_name>` | — | Fired when navigating away or unmounting. Metadata: `{ duration_seconds: 45 }` |
| `scroll_depth` | `<screen_name>` | — | Fired when scroll milestone reached: `25%`, `50%`, `75%`, `100%`. Metadata: `{ depth_pct: 75 }` |
| `tap_zone` | `<screen_name>` | `<element_id>` | Fired on interactive clicks / taps. Metadata: `{ repeat_count: 1 }` |

### B. Core POS Billing Journey (Core Action Funnel)
| Event Name | Screen | Element | Description & Metadata |
|---|---|---|---|
| `pos_opened` | `pos_terminal` | — | User opens the POS billing screen. |
| `item_added` | `pos_terminal` | `service_tile` | User adds an item/service to the current cart. Metadata: `{ item_id, price }` |
| `customer_assigned` | `pos_terminal` | `client_input` | Phone or name attached to bill. Metadata: `{ customer_id, is_new: true }` |
| `payment_tendered` | `pos_terminal` | `tender_btn` | Payment mode selected: `Cash`, `UPI`, `Card`. Metadata: `{ mode: 'upi', amount: 450 }` |
| `bill_completed` | `pos_terminal` | `checkout_btn` | Transaction finalized and bill stored. Metadata: `{ bill_id, total: 450, printer_status: 'ok' }` |

### C. Subscription & Upgrade Flow (Subscription Funnel)
| Event Name | Screen | Element | Description & Metadata |
|---|---|---|---|
| `pricing_viewed` | `pricing_plans` | — | User views subscription plans screen or quota modal. |
| `plan_selected` | `pricing_plans` | `plan_card` | User clicks on `Pro Monthly` or `Pro Annual`. Metadata: `{ plan: 'pro', interval: 'monthly' }` |
| `subscribe_clicked` | `pricing_plans` | `subscribe_cta` | User clicks checkout / proceed to pay button. |
| `payment_started` | `checkout` | `gateway` | Razorpay / Stripe gateway initialized. Metadata: `{ gateway: 'razorpay' }` |
| `payment_success` | `checkout` | — | Payment confirmed by gateway callback. Metadata: `{ transaction_id, amount: 999 }` |
| `payment_failed` | `checkout` | — | Payment declined or cancelled. Metadata: `{ error_code, reason: 'insufficient_funds' }` |

### D. Setup & Catalog Events (User Journey Funnel)
| Event Name | Screen | Element | Description & Metadata |
|---|---|---|---|
| `catalog_item_added` | `catalog_menu` | `save_btn` | Salon owner adds first or new service/item. Metadata: `{ name: 'Hair Cut', price: 150 }` |
| `printer_connected` | `shop_settings` | `bt_connect` | Bluetooth thermal printer paired. Metadata: `{ printer_name: 'POS-58' }` |
