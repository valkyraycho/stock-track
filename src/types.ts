/**
 * Shared domain types.
 *
 * Naming rule: shapes that mirror the Finnhub API wire format keep their
 * cryptic one-letter keys (c, d, dp, ...) because we deserialize JSON
 * directly into them. If we renamed fields we'd pay a mapping tax on
 * every quote. We document each field instead.
 */

/** A favorite entry persisted in localStorage. Slim by design: heavier
 *  profile data (logo, industry, etc.) is cached separately. */
export type Favorite = {
  symbol: string;
  name: string;
  /** URL to company logo PNG. Finnhub returns a plain string; may be empty. */
  logo: string;
  /** ISO timestamp so we can sort/newest-first if we ever want to. */
  addedAt: string;
};

/** Finnhub /quote response. All numeric. `t` is a UNIX-seconds timestamp. */
export type Quote = {
  c: number; // current price
  d: number | null; // change
  dp: number | null; // percent change
  h: number; // high of day
  l: number; // low of day
  o: number; // open
  pc: number; // previous close
  t: number; // unix seconds
};

/** Finnhub /stock/profile2 response (subset we actually render). */
export type Profile = {
  name: string;
  ticker: string;
  logo: string;
  finnhubIndustry: string;
  exchange: string;
  marketCapitalization: number; // millions USD
  country: string;
  currency: string;
  weburl: string;
};

/** One row from Finnhub /search. */
export type SearchResult = {
  symbol: string;
  description: string;
  displaySymbol: string;
  type: string;
};

/** A single trade tick pushed by the WebSocket. */
export type TradeTick = {
  /** symbol */ s: string;
  /** price */ p: number;
  /** unix ms */ t: number;
  /** volume */ v: number;
};
