export type ResolvedCardImage = {
  url: string | null;
  languageId: string | null;
  isFallback: boolean;
};

// Resolves the requested scan and exposes when another language had to be used.
export const resolveCardImage = (
  images: Record<string, string>,
  languageId: string,
  fallbackLanguageId: string = 'en'
): ResolvedCardImage => {
  if (images[languageId]) {
    return { url: images[languageId], languageId, isFallback: false };
  }

  const fallback = images[fallbackLanguageId]
    ? [fallbackLanguageId, images[fallbackLanguageId]] as const
    : Object.entries(images).find(([, url]) => Boolean(url));
  return {
    url: fallback?.[1] ?? null,
    languageId: fallback?.[0] ?? null,
    isFallback: Boolean(fallback)
  };
};

// Compatibility helper for consumers that only need the URL.
export const localizedCardImage = (images: Record<string, string>, languageId: string): string | null => {
  return resolveCardImage(images, languageId).url;
};
