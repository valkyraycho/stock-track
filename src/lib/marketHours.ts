/**
 * US equities market-hours utilities.
 *
 * Regular session: Monday–Friday, 09:30–16:00 US/Eastern.
 * We ignore half-days (day after Thanksgiving, Christmas Eve) and holidays;
 * the cost of being slightly wrong on ~8 days a year is worth skipping a
 * 200-line holiday calendar in a client-only app. When we say "closed" on
 * a holiday, the UI stays honest — no prices are moving anyway.
 *
 * We operate entirely on Date objects, converting to Eastern Time via the
 * Intl API rather than a dependency. This avoids the classic "dev forgot
 * about DST" bug you get with `hours - 5`.
 */

const NY_TZ = "America/New_York";

/**
 * Get the Y/M/D/H/M components of `now` as they appear in US Eastern Time,
 * without pulling in a timezone library. Intl.DateTimeFormat with a TZ
 * option is the idiomatic path.
 */
function nyParts(now: Date) {
  // `en-US` with explicit parts is the most portable form. The `hourCycle`
  // flag forces 0-23 even when the locale would default to 12-hour.
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: NY_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  });
  const parts = fmt.formatToParts(now);
  const get = (t: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === t)?.value ?? "";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    second: Number(get("second")),
    // "Mon" | "Tue" | ...
    weekday: get("weekday") as
      | "Mon"
      | "Tue"
      | "Wed"
      | "Thu"
      | "Fri"
      | "Sat"
      | "Sun",
  };
}

export function isMarketOpen(now = new Date()): boolean {
  const p = nyParts(now);
  if (p.weekday === "Sat" || p.weekday === "Sun") return false;
  const minutesOfDay = p.hour * 60 + p.minute;
  // 9:30 = 570 minutes. 16:00 = 960 minutes.
  return minutesOfDay >= 570 && minutesOfDay < 960;
}

/**
 * Return a Date representing the next 09:30 ET opening after `now`.
 * The returned Date's UTC instant is correct; display code can format it
 * in whatever timezone is appropriate.
 *
 * Implementation: we can't easily construct a "9:30 ET on day D" Date
 * directly from the browser's locale. Instead we iterate minute-by-minute
 * from `now`, testing each with `isMarketOpen`. Cheap enough — at most
 * ~4000 iterations across a long weekend.
 */
export function nextOpenAt(now = new Date()): Date {
  // Step forward in 1-minute jumps until isMarketOpen() is true.
  // We also require the local NY minute to be exactly 30 past 9, so we
  // land on the opening instant rather than mid-session.
  const start = new Date(now.getTime());
  for (let i = 0; i < 60 * 24 * 7; i++) {
    const candidate = new Date(start.getTime() + i * 60_000);
    const p = nyParts(candidate);
    if (
      p.weekday !== "Sat" &&
      p.weekday !== "Sun" &&
      p.hour === 9 &&
      p.minute === 30 &&
      candidate.getTime() > now.getTime()
    ) {
      return candidate;
    }
  }
  // Fallback — should never happen within 7 days.
  return new Date(now.getTime() + 24 * 3600_000);
}

/** Humanize a milliseconds-ago value: "just now" / "Xs ago" / "Xm ago" / "Xh ago" / "D/M". */
export function formatRelative(fromMs: number, now = Date.now()): string {
  const diff = Math.max(0, now - fromMs);
  if (diff < 3_000) return "just now";
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  const d = new Date(fromMs);
  return d.toLocaleDateString();
}

/** "in 2h 14m" style forward-looking diff for the next-open banner. */
export function formatUntil(targetMs: number, now = Date.now()): string {
  const diff = Math.max(0, targetMs - now);
  const hours = Math.floor(diff / 3600_000);
  const minutes = Math.floor((diff % 3600_000) / 60_000);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remHrs = hours % 24;
    return remHrs > 0 ? `in ${days}d ${remHrs}h` : `in ${days}d`;
  }
  if (hours > 0) return `in ${hours}h ${minutes}m`;
  return `in ${minutes}m`;
}
