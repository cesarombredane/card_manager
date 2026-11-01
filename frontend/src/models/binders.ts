export type Binder_Layout = '2x2' | '3x3';

export type Binder_Proxy = {
  id: string;
  name: string;
  quantity: number;
  date?: string;
  created_at: string;
};

export type Binder_Image = {
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

export type Binder_Image_Placement = {
  image_id: string;
  side_index: number;
  row: number;
  column: number;
};

export type Collection_Binder = {
  folder_id: string;
  page_count: number;
  layout: Binder_Layout;
  locked_pages: number[];
  slots: Array<string | null>;
  proxies: Binder_Proxy[];
  images: Binder_Image[];
  image_placements: Binder_Image_Placement[];
  created_at: string;
  updated_at: string;
};

export type Binders_Data = {
  version: 1;
  binders: Collection_Binder[];
};
