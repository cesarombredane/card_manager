// import utils
import { get_cards, get_pokemon, get_series, get_set_by_id } from '../services/catalog_storage';
import { unique_values } from './array_utils';

// import types
import type { Pokedex_Binder_Config, Pokedex_Candidate } from '../models/pokedex_binder';
import type { Card, Card_Variant, Pokemon, Set as Card_Set } from '../models/catalog';
import type { Display_Card } from './card_display';

export type {
  Pokedex_Region,
  Pokedex_Binder_Config,
  Pokedex_Candidate,
} from '../models/pokedex_binder';

export const copy_pokedex_binder_config = (
  config: Pokedex_Binder_Config,
): Pokedex_Binder_Config => ({
  include_regional_forms: config.include_regional_forms,
  include_mega_forms: config.include_mega_forms,
  region: config.region,
  international_language_id: config.international_language_id,
  asia_language_id: config.asia_language_id,
  series_ids: [...config.series_ids],
  variant_types: [...config.variant_types],
  rarities: [...config.rarities],
});

const pokemon = get_pokemon();
const cards = get_cards();
const card_by_set_and_id = new Map(cards.map((card) => [`${card.set_id}:${card.id}`, card]));
const pokemon_by_id = new Map(pokemon.map((entry) => [entry.id, entry]));
const base_pokemon_by_number = new Map(
  pokemon.filter((entry) => entry.form === null).map((entry) => [entry.pokedex_id, entry]),
);
const targets_cache = new Map<string, Pokemon[]>();
const candidates_cache = new Map<string, Map<string, Pokedex_Candidate[]>>();
const config_cache_key = (config: Pokedex_Binder_Config): string => JSON.stringify(config);

const pokemon_aliases = new Map<string, Set<number>>();
const pokemon_id_aliases = new Map<string, Set<string>>();
for (const entry of pokemon) {
  for (const [language_id, name] of Object.entries(entry.names)) {
    if (!name) continue;
    const key = `${language_id}:${name.trim().toLocaleLowerCase()}`;
    if (!pokemon_aliases.has(key)) pokemon_aliases.set(key, new Set());
    pokemon_aliases.get(key)?.add(entry.pokedex_id);
    if (!pokemon_id_aliases.has(key)) pokemon_id_aliases.set(key, new Set());
    pokemon_id_aliases.get(key)?.add(entry.id);
  }
}

const evolution_children = new Map<number, Set<number>>();
const evolution_neighbors = new Map<number, Set<number>>();
const evolution_children_by_pokemon_id = new Map<string, Set<string>>();
const evolution_parents_by_pokemon_id = new Map<string, Set<string>>();
for (const card of cards) {
  if (!card.evolves_from || !card.pokemon?.length) continue;
  const parent_numbers = new Set(
    Object.entries(card.evolves_from).flatMap(([language_id, name]) => {
      if (!name) return [];
      const matches = pokemon_aliases.get(`${language_id}:${name.trim().toLocaleLowerCase()}`);
      return matches?.size === 1 ? [...matches] : [];
    }),
  );
  const child_numbers = new Set(
    card.pokemon.flatMap((pokemon_id) => {
      const entry = pokemon_by_id.get(pokemon_id);
      return entry ? [entry.pokedex_id] : [];
    }),
  );
  const parent_pokemon_ids = new Set(
    Object.entries(card.evolves_from).flatMap(([language_id, name]) => {
      if (!name) return [];
      const matches = pokemon_id_aliases.get(`${language_id}:${name.trim().toLocaleLowerCase()}`);
      return matches?.size === 1 ? [...matches] : [];
    }),
  );
  if (parent_pokemon_ids.size === 1) {
    const parent_pokemon_id = [...parent_pokemon_ids][0];
    if (parent_pokemon_id !== undefined) {
      for (const child_pokemon_id of card.pokemon) {
        if (parent_pokemon_id === child_pokemon_id || !pokemon_by_id.has(child_pokemon_id))
          continue;
        if (!evolution_children_by_pokemon_id.has(parent_pokemon_id))
          evolution_children_by_pokemon_id.set(parent_pokemon_id, new Set());
        if (!evolution_parents_by_pokemon_id.has(child_pokemon_id))
          evolution_parents_by_pokemon_id.set(child_pokemon_id, new Set());
        evolution_children_by_pokemon_id.get(parent_pokemon_id)?.add(child_pokemon_id);
        evolution_parents_by_pokemon_id.get(child_pokemon_id)?.add(parent_pokemon_id);
      }
    }
  }
  if (parent_numbers.size !== 1) continue;
  const parent = [...parent_numbers][0];
  if (parent === undefined) continue;
  for (const child of child_numbers) {
    if (parent === child) continue;
    if (!evolution_children.has(parent)) evolution_children.set(parent, new Set());
    evolution_children.get(parent)?.add(child);
    if (!evolution_neighbors.has(parent)) evolution_neighbors.set(parent, new Set());
    if (!evolution_neighbors.has(child)) evolution_neighbors.set(child, new Set());
    evolution_neighbors.get(parent)?.add(child);
    evolution_neighbors.get(child)?.add(parent);
  }
}

