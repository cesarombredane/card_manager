import { getCards, getPokemon, getSeries, getSetById, getSets } from './dataManagement';
import type { Card, CardVariant, Pokemon, Set } from './types';
import { uniqueValues } from './arrayUtils';
import type { DisplayCard } from './cardDisplay';

export type PokedexRegion = 'all' | 'intl' | 'asia';

export type PokedexBinderConfig = {
  include_regional_forms: boolean;
  include_mega_forms: boolean;
  region: PokedexRegion;
  international_language_id: string;
  asia_language_id: string;
  series_ids: string[];
  variant_types: string[];
  rarities: string[];
};

export type PokedexCandidate = {
  set_id: string;
  card_id: string;
  variant_id: string;
  language_id: string;
};

export const copyPokedexBinderConfig = (config: PokedexBinderConfig): PokedexBinderConfig => ({
  include_regional_forms: config.include_regional_forms,
  include_mega_forms: config.include_mega_forms,
  region: config.region,
  international_language_id: config.international_language_id,
  asia_language_id: config.asia_language_id,
  series_ids: [...config.series_ids],
  variant_types: [...config.variant_types],
  rarities: [...config.rarities]
});

const pokemon = getPokemon();
const sets = getSets();
const cards = getCards();
const cardBySetAndId = new Map(cards.map((card) => [`${card.set_id}:${card.id}`, card]));
const basePokemonByNumber = new Map(
  pokemon.filter((entry) => entry.form === null).map((entry) => [entry.pokedex_id, entry])
);

export const pokedexSeriesOptions = getSeries()
  .map((item) => ({ label: item.name, value: item.id, region_id: item.region_id }));
export const pokedexVariantTypes = uniqueValues(cards.flatMap((card) => card.variants
  .map((variant) => variant.type ?? variant.id.split('-')[0])));
export const pokedexRarities = uniqueValues(cards.map((card) => card.rarity));

export const pokedexRequirementId = (pokemonId: string): string => `pokedex:${pokemonId}`;
export const pokemonIdFromRequirement = (requirementId: string): string => requirementId.replace(/^pokedex:/, '');

const previewCache = new Map<string, Map<string, string[]>>();
const previewUrlsByTarget = (config: PokedexBinderConfig): Map<string, string[]> => {
  const cacheKey = JSON.stringify(config);
  const cached = previewCache.get(cacheKey);
  if (cached) return cached;
  const result = new Map<string, string[]>();
  for (const [pokemonId, candidates] of pokedexCandidatesByTarget(config)) {
    const urls = uniqueValues(candidates.flatMap((candidate) => {
      const card = cardBySetAndId.get(`${candidate.set_id}:${candidate.card_id}`);
      const variant = card?.variants.find((item) => item.id === candidate.variant_id);
      const url = variant?.images[candidate.language_id]
        ?? (variant ? Object.values(variant.images).find(Boolean) : undefined);
      return url ? [url] : [];
    }));
    result.set(pokemonId, urls);
  }
  previewCache.set(cacheKey, result);
  return result;
};

const evenlySample = (values: string[], maximum: number): string[] => {
  if (values.length <= maximum) return values;
  return Array.from({ length: maximum }, (_, index) => values[Math.floor(index * values.length / maximum)]);
};

export const pokedexPlaceholderCard = (
  requirementId: string,
  candidateCount: number,
  languageId: string,
  config?: PokedexBinderConfig
): DisplayCard | null => {
  const target = pokemon.find((entry) => entry.id === pokemonIdFromRequirement(requirementId));
  if (!target) return null;
  const name = target.names[languageId] ?? target.name;
  return {
    id: requirementId,
    card_id: target.id,
    set_id: 'pokedex-requirement',
    set_name: 'Pokédex requirement',
    language_id: languageId,
    variant_id: candidateCount ? 'multiple' : 'unavailable',
    variant_type: candidateCount ? 'multiple' : 'unavailable',
    number: String(target.pokedex_id).padStart(4, '0'),
    display_name: candidateCount ? `${name} — ${candidateCount} possible cards` : `${name} — no available card`,
    category: 'pokemon',
    rarity: 'Pokédex slot',
    hp: null,
    illustrator: null,
    types: [],
    pokemon_names: [target.id],
    energy_costs: [],
    image_url: null,
    preview_image_urls: candidateCount > 1 && config
      ? evenlySample(previewUrlsByTarget(config).get(target.id) ?? [], 12)
      : [],
    image_language_id: null,
    image_is_fallback: false,
    image_source: null,
    cardmarket: null
  };
};

export const pokedexTargets = (config: PokedexBinderConfig): Pokemon[] => pokemon
  .filter((entry) => entry.form === null
    || (entry.form === 'mega' ? config.include_mega_forms : config.include_regional_forms))
  .sort((left, right) => left.pokedex_id - right.pokedex_id || left.name.localeCompare(right.name));

