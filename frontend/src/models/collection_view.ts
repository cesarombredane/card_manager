// import types
import type { Display_Card } from '../utils/card_display';
import type { Collection_Entry } from './collection';

export type Collection_Row = {
  entry: Collection_Entry;
  card: Display_Card;
  release_date: string | null;
  pokedex_number: number | null;
  unit_price: number | null;
  total_value: number;
};
