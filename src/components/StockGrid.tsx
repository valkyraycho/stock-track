import { StockCard } from "./StockCard";
import type { Favorite } from "../types";

type Props = {
  favorites: Favorite[];
  token: string;
  onRemove: (symbol: string) => void;
  onOpen: (symbol: string) => void;
  onSeed: (symbol: string, seed: { dp: number; c: number }) => void;
};

export function StockGrid({
  favorites,
  token,
  onRemove,
  onOpen,
  onSeed,
}: Props) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {favorites.map((fav, i) => (
        <StockCard
          key={fav.symbol}
          favorite={fav}
          token={token}
          index={i}
          onRemove={onRemove}
          onOpen={onOpen}
          onSeed={onSeed}
        />
      ))}
    </div>
  );
}
