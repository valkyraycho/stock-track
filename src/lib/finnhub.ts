/**
 * Finnhub REST client — tiny wrapper over fetch().
 *
 * Why not Axios or TanStack Query?
 *   - fetch() is built in, zero bundle cost, and our needs are trivial:
 *     three endpoints, no cache, no interceptors, no retries.
 *   - Adding a client library is a classic over-engineering trap for a
 *     project this size. We'll graduate to one only if a concrete need appears.
 */

import type { NewsItem, Profile, Quote, SearchResult } from "../types";

const BASE = "https://finnhub.io/api/v1";

/** Thrown for non-2xx responses. Callers can inspect `.status`. */
export class FinnhubError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "FinnhubError";
  }
}

async function get<T>(
  path: string,
  params: Record<string, string>,
  token: string
): Promise<T> {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("token", token);

  const res = await fetch(url.toString(), { method: "GET" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new FinnhubError(
      res.status,
      `Finnhub ${path} ${res.status}: ${text.slice(0, 200)}`
    );
  }
  return (await res.json()) as T;
}

/** Autocomplete symbol search. Filters to common stocks so we don't
 *  pollute the dropdown with SPACs, warrants, etc. */
export async function search(
  query: string,
  token: string
): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  const data = await get<{ count: number; result: SearchResult[] }>(
    "/search",
    { q: query, exchange: "US" },
    token
  );
  return (data.result ?? [])
    .filter((r) => r.type === "Common Stock" && !r.symbol.includes("."))
    .slice(0, 10);
}

/** Point-in-time quote. Used once when a stock is added (to seed the card)
 *  and again on page reload (because the WebSocket only pushes *new* trades). */
export function quote(symbol: string, token: string): Promise<Quote> {
  return get<Quote>("/quote", { symbol }, token);
}

/** Company profile. Cached per-symbol in localStorage by the caller. */
export function profile2(symbol: string, token: string): Promise<Profile> {
  return get<Profile>("/stock/profile2", { symbol }, token);
}

/**
 * Company news for the last N days (default: 14). Finnhub requires `from`
 * and `to` as YYYY-MM-DD strings — we compute them here so callers don't
 * have to. Still on the free tier as of 2026-05.
 */
export async function companyNews(
  symbol: string,
  token: string,
  days = 14
): Promise<NewsItem[]> {
  const to = new Date();
  const from = new Date(to.getTime() - days * 86_400_000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return get<NewsItem[]>(
    "/company-news",
    { symbol, from: fmt(from), to: fmt(to) },
    token
  );
}
