/**
 * wine.ai Taste Lexicon & Scoring Engine
 * Ported from taste_engine.py — parses natural language into 7-dim vectors
 * Dimensions: [tannin, acidity, sweetness, body, fruit, oak, spice]
 */

export const DIMENSIONS = ['tannin', 'acidity', 'sweetness', 'body', 'fruit', 'oak', 'spice'];

// ── Prompt patterns: regex → dimension targets ──
const PROMPT_PATTERNS = [
  // Body/weight
  [/\b(light|light-bodied|lightweight|thin|delicate)\b/i, { body: 0.25, tannin: 0.25 }],
  [/\b(medium-bodied|medium body|balanced)\b/i, { body: 0.55 }],
  [/\b(full-bodied|full body|big|heavy|rich|robust)\b/i, { body: 0.85, tannin: 0.70 }],

  // Sweetness
  [/\b(dry|bone dry|very dry|brut)\b/i, { sweetness: 0.08 }],
  [/\b(off-dry|slightly sweet|hint of sweet)\b/i, { sweetness: 0.40 }],
  [/\b(sweet|dessert wine)\b/i, { sweetness: 0.75 }],

  // Acidity
  [/\b(crisp|bright|zesty|tart|acidic|refreshing)\b/i, { acidity: 0.80 }],
  [/\b(mellow|round|soft|smooth)\b/i, { acidity: 0.35, tannin: 0.25 }],

  // Tannin
  [/\b(tannic|bold|structured|grippy|powerful)\b/i, { tannin: 0.80, body: 0.75 }],
  [/\b(silky|velvety|gentle|easy drinking|easy-drinking)\b/i, { tannin: 0.20 }],

  // Fruit
  [/\b(fruity|fruit-forward|fruit forward|juicy|jammy)\b/i, { fruit: 0.85 }],
  [/\b(earthy|mineral|minerally|savory|savoury)\b/i, { fruit: 0.30, spice: 0.55 }],

  // Oak
  [/\b(oaky|oaked|vanilla|toasty|buttery)\b/i, { oak: 0.75 }],
  [/\b(unoaked|un-oaked|no oak|stainless)\b/i, { oak: 0.08 }],

  // Spice
  [/\b(spicy|peppery|complex|herbal)\b/i, { spice: 0.75 }],

  // Grape profiles
  [/\bcabernet\b/i, { tannin: 0.80, body: 0.80, fruit: 0.65, oak: 0.65 }],
  [/\bpinot noir\b/i, { tannin: 0.35, acidity: 0.70, body: 0.45, fruit: 0.80 }],
  [/\bmerlot\b/i, { tannin: 0.55, body: 0.65, fruit: 0.75, oak: 0.50 }],
  [/\bchardonnay\b/i, { tannin: 0.05, acidity: 0.60, body: 0.60, fruit: 0.70, oak: 0.50 }],
  [/\briesling\b/i, { tannin: 0.03, acidity: 0.85, sweetness: 0.30, fruit: 0.80 }],
  [/\bsauvignon blanc\b/i, { tannin: 0.05, acidity: 0.85, body: 0.40, fruit: 0.75 }],
  [/\bmalbec\b/i, { tannin: 0.65, body: 0.80, fruit: 0.80, oak: 0.55 }],
  [/\b(syrah|shiraz)\b/i, { tannin: 0.72, body: 0.82, fruit: 0.75, spice: 0.78 }],
  [/\bpinot grigio\b/i, { tannin: 0.05, acidity: 0.70, body: 0.35, fruit: 0.65 }],
  [/\bmoscato\b/i, { tannin: 0.03, acidity: 0.55, sweetness: 0.70, body: 0.30, fruit: 0.85 }],
  [/\bzinfandel\b/i, { tannin: 0.60, body: 0.75, fruit: 0.85, spice: 0.65 }],
  [/\bprosecco\b/i, { tannin: 0.03, acidity: 0.70, sweetness: 0.25, body: 0.30, fruit: 0.70 }],
  [/\bsangiovese\b/i, { tannin: 0.65, acidity: 0.70, body: 0.65, fruit: 0.65, spice: 0.55 }],
  [/\btempranillo\b/i, { tannin: 0.60, body: 0.70, fruit: 0.65, oak: 0.60, spice: 0.55 }],

  // Colour profiles
  [/\bred wine\b/i, { tannin: 0.60, body: 0.65, fruit: 0.70, oak: 0.45 }],
  [/\bwhite wine\b/i, { tannin: 0.05, acidity: 0.65, body: 0.40, fruit: 0.70 }],
  [/\b(rose|rosé)\b/i, { tannin: 0.15, acidity: 0.60, body: 0.35, fruit: 0.75 }],
];

