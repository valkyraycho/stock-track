# STOCK//TRACK

A real-time watchlist for US equities. Static front-end, no backend — deploys
to GitHub Pages. Live trade prices stream in over Finnhub's WebSocket.

## Stack

- **Vite + React 18 + TypeScript**
- **Tailwind CSS v4** (design tokens in `src/styles/index.css`)
- **Finnhub** (free tier) — REST for seed data + profile, WebSocket for live ticks

## Getting started

```bash
npm install
cp .env.example .env.local   # then paste your key
npm run dev
```

Open http://localhost:5173/ . If `.env.local` contains `VITE_FINNHUB_API_KEY`
you'll skip the key prompt; otherwise the app will ask for one on first run.

Get a free Finnhub key at <https://finnhub.io/register>.

## Build

```bash
npm run build     # outputs static site to dist/
npm run preview   # serve the production build locally
```

## Deploying to GitHub Pages

1. Create a GitHub repo named `stock-track` (the `base` path in
   `vite.config.ts` matches this name — change both together if you rename).
2. Push to `main`.
3. In the repo: **Settings → Pages → Source = "GitHub Actions"**.
4. The workflow in `.github/workflows/deploy.yml` will build and publish.

The shipped bundle does **not** contain any API key. Each visitor enters
their own Finnhub key on first run; it stays in their browser's
`localStorage`.

## Keyboard shortcuts

- <kbd>a</kbd> — add a stock
- <kbd>↑</kbd> <kbd>↓</kbd> <kbd>↵</kbd> — navigate / select search results
- <kbd>esc</kbd> — close dialogs

## Project layout

```
src/
  App.tsx                # root: gates on API key, composes the page
  main.tsx               # React mount point
  types.ts               # Favorite / Quote / Profile / TradeTick
  lib/finnhub.ts         # tiny fetch wrapper over /search /quote /profile2
  hooks/
    useLocalStorage.ts   # typed + cross-tab via useSyncExternalStore
    useFavorites.ts      # CRUD around the favorites array
    useFinnhubSocket.ts  # singleton WS + refcounted subscribe/unsubscribe
  components/
    Header.tsx           # brand, connection badge, clock, add button
    ApiKeyModal.tsx      # first-run + edit key
    AddStockDialog.tsx   # debounced search, keyboard nav
    StockCard.tsx        # per-ticker card with live price + sparkline
    StockGrid.tsx        # responsive 1/2/3/4 column grid
    TickerTape.tsx       # scrolling live prices band at bottom
    EmptyState.tsx       # zero-state with quick-add chips
  styles/index.css       # Tailwind + design tokens + keyframes
```

## Known limits

- **Market hours only**: Finnhub's free WebSocket only streams during the US
  regular session. Outside hours the connection stays open but is silent;
  seed data (`pc`, `o`, `h`, `l`) continues to render so cards aren't blank.
- **Free-tier rate limits**: the app uses a single shared socket, so
  subscribing 10+ tickers is fine. REST is only called once per add +
  once per card mount to seed pricing.
- **Logos**: served by Finnhub; occasionally 404, in which case the card
  falls back to a 2-letter monogram.
