// import types
import type { Display_Card } from '../utils/card_display';
import type { Collection_Entry } from './collection';

export type Binder_Row = {
  entry: Collection_Entry;
  card: Display_Card;
  available: number;
  release_date: string | null;
  pokedex_number: number | null;
  price: number | null;
};
