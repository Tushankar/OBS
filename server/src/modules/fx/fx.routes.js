import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';

// Live FX rates for DISPLAY conversion (GET /fx). Money truth: buyers are
// always charged in the event's own currency — these rates only make the
// converted prices shown on cards/booking honest.
//
// Source: open.er-api.com (ExchangeRate-API open endpoint — no key, 160+
// currencies, refreshed daily). Rates are cached in memory for 6 hours and
// the last good copy is served if the provider is ever down; SEED_RATES is
// the cold-start fallback so /fx always answers.
const router = Router();

// 1 unit of currency ≈ X INR (approximate cold-start seed; overwritten by the
// live feed on first successful fetch).
const SEED_RATES = {
  INR: 1, USD: 83, EUR: 90, GBP: 105, AED: 22.6, SGD: 62, AUD: 55, CAD: 61,
  JPY: 0.53, CNY: 11.5, HKD: 10.6, SAR: 22.1, QAR: 22.8, TRY: 2.5, RUB: 0.95,
  ZAR: 4.6, NGN: 0.055, KES: 0.64, EGP: 1.7, MAD: 8.3, GHS: 5.5, TZS: 0.032,
  RWF: 0.063, BRL: 15.5, ARS: 0.09, MXN: 4.6, BDT: 0.71, PKR: 0.3, MYR: 18.5,
  THB: 2.3, IDR: 0.0052, PHP: 1.45, VND: 0.0033, KRW: 0.061, TWD: 2.6,
  NZD: 51, CHF: 93, SEK: 7.9, NOK: 7.7, DKK: 12.1, PLN: 21, RON: 18,
};

const TTL_MS = 6 * 60 * 60 * 1000; // 6h — provider updates daily
let cache = { ratesToInr: SEED_RATES, fetchedAt: null, source: 'seed' };
let inflight = null;

async function refreshRates() {
  const res = await fetch('https://open.er-api.com/v6/latest/INR', { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`fx provider ${res.status}`);
  const data = await res.json();
  if (data.result !== 'success' || !data.rates) throw new Error('fx provider payload invalid');
  // Provider gives 1 INR = r units of X → INR per 1 unit of X = 1 / r.
  const ratesToInr = { INR: 1 };
  for (const code of Object.keys(SEED_RATES)) {
    const r = data.rates[code];
    if (r > 0) ratesToInr[code] = 1 / r;
  }
  cache = { ratesToInr, fetchedAt: new Date().toISOString(), source: 'open.er-api.com' };
  return cache;
}

router.get('/', asyncHandler(async (req, res) => {
  const stale = !cache.fetchedAt || Date.now() - new Date(cache.fetchedAt).getTime() > TTL_MS;
  if (stale) {
    // Single flight — concurrent requests share one provider call; on failure
    // we serve the last good copy (or the seed) rather than erroring.
    inflight = inflight || refreshRates().catch((e) => {
      console.error('[fx] refresh failed:', e.message);
      return cache;
    }).finally(() => { inflight = null; });
    await inflight;
  }
  res.set('Cache-Control', 'public, max-age=900'); // browsers/CDN: 15 min
  res.status(200).json(cache);
}));

export default router;
