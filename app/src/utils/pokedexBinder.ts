import { getCards, getPokemon, getSeries, getSetById, getSets } from './dataManagement';
import type { Card, CardVariant, Pokemon, Set as CardSet } from './types';
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
const pokemonById = new Map(pokemon.map((entry) => [entry.id, entry]));
const basePokemonByNumber = new Map(
  pokemon.filter((entry) => entry.form === null).map((entry) => [entry.pokedex_id, entry])
);
const targetsCache = new Map<string, Pokemon[]>();
const candidatesCache = new Map<string, Map<string, PokedexCandidate[]>>();
const configCacheKey = (config: PokedexBinderConfig): string => JSON.stringify(config);

const pokemonAliases = new Map<string, Set<number>>();
const pokemonIdAliases = new Map<string, Set<string>>();
for (const entry of pokemon) {
  for (const [languageId, name] of Object.entries(entry.names)) {
    if (!name) continue;
    const key = `${languageId}:${name.trim().toLocaleLowerCase()}`;
    if (!pokemonAliases.has(key)) pokemonAliases.set(key, new Set());
    pokemonAliases.get(key)?.add(entry.pokedex_id);
    if (!pokemonIdAliases.has(key)) pokemonIdAliases.set(key, new Set());
    pokemonIdAliases.get(key)?.add(entry.id);
  }
}

const evolutionChildren = new Map<number, Set<number>>();
const evolutionNeighbors = new Map<number, Set<number>>();
const evolutionChildrenByPokemonId = new Map<string, Set<string>>();
const evolutionParentsByPokemonId = new Map<string, Set<string>>();
for (const card of cards) {
  if (!card.evolves_from || !card.pokemon?.length) continue;
  const parentNumbers = new Set(Object.entries(card.evolves_from).flatMap(([languageId, name]) => {
    if (!name) return [];
    const matches = pokemonAliases.get(`${languageId}:${name.trim().toLocaleLowerCase()}`);
    return matches?.size === 1 ? [...matches] : [];
  }));
  const childNumbers = new Set(card.pokemon.flatMap((pokemonId) => {
    const entry = pokemonById.get(pokemonId);
    return entry ? [entry.pokedex_id] : [];
  }));
  const parentPokemonIds = new Set(Object.entries(card.evolves_from).flatMap(([languageId, name]) => {
    if (!name) return [];
    const matches = pokemonIdAliases.get(`${languageId}:${name.trim().toLocaleLowerCase()}`);
    return matches?.size === 1 ? [...matches] : [];
  }));
  if (parentPokemonIds.size === 1) {
    const parentPokemonId = [...parentPokemonIds][0];
    if (parentPokemonId !== undefined) {
      for (const childPokemonId of card.pokemon) {
        if (parentPokemonId === childPokemonId || !pokemonById.has(childPokemonId)) continue;
        if (!evolutionChildrenByPokemonId.has(parentPokemonId)) evolutionChildrenByPokemonId.set(parentPokemonId, new Set());
        if (!evolutionParentsByPokemonId.has(childPokemonId)) evolutionParentsByPokemonId.set(childPokemonId, new Set());
        evolutionChildrenByPokemonId.get(parentPokemonId)?.add(childPokemonId);
        evolutionParentsByPokemonId.get(childPokemonId)?.add(parentPokemonId);
      }
    }
  }
  if (parentNumbers.size !== 1) continue;
  const parent = [...parentNumbers][0];
  if (parent === undefined) continue;
  for (const child of childNumbers) {
    if (parent === child) continue;
    if (!evolutionChildren.has(parent)) evolutionChildren.set(parent, new Set());
    evolutionChildren.get(parent)?.add(child);
    if (!evolutionNeighbors.has(parent)) evolutionNeighbors.set(parent, new Set());
    if (!evolutionNeighbors.has(child)) evolutionNeighbors.set(child, new Set());
    evolutionNeighbors.get(parent)?.add(child);
    evolutionNeighbors.get(child)?.add(parent);
  }
}

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

export const pokedexTargets = (config: PokedexBinderConfig): Pokemon[] => {
  const cacheKey = configCacheKey(config);
  const cached = targetsCache.get(cacheKey);
  if (cached) return cached;
  const targets = pokemon
    .filter((entry) => entry.form === null
      || (entry.form === 'mega' ? config.include_mega_forms : config.include_regional_forms))
    .sort((left, right) => left.pokedex_id - right.pokedex_id || left.name.localeCompare(right.name));
  targetsCache.set(cacheKey, targets);
  return targets;
};

