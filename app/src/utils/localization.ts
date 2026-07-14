import type { LocalizedText } from './types';


// Returns a localized value with stable fallbacks for incomplete translations.
export const localizedValue = (value: LocalizedText, languageId: string): string | null => {
  return value[languageId]
    ?? value.en
    ?? Object.values(value).find((item): item is string => Boolean(item))
    ?? null;
};