export const pokedex_series_options = get_series().map((item) => ({
  label: item.name,
  value: item.id,
  region_id: item.region_id,
}));
export const pokedex_variant_types = unique_values(
  cards.flatMap((card) => card.variants.map((variant) => variant.type ?? variant.id.split('-')[0])),
);
export const pokedex_rarities = unique_values(cards.map((card) => card.rarity));

export const pokedex_requirement_id = (pokemon_id: string): string => `pokedex:${pokemon_id}`;
export const pokemon_id_from_requirement = (requirement_id: string): string =>
  requirement_id.replace(/^pokedex:/, '');

const preview_cache = new Map<string, Map<string, string[]>>();
const preview_urls_by_target = (config: Pokedex_Binder_Config): Map<string, string[]> => {
  const cache_key = JSON.stringify(config);
  const cached = preview_cache.get(cache_key);
  if (cached) return cached;
  const result = new Map<string, string[]>();
  for (const [pokemon_id, candidates] of pokedex_candidates_by_target(config)) {
    const urls = unique_values(
      candidates.flatMap((candidate) => {
        const card = card_by_set_and_id.get(`${candidate.set_id}:${candidate.card_id}`);
        const variant = card?.variants.find((item) => item.id === candidate.variant_id);
        const url =
          variant?.images[candidate.language_id] ??
          (variant ? Object.values(variant.images).find(Boolean) : undefined);
        return url ? [url] : [];
      }),
    );
    result.set(pokemon_id, urls);
  }
  preview_cache.set(cache_key, result);
  return result;
};

const evenly_sample = (values: string[], maximum: number): string[] => {
  if (values.length <= maximum) return values;
  return Array.from(
    { length: maximum },
    (_, index) => values[Math.floor((index * values.length) / maximum)],
  );
};

export const pokedex_placeholder_card = (
  requirement_id: string,
  candidate_count: number,
  language_id: string,
  config?: Pokedex_Binder_Config,
): Display_Card | null => {
  const target = pokemon.find((entry) => entry.id === pokemon_id_from_requirement(requirement_id));
  if (!target) return null;
  const name = target.names[language_id] ?? target.name;
  return {
    id: requirement_id,
    card_id: target.id,
    set_id: 'pokedex-requirement',
    set_name: 'Pokédex requirement',
    language_id: language_id,
    variant_id: candidate_count ? 'multiple' : 'unavailable',
    variant_type: candidate_count ? 'multiple' : 'unavailable',
    number: String(target.pokedex_id).padStart(4, '0'),
    display_name: candidate_count
      ? `${name} — ${candidate_count} possible cards`
      : `${name} — no available card`,
    category: 'pokemon',
    rarity: 'Pokédex slot',
    hp: null,
    illustrator: null,
    types: [],
    pokemon_names: [target.id],
    energy_costs: [],
    image_url: null,
    preview_image_urls:
      candidate_count > 1 && config
        ? evenly_sample(preview_urls_by_target(config).get(target.id) ?? [], 12)
        : [],
    image_language_id: null,
    image_is_fallback: false,
    image_source: null,
    cardmarket: null,
  };
};