export const groupPokemonByEvolution = (entries: Pokemon[]): Pokemon[][] => {
  const selectedNumbers = new Set(entries.map((entry) => entry.pokedex_id));
  const unvisited = new Set(selectedNumbers);
  const components: number[][] = [];
  while (unvisited.size) {
    const start = Math.min(...unvisited);
    const component = new Set<number>();
    const pending = [start];
    while (pending.length) {
      const current = pending.pop();
      if (current === undefined || component.has(current)) continue;
      component.add(current);
      unvisited.delete(current);
      for (const neighbor of evolutionNeighbors.get(current) ?? []) {
        if (selectedNumbers.has(neighbor) && !component.has(neighbor)) pending.push(neighbor);
      }
    }
    components.push([...component]);
  }
  components.sort((left, right) => Math.min(...left) - Math.min(...right));

  const orderedNumbers = components.flatMap((component) => {
    const componentSet = new Set(component);
    const indegree = new Map(component.map((number) => [number, 0]));
    for (const parent of component) {
      for (const child of evolutionChildren.get(parent) ?? []) {
        if (componentSet.has(child)) indegree.set(child, (indegree.get(child) ?? 0) + 1);
      }
    }
    const ready = component.filter((number) => indegree.get(number) === 0).sort((left, right) => left - right);
    const ordered: number[] = [];
    while (ready.length) {
      const current = ready.shift();
      if (current === undefined) break;
      ordered.push(current);
      for (const child of evolutionChildren.get(current) ?? []) {
        if (!componentSet.has(child)) continue;
        const remaining = (indegree.get(child) ?? 0) - 1;
        indegree.set(child, remaining);
        if (remaining === 0) {
          ready.push(child);
          ready.sort((left, right) => left - right);
        }
      }
    }
    const orderedSet = new Set(ordered);
    return [...ordered, ...component.filter((number) => !orderedSet.has(number)).sort((left, right) => left - right)];
  });
  const numberRank = new Map(orderedNumbers.map((number, index) => [number, index]));
  const regionalFormOrder = ['alolan', 'galarian', 'hisuian', 'paldean'] as const;
  type EvolutionBranch = 'base' | typeof regionalFormOrder[number];
  const regionalForms = new Set<string>(regionalFormOrder);
  const selectedIds = new Set(entries.map((entry) => entry.id));
  const branchByPokemonId = new Map<string, EvolutionBranch>();
  for (const entry of entries) {
    if (entry.form && regionalForms.has(entry.form)) {
      branchByPokemonId.set(entry.id, entry.form as EvolutionBranch);
    }
  }
  let branchChanged = true;
  while (branchChanged) {
    branchChanged = false;
    for (const entry of entries) {
      if (entry.form !== null || branchByPokemonId.has(entry.id)) continue;
      const inheritedBranches = new Set(
        [...(evolutionParentsByPokemonId.get(entry.id) ?? [])]
          .filter((parentId) => selectedIds.has(parentId))
          .flatMap((parentId) => {
            const branch = branchByPokemonId.get(parentId);
            return branch && branch !== 'base' ? [branch] : [];
          })
      );
      if (inheritedBranches.size === 1) {
        branchByPokemonId.set(entry.id, [...inheritedBranches][0] as EvolutionBranch);
        branchChanged = true;
      }
    }
  }

  const compareEntries = (left: Pokemon, right: Pokemon): number =>
    (numberRank.get(left.pokedex_id) ?? Number.MAX_SAFE_INTEGER)
      - (numberRank.get(right.pokedex_id) ?? Number.MAX_SAFE_INTEGER)
    || Number(left.form !== null) - Number(right.form !== null)
    || left.name.localeCompare(right.name);
  const orderBranch = (branchEntries: Pokemon[]): Pokemon[] => {
    const branchIds = new Set(branchEntries.map((entry) => entry.id));
    const indegree = new Map(branchEntries.map((entry) => [entry.id, 0]));
    for (const entry of branchEntries) {
      for (const childId of evolutionChildrenByPokemonId.get(entry.id) ?? []) {
        if (branchIds.has(childId)) indegree.set(childId, (indegree.get(childId) ?? 0) + 1);
      }
    }
    const ready = branchEntries.filter((entry) => indegree.get(entry.id) === 0).sort(compareEntries);
    const ordered: Pokemon[] = [];
    while (ready.length) {
      const current = ready.shift();
      if (!current) break;
      ordered.push(current);
      for (const childId of evolutionChildrenByPokemonId.get(current.id) ?? []) {
        if (!branchIds.has(childId)) continue;
        const remaining = (indegree.get(childId) ?? 0) - 1;
        indegree.set(childId, remaining);
        if (remaining === 0) {
          const child = pokemonById.get(childId);
          if (child) ready.push(child);
          ready.sort(compareEntries);
        }
      }
    }
    const orderedIds = new Set(ordered.map((entry) => entry.id));
    return [...ordered, ...branchEntries.filter((entry) => !orderedIds.has(entry.id)).sort(compareEntries)];
  };

  return components.flatMap((component) => {
    const componentNumbers = new Set(component);
    const componentEntries = entries.filter((entry) => componentNumbers.has(entry.pokedex_id));
    const branches: EvolutionBranch[] = ['base', ...regionalFormOrder];
    return branches
      .map((branch) => orderBranch(componentEntries.filter((entry) =>
        (branchByPokemonId.get(entry.id) ?? 'base') === branch
      )))
      .filter((branch) => branch.length > 0);
  });
};

export const orderPokemonByEvolution = (entries: Pokemon[]): Pokemon[] =>
  groupPokemonByEvolution(entries).flat();

const setMatches = (set: CardSet, config: PokedexBinderConfig): boolean => {
  const asia = set.series_id.startsWith('asia-');
  return (config.region === 'all' || (config.region === 'asia') === asia)
    && config.series_ids.includes(set.series_id);
};

const languageForSet = (set: CardSet, config: PokedexBinderConfig): string =>
  set.series_id.startsWith('asia-') ? config.asia_language_id : config.international_language_id;

const variantHasLanguage = (variant: CardVariant, set: CardSet, languageId: string): boolean => {
  const languageIds = variant.language_ids?.length
    ? variant.language_ids
    : set.language_ids;
  return languageIds.includes(languageId);
};

const cardTargetIds = (card: Card, config: PokedexBinderConfig): string[] => uniqueValues((card.pokemon ?? []).flatMap((pokemonId) => {
  const represented = pokemonById.get(pokemonId);
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
  const cacheKey = configCacheKey(config);
  const cached = candidatesCache.get(cacheKey);
  if (cached) return cached;
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
  candidatesCache.set(cacheKey, result);
  return result;
};

export const matchingPokedexRequirementIds = (
  config: PokedexBinderConfig,
  setId: string,
  cardId: string,
  variantId: string,
  languageId: string
): string[] => {
  const card = cardBySetAndId.get(`${setId}:${cardId}`);
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
