// Display-only multi-currency (buyer directive 2026-07-10).
// Amounts move through the system in each EVENT's own currency, in integer
// minor units (paise/cents/fils — all 2-digit). Orders are still CREATED and
// CHARGED server-side in the event's currency (Stripe). This module only
// CONVERTS amounts for DISPLAY into the currency the visitor selects.
//
// Rates are a static, approximate config (1 unit of currency ≈ X INR). Swap for
// a live FX feed later if real-time accuracy is needed — display only, so a
// stale rate never affects what a buyer is actually charged.

// One row per supported display currency:
// [code, symbol, ≈INR per 1 unit (display only), locale, flag (ISO-2, 'eu' for €)]
const DEFS = [
  ['AED', 'د.إ ', 22.6, 'en-AE', 'ae'],
  ['USD', '$', 83, 'en-US', 'us'],
  ['INR', '₹', 1, 'en-IN', 'in'],
  ['EUR', '€', 90, 'en-IE', 'eu'],
  ['GBP', '£', 105, 'en-GB', 'gb'],
  ['SGD', 'S$', 62, 'en-SG', 'sg'],
  ['AUD', 'A$', 55, 'en-AU', 'au'],
  ['CAD', 'C$', 61, 'en-CA', 'ca'],
  ['JPY', '¥', 0.53, 'ja-JP', 'jp'],
  ['CNY', 'CN¥', 11.5, 'zh-CN', 'cn'],
  ['HKD', 'HK$', 10.6, 'en-HK', 'hk'],
  ['SAR', 'SR ', 22.1, 'en-SA', 'sa'],
  ['QAR', 'QR ', 22.8, 'en-QA', 'qa'],
  ['TRY', '₺', 2.5, 'tr-TR', 'tr'],
  ['RUB', '₽', 0.95, 'ru-RU', 'ru'],
  ['ZAR', 'R ', 4.6, 'en-ZA', 'za'],
  ['NGN', '₦', 0.055, 'en-NG', 'ng'],
  ['KES', 'KSh ', 0.64, 'en-KE', 'ke'],
  ['EGP', 'E£', 1.7, 'ar-EG', 'eg'],
  ['MAD', 'DH ', 8.3, 'fr-MA', 'ma'],
  ['GHS', 'GH₵', 5.5, 'en-GH', 'gh'],
  ['TZS', 'TSh ', 0.032, 'en-TZ', 'tz'],
  ['RWF', 'FRw ', 0.063, 'en-RW', 'rw'],
  ['BRL', 'R$', 15.5, 'pt-BR', 'br'],
  ['ARS', 'AR$', 0.09, 'es-AR', 'ar'],
  ['MXN', 'MX$', 4.6, 'es-MX', 'mx'],
  ['BDT', '৳', 0.71, 'bn-BD', 'bd'],
  ['PKR', '₨ ', 0.3, 'en-PK', 'pk'],
  ['MYR', 'RM ', 18.5, 'ms-MY', 'my'],
  ['THB', '฿', 2.3, 'th-TH', 'th'],
  ['IDR', 'Rp ', 0.0052, 'id-ID', 'id'],
  ['PHP', '₱', 1.45, 'en-PH', 'ph'],
  ['VND', '₫', 0.0033, 'vi-VN', 'vn'],
  ['KRW', '₩', 0.061, 'ko-KR', 'kr'],
  ['TWD', 'NT$', 2.6, 'zh-TW', 'tw'],
  ['NZD', 'NZ$', 51, 'en-NZ', 'nz'],
  ['CHF', 'CHF ', 93, 'de-CH', 'ch'],
  ['SEK', 'kr ', 7.9, 'sv-SE', 'se'],
  ['NOK', 'kr ', 7.7, 'nb-NO', 'no'],
  ['DKK', 'kr ', 12.1, 'da-DK', 'dk'],
  ['PLN', 'zł ', 21, 'pl-PL', 'pl'],
  ['RON', 'lei ', 18, 'ro-RO', 'ro'],
];

export const CURRENCIES = DEFS.map((d) => d[0]);
export const CURRENCY_SYMBOL = Object.fromEntries(DEFS.map((d) => [d[0], d[1]]));
export const CURRENCY_LABEL = Object.fromEntries(DEFS.map((d) => [d[0], d[1].trim() === d[0] ? d[0] : `${d[0]} ${d[1].trim()}`]));
export const CURRENCY_FLAG = Object.fromEntries(DEFS.map((d) => [d[0], d[4]]));

// 1 unit of the currency ≈ this many INR. The DEFS values are only a
// cold-start seed — live mid-market rates from GET /fx (cached server-side)
// overwrite them at app start via setLiveRates(), so displayed conversions
// track the real market.
export const RATES_TO_INR = Object.fromEntries(DEFS.map((d) => [d[0], d[2]]));

export function setLiveRates(ratesToInr) {
  if (!ratesToInr || typeof ratesToInr !== 'object') return;
  for (const [code, rate] of Object.entries(ratesToInr)) {
    if (typeof rate === 'number' && rate > 0 && code in RATES_TO_INR) RATES_TO_INR[code] = rate;
  }
}

const LOCALE = Object.fromEntries(DEFS.map((d) => [d[0], d[3]]));

