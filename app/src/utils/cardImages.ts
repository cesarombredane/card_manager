// Returns a localized card image with stable fallbacks for incomplete caches.
export const localizedCardImage = (images: Record<string, string>, languageId: string): string | null => {
  return images[languageId]
    || images.en
    || Object.values(images).find(Boolean)
    || null;
};
