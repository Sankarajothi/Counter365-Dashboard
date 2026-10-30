import { Shop, Bill, TelemetryRecord } from '@/types/database';

export type PlatformType = 'iOS' | 'Android';

const OVERRIDE_STORAGE_PREFIX = 'counter365_platform_override_';

/**
 * Check if a platform string represents iOS / Apple
 */
export function isIosPlatform(platform?: string | null): boolean {
  if (!platform) return false;
  const p = platform.toLowerCase();
  return (
    p.includes('ios') ||
    p.includes('apple') ||
    p.includes('iphone') ||
    p.includes('ipad') ||
    p.includes('ipod') ||
    p.includes('darwin') ||
    p.includes('safari mobile')
  );
}

/**
 * Check if a platform string represents Android
 */
export function isAndroidPlatform(platform?: string | null): boolean {
  if (!platform) return false;
  const p = platform.toLowerCase();
  return p.includes('android');
}

/**
 * Retrieve admin persistent override for a shop if set
 */
export function getShopPlatformOverride(shopId: string): PlatformType | null {
  if (typeof window === 'undefined') return null;
  try {
    const val = localStorage.getItem(`${OVERRIDE_STORAGE_PREFIX}${shopId}`);
    if (val === 'iOS' || val === 'Android') {
      return val;
    }
  } catch {
    // localStorage might be unavailable
  }
  return null;
}

/**
 * Persist an admin platform override for a shop
 */
export function setShopPlatformOverride(shopId: string, platform: PlatformType): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${OVERRIDE_STORAGE_PREFIX}${shopId}`, platform);
    // Dispatch a custom window event so all open views update reactively
    window.dispatchEvent(
      new CustomEvent('counter365_platform_changed', {
        detail: { shopId, platform },
      })
    );
  } catch (e) {
    console.warn('Failed to save platform override in localStorage', e);
  }
}

/**
 * Detect the platform used by a shop based on:
 * 1. Admin local override (for testing or manual assignment)
 * 2. Shop object properties (shop.platform, shop.device_os, shop.metadata)
 * 3. Associated Telemetry records
 * 4. Associated Audit logs (metadata.platform, metadata.device, metadata.os)
 * 5. Associated Bills metadata
 * 6. Fallback: 'Android'
 */
export function detectShopPlatform(
  shop: Shop,
  context?: {
    bills?: Bill[];
    auditLogs?: Array<{ shop_id?: string; metadata?: any }>;
    telemetry?: TelemetryRecord[];
  }
): PlatformType {
  if (!shop) return 'Android';

  // 1. Check persistent override
  const override = getShopPlatformOverride(shop.id);
  if (override) return override;

  // 2. Direct property on shop
  const directPlatform =
    (shop as any).platform ||
    (shop as any).device_os ||
    (shop as any).os ||
    (shop as any).client_platform;

  if (directPlatform) {
    if (isIosPlatform(directPlatform)) return 'iOS';
    if (isAndroidPlatform(directPlatform)) return 'Android';
  }

  // 2b. Shop metadata if present
  const shopMeta = (shop as any).metadata;
  if (shopMeta && typeof shopMeta === 'object') {
    const metaPlatform = shopMeta.platform || shopMeta.os || shopMeta.device_os;
    if (metaPlatform) {
      if (isIosPlatform(metaPlatform)) return 'iOS';
      if (isAndroidPlatform(metaPlatform)) return 'Android';
    }
  }

  // 3. Telemetry records
  if (context?.telemetry && context.telemetry.length > 0) {
    const shopTelemetry = context.telemetry.filter((t) => t.shop_id === shop.id);
    for (const t of shopTelemetry) {
      if (isIosPlatform(t.platform) || isIosPlatform(t.os_name)) return 'iOS';
      if (isAndroidPlatform(t.platform) || isAndroidPlatform(t.os_name)) return 'Android';
    }
  }

  // 4. Audit logs associated with this shop
  if (context?.auditLogs && context.auditLogs.length > 0) {
    const shopLogs = context.auditLogs.filter((l) => l.shop_id === shop.id);
    for (const log of shopLogs) {
      const meta = log.metadata;
      if (meta && typeof meta === 'object') {
        const plat = meta.platform || meta.device || meta.os || meta.user_agent;
        if (typeof plat === 'string') {
          if (isIosPlatform(plat)) return 'iOS';
          if (isAndroidPlatform(plat)) return 'Android';
        }
      }
    }
  }

  // 5. Bills metadata
  if (context?.bills && context.bills.length > 0) {
    const shopBills = context.bills.filter((b) => b.shop_id === shop.id);
    for (const b of shopBills) {
      const bPlat = (b as any).platform || (b as any).device_platform;
      if (bPlat) {
        if (isIosPlatform(bPlat)) return 'iOS';
        if (isAndroidPlatform(bPlat)) return 'Android';
      }
      if (b.notes && isIosPlatform(b.notes)) return 'iOS';
      if (b.client_operation_id && b.client_operation_id.toLowerCase().includes('ios')) return 'iOS';
    }
  }

  // Default baseline POS
  return 'Android';
}