// Convert an integer minor amount from one currency to another (both 2-digit
// minor units, so the ×100 cancels: minor_to = minor_from × rateFrom / rateTo).
export function convertMinor(minor, from = 'INR', to = 'INR') {
  const v = Number(minor) || 0;
  if (from === to) return Math.round(v);
  const inInr = v * (RATES_TO_INR[from] ?? 1);
  return Math.round(inInr / (RATES_TO_INR[to] ?? 1));
}

// Format an integer minor amount already IN `currency`.
export function formatMoney(minor, currency = 'INR') {
  const sym = CURRENCY_SYMBOL[currency] || `${currency} `;
  const amount = (Number(minor) || 0) / 100;
  return sym + amount.toLocaleString(LOCALE[currency] || 'en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// Convert `minor` (held in `from`) into `to` and format it. This is the main
// display helper — e.g. displayMoney(50000, 'INR', 'AED').
export function displayMoney(minor, from = 'INR', to = 'INR') {
  return formatMoney(convertMinor(minor, from, to), to);
}

const isCurrency = (c) => CURRENCIES.includes(c);

// Map the visitor's IANA timezone → a supported display currency. Location-based
// default (buyer directive): the currency auto-changes with where they are.
// Falls back to locale, then INR ('English'/default).
const TZ_CURRENCY = [
  [/dubai|abu_dhabi|asia\/muscat|asia\/bahrain|asia\/kuwait/i, 'AED'],
  [/asia\/riyadh/i, 'SAR'],
  [/asia\/qatar/i, 'QAR'],
  [/asia\/kolkata|asia\/calcutta|asia\/colombo/i, 'INR'],
  [/asia\/singapore/i, 'SGD'],
  [/asia\/kuala_lumpur/i, 'MYR'],
  [/asia\/tokyo/i, 'JPY'],
  [/asia\/seoul/i, 'KRW'],
  [/asia\/shanghai|asia\/chongqing/i, 'CNY'],
  [/asia\/hong_kong/i, 'HKD'],
  [/asia\/bangkok/i, 'THB'],
  [/asia\/jakarta|asia\/makassar/i, 'IDR'],
  [/asia\/manila/i, 'PHP'],
  [/asia\/karachi/i, 'PKR'],
  [/asia\/dhaka/i, 'BDT'],
  [/^australia\//i, 'AUD'],
  [/pacific\/auckland/i, 'NZD'],
  [/america\/sao_paulo|america\/bahia|america\/fortaleza/i, 'BRL'],
  [/america\/argentina/i, 'ARS'],
  [/america\/mexico_city|america\/monterrey/i, 'MXN'],
  [/america\/toronto|america\/vancouver|america\/edmonton|america\/winnipeg|america\/halifax/i, 'CAD'],
  [/^america\//i, 'USD'],
  [/africa\/johannesburg/i, 'ZAR'],
  [/africa\/lagos/i, 'NGN'],
  [/africa\/nairobi/i, 'KES'],
  [/africa\/cairo/i, 'EGP'],
  [/africa\/casablanca/i, 'MAD'],
  [/europe\/london|europe\/dublin/i, 'GBP'],
  [/europe\/zurich/i, 'CHF'],
  [/europe\/istanbul/i, 'TRY'],
  [/europe\/moscow/i, 'RUB'],
  [/europe\/warsaw/i, 'PLN'],
  [/europe\/stockholm/i, 'SEK'],
  [/europe\/oslo/i, 'NOK'],
  [/europe\/copenhagen/i, 'DKK'],
  [/europe\/bucharest/i, 'RON'],
  [/^europe\//i, 'EUR'],
];
const LOCALE_CURRENCY = {
  AE: 'AED', IN: 'INR', SG: 'SGD', US: 'USD', GB: 'GBP', UK: 'GBP',
  DE: 'EUR', FR: 'EUR', IE: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR', AT: 'EUR', BE: 'EUR', FI: 'EUR', GR: 'EUR', PT: 'EUR',
  AU: 'AUD', CA: 'CAD', JP: 'JPY', CN: 'CNY', HK: 'HKD', KR: 'KRW', TW: 'TWD', SA: 'SAR', QA: 'QAR',
  BR: 'BRL', AR: 'ARS', MX: 'MXN', ZA: 'ZAR', NG: 'NGN', KE: 'KES', EG: 'EGP', MA: 'MAD', GH: 'GHS',
  PK: 'PKR', BD: 'BDT', MY: 'MYR', TH: 'THB', ID: 'IDR', PH: 'PHP', VN: 'VND', TR: 'TRY', RU: 'RUB',
  PL: 'PLN', RO: 'RON', CH: 'CHF', SE: 'SEK', NO: 'NOK', DK: 'DKK', NZ: 'NZD',
};

// A stored user choice always wins; otherwise derive from location.
export function detectDefaultCurrency() {
  try {
    const stored = localStorage.getItem('obs_currency');
    if (stored && isCurrency(stored)) return stored;
  } catch { /* ignore */ }
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    for (const [re, cur] of TZ_CURRENCY) if (re.test(tz)) return cur;
    const region = (navigator.language || '').split('-')[1]?.toUpperCase();
    if (region && LOCALE_CURRENCY[region] && isCurrency(LOCALE_CURRENCY[region])) return LOCALE_CURRENCY[region];
  } catch { /* ignore */ }
  return 'AED'; // UAE-first platform — dirham is the default display currency
}
