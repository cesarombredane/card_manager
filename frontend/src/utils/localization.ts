// import types
import type { Localized_Text } from '../models/catalog';

// Returns a localized value with stable fallbacks for incomplete translations.
export const localized_value = (value: Localized_Text, language_id: string): string | null => {
  return (
    value[language_id] ??
    value.en ??
    Object.values(value).find((item): item is string => Boolean(item)) ??
    null
  );
};