export const pokedex_targets = (config: Pokedex_Binder_Config): Pokemon[] => {
  const cache_key = config_cache_key(config);
  const cached = targets_cache.get(cache_key);
  if (cached) return cached;
  const targets = pokemon
    .filter(
      (entry) =>
        entry.form === null ||
        (entry.form === 'mega' ? config.include_mega_forms : config.include_regional_forms),
    )
    .sort(
      (left, right) => left.pokedex_id - right.pokedex_id || left.name.localeCompare(right.name),
    );
  targets_cache.set(cache_key, targets);
  return targets;
};

export const group_pokemon_by_evolution = (entries: Pokemon[]): Pokemon[][] => {
  const selected_numbers = new Set(entries.map((entry) => entry.pokedex_id));
  const unvisited = new Set(selected_numbers);
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
      for (const neighbor of evolution_neighbors.get(current) ?? []) {
        if (selected_numbers.has(neighbor) && !component.has(neighbor)) pending.push(neighbor);
      }
    }
    components.push([...component]);
  }
  components.sort((left, right) => Math.min(...left) - Math.min(...right));

  const ordered_numbers = components.flatMap((component) => {
    const component_set = new Set(component);
    const indegree = new Map(component.map((number) => [number, 0]));
    for (const parent of component) {
      for (const child of evolution_children.get(parent) ?? []) {
        if (component_set.has(child)) indegree.set(child, (indegree.get(child) ?? 0) + 1);
      }
    }
    const ready = component
      .filter((number) => indegree.get(number) === 0)
      .sort((left, right) => left - right);
    const ordered: number[] = [];
    while (ready.length) {
      const current = ready.shift();
      if (current === undefined) break;
      ordered.push(current);
      for (const child of evolution_children.get(current) ?? []) {
        if (!component_set.has(child)) continue;
        const remaining = (indegree.get(child) ?? 0) - 1;
        indegree.set(child, remaining);
        if (remaining === 0) {
          ready.push(child);
          ready.sort((left, right) => left - right);
        }
      }
    }
    const ordered_set = new Set(ordered);
    return [
      ...ordered,
      ...component.filter((number) => !ordered_set.has(number)).sort((left, right) => left - right),
    ];
  });
  const number_rank = new Map(ordered_numbers.map((number, index) => [number, index]));
  const regional_form_order = ['alolan', 'galarian', 'hisuian', 'paldean'] as const;
  type Evolution_Branch = 'base' | (typeof regional_form_order)[number];
  const regional_forms = new Set<string>(regional_form_order);
  const selected_ids = new Set(entries.map((entry) => entry.id));
  const branch_by_pokemon_id = new Map<string, Evolution_Branch>();
  for (const entry of entries) {
    if (entry.form && regional_forms.has(entry.form)) {
      branch_by_pokemon_id.set(entry.id, entry.form as Evolution_Branch);
    }
  }
  let branch_changed = true;
  while (branch_changed) {
    branch_changed = false;
    for (const entry of entries) {
      if (entry.form !== null || branch_by_pokemon_id.has(entry.id)) continue;
      const inherited_branches = new Set(
        [...(evolution_parents_by_pokemon_id.get(entry.id) ?? [])]
          .filter((parent_id) => selected_ids.has(parent_id))
          .flatMap((parent_id) => {
            const branch = branch_by_pokemon_id.get(parent_id);
            return branch && branch !== 'base' ? [branch] : [];
          }),
      );
      if (inherited_branches.size === 1) {
        branch_by_pokemon_id.set(entry.id, [...inherited_branches][0] as Evolution_Branch);
        branch_changed = true;
      }
    }
  }

  const compare_entries = (left: Pokemon, right: Pokemon): number =>
    (number_rank.get(left.pokedex_id) ?? Number.MAX_SAFE_INTEGER) -
      (number_rank.get(right.pokedex_id) ?? Number.MAX_SAFE_INTEGER) ||
    Number(left.form !== null) - Number(right.form !== null) ||
    left.name.localeCompare(right.name);
  const order_branch = (branch_entries: Pokemon[]): Pokemon[] => {
    const branch_ids = new Set(branch_entries.map((entry) => entry.id));
    const indegree = new Map(branch_entries.map((entry) => [entry.id, 0]));
    for (const entry of branch_entries) {
      for (const child_id of evolution_children_by_pokemon_id.get(entry.id) ?? []) {
        if (branch_ids.has(child_id)) indegree.set(child_id, (indegree.get(child_id) ?? 0) + 1);
      }
    }
    const ready = branch_entries
      .filter((entry) => indegree.get(entry.id) === 0)
      .sort(compare_entries);
    const ordered: Pokemon[] = [];
    while (ready.length) {
      const current = ready.shift();
      if (!current) break;
      ordered.push(current);
      for (const child_id of evolution_children_by_pokemon_id.get(current.id) ?? []) {
        if (!branch_ids.has(child_id)) continue;
        const remaining = (indegree.get(child_id) ?? 0) - 1;
        indegree.set(child_id, remaining);
        if (remaining === 0) {
          const child = pokemon_by_id.get(child_id);
          if (child) ready.push(child);
          ready.sort(compare_entries);
        }
      }
    }
    const ordered_ids = new Set(ordered.map((entry) => entry.id));
    return [
      ...ordered,
      ...branch_entries.filter((entry) => !ordered_ids.has(entry.id)).sort(compare_entries),
    ];
  };

  return components.flatMap((component) => {
    const component_numbers = new Set(component);
    const component_entries = entries.filter((entry) => component_numbers.has(entry.pokedex_id));
    const branches: Evolution_Branch[] = ['base', ...regional_form_order];
    return branches
      .map((branch) =>
        order_branch(
          component_entries.filter(
            (entry) => (branch_by_pokemon_id.get(entry.id) ?? 'base') === branch,
          ),
        ),
      )
      .filter((branch) => branch.length > 0);
  });
};

