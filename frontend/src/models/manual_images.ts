export type Manual_Image_Entry = {
  set_id: string;
  card_id: string;
  variant_id: string;
  language_id: string;
  url: string;
  updated_at: string;
};

export type Manual_Image_Data = { version: 1; entries: Manual_Image_Entry[] };
