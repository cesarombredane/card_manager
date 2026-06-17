// A printing/product market, such as Japan or International.
export type Region = {
  id: string;
  name: string;
};

// A region-specific era of releases.
export type Series = {
  id: string;
  region_id: string;
  name: string;
  start_date: string;
};

// A set inside one series, with language-specific availability.
export type Set = {
  id: string;
  series_id: string;
  name: string;
  local_name: string | null;
  title_image_url: string | null;
  symbol_image_url: string | null;
  release_date: string;
  card_count: number;
  language_ids: string[];
};
