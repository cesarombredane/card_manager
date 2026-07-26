import { manualImageStore } from './manualImages';

export type ResolvedCardImage = {
  url: string | null;
  languageId: string | null;
  isFallback: boolean;
  source: 'automatic' | 'manual' | null;
};

export type CardImageIdentity = {
  setId: string;
  cardId: string;
  variantId: string;
};

// Resolves the requested scan and exposes when another language had to be used.
export const resolveCardImage = (
  images: Record<string, string>,
  languageId: string,
  fallbackLanguageId: string = 'en',
  identity?: CardImageIdentity
): ResolvedCardImage => {
  if (images[languageId]) {
    return { url: images[languageId], languageId, isFallback: false, source: 'automatic' };
  }

  const requestedManual = identity
    ? manualImageStore.find(identity.setId, identity.cardId, identity.variantId, languageId)
    : null;
  if (requestedManual) {
    return {
      url: `${requestedManual.url}?v=${encodeURIComponent(requestedManual.updated_at)}`,
      languageId,
      isFallback: false,
      source: 'manual'
    };
  }

  const automaticFallback = images[fallbackLanguageId]
    ? [fallbackLanguageId, images[fallbackLanguageId]] as const
    : Object.entries(images).find(([, url]) => Boolean(url));
  if (automaticFallback) {
    return {
      url: automaticFallback[1],
      languageId: automaticFallback[0],
      isFallback: true,
      source: 'automatic'
    };
  }

  const manualFallback = identity
    ? manualImageStore.find(identity.setId, identity.cardId, identity.variantId, fallbackLanguageId)
      ?? manualImageStore.entries.value.find((entry) =>
        entry.set_id === identity.setId
        && entry.card_id === identity.cardId
        && entry.variant_id === identity.variantId
      )
    : null;
  return {
    url: manualFallback
      ? `${manualFallback.url}?v=${encodeURIComponent(manualFallback.updated_at)}`
      : null,
    languageId: manualFallback?.language_id ?? null,
    isFallback: Boolean(manualFallback),
    source: manualFallback ? 'manual' : null
  };
};

// Compatibility helper for consumers that only need the URL.
export const localizedCardImage = (images: Record<string, string>, languageId: string): string | null => {
  return resolveCardImage(images, languageId).url;
};
