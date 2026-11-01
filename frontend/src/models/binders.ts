export type BinderLayout = '2x2' | '3x3';

export type BinderProxy = {
  id: string;
  name: string;
  quantity: number;
  date?: string;
  created_at: string;
};

export type BinderImage = {
  id: string;
  name: string;
  width: number;
  height: number;
  card_slots: number[];
  crop_zoom: number;
  crop_x: number;
  crop_y: number;
  created_at: string;
};

export type BinderImagePlacement = {
  image_id: string;
  side_index: number;
  row: number;
  column: number;
};

export type CollectionBinder = {
  folder_id: string;
  page_count: number;
  layout: BinderLayout;
  locked_pages: number[];
  slots: Array<string | null>;
  proxies: BinderProxy[];
  images: BinderImage[];
  image_placements: BinderImagePlacement[];
  created_at: string;
  updated_at: string;
};

export type BindersData = {
  version: 1;
  binders: CollectionBinder[];
};