export const order_pokemon_by_evolution = (entries: Pokemon[]): Pokemon[] =>
  group_pokemon_by_evolution(entries).flat();

const set_matches = (set: Card_Set, config: Pokedex_Binder_Config): boolean => {
  const asia = set.series_id.startsWith('asia-');
  return (
    (config.region === 'all' || (config.region === 'asia') === asia) &&
    config.series_ids.includes(set.series_id)
  );
};

const language_for_set = (set: Card_Set, config: Pokedex_Binder_Config): string =>
  set.series_id.startsWith('asia-') ? config.asia_language_id : config.international_language_id;

const variant_has_language = (
  variant: Card_Variant,
  set: Card_Set,
  language_id: string,
): boolean => {
  const language_ids = variant.language_ids?.length ? variant.language_ids : set.language_ids;
  return language_ids.includes(language_id);
};

const card_target_ids = (card: Card, config: Pokedex_Binder_Config): string[] =>
  unique_values(
    (card.pokemon ?? []).flatMap((pokemon_id) => {
      const represented = pokemon_by_id.get(pokemon_id);
      if (!represented || represented.form === null) return represented ? [represented.id] : [];
      const form_included =
        represented.form === 'mega' ? config.include_mega_forms : config.include_regional_forms;
      if (form_included) return [represented.id];
      const base = base_pokemon_by_number.get(represented.pokedex_id);
      return base ? [base.id] : [];
    }),
  );