// ── Colour detection ──
const COLOUR_PATTERNS = [
  [/\bred\b/i, 'Red'],
  [/\bwhite\b/i, 'White'],
  [/\b(rose|rosé|rosado)\b/i, 'Rose'],
  [/\bsparkling\b/i, 'Sparkling'],
  [/\b(cabernet|merlot|pinot noir|syrah|shiraz|malbec|tempranillo|sangiovese|nebbiolo|zinfandel)\b/i, 'Red'],
  [/\b(chardonnay|riesling|sauvignon blanc|pinot grigio|pinot gris|gewurztraminer|viognier|moscato)\b/i, 'White'],
  [/\bprosecco\b/i, 'Sparkling'],
];

// ── Price extraction ──
const PRICE_PATTERNS = [
  [/under\s*\$?(\d+)/i, m => [0, parseFloat(m[1])]],
  [/below\s*\$?(\d+)/i, m => [0, parseFloat(m[1])]],
  [/less than\s*\$?(\d+)/i, m => [0, parseFloat(m[1])]],
  [/\$?(\d+)\s*[-–to]+\s*\$?(\d+)/i, m => [parseFloat(m[1]), parseFloat(m[2])]],
  [/around\s*\$?(\d+)/i, m => [parseFloat(m[1]) * 0.7, parseFloat(m[1]) * 1.3]],
  [/about\s*\$?(\d+)/i, m => [parseFloat(m[1]) * 0.7, parseFloat(m[1]) * 1.3]],
  [/over\s*\$?(\d+)/i, m => [parseFloat(m[1]), 9999]],
  [/above\s*\$?(\d+)/i, m => [parseFloat(m[1]), 9999]],
];

// ── Region/country extraction ──
const REGION_PATTERNS = [
  [/\bbordeaux\b/i, 'France', 'Bordeaux'],
  [/\b(burgundy|bourgogne)\b/i, 'France', 'Burgundy'],
  [/\b(rhone|rhône)\b/i, 'France', 'Rhone'],
  [/\bnapa\b/i, 'United States', 'California'],
  [/\bcalifornia\b/i, 'United States', 'California'],
  [/\boregon\b/i, 'United States', 'Oregon'],
  [/\bfinger lakes\b/i, 'United States', 'New York'],
  [/\b(tuscany|toscana)\b/i, 'Italy', 'Tuscany'],
  [/\b(piedmont|piemonte)\b/i, 'Italy', 'Piedmont'],
  [/\brioja\b/i, 'Spain', 'Rioja'],
  [/\bmendoza\b/i, 'Argentina', 'Mendoza'],
  [/\bmarlborough\b/i, 'New Zealand', 'Marlborough'],
  [/\bbarossa\b/i, 'Australia', 'South Australia'],
  [/\bmosel\b/i, 'Germany', 'Mosel'],
  [/\bdouro\b/i, 'Portugal', 'Douro'],
  [/\bital(y|ian)\b/i, 'Italy', null],
  [/\bfran(ce|ch)\b/i, 'France', null],
  [/\b(spain|spanish)\b/i, 'Spain', null],
  [/\baustralia[n]?\b/i, 'Australia', null],
  [/\bargentin(a|e|ian)\b/i, 'Argentina', null],
  [/\bchile(an)?\b/i, 'Chile', null],
  [/\bsouth africa[n]?\b/i, 'South Africa', null],
];

// ── Grape extraction from prompt ──
const GRAPE_PATTERNS = [
  [/\bcabernet sauvignon\b/i, 'cabernet sauvignon'],
  [/\bcabernet\b/i, 'cabernet sauvignon'],
  [/\bpinot noir\b/i, 'pinot noir'],
  [/\bmerlot\b/i, 'merlot'],
  [/\bchardonnay\b/i, 'chardonnay'],
  [/\briesling\b/i, 'riesling'],
  [/\bsauvignon blanc\b/i, 'sauvignon blanc'],
  [/\bmalbec\b/i, 'malbec'],
  [/\b(syrah|shiraz)\b/i, 'syrah'],
  [/\bpinot grigio\b/i, 'pinot grigio'],
  [/\bmoscato\b/i, 'moscato'],
  [/\bzinfandel\b/i, 'zinfandel'],
  [/\bprosecco\b/i, 'glera'],
  [/\bsangiovese\b/i, 'sangiovese'],
  [/\btempranillo\b/i, 'tempranillo'],
  [/\bnebbiolo\b/i, 'nebbiolo'],
  [/\bgewurztraminer\b/i, 'gewurztraminer'],
  [/\bviognier\b/i, 'viognier'],
];

