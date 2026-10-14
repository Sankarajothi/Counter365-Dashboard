import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Core math helper replicated for standalone unit testing
function calculateFunnelRow(prevCount, currentCount, startCount) {
  // Enforce strict monotonically decreasing funnel order
  const count = Math.min(currentCount, prevCount);
  const fromPrevPct = prevCount > 0 ? Number(((count / prevCount) * 100).toFixed(1)) : 0;
  const fromStartPct = startCount > 0 ? Number(((count / startCount) * 100).toFixed(1)) : 0;
  const dropOffCount = Math.max(0, prevCount - count);
  const dropOffPct = prevCount > 0 ? Number(((dropOffCount / prevCount) * 100).toFixed(1)) : 0;

  return {
    count,
    fromPrevPct: Math.min(100, Math.max(0, fromPrevPct)),
    fromStartPct: Math.min(100, Math.max(0, fromStartPct)),
    dropOffPct: Math.min(100, Math.max(0, dropOffPct)),
    dropOffCount,
  };
}

function calculateEngagementScore(daysSinceActivity, eventVolume, coreActions) {
  // 1. Recency Score (max 35)
  let recency = 0;
  if (daysSinceActivity <= 2) recency = 35;
  else if (daysSinceActivity <= 5) recency = 25;
  else if (daysSinceActivity <= 10) recency = 15;
  else if (daysSinceActivity <= 30) recency = 5;

  // 2. Frequency Score (max 35)
  let frequency = 0;
  if (eventVolume >= 25) frequency = 35;
  else if (eventVolume >= 12) frequency = 25;
  else if (eventVolume >= 5) frequency = 15;
  else if (eventVolume >= 1) frequency = 5;

  // 3. Core Action Depth (max 30)
  let depth = 0;
  if (coreActions >= 10) depth = 30;
  else if (coreActions >= 5) depth = 20;
  else if (coreActions >= 1) depth = 10;

  const total = Math.min(100, recency + frequency + depth);

  let bucket = 'inactive';
  if (total >= 70) bucket = 'highly_engaged';
  else if (total >= 40) bucket = 'moderately_engaged';
  else if (total >= 15) bucket = 'at_risk';

  return { score: total, bucket };
}

describe('Product Analytics Engine Unit Tests', () => {
  describe('Funnel Math & Strict Ordering', () => {
    test('fromPrevPct can never exceed 100% even if raw events spike', () => {
      const prevUsers = 10;
      const rawCurrentUsers = 15; // Spike or non-ordered tracking
      const row = calculateFunnelRow(prevUsers, rawCurrentUsers, 20);

      assert.ok(row.fromPrevPct <= 100, 'fromPrevPct must never exceed 100%');
      assert.equal(row.fromPrevPct, 100);
      assert.equal(row.dropOffCount, 0);
      assert.equal(row.dropOffPct, 0);
    });

    test('calculates correct drop-off count and percentage on loss', () => {
      const prevUsers = 20;
      const currentUsers = 15; // 5 dropped off
      const row = calculateFunnelRow(prevUsers, currentUsers, 40);

      assert.equal(row.count, 15);
      assert.equal(row.dropOffCount, 5);
      assert.equal(row.dropOffPct, 25.0); // 5/20 = 25%
      assert.equal(row.fromPrevPct, 75.0); // 15/20 = 75%
      assert.equal(row.fromStartPct, 37.5); // 15/40 = 37.5%
    });

    test('handles zero users gracefully without NaN', () => {
      const row = calculateFunnelRow(0, 0, 0);
      assert.equal(row.fromPrevPct, 0);
      assert.equal(row.fromStartPct, 0);
      assert.equal(row.dropOffPct, 0);
      assert.equal(row.dropOffCount, 0);
    });
  });

  describe('Engagement Scoring Algorithm', () => {
    test('active merchant with recent daily bills receives highly engaged score', () => {
      // Last active 1 day ago, 30 events, 12 completed bills
      const result = calculateEngagementScore(1, 30, 12);
      assert.equal(result.score, 100);
      assert.equal(result.bucket, 'highly_engaged');
    });

    test('moderate merchant active 4 days ago receives moderately engaged score', () => {
      // Last active 4 days ago, 15 events, 6 bills
      const result = calculateEngagementScore(4, 15, 6);
      // recency: 25, frequency: 25, depth: 20 => total 70 -> highly_engaged
      assert.equal(result.score, 70);
      assert.equal(result.bucket, 'highly_engaged');

      // Moderate example: 4 days ago, 8 events, 2 bills
      const mod = calculateEngagementScore(4, 8, 2);
      // recency: 25, frequency: 15, depth: 10 => 50
      assert.equal(mod.score, 50);
      assert.equal(mod.bucket, 'moderately_engaged');
    });

    test('merchant with 15 days inactivity is flagged at risk or inactive', () => {
      // Last active 15 days ago, 2 events, 1 bill
      const result = calculateEngagementScore(15, 2, 1);
      // recency: 5, frequency: 5, depth: 10 => 20
      assert.equal(result.score, 20);
      assert.equal(result.bucket, 'at_risk');

      // Merchant inactive for 45 days, 0 recent events
      const inactive = calculateEngagementScore(45, 0, 0);
      assert.equal(inactive.score, 0);
      assert.equal(inactive.bucket, 'inactive');
    });
  });

  describe('Alerts Threshold Rules', () => {
    test('identifies high drop-off screens correctly when exit rate >= 50%', () => {
      const threshold = 50;
      const screens = [
        { name: 'POS Terminal', exitRate: 18.2 },
        { name: 'Pricing Plans', exitRate: 54.8 },
        { name: 'Settings', exitRate: 28.1 },
      ];

      const highDropOff = screens.filter((s) => s.exitRate >= threshold);
      assert.equal(highDropOff.length, 1);
      assert.equal(highDropOff[0].name, 'Pricing Plans');
    });
  });
});
