import { useEffect, useState } from "react";
import { ExternalLink, Newspaper, Loader2 } from "lucide-react";
import { companyNews } from "../lib/finnhub";
import { formatRelative } from "../lib/marketHours";
import type { NewsItem } from "../types";

type Props = {
  symbol: string;
  token: string;
};

/**
 * Scrollable list of recent news for a symbol.
 * Fetched once on mount, no polling — news doesn't change in bursts.
 *
 * Images are optional (Finnhub sometimes returns an empty string). We
 * handle onError by hiding the image; a news card without a thumbnail
 * still works fine.
 */
export function NewsPanel({ symbol, token }: Props) {
  const [items, setItems] = useState<NewsItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setItems(null);
    setError(null);
    companyNews(symbol, token, 14)
      .then((list) => {
        if (cancelled) return;
        // Finnhub sometimes returns dozens; cap and sort newest-first.
        const sorted = list
          .filter((n) => n.headline && n.url)
          .sort((a, b) => b.datetime - a.datetime)
          .slice(0, 8);
        setItems(sorted);
      })
      .catch((e) => {
        if (cancelled) return;
        setError((e as Error).message);
      });
    return () => {
      cancelled = true;
    };
  }, [symbol, token]);

  return (
    <div className="border-t border-white/5 px-6 py-5">
      <div className="mb-3 flex items-center gap-2">
        <Newspaper className="size-3.5 text-[var(--color-lime)]" />
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-bone-300">
          recent news · 14d
        </span>
      </div>

      {items === null && !error && (
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-bone-400">
          <Loader2 className="size-3 animate-spin" />
          loading…
        </div>
      )}

      {error && (
        <div className="font-mono text-[11px] text-[var(--color-loss)]">
          Couldn't load news: {error}
        </div>
      )}

      {items && items.length === 0 && (
        <div className="font-mono text-[11px] text-bone-400">
          No recent news for {symbol}.
        </div>
      )}

      {items && items.length > 0 && (
        <ul className="flex flex-col gap-2">
          {items.map((n) => (
            <NewsRow key={n.id} item={n} />
          ))}
        </ul>
      )}
    </div>
  );
}

function NewsRow({ item }: { item: NewsItem }) {
  const [imgOk, setImgOk] = useState(Boolean(item.image));
  return (
    <li>
      <a
        href={item.url}
        target="_blank"
        rel="noreferrer"
        className="group flex items-start gap-3 rounded-lg border border-transparent px-3 py-2.5 transition hover:border-white/10 hover:bg-white/[0.03]"
      >
        {imgOk ? (
          <img
            src={item.image}
            alt=""
            onError={() => setImgOk(false)}
            className="size-14 shrink-0 rounded-md object-cover ring-1 ring-white/10"
          />
        ) : (
          <div className="flex size-14 shrink-0 items-center justify-center rounded-md bg-white/5 ring-1 ring-white/10">
            <Newspaper className="size-5 text-bone-400" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="line-clamp-2 text-sm font-medium leading-snug text-bone-100 group-hover:text-[var(--color-lime)]">
            {item.headline}
          </div>
          <div className="mt-1.5 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-bone-400">
            <span>{item.source}</span>
            <span>·</span>
            <span>{formatRelative(item.datetime * 1000)}</span>
          </div>
        </div>
        <ExternalLink className="mt-1 size-3 shrink-0 text-bone-400 opacity-0 transition group-hover:opacity-100" />
      </a>
    </li>
  );
}
