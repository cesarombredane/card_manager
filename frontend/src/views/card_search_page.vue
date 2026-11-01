<template>
  <q-page class="bg-dark q-pa-md">
    <section class="q-mb-md">
      <div class="text-overline text-primary">Card search</div>
      <h1 class="text-h4 text-weight-bold q-my-none">Search every card</h1>
      <div class="text-body2 text-secondary">
        Showing {{ displayed_cards.length }} of {{ filtered_cards.length }} collectible cards
        including variants
      </div>
    </section>

    <section class="row q-col-gutter-md items-center q-mb-md">
      <div class="col-12 col-sm-6 col-md-4">
        <q-input
          v-model="search"
          dark
          dense
          outlined
          clearable
          debounce="150"
          label="Search a card by name"
          @clear="search = ''"
        >
          <template #prepend>
            <q-icon name="search" />
          </template>
        </q-input>
      </div>
      <div class="col-12 col-sm-6 col-md-4">
        <div class="row no-wrap items-center q-gutter-xs">
          <q-btn
            aria-label="Previous Pokemon"
            :disable="!previous_pokemon"
            dark
            dense
            flat
            round
            icon="chevron_left"
            no-caps
            @click="select_adjacent_pokemon(previous_pokemon)"
          >
            <q-tooltip v-if="previous_pokemon">Previous: {{ previous_pokemon.label }}</q-tooltip>
          </q-btn>
          <q-select
            v-model="selected_pokemon"
            class="col"
            :options="filtered_pokemon_options"
            emit-value
            map-options
            dark
            dense
            outlined
            clearable
            use-input
            fill-input
            hide-selected
            input-debounce="0"
            label="Pokemon"
            @filter="filter_pokemon"
          />
          <q-btn
            aria-label="Next Pokemon"
            :disable="!next_pokemon"
            dark
            dense
            flat
            round
            icon="chevron_right"
            no-caps
            @click="select_adjacent_pokemon(next_pokemon)"
          >
            <q-tooltip v-if="next_pokemon">Next: {{ next_pokemon.label }}</q-tooltip>
          </q-btn>
        </div>
      </div>
      <div class="col-12 col-sm-auto">
        <q-checkbox v-model="include_special_forms" dark label="Include regional and Mega forms" />
      </div>
      <div class="col-12 col-sm-auto">
        <q-checkbox v-model="only_my_cards" dark label="Only my cards" />
      </div>
      <div class="col-12 col-sm-auto">
        <q-btn
          :icon="advanced_filters_open ? 'expand_less' : 'tune'"
          :label="advanced_filters_open ? 'Hide advanced filters' : 'Advanced filters'"
          color="primary"
          flat
          no-caps
          @click="advanced_filters_open = !advanced_filters_open"
          ><q-tooltip :delay="1000">{{
            advanced_filters_open ? 'Hide advanced filters' : 'Advanced filters'
          }}</q-tooltip></q-btn
        >
      </div>
    </section>

    <q-slide-transition>
      <section v-show="advanced_filters_open" class="row q-col-gutter-md items-center q-mb-md">
        <div class="col-12">
          <div class="row no-wrap q-col-gutter-md items-start">
            <div class="col-auto">
              <div class="text-caption text_secondary q-mb-xs">Card region</div>
              <q-btn-toggle
                v-model="selected_region"
                :options="region_options"
                color="dark"
                text-color="secondary"
                toggle-color="primary"
                toggle-text-color="dark"
                unelevated
              />
            </div>
            <div class="col-auto">
              <div class="text-caption text_secondary q-mb-xs">International card language</div>
              <language-selector
                v-model="selected_international_language_id"
                :language_ids="
                  international_language_ids.length
                    ? international_language_ids
                    : all_international_language_ids
                "
                :disable="selected_region === 'asia' || international_language_ids.length === 0"
              />
            </div>
            <div class="col-auto">
              <div class="text-caption text_secondary q-mb-xs">Asian card language</div>
              <language-selector
                v-model="selected_asia_language_id"
                :language_ids="asia_language_ids.length ? asia_language_ids : all_asia_language_ids"
                :disable="selected_region === 'intl' || asia_language_ids.length === 0"
              />
            </div>
          </div>
        </div>
        <div class="col-12 col-sm-6 col-md-4">
          <q-select
            v-model="selected_series_ids"
            :display-value="series_selection_label"
            :options="available_series_options"
            dark
            dense
            outlined
            multiple
            emit-value
            map-options
            options-selected-class="text-primary"
            label="Series"
          >
            <template #append>
              <q-btn
                aria-label="Select all series"
                :disable="selected_series_ids.length === available_series_options.length"
                dense
                flat
                round
                icon="select_all"
                no-caps
                @click.stop="select_all_series"
              >
                <q-tooltip :delay="1000">Select all series</q-tooltip>
              </q-btn>
              <q-btn
                aria-label="Clear all series"
                :disable="selected_series_ids.length === 0"
                dense
                flat
                round
                icon="deselect"
                no-caps
                @click.stop="clear_series"
              >
                <q-tooltip :delay="1000">Clear all series</q-tooltip>
              </q-btn>
            </template>
          </q-select>
        </div>
        <div class="col-12 col-sm-6 col-md-4">
          <q-select
            v-model="selected_variant_types"
            :display-value="variant_selection_label"
            :options="variant_options"
            dark
            dense
            outlined
            multiple
            emit-value
            map-options
            options-selected-class="text-primary"
            label="Variants"
          >
            <template #append>
              <q-btn
                aria-label="Select all variants"
                :disable="selected_variant_types.length === variant_options.length"
                dense
                flat
                round
                icon="select_all"
                no-caps
                @click.stop="select_all_variants"
              >
                <q-tooltip :delay="1000">Select all variants</q-tooltip>
              </q-btn>
              <q-btn
                aria-label="Clear all variants"
                :disable="selected_variant_types.length === 0"
                dense
                flat
                round
                icon="deselect"
                no-caps
                @click.stop="clear_variants"
              >
                <q-tooltip :delay="1000">Clear all variants</q-tooltip>
              </q-btn>
            </template>
          </q-select>
        </div>
        <div class="col-12 col-sm-6 col-md-4">
          <q-select
            v-model="selected_artist"
            :options="filtered_artist_options"
            dark
            dense
            outlined
            clearable
            use-input
            input-debounce="0"
            label="Artist"
            @filter="filter_artists"
          />
        </div>
        <div class="col-12 col-sm-6 col-md-4">
          <q-select
            v-model="selected_rarities"
            :display-value="rarity_selection_label"
            :options="rarity_options"
            dark
            dense
            outlined
            multiple
            options-selected-class="text-primary"
            label="Rarities"
          >
            <template #append>
              <q-btn
                aria-label="Select all rarities"
                :disable="selected_rarities.length === rarity_options.length"
                dense
                flat
                round
                icon="select_all"
                no-caps
                @click.stop="select_all_rarities"
              >
                <q-tooltip :delay="1000">Select all rarities</q-tooltip>
              </q-btn>
              <q-btn
                aria-label="Clear all rarities"
                :disable="selected_rarities.length === 0"
                dense
                flat
                round
                icon="deselect"
                no-caps
                @click.stop="clear_rarities"
              >
                <q-tooltip :delay="1000">Clear all rarities</q-tooltip>
              </q-btn>
            </template>
          </q-select>
        </div>
        <div class="col-12 col-sm-6 col-md-4">
          <q-select
            v-model="selected_energy"
            :options="energy_options"
            dark
            dense
            outlined
            clearable
            label="Pokémon energy"
          />
        </div>
        <div class="col-12 col-sm-6 col-md-4">
          <q-input
            v-model="set_number"
            dark
            dense
            outlined
            clearable
            label="Set number"
            @clear="set_number = ''"
          />
        </div>
        <div class="col-12 col-sm-6 col-md-4">
          <card-sort-selector v-model="selected_sort" />
        </div>
      </section>
    </q-slide-transition>

    <q-separator class="q-mb-md" />

    <card-list :cards="displayed_cards" @card-click="go_to_card" />

    <div
      v-if="displayed_cards.length < filtered_cards.length"
      class="row justify-center q-mt-xl q-pb-md"
    >
      <q-btn
        color="primary"
        label="Show more"
        text-color="dark"
        unelevated
        no-caps
        @click="show_more_cards"
        ><q-tooltip :delay="1000">Show more</q-tooltip></q-btn
      >
    </div>

    <q-banner v-if="filtered_cards.length === 0" class="app_surface text_secondary">
      No card found for these filters.
    </q-banner>

    <back-to-top-button />
  </q-page>