export const candidate_key = (candidate: Pokedex_Candidate): string =>
  `${candidate.set_id}:${candidate.card_id}:${candidate.variant_id}:${candidate.language_id}`;

export const pokedex_candidates = (
  config: Pokedex_Binder_Config,
  target_pokemon_id?: string,
): Pokedex_Candidate[] =>
  cards.flatMap((card) => {
    if (!config.rarities.includes(card.rarity)) return [];
    if (target_pokemon_id && !card_target_ids(card, config).includes(target_pokemon_id)) return [];
    const set = get_set_by_id(card.set_id);
    if (!set || !set_matches(set, config)) return [];
    const language_id = language_for_set(set, config);
    return card.variants.flatMap((variant) => {
      const variant_type = variant.type ?? variant.id.split('-')[0];
      return config.variant_types.includes(variant_type) &&
        variant_has_language(variant, set, language_id)
        ? [
            {
              set_id: card.set_id,
              card_id: card.id,
              variant_id: variant.id,
              language_id: language_id,
            },
          ]
        : [];
    });
  });

export const pokedex_candidates_by_target = (
  config: Pokedex_Binder_Config,
): Map<string, Pokedex_Candidate[]> => {
  const cache_key = config_cache_key(config);
  const cached = candidates_cache.get(cache_key);
  if (cached) return cached;
  const target_ids = new Set(pokedex_targets(config).map((target) => target.id));
  const result = new Map<string, Pokedex_Candidate[]>();
  for (const card of cards) {
    if (!config.rarities.includes(card.rarity)) continue;
    const matched_targets = card_target_ids(card, config).filter((pokemon_id) =>
      target_ids.has(pokemon_id),
    );
    if (matched_targets.length === 0) continue;
    const set = get_set_by_id(card.set_id);
    if (!set || !set_matches(set, config)) continue;
    const language_id = language_for_set(set, config);
    for (const variant of card.variants) {
      const variant_type = variant.type ?? variant.id.split('-')[0];
      if (
        !config.variant_types.includes(variant_type) ||
        !variant_has_language(variant, set, language_id)
      )
        continue;
      const candidate = {
        set_id: card.set_id,
        card_id: card.id,
        variant_id: variant.id,
        language_id: language_id,
      };
      for (const pokemon_id of matched_targets) {
        if (!result.has(pokemon_id)) result.set(pokemon_id, []);
        result.get(pokemon_id)?.push(candidate);
      }
    }
  }
  candidates_cache.set(cache_key, result);
  return result;
};

export const matching_pokedex_requirement_ids = (
  config: Pokedex_Binder_Config,
  set_id: string,
  card_id: string,
  variant_id: string,
  language_id: string,
): string[] => {
  const card = card_by_set_and_id.get(`${set_id}:${card_id}`);
  const set = get_set_by_id(set_id);
  const variant = card?.variants.find((candidate) => candidate.id === variant_id);
  if (
    !card ||
    !set ||
    !variant ||
    !set_matches(set, config) ||
    !config.rarities.includes(card.rarity)
  )
    return [];
  if (
    language_for_set(set, config) !== language_id ||
    !variant_has_language(variant, set, language_id)
  )
    return [];
  if (!config.variant_types.includes(variant.type ?? variant.id.split('-')[0])) return [];
  const target_ids = new Set(pokedex_targets(config).map((target) => target.id));
  return card_target_ids(card, config)
    .filter((pokemon_id) => target_ids.has(pokemon_id))
    .map(pokedex_requirement_id);
};

export const default_pokedex_config = (
  international_language_id: string,
  asia_language_id = 'ja',
): Pokedex_Binder_Config => ({
  include_regional_forms: true,
  include_mega_forms: true,
  region: 'all',
  international_language_id: international_language_id,
  asia_language_id: asia_language_id,
  series_ids: pokedex_series_options.map((option) => option.value),
  variant_types: [...pokedex_variant_types],
  rarities: [...pokedex_rarities],
});