const setMatches = (set: Set, config: PokedexBinderConfig): boolean => {
  const asia = set.series_id.startsWith('asia-');
  return (config.region === 'all' || (config.region === 'asia') === asia)
    && config.series_ids.includes(set.series_id);
};

const languageForSet = (set: Set, config: PokedexBinderConfig): string =>
  set.series_id.startsWith('asia-') ? config.asia_language_id : config.international_language_id;

const variantHasLanguage = (variant: CardVariant, set: Set, languageId: string): boolean => {
  const languageIds = variant.language_ids?.length
    ? variant.language_ids
    : set.language_ids;
  return languageIds.includes(languageId);
};

const cardTargetIds = (card: Card, config: PokedexBinderConfig): string[] => uniqueValues((card.pokemon ?? []).flatMap((pokemonId) => {
  const represented = pokemon.find((entry) => entry.id === pokemonId);
  if (!represented || represented.form === null) return represented ? [represented.id] : [];
  const formIncluded = represented.form === 'mega' ? config.include_mega_forms : config.include_regional_forms;
  if (formIncluded) return [represented.id];
  const base = basePokemonByNumber.get(represented.pokedex_id);
  return base ? [base.id] : [];
}));

export const candidateKey = (candidate: PokedexCandidate): string =>
  `${candidate.set_id}:${candidate.card_id}:${candidate.variant_id}:${candidate.language_id}`;

export const pokedexCandidates = (config: PokedexBinderConfig, targetPokemonId?: string): PokedexCandidate[] => cards.flatMap((card) => {
  if (!config.rarities.includes(card.rarity)) return [];
  if (targetPokemonId && !cardTargetIds(card, config).includes(targetPokemonId)) return [];
  const set = getSetById(card.set_id);
  if (!set || !setMatches(set, config)) return [];
  const languageId = languageForSet(set, config);
  return card.variants.flatMap((variant) => {
    const variantType = variant.type ?? variant.id.split('-')[0];
    return config.variant_types.includes(variantType) && variantHasLanguage(variant, set, languageId)
      ? [{ set_id: card.set_id, card_id: card.id, variant_id: variant.id, language_id: languageId }]
      : [];
  });
});

export const pokedexCandidatesByTarget = (config: PokedexBinderConfig): Map<string, PokedexCandidate[]> => {
  const targetIds = new Set(pokedexTargets(config).map((target) => target.id));
  const result = new Map<string, PokedexCandidate[]>();
  for (const card of cards) {
    if (!config.rarities.includes(card.rarity)) continue;
    const matchedTargets = cardTargetIds(card, config).filter((pokemonId) => targetIds.has(pokemonId));
    if (matchedTargets.length === 0) continue;
    const set = getSetById(card.set_id);
    if (!set || !setMatches(set, config)) continue;
    const languageId = languageForSet(set, config);
    for (const variant of card.variants) {
      const variantType = variant.type ?? variant.id.split('-')[0];
      if (!config.variant_types.includes(variantType) || !variantHasLanguage(variant, set, languageId)) continue;
      const candidate = { set_id: card.set_id, card_id: card.id, variant_id: variant.id, language_id: languageId };
      for (const pokemonId of matchedTargets) {
        if (!result.has(pokemonId)) result.set(pokemonId, []);
        result.get(pokemonId)?.push(candidate);
      }
    }
  }
  return result;
};

export const matchingPokedexRequirementIds = (
  config: PokedexBinderConfig,
  setId: string,
  cardId: string,
  variantId: string,
  languageId: string
): string[] => {
  const card = cards.find((candidate) => candidate.set_id === setId && candidate.id === cardId);
  const set = getSetById(setId);
  const variant = card?.variants.find((candidate) => candidate.id === variantId);
  if (!card || !set || !variant || !setMatches(set, config) || !config.rarities.includes(card.rarity)) return [];
  if (languageForSet(set, config) !== languageId || !variantHasLanguage(variant, set, languageId)) return [];
  if (!config.variant_types.includes(variant.type ?? variant.id.split('-')[0])) return [];
  const targetIds = new Set(pokedexTargets(config).map((target) => target.id));
  return cardTargetIds(card, config).filter((pokemonId) => targetIds.has(pokemonId)).map(pokedexRequirementId);
};

export const defaultPokedexConfig = (
  internationalLanguageId: string,
  asiaLanguageId = 'ja'
): PokedexBinderConfig => ({
  include_regional_forms: true,
  include_mega_forms: true,
  region: 'all',
  international_language_id: internationalLanguageId,
  asia_language_id: asiaLanguageId,
  series_ids: pokedexSeriesOptions.map((option) => option.value),
  variant_types: [...pokedexVariantTypes],
  rarities: [...pokedexRarities]
});
