import type { CategoryId } from "../api/types";

// The 4 launch categories (build instructions: sneakers, luxury handbags,
// Pokémon cards, luxury watches). Used by the manual category picker (spec §4.2).
export interface CategoryMeta {
  id: CategoryId;
  label: string;
  emoji: string;
}

export const CATEGORIES: CategoryMeta[] = [
  { id: "sneaker", label: "Sneakers", emoji: "👟" },
  { id: "handbag", label: "Luxury handbag", emoji: "👜" },
  { id: "pokemon", label: "Pokémon card", emoji: "🃏" },
  { id: "watch", label: "Luxury watch", emoji: "⌚" },
];

export function categoryLabel(id: string): string {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
}