/**
 * Parse a natural-language prompt into a target vector + filters.
 * @param {string} prompt
 * @returns {{ target: number[], filters: object }}
 */
export function parsePrompt(prompt) {
  const lower = prompt.toLowerCase();

  // Accumulate dimension values
  const dimVals = {};
  for (const d of DIMENSIONS) dimVals[d] = [];

  for (const [re, targets] of PROMPT_PATTERNS) {
    if (re.test(lower)) {
      for (const [dim, val] of Object.entries(targets)) {
        dimVals[dim].push(val);
      }
    }
  }

  // Average per dimension, null if no signal
  const target = DIMENSIONS.map(d => {
    const vals = dimVals[d];
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  });

  // Fill nulls with 0.5 (neutral)
  const filled = target.map(v => v !== null ? v : 0.5);

  // Check if any actual signal was found
  const hasSignal = target.some(v => v !== null);

  // Extract filters
  const filters = {};

  // Colour
  for (const [re, col] of COLOUR_PATTERNS) {
    if (re.test(lower)) {
      filters.colour = col;
      break;
    }
  }

  // Grape
  for (const [re, grape] of GRAPE_PATTERNS) {
    if (re.test(lower)) {
      filters.grape = grape;
      break;
    }
  }

  // Region/country
  for (const [re, country, region] of REGION_PATTERNS) {
    if (re.test(lower)) {
      filters.country = country;
      if (region) filters.region = region;
      break;
    }
  }

  // Price
  for (const [re, extractor] of PRICE_PATTERNS) {
    const m = lower.match(re);
    if (m) {
      const [pmin, pmax] = extractor(m);
      filters.priceMin = pmin;
      filters.priceMax = pmax;
      break;
    }
  }

  // If no taste signal, use a balanced default
  if (!hasSignal) {
    return { target: [0.55, 0.55, 0.12, 0.60, 0.70, 0.40, 0.40], filters };
  }

  return { target: filled, filters };
}

/**
 * Compute similarity between target vector and wine vector.
 * Inverse Euclidean distance normalized to 0–1.
 * @param {number[]} target
 * @param {number[]} candidate
 * @returns {number}
 */
export function similarity(target, candidate) {
  let sqSum = 0;
  for (let i = 0; i < 7; i++) {
    const diff = target[i] - (candidate[i] || 0.5);
    sqSum += diff * diff;
  }
  const dist = Math.sqrt(sqSum);
  return Math.max(0, 1 - dist / 2.6458);
}

/**
 * Generate a human-readable match reason from the vector comparison.
 * @param {number[]} target
 * @param {number[]} wine
 * @returns {string}
 */
export function matchReason(target, wine) {
  const labels = ['tannin', 'acidity', 'sweetness', 'body', 'fruit', 'oak', 'spice'];
  const descriptors = {
    tannin:    { high: 'bold tannins', low: 'soft tannins', mid: 'moderate tannins' },
    acidity:   { high: 'bright acidity', low: 'mellow', mid: 'balanced acidity' },
    sweetness: { high: 'sweet', low: 'dry', mid: 'off-dry' },
    body:      { high: 'full-bodied', low: 'light-bodied', mid: 'medium-bodied' },
    fruit:     { high: 'fruit-forward', low: 'earthy', mid: 'moderate fruit' },
    oak:       { high: 'oaky', low: 'unoaked', mid: 'lightly oaked' },
    spice:     { high: 'spicy', low: 'mild', mid: 'hint of spice' },
  };

  // Find the dimensions where the wine best matches the user's strongest preferences
  const matches = [];
  for (let i = 0; i < 7; i++) {
    const diff = Math.abs(target[i] - (wine[i] || 0.5));
    const wineVal = wine[i] || 0.5;
    let level = wineVal >= 0.65 ? 'high' : wineVal <= 0.3 ? 'low' : 'mid';
    matches.push({ dim: labels[i], diff, desc: descriptors[labels[i]][level], wineVal });
  }

  // Sort by closest match (smallest diff) and pick top descriptors
  matches.sort((a, b) => a.diff - b.diff);
  const top = matches.slice(0, 3).map(m => m.desc);
  // Deduplicate
  const unique = [...new Set(top)];
  return unique.join(', ');
}

/**
 * Format distance from user location to store.
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 * @returns {number} distance in miles
 */
export function distanceMiles(lat1, lng1, lat2, lng2) {
  const R = 3959; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
