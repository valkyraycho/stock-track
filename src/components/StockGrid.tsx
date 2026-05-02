import { StockCard } from "./StockCard";
import type { Favorite } from "../types";

type Props = {
  favorites: Favorite[];
  token: string;
  onRemove: (symbol: string) => void;
};

/**
 * Responsive grid of StockCard. Intentionally not a masonry — equal heights
 * read more like a proper financial dashboard than a Pinterest board.
 */
export function StockGrid({ favorites, token, onRemove }: Props) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {favorites.map((fav, i) => (
        <StockCard
          key={fav.symbol}
          favorite={fav}
          token={token}
          index={i}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}
