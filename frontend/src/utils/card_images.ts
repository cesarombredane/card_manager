// import utils
import { manual_image_store } from '../store/modules/manual_images';

export type Resolved_Card_Image = {
  url: string | null;
  language_id: string | null;
  is_fallback: boolean;
  source: 'automatic' | 'manual' | null;
};

export type Card_Image_Identity = {
  set_id: string;
  card_id: string;
  variant_id: string;
};

// Resolves the requested scan and exposes when another language had to be used.
export const resolve_card_image = (
  images: Record<string, string>,
  language_id: string,
  fallback_language_id: string = 'en',
  identity?: Card_Image_Identity,
): Resolved_Card_Image => {
  if (images[language_id]) {
    return {
      url: images[language_id],
      language_id: language_id,
      is_fallback: false,
      source: 'automatic',
    };
  }

  const requested_manual = identity
    ? manual_image_store.find(identity.set_id, identity.card_id, identity.variant_id, language_id)
    : null;
  if (requested_manual) {
    return {
      url: `${requested_manual.url}?v=${encodeURIComponent(requested_manual.updated_at)}`,
      language_id: language_id,
      is_fallback: false,
      source: 'manual',
    };
  }

  const automatic_fallback = images[fallback_language_id]
    ? ([fallback_language_id, images[fallback_language_id]] as const)
    : Object.entries(images).find(([, url]) => Boolean(url));
  if (automatic_fallback) {
    return {
      url: automatic_fallback[1],
      language_id: automatic_fallback[0],
      is_fallback: true,
      source: 'automatic',
    };
  }

  const manual_fallback = identity
    ? (manual_image_store.find(
        identity.set_id,
        identity.card_id,
        identity.variant_id,
        fallback_language_id,
      ) ??
      manual_image_store.entries.value.find(
        (entry) =>
          entry.set_id === identity.set_id &&
          entry.card_id === identity.card_id &&
          entry.variant_id === identity.variant_id,
      ))
    : null;
  return {
    url: manual_fallback
      ? `${manual_fallback.url}?v=${encodeURIComponent(manual_fallback.updated_at)}`
      : null,
    language_id: manual_fallback?.language_id ?? null,
    is_fallback: Boolean(manual_fallback),
    source: manual_fallback ? 'manual' : null,
  };
};

// Compatibility helper for consumers that only need the URL.
export const localized_card_image = (
  images: Record<string, string>,
  language_id: string,
): string | null => {
  return resolve_card_image(images, language_id).url;
};
