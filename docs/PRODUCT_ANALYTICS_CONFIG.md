# Product Analytics Engine Configuration

Configuration file location: `src/config/productAnalyticsConfig.ts`

This file centralizes all domain labels, funnel sequences, scoring weights, and alert thresholds for the **Counter365 / StyleFleet** Product Analytics Engine.

---

## 1. Domain & Terminology Labels

To adapt the analytics engine across different verticals (e.g. Salons, Cafes, Retail) without code refactoring, modify the `labels` object:

```typescript
export const PRODUCT_ANALYTICS_CONFIG = {
  labels: {
    appName: 'Counter365',
    entityName: 'Salon / Merchant',
    entityNamePlural: 'Salons',
    coreActionName: 'Bill / Order',
    coreActionNamePlural: 'Bills',
    catalogItemName: 'Service / Menu Item',
    customerName: 'Customer',
  },
  ...
};
```

---

## 2. Alert Thresholds

Configure the rule triggers for the top warning panel:

* `highDropOffExitRateThreshold: 0.50` (50%): Any screen whose exit rate meets or exceeds 50% triggers a yellow alert in the alert banner.
* `inactiveDaysThreshold: 7`: Merchants with 0 bills or events in the last 7 calendar days are flagged as inactive.
* `stalledOnboardingDaysThreshold: 3`: Salons registered 3+ days ago with no catalog items or orders.

---

## 3. Funnel Steps

All funnels enforce **strict ordered progression**:
1. **User Journey Funnel:** `Registered` &rarr; `Profile completed` &rarr; `Catalog / Menu created` &rarr; `First bill created` &rarr; `Multiple bills (5+)`
2. **Subscription Funnel:** `Viewed pricing` &rarr; `Selected plan` &rarr; `Clicked subscribe` &rarr; `Payment started` &rarr; `Payment success / failed` &rarr; `Subscribed`. Prevents *From Prev %* from ever exceeding 100%.
3. **Core Action Funnel:** `Opened POS / Terminal` &rarr; `Added items to cart` &rarr; `Added customer details` &rarr; `Tendered payment mode` &rarr; `Completed bill & printed`.

---

## 4. Engagement Score Algorithm (0 - 100)

Total engagement score is computed using a balanced 3-factor weighting model:

| Factor | Weight | Scoring Rules |
|---|---|---|
| **Recency** | **35%** | &le; 2 days = 35 pts, &le; 5 days = 25 pts, &le; 10 days = 15 pts, &le; 30 days = 5 pts, > 30 days = 0 pts |
| **Frequency** | **35%** | &ge; 25 events = 35 pts, &ge; 12 events = 25 pts, &ge; 5 events = 15 pts, &ge; 1 event = 5 pts |
| **Core Action Depth** | **30%** | &ge; 10 completed bills = 30 pts, &ge; 5 bills = 20 pts, &ge; 1 bill = 10 pts, 0 bills = 0 pts |

### Score Buckets:
* **Highly Engaged:** 70 – 100
* **Moderately Engaged:** 40 – 69
* **At Risk:** 15 – 39
* **Inactive:** 0 – 14

---

## 5. Cache Configuration

* `cacheTTLMs: 300000` (5 minutes).
* Clicking the **Refresh** button in the UI or querying `GET /api/admin/product-analytics?refresh=true` immediately bypasses the cache and recomputes directly from the live database.