</template>

<script setup lang="ts">
  // import hooks
  import { useRoute, useRouter } from 'vue-router';
  import { computed, ref, watch } from 'vue';

  // import components
  import CardSortSelector from '../components/card_sort_selector.vue';
  import LanguageSelector from '../components/language_selector.vue';
  import BackToTopButton from '../components/back_to_top_button.vue';
  import CardList from '../components/card_list.vue';

  // import utils
  import { manual_image_store } from '../store/modules/manual_images';
  import { collection_store } from '../store/modules/collection';
  import { localized_value } from '../utils/localization';
  import { unique_values } from '../utils/array_utils';
  import {
    get_cards,
    get_pokemon,
    get_series,
    get_set_by_id,
    get_sets,
  } from '../services/catalog_storage';
  import { use_store } from '../store';
  import {
    build_display_card,
    cardmarket_display_price,
    compare_card_release_and_number,
  } from '../utils/card_display';

  // import types
  import type { Card_Search_Filters, Card_Search_Region } from '../store/index';
  import type { Card, Pokemon, Series, Set } from '../models/catalog';
  import type { Display_Card } from '../utils/card_display';
  import type { Card_Sort } from '../utils/card_sorting';

  /* hooks */
  // Current route used to read deep-linked filters.

  const route = useRoute();

  // Router used to open the card detail page.
  const router = useRouter();

  // Shared application state.
  const store = use_store();

  /* const vars */
  // Number of card results shown on the first render.

  const initial_visible_card_count = 12;

  // Number of extra card results added when clicking show more.
  const visible_card_step = 12;

  // Every set in the local data catalog.

  const sets: Set[] = get_sets();

  // Every release series in the local data catalog.
  const series: Series[] = get_series();

  // Every card in the local data catalog.
  const cards: Card[] = get_cards();

  // Regional language options retained when active filters have no matching cards.
  const all_international_language_ids: string[] = unique_values(
    sets.filter((set) => !set.series_id.startsWith('asia-')).flatMap((set) => set.language_ids),
  );

  const all_asia_language_ids: string[] = unique_values(
    sets.filter((set) => set.series_id.startsWith('asia-')).flatMap((set) => set.language_ids),
  );

  // Standardized Pokemon species and form catalog.
  const pokemon: Pokemon[] = get_pokemon();

  // Every rarity represented in the local card catalog.
  const rarity_options: string[] = unique_values(cards.map((card) => card.rarity));

  // Every broad physical variant type represented in the card catalog.
  const variant_types: string[] = unique_values(
    cards.flatMap((card) =>
      card.variants.map((variant) => variant.type ?? variant.id.split('-')[0]),
    ),
  );

  const variant_options: { label: string; value: string }[] = variant_types.map((variant_type) => ({
    label: variant_type
      .replaceAll('_', ' ')
      .replace(/\b\w/g, (character) => character.toUpperCase()),
    value: variant_type,
  }));

  // Region choices for the complete catalog, International sets, or Asian sets.
  const region_options: { label: string; value: Card_Search_Region }[] = [
    { label: 'Both', value: 'all' },
    { label: 'International', value: 'intl' },
    { label: 'Asia', value: 'asia' },
  ];

  // Release dates indexed once for efficient card sorting.
  const set_release_dates = new Map<string, string>(sets.map((set) => [set.id, set.release_date]));

  const series_id_by_set_id = new Map<string, string>(sets.map((set) => [set.id, set.series_id]));

  const asia_set_ids = new globalThis.Set<string>(
    sets.filter((set) => set.series_id.startsWith('asia-')).map((set) => set.id),
  );

  const pokedex_by_pokemon_id = new Map<string, number>(
    pokemon.map((entry) => [entry.id, entry.pokedex_id]),
  );

  const pokemon_id_by_name = new Map<string, string>(
    pokemon.flatMap((entry) =>
      [entry.name, ...Object.values(entry.names)]
        .filter((name): name is string => Boolean(name))
        .map((name) => [name.toLocaleLowerCase(), entry.id] as const),
    ),
  );

  const stored_filters: Card_Search_Filters = store.state.card_search_filters;

  // Energy/type options represented by Pokemon cards in the catalog.

  const energy_options: string[] = unique_values(
    cards.filter((card) => card.category === 'pokemon').flatMap((card) => card.types ?? []),
  );

  /* reactive vars */
  // Preferred language for localized International labels and scans.

  const selected_international_language_id = ref<string>(
    stored_filters.international_language_id ??
      (sets.some(
        (set) =>
          !set.series_id.startsWith('asia-') &&
          set.language_ids.includes(store.state.selected_language_id),
      )
        ? store.state.selected_language_id
        : 'en'),
  );

  // Preferred language for localized Asian labels and scans.
  const selected_asia_language_id = ref<string>(stored_filters.asia_language_id);

  // Search text used to filter card names.
  const search = ref<string>(stored_filters.search);

  // Exact printed card number filter.
  const set_number = ref<string>(stored_filters.set_number ?? '');

  // Selected rarity filters. The complete catalog is visible by default.
  const selected_rarities = ref<string[]>(
    stored_filters.rarities ? [...stored_filters.rarities] : [...rarity_options],
  );

  // Current result ordering, newest releases first by default.
  const selected_sort = ref<Card_Sort>(stored_filters.sort);

  // Whether regional and Mega forms are available in Pokemon results.
  const include_special_forms = ref<boolean>(stored_filters.include_special_forms);

  // Whether results are limited to cards currently owned by the user.
  const only_my_cards = ref<boolean>(stored_filters.only_my_cards ?? false);

  // Catalog region currently included in results.
  const selected_region = ref<Card_Search_Region>(stored_filters.region);

  // Series included in results, initially every series belonging to the active region.
  const selected_series_ids = ref<string[]>(
    (stored_filters.series_ids ?? series.map((item) => item.id)).filter((series_id) => {
      const item = series.find((candidate) => candidate.id === series_id);
      return (
        item &&
        (selected_region.value === 'all' ||
          item.region_id === (selected_region.value === 'asia' ? 'ASIA' : 'INTL'))
      );
    }),
  );

  // Broad physical variant types included in results.
  const selected_variant_types = ref<string[]>(
    stored_filters.variant_types
      ? stored_filters.variant_types.filter((variant_type) => variant_types.includes(variant_type))
      : [...variant_types],
  );

  // Whether the secondary search controls are visible.
  const advanced_filters_open = ref<boolean>(stored_filters.advanced_filters_open);

  // Artist options matching the text currently typed in the select.
  const filtered_artist_options = ref<string[]>([]);

  // Pokemon options matching the text currently typed in the select.
  const filtered_pokemon_options = ref<{ label: string; value: string; search_names: string[] }[]>(
    [],
  );

  // Number of filtered cards currently visible.
  const visible_card_count = ref<number>(initial_visible_card_count);

  // Selected artist filter.
  const selected_artist = ref<string | null>(query_value('artist') ?? stored_filters.artist);

  // Selected Pokemon filter.
  const selected_pokemon = ref<string | null>(query_value('pokemon') ?? stored_filters.pokemon);

  // Selected energy/type filter for Pokemon cards.
  const selected_energy = ref<string | null>(query_value('energy') ?? stored_filters.energy);

  /* computed vars */
  // Artist filter options found across every card.

  const artist_options = computed<string[]>(() =>
    unique_values(cards.map((card) => card.illustrator ?? '')),
  );

  // Series choices belonging to the currently selected card region.
  const available_series_options = computed<{ label: string; value: string }[]>(() =>
    series
      .filter(
        (item) =>
          selected_region.value === 'all' ||
          item.region_id === (selected_region.value === 'asia' ? 'ASIA' : 'INTL'),
      )
      .sort((a, b) => b.start_date.localeCompare(a.start_date))
      .map((item) => ({ label: item.name, value: item.id })),
  );

  // Pokemon filter options found across every card.
  // Base-species options display English canonical names while retaining stable ids.

  const pokemon_options = computed<{ label: string; value: string; search_names: string[] }[]>(() =>
    pokemon
      .filter((entry) => entry.form === null)
      .sort((a, b) => a.pokedex_id - b.pokedex_id)
      .map((entry) => ({
        label: entry.name,
        value: entry.id,
        search_names: unique_values(
          Object.values(entry.names).filter((name): name is string => Boolean(name)),
        ),
      })),
  );

  // Index of the selected base species in Pokedex order.

  const selected_pokemon_index = computed<number>(() =>
    pokemon_options.value.findIndex((option) => option.value === selected_pokemon.value),
  );

  // Base species immediately before the current selection in Pokedex order.
  const previous_pokemon = computed<{ label: string; value: string } | null>(() => {
    const index: number = selected_pokemon_index.value;
    return index > 0 ? pokemon_options.value[index - 1] : null;
  });

  // Base species immediately after the current selection in Pokedex order.
  const next_pokemon = computed<{ label: string; value: string } | null>(() => {
    const index: number = selected_pokemon_index.value;
    return index >= 0 && index < pokemon_options.value.length - 1
      ? pokemon_options.value[index + 1]
      : null;
  });

  // Compact summary shown by the multi-select instead of a long list of values.
  const rarity_selection_label = computed<string>(() => {
    if (selected_rarities.value.length === rarity_options.length) return 'All rarities';
    if (selected_rarities.value.length === 0) return 'No rarities';
    return `${selected_rarities.value.length} rarities selected`;
  });

  // Compact summary shown by the series multi-select.
  const series_selection_label = computed<string>(() => {
    if (selected_series_ids.value.length === available_series_options.value.length)
      return 'All series';
    if (selected_series_ids.value.length === 0) return 'No series';
    return `${selected_series_ids.value.length} series selected`;
  });

  // Compact summary shown by the variant-type multi-select.
  const variant_selection_label = computed<string>(() => {
    if (selected_variant_types.value.length === variant_options.length) return 'All variants';
    if (selected_variant_types.value.length === 0) return 'No variants';
    return `${selected_variant_types.value.length} variants selected`;
  });

  // Selected catalog ids, broadened to requested forms sharing the same Pokedex number.
  const selected_pokemon_ids = computed<globalThis.Set<string>>(() => {
    if (!selected_pokemon.value) return new Set();
    const selected_entry = pokemon.find((entry) => entry.id === selected_pokemon.value);
    if (!include_special_forms.value || !selected_entry) return new Set([selected_pokemon.value]);
    return new Set(
      pokemon
        .filter((entry) => entry.pokedex_id === selected_entry.pokedex_id)
        .map((entry) => entry.id),
    );
  });

  // Every card variant as an individual display row.
  const all_cards = computed<Display_Card[]>(() =>
    cards.flatMap((card) => {
      const set: Set | null = get_set_by_id(card.set_id);
      const language_id: string = set?.series_id.startsWith('asia-')
        ? selected_asia_language_id.value
        : selected_international_language_id.value;
      const set_name: string | null = set
        ? (localized_value(set.name, language_id) ?? set.id)
        : 'Unknown set';
      return card.variants.map((variant) =>
        build_display_card(card, variant, language_id, set_name),
      );
    }),
  );

  // Catalog variants represented by at least one owned (non-wanted) entry.
  const owned_catalog_card_keys = computed<globalThis.Set<string>>(
    () =>
      new Set(
        collection_store.entries.value
          .filter((entry) => !entry.wanted && entry.set_id !== 'manual-collection')
          .map((entry) => `${entry.set_id}:${entry.card_id}:${entry.variant_id}`),
      ),
  );

  // User-created cards have no catalog record, so build their search rows from
  // the manual card and collection entry data.
  const owned_manual_cards = computed<Display_Card[]>(() => {
    const seen = new Set<string>();

    return collection_store.entries.value.flatMap((entry): Display_Card[] => {
      if (entry.wanted || entry.set_id !== 'manual-collection') return [];
      const key = `${entry.card_id}:${entry.variant_id}:${entry.language_id}`;
      if (seen.has(key)) return [];
      seen.add(key);

      const manual_card = collection_store.manual_cards.value.find(
        (card) => card.id === entry.card_id,
      );
      if (!manual_card) return [];
      const image = manual_image_store.find(
        'manual-collection',
        manual_card.id,
        entry.variant_id,
        entry.language_id,
      );

      return [
        {
          id: `manual-collection-${manual_card.id}-${entry.variant_id}-${entry.language_id}`,
          card_id: manual_card.id,
          set_id: 'manual-collection',
          set_name: manual_card.set_name || null,
          language_id: entry.language_id,
          variant_id: entry.variant_id,
          variant_type: entry.variant_id.split('-')[0],
          number: manual_card.number || '?',
          display_name: manual_card.name,
          category: manual_card.category,
          rarity: manual_card.rarity,
          hp: manual_card.hp,
          illustrator: manual_card.illustrator || null,
          types: manual_card.types,
          pokemon_names: manual_card.pokemon_name
            ? [
                pokemon_id_by_name.get(manual_card.pokemon_name.toLocaleLowerCase()) ??
                  manual_card.pokemon_name,
              ]
            : [],
          energy_costs: [],
          image_url: image?.url ?? null,
          image_language_id: image?.language_id ?? null,
          image_is_fallback: false,
          image_source: image ? 'manual' : null,
          cardmarket: null,
          is_manual: true,
          estimated_value: manual_card.estimated_value,
        },
      ];
    });
  });

  // Cards matching the search text and selected filters.
  const filtered_cards = computed<Display_Card[]>(() => {
    const query: string = search.value.trim().toLowerCase();
    const number_query: string = set_number.value.trim().toLowerCase().replace(/^#/, '');
    const searchable_cards = only_my_cards.value
      ? [
          ...all_cards.value.filter((card) =>
            owned_catalog_card_keys.value.has(`${card.set_id}:${card.card_id}:${card.variant_id}`),
          ),
          ...owned_manual_cards.value,
        ]
      : all_cards.value;

    return searchable_cards
      .filter(
        (card) =>
          selected_region.value === 'all' ||
          card.is_manual ||
          (selected_region.value === 'asia'
            ? asia_set_ids.has(card.set_id)
            : !asia_set_ids.has(card.set_id)),
      )
      .filter(
        (card) =>
          card.is_manual ||
          selected_series_ids.value.includes(series_id_by_set_id.get(card.set_id) ?? ''),
      )
      .filter((card) =>
        selected_variant_types.value.includes(card.variant_type ?? card.variant_id.split('-')[0]),
      )
      .filter((card) => query === '' || card.display_name.toLowerCase().includes(query))
      .filter((card) => !selected_artist.value || card.illustrator === selected_artist.value)
      .filter(
        (card) =>
          !selected_pokemon.value ||
          card.pokemon_names.some((pokemon_id) => selected_pokemon_ids.value.has(pokemon_id)),
      )
      .filter((card) => !selected_energy.value || card.types.includes(selected_energy.value))
      .filter(
        (card) =>
          number_query === '' || card.number.toLowerCase().replace(/^#/, '') === number_query,
      )
      .filter(
        (card) =>
          selected_rarities.value.includes(card.rarity) ||
          (card.is_manual && !rarity_options.includes(card.rarity)),
      )
      .sort((a, b) => {
        if (selected_sort.value === 'pokedex-asc' || selected_sort.value === 'pokedex-desc') {
          const left_numbers = a.pokemon_names
            .map((pokemon_id) => pokedex_by_pokemon_id.get(pokemon_id))
            .filter((number): number is number => number !== undefined);
          const right_numbers = b.pokemon_names
            .map((pokemon_id) => pokedex_by_pokemon_id.get(pokemon_id))
            .filter((number): number is number => number !== undefined);
          const left_number = left_numbers.length ? Math.min(...left_numbers) : null;
          const right_number = right_numbers.length ? Math.min(...right_numbers) : null;
          if (left_number === null && right_number !== null) return 1;
          if (left_number !== null && right_number === null) return -1;
          if (left_number !== null && right_number !== null && left_number !== right_number) {
            return selected_sort.value === 'pokedex-asc'
              ? left_number - right_number
              : right_number - left_number;
          }
        }
        if (selected_sort.value === 'price-asc' || selected_sort.value === 'price-desc') {
          const left_price = a.is_manual
            ? (a.estimated_value ?? null)
            : cardmarket_display_price(a.cardmarket);
          const right_price = b.is_manual
            ? (b.estimated_value ?? null)
            : cardmarket_display_price(b.cardmarket);
          if (left_price === null && right_price !== null) return 1;
          if (left_price !== null && right_price === null) return -1;
          if (left_price !== null && right_price !== null && left_price !== right_price) {
            return selected_sort.value === 'price-asc'
              ? left_price - right_price
              : right_price - left_price;
          }
        }

        const release_comparison = compare_card_release_and_number(
          set_release_dates.get(a.set_id),
          set_release_dates.get(b.set_id),
          a.number,
          b.number,
          selected_sort.value === 'release-asc' ? 'asc' : 'desc',
        );

        return (
          release_comparison ||
          (a.set_name ?? '').localeCompare(b.set_name ?? '') ||
          a.variant_id.localeCompare(b.variant_id)
        );
      });
  });

  // Cards currently rendered after applying the visible result limit.
  const displayed_cards = computed<Display_Card[]>(() =>
    filtered_cards.value.slice(0, visible_card_count.value),
  );

  // International languages represented by the cards matching the active filters.
  const international_language_ids = computed<string[]>(() => {
    const visible_set_ids = new Set(filtered_cards.value.map((card) => card.set_id));
    return unique_values(
      sets
        .filter((set) => visible_set_ids.has(set.id) && !set.series_id.startsWith('asia-'))
        .flatMap((set) => set.language_ids),
    );
  });

  // Asian languages represented by the cards matching the active filters.
  const asia_language_ids = computed<string[]>(() => {
    const visible_set_ids = new Set(filtered_cards.value.map((card) => card.set_id));
    return unique_values(
      sets
        .filter((set) => visible_set_ids.has(set.id) && set.series_id.startsWith('asia-'))
        .flatMap((set) => set.language_ids),
    );
  });

  /* functions */
  // Reads a string query parameter from the current route.

  function query_value(key: string): string | null {
    const value = route.query[key];
    return typeof value === 'string' && value !== '' ? value : null;
  }

  // Narrows select options using a case-insensitive prefix match.

  const filter_select_options = (
    input_value: string,
    options: string[],
    filtered_options: { value: string[] },
    update: (callback: () => void) => void,
  ): void => {
    const query: string = input_value.trim().toLowerCase();
    update(() => {
      filtered_options.value =
        query === '' ? options : options.filter((option) => option.toLowerCase().startsWith(query));
    });
  };

  // Filters artist suggestions as the user types.
  const filter_artists = (input_value: string, update: (callback: () => void) => void): void => {
    filter_select_options(input_value, artist_options.value, filtered_artist_options, update);
  };

  // Filters Pokemon suggestions as the user types.
  const filter_pokemon = (input_value: string, update: (callback: () => void) => void): void => {
    const query: string = input_value.trim().toLocaleLowerCase();
    update(() => {
      filtered_pokemon_options.value = pokemon_options.value.filter(
        (option) =>
          query === '' ||
          option.search_names.some((name) => name.toLocaleLowerCase().startsWith(query)),
      );
    });
  };

  // Changes only the Pokemon filter, preserving every other search field.
  const select_adjacent_pokemon = (option: { value: string } | null): void => {
    if (!option) return;

    // Keep the selected id-to-label mapping available after a narrowed text search.
    filtered_pokemon_options.value = pokemon_options.value;
    selected_pokemon.value = option.value;
  };

  // Deselects every series in the active card region.
  const clear_series = (): void => {
    selected_series_ids.value = [];
  };

  // Selects every series belonging to the active card region.
  const select_all_series = (): void => {
    selected_series_ids.value = available_series_options.value.map((option) => option.value);
  };

  // Deselects every broad physical card variant type.
  const clear_variants = (): void => {
    selected_variant_types.value = [];
  };

  // Selects every broad physical card variant type in the catalog.
  const select_all_variants = (): void => {
    selected_variant_types.value = [...variant_types];
  };

  // Deselects every rarity so the user can rebuild the filter from scratch.
  const clear_rarities = (): void => {
    selected_rarities.value = [];
  };

  // Selects every rarity represented in the card catalog.
  const select_all_rarities = (): void => {
    selected_rarities.value = [...rarity_options];
  };

  // Increases the number of rendered card results.
  const show_more_cards = (): void => {
    visible_card_count.value += visible_card_step;
  };

  // Opens the detail page for a card from its set.
  const go_to_card = (card: Display_Card): void => {
    if (card.is_manual) return;
    router.push({
      path: `/set/${card.set_id}/card/${card.card_id}`,
      query: { variant: card.variant_id, from: 'search' },
    });
  };

  /* watchers */
  // Keep the complete option objects available on initial/deep-linked loads so
  // QSelect can resolve a stored Pokémon id to its human-readable label.

  watch(
    pokemon_options,
    (options): void => {
      filtered_pokemon_options.value = options;
    },
    { immediate: true },
  );

  // A region change exposes and selects exactly the series belonging to that region.

  watch(selected_region, (): void => {
    selected_series_ids.value = available_series_options.value.map((option) => option.value);
  });

  // Keeps route-driven filters in sync if the user opens a new search link while already on this page.
  watch(
    () => route.query,
    (): void => {
      selected_artist.value = query_value('artist');
      selected_pokemon.value = query_value('pokemon');
      selected_energy.value = query_value('energy');
    },
  );

  // Keeps each preference valid as result filters change the represented sets.
  watch(
    international_language_ids,
    (language_ids): void => {
      if (
        language_ids.length > 0 &&
        !language_ids.includes(selected_international_language_id.value)
      ) {
        selected_international_language_id.value = language_ids.includes('en')
          ? 'en'
          : language_ids[0];
      }
    },
    { immediate: true },
  );

  watch(
    asia_language_ids,
    (language_ids): void => {
      if (language_ids.length > 0 && !language_ids.includes(selected_asia_language_id.value)) {
        selected_asia_language_id.value = language_ids.includes('ja') ? 'ja' : language_ids[0];
      }
    },
    { immediate: true },
  );

  // Resets pagination whenever the visible result set changes.
  watch(
    [
      search,
      selected_international_language_id,
      selected_asia_language_id,
      selected_artist,
      selected_pokemon,
      selected_energy,
      set_number,
      selected_series_ids,
      selected_variant_types,
      selected_rarities,
      selected_sort,
      include_special_forms,
      only_my_cards,
      selected_region,
    ],
    (): void => {
      visible_card_count.value = initial_visible_card_count;
    },
  );

  // Keeps all search preferences available when navigating away and returning.
  watch(
    [
      search,
      selected_international_language_id,
      selected_asia_language_id,
      selected_artist,
      selected_pokemon,
      selected_energy,
      set_number,
      selected_series_ids,
      selected_variant_types,
      selected_rarities,
      selected_sort,
      include_special_forms,
      only_my_cards,
      selected_region,
      advanced_filters_open,
    ],
    (): void => {
      store.commit('set_card_search_filters', {
        search: search.value,
        artist: selected_artist.value,
        pokemon: selected_pokemon.value,
        energy: selected_energy.value,
        set_number: set_number.value,
        series_ids: [...selected_series_ids.value],
        variant_types: [...selected_variant_types.value],
        rarities: [...selected_rarities.value],
        sort: selected_sort.value,
        include_special_forms: include_special_forms.value,
        only_my_cards: only_my_cards.value,
        region: selected_region.value,
        international_language_id: selected_international_language_id.value,
        asia_language_id: selected_asia_language_id.value,
        advanced_filters_open: advanced_filters_open.value,
      } satisfies Card_Search_Filters);
    },
    { deep: true, immediate: true },
  );
</script>
