<template>
  <q-page class="bg-dark q-pa-md">
    <section class="q-mb-md">
      <div class="text-overline text-primary">
        Card search
      </div>
      <div class="text-h4 text-weight-bold">
        Search every card
      </div>
      <div class="text-body2 text-secondary">
        Showing {{ displayedCards.length }} of {{ filteredCards.length }} collectible cards including variants
      </div>
    </section>

    <section class="row q-col-gutter-md items-center q-mb-md">
      <div class="col-12 col-sm-6 col-md-4">
        <q-input v-model="search" dark dense outlined clearable debounce="150" label="Search a card by name" @clear="search = ''">
          <template #prepend>
            <q-icon name="search" />
          </template>
        </q-input>
      </div>
      <div class="col-12 col-sm-6 col-md-4">
        <div class="row no-wrap items-center q-gutter-xs">
          <q-btn aria-label="Previous Pokemon" :disable="!previousPokemon" dark dense flat round icon="chevron_left" @click="selectAdjacentPokemon(previousPokemon)">
            <q-tooltip v-if="previousPokemon">Previous: {{ previousPokemon.label }}</q-tooltip>
          </q-btn>
          <q-select v-model="selectedPokemon" class="col" :options="filteredPokemonOptions" emit-value map-options dark dense outlined clearable use-input fill-input
            hide-selected input-debounce="0" label="Pokemon" @filter="filterPokemon" />
          <q-btn aria-label="Next Pokemon" :disable="!nextPokemon" dark dense flat round icon="chevron_right" @click="selectAdjacentPokemon(nextPokemon)">
            <q-tooltip v-if="nextPokemon">Next: {{ nextPokemon.label }}</q-tooltip>
          </q-btn>
        </div>
      </div>
      <div class="col-12 col-sm-auto">
        <q-checkbox v-model="includeSpecialForms" dark label="Include regional and Mega forms" />
      </div>
      <div class="col-12 col-sm-auto">
        <q-checkbox v-model="onlyMyCards" dark label="Only my cards" />
      </div>
      <div class="col-12 col-sm-auto">
        <q-btn :icon="advancedFiltersOpen ? 'expand_less' : 'tune'" :label="advancedFiltersOpen ? 'Hide advanced filters' : 'Advanced filters'" color="primary" flat
          @click="advancedFiltersOpen = !advancedFiltersOpen" />
      </div>
    </section>

    <q-slide-transition>
      <section v-show="advancedFiltersOpen" class="row q-col-gutter-md items-center q-mb-md">
        <div class="col-12">
          <div class="row no-wrap q-col-gutter-md items-start">
            <div class="col-auto">
              <div class="text-caption text-grey-5 q-mb-xs">Card region</div>
              <q-btn-toggle v-model="selectedRegion" :options="regionOptions" color="grey-9" text-color="grey-4" toggle-color="primary"
                toggle-text-color="black" unelevated />
            </div>
            <div class="col-auto">
              <div class="text-caption text-grey-5 q-mb-xs">International card language</div>
              <language-selector v-model="selectedInternationalLanguageId"
                :language-ids="internationalLanguageIds.length ? internationalLanguageIds : allInternationalLanguageIds"
                :disable="selectedRegion === 'asia' || internationalLanguageIds.length === 0" />
            </div>
            <div class="col-auto">
              <div class="text-caption text-grey-5 q-mb-xs">Asian card language</div>
              <language-selector v-model="selectedAsiaLanguageId" :language-ids="asiaLanguageIds.length ? asiaLanguageIds : allAsiaLanguageIds"
                :disable="selectedRegion === 'intl' || asiaLanguageIds.length === 0" />
            </div>
          </div>
        </div>
        <div class="col-12 col-sm-6 col-md-4">
          <q-select v-model="selectedSeriesIds" :display-value="seriesSelectionLabel" :options="availableSeriesOptions" dark dense outlined multiple
            emit-value map-options options-selected-class="text-primary" label="Series">
            <template #append>
              <q-btn aria-label="Select all series" :disable="selectedSeriesIds.length === availableSeriesOptions.length" dense flat round icon="select_all"
                @click.stop="selectAllSeries">
                <q-tooltip>Select all series</q-tooltip>
              </q-btn>
              <q-btn aria-label="Clear all series" :disable="selectedSeriesIds.length === 0" dense flat round icon="deselect" @click.stop="clearSeries">
                <q-tooltip>Clear all series</q-tooltip>
              </q-btn>
            </template>
          </q-select>
        </div>
        <div class="col-12 col-sm-6 col-md-4">
          <q-select v-model="selectedVariantTypes" :display-value="variantSelectionLabel" :options="variantOptions" dark dense outlined multiple
            emit-value map-options options-selected-class="text-primary" label="Variants">
            <template #append>
              <q-btn aria-label="Select all variants" :disable="selectedVariantTypes.length === variantOptions.length" dense flat round icon="select_all"
                @click.stop="selectAllVariants">
                <q-tooltip>Select all variants</q-tooltip>
              </q-btn>
              <q-btn aria-label="Clear all variants" :disable="selectedVariantTypes.length === 0" dense flat round icon="deselect" @click.stop="clearVariants">
                <q-tooltip>Clear all variants</q-tooltip>
              </q-btn>
            </template>
          </q-select>
        </div>
        <div class="col-12 col-sm-6 col-md-4">
          <q-select v-model="selectedArtist" :options="filteredArtistOptions" dark dense outlined clearable use-input input-debounce="0" label="Artist"
            @filter="filterArtists" />
        </div>
        <div class="col-12 col-sm-6 col-md-4">
          <q-select v-model="selectedRarities" :display-value="raritySelectionLabel" :options="rarityOptions" dark dense outlined multiple
            options-selected-class="text-primary" label="Rarities">
            <template #append>
              <q-btn aria-label="Select all rarities" :disable="selectedRarities.length === rarityOptions.length" dense flat round icon="select_all"
                @click.stop="selectAllRarities">
                <q-tooltip>Select all rarities</q-tooltip>
              </q-btn>
              <q-btn aria-label="Clear all rarities" :disable="selectedRarities.length === 0" dense flat round icon="deselect" @click.stop="clearRarities">
                <q-tooltip>Clear all rarities</q-tooltip>
              </q-btn>
            </template>
          </q-select>
        </div>
        <div class="col-12 col-sm-6 col-md-4">
          <q-select v-model="selectedEnergy" :options="energyOptions" dark dense outlined clearable label="Pokémon energy" />
        </div>
        <div class="col-12 col-sm-6 col-md-4">
          <q-input v-model="setNumber" dark dense outlined clearable label="Set number" @clear="setNumber = ''" />
        </div>
        <div class="col-12 col-sm-6 col-md-4">
          <card-sort-selector v-model="selectedSort" />
        </div>
      </section>
    </q-slide-transition>

    <q-separator class="q-mb-md" />

    <card-list :cards="displayedCards" @card-click="goToCard" />

    <div v-if="displayedCards.length < filteredCards.length" class="row justify-center q-mt-xl q-pb-md">
      <q-btn color="yellow-7" label="Show more" text-color="black" unelevated @click="showMoreCards" />
    </div>

    <q-banner v-if="filteredCards.length === 0" class="bg-grey-10 text-grey-4">
      No card found for these filters.
    </q-banner>

    <back-to-top-button />
  </q-page>
</template>

<script setup lang="ts">
  // import hooks
  import { computed, ref, watch } from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  import { useStore } from 'vuex';

  // import components
  import LanguageSelector from '../components/LanguageSelector.vue';
  import CardList from '../components/CardList.vue';
  import CardSortSelector from '../components/CardSortSelector.vue';
  import BackToTopButton from '../components/BackToTopButton.vue';

  // import utils
  import { getCards, getPokemon, getSeries, getSetById, getSets } from '../utils/dataManagement';
  import { buildDisplayCard, cardmarketDisplayPrice, compareCardReleaseAndNumber } from '../utils/cardDisplay';
  import type { DisplayCard } from '../utils/cardDisplay';
  import { localizedValue } from '../utils/localization';
  import type { Card, Pokemon, Series, Set } from '../utils/types';
  import { uniqueValues } from '../utils/arrayUtils';
  import type { AppState, CardSearchFilters, CardSearchRegion } from '../store';
  import type { CardSort } from '../utils/cardSorting';
  import { collectionStore } from '../utils/collection';
  import { manualImageStore } from '../utils/manualImages';


  /* constant vars */
  // Number of card results shown on the first render.
  const initialVisibleCardCount = 12;

  // Number of extra card results added when clicking show more.
  const visibleCardStep = 12;

  // Current route used to read deep-linked filters.
  const route = useRoute();

  // Router used to open the card detail page.
  const router = useRouter();

  // Shared application state.
  const store = useStore<AppState>();

  // Every set in the local data catalog.
  const sets: Set[] = getSets();

  // Every release series in the local data catalog.
  const series: Series[] = getSeries();

  // Every card in the local data catalog.
  const cards: Card[] = getCards();

  // Regional language options retained when active filters have no matching cards.
  const allInternationalLanguageIds: string[] = uniqueValues(sets
    .filter((set) => !set.series_id.startsWith('asia-'))
    .flatMap((set) => set.language_ids));
  const allAsiaLanguageIds: string[] = uniqueValues(sets
    .filter((set) => set.series_id.startsWith('asia-'))
    .flatMap((set) => set.language_ids));

  // Standardized Pokemon species and form catalog.
  const pokemon: Pokemon[] = getPokemon();

  // Every rarity represented in the local card catalog.
  const rarityOptions: string[] = uniqueValues(cards.map((card) => card.rarity));

  // Every broad physical variant type represented in the card catalog.
  const variantTypes: string[] = uniqueValues(cards.flatMap((card) => card.variants
    .map((variant) => variant.type ?? variant.id.split('-')[0])));
  const variantOptions: { label: string; value: string; }[] = variantTypes.map((variantType) => ({
    label: variantType.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase()),
    value: variantType
  }));

  // Region choices for the complete catalog, International sets, or Asian sets.
  const regionOptions: { label: string; value: CardSearchRegion; }[] = [
    { label: 'Both', value: 'all' },
    { label: 'International', value: 'intl' },
    { label: 'Asia', value: 'asia' }
  ];

  // Release dates indexed once for efficient card sorting.
  const setReleaseDates = new Map<string, string>(sets.map((set) => [set.id, set.release_date]));
  const seriesIdBySetId = new Map<string, string>(sets.map((set) => [set.id, set.series_id]));
  const asiaSetIds = new globalThis.Set<string>(
    sets.filter((set) => set.series_id.startsWith('asia-')).map((set) => set.id)
  );
  const pokedexByPokemonId = new Map<string, number>(pokemon.map((entry) => [entry.id, entry.pokedex_id]));
  const pokemonIdByName = new Map<string, string>(
    pokemon.flatMap((entry) =>
      [entry.name, ...Object.values(entry.names)]
        .filter((name): name is string => Boolean(name))
        .map((name) => [name.toLocaleLowerCase(), entry.id] as const)
    )
  );


  /* methods */
  // Reads a string query parameter from the current route.
  const queryValue = (key: string): string | null => {
    const value = route.query[key];
    return typeof value === 'string' && value !== '' ? value : null;
  };


  /* reactive vars */
  const storedFilters: CardSearchFilters = store.state.card_search_filters;

  // Preferred language for localized International labels and scans.
  const selectedInternationalLanguageId = ref<string>(
    storedFilters.international_language_id
    ?? (sets.some((set) => !set.series_id.startsWith('asia-') && set.language_ids.includes(store.state.selected_language_id))
      ? store.state.selected_language_id
      : 'en')
  );

  // Preferred language for localized Asian labels and scans.
  const selectedAsiaLanguageId = ref<string>(storedFilters.asia_language_id);

  // Search text used to filter card names.
  const search = ref<string>(storedFilters.search);

  // Selected artist filter.
  const selectedArtist = ref<string | null>(queryValue('artist') ?? storedFilters.artist);

  // Selected Pokemon filter.
  const selectedPokemon = ref<string | null>(queryValue('pokemon') ?? storedFilters.pokemon);

  // Selected energy/type filter for Pokemon cards.
  const selectedEnergy = ref<string | null>(queryValue('energy') ?? storedFilters.energy);

  // Exact printed card number filter.
  const setNumber = ref<string>(storedFilters.set_number ?? '');

  // Selected rarity filters. The complete catalog is visible by default.
  const selectedRarities = ref<string[]>(storedFilters.rarities ? [...storedFilters.rarities] : [...rarityOptions]);

  // Current result ordering, newest releases first by default.
  const selectedSort = ref<CardSort>(storedFilters.sort);

  // Whether regional and Mega forms are available in Pokemon results.
  const includeSpecialForms = ref<boolean>(storedFilters.include_special_forms);

  // Whether results are limited to cards currently owned by the user.
  const onlyMyCards = ref<boolean>(storedFilters.only_my_cards ?? false);

  // Catalog region currently included in results.
  const selectedRegion = ref<CardSearchRegion>(storedFilters.region);

  // Series included in results, initially every series belonging to the active region.
  const selectedSeriesIds = ref<string[]>((storedFilters.series_ids ?? series.map((item) => item.id))
    .filter((seriesId) => {
      const item = series.find((candidate) => candidate.id === seriesId);
      return item && (selectedRegion.value === 'all'
        || item.region_id === (selectedRegion.value === 'asia' ? 'ASIA' : 'INTL'));
    }));

  // Broad physical variant types included in results.
  const selectedVariantTypes = ref<string[]>(storedFilters.variant_types
    ? storedFilters.variant_types.filter((variantType) => variantTypes.includes(variantType))
    : [...variantTypes]);

  // Whether the secondary search controls are visible.
  const advancedFiltersOpen = ref<boolean>(storedFilters.advanced_filters_open);

  // Artist options matching the text currently typed in the select.
  const filteredArtistOptions = ref<string[]>([]);

  // Pokemon options matching the text currently typed in the select.
  const filteredPokemonOptions = ref<{ label: string; value: string; searchNames: string[]; }[]>([]);

  // Number of filtered cards currently visible.
  const visibleCardCount = ref<number>(initialVisibleCardCount);


  /* computed vars */
  // Artist filter options found across every card.
  const artistOptions = computed<string[]>(() => uniqueValues(cards.map((card) => card.illustrator ?? '')));

  // Series choices belonging to the currently selected card region.
  const availableSeriesOptions = computed<{ label: string; value: string; }[]>(() => series
    .filter((item) => selectedRegion.value === 'all'
      || item.region_id === (selectedRegion.value === 'asia' ? 'ASIA' : 'INTL'))
    .sort((a, b) => b.start_date.localeCompare(a.start_date))
    .map((item) => ({ label: item.name, value: item.id })));

  // Energy/type options represented by Pokemon cards in the catalog.
  const energyOptions: string[] = uniqueValues(
    cards
      .filter((card) => card.category === 'pokemon')
      .flatMap((card) => card.types ?? [])
  );

  // Pokemon filter options found across every card.
  // Base-species options display English canonical names while retaining stable ids.
  const pokemonOptions = computed<{ label: string; value: string; searchNames: string[]; }[]>(() => pokemon
    .filter((entry) => entry.form === null)
    .sort((a, b) => a.pokedex_id - b.pokedex_id)
    .map((entry) => ({
      label: entry.name,
      value: entry.id,
      searchNames: uniqueValues(Object.values(entry.names).filter((name): name is string => Boolean(name)))
    })));

  // Keep the complete option objects available on initial/deep-linked loads so
  // QSelect can resolve a stored Pokémon id to its human-readable label.
  watch(pokemonOptions, (options): void => {
    filteredPokemonOptions.value = options;
  }, { immediate: true });

  // Index of the selected base species in Pokedex order.
  const selectedPokemonIndex = computed<number>(() => pokemonOptions.value.findIndex((option) => option.value === selectedPokemon.value));

  // Base species immediately before the current selection in Pokedex order.
  const previousPokemon = computed<{ label: string; value: string; } | null>(() => {
    const index: number = selectedPokemonIndex.value;
    return index > 0 ? pokemonOptions.value[index - 1] : null;
  });

  // Base species immediately after the current selection in Pokedex order.
  const nextPokemon = computed<{ label: string; value: string; } | null>(() => {
    const index: number = selectedPokemonIndex.value;
    return index >= 0 && index < pokemonOptions.value.length - 1 ? pokemonOptions.value[index + 1] : null;
  });

  // Compact summary shown by the multi-select instead of a long list of values.
  const raritySelectionLabel = computed<string>(() => {
    if (selectedRarities.value.length === rarityOptions.length) return 'All rarities';
    if (selectedRarities.value.length === 0) return 'No rarities';
    return `${selectedRarities.value.length} rarities selected`;
  });

  // Compact summary shown by the series multi-select.
  const seriesSelectionLabel = computed<string>(() => {
    if (selectedSeriesIds.value.length === availableSeriesOptions.value.length) return 'All series';
    if (selectedSeriesIds.value.length === 0) return 'No series';
    return `${selectedSeriesIds.value.length} series selected`;
  });

  // Compact summary shown by the variant-type multi-select.
  const variantSelectionLabel = computed<string>(() => {
    if (selectedVariantTypes.value.length === variantOptions.length) return 'All variants';
    if (selectedVariantTypes.value.length === 0) return 'No variants';
    return `${selectedVariantTypes.value.length} variants selected`;
  });

  // Selected catalog ids, broadened to requested forms sharing the same Pokedex number.
  const selectedPokemonIds = computed<globalThis.Set<string>>(() => {
    if (!selectedPokemon.value) return new Set();
    const selectedEntry = pokemon.find((entry) => entry.id === selectedPokemon.value);
    if (!includeSpecialForms.value || !selectedEntry) return new Set([selectedPokemon.value]);
    return new Set(pokemon.filter((entry) => entry.pokedex_id === selectedEntry.pokedex_id).map((entry) => entry.id));
  });

  // Every card variant as an individual display row.
  const allCards = computed<DisplayCard[]>(() => cards.flatMap((card) => {
    const set: Set | null = getSetById(card.set_id);
    const languageId: string = set?.series_id.startsWith('asia-')
      ? selectedAsiaLanguageId.value
      : selectedInternationalLanguageId.value;
    const setName: string | null = set ? localizedValue(set.name, languageId) ?? set.id : 'Unknown set';
    return card.variants.map((variant) => buildDisplayCard(card, variant, languageId, setName));
  }));

  // Catalog variants represented by at least one owned (non-wanted) entry.
  const ownedCatalogCardKeys = computed<globalThis.Set<string>>(() => new Set(
    collectionStore.entries.value
      .filter((entry) => !entry.wanted && entry.set_id !== 'manual-collection')
      .map((entry) => `${entry.set_id}:${entry.card_id}:${entry.variant_id}`)
  ));

  // User-created cards have no catalog record, so build their search rows from
  // the manual card and collection entry data.
  const ownedManualCards = computed<DisplayCard[]>(() => {
    const seen = new Set<string>();

    return collectionStore.entries.value.flatMap((entry): DisplayCard[] => {
      if (entry.wanted || entry.set_id !== 'manual-collection') return [];
      const key = `${entry.card_id}:${entry.variant_id}:${entry.language_id}`;
      if (seen.has(key)) return [];
      seen.add(key);

      const manualCard = collectionStore.manualCards.value.find((card) => card.id === entry.card_id);
      if (!manualCard) return [];
      const image = manualImageStore.find(
        'manual-collection',
        manualCard.id,
        entry.variant_id,
        entry.language_id
      );

      return [{
        id: `manual-collection-${manualCard.id}-${entry.variant_id}-${entry.language_id}`,
        card_id: manualCard.id,
        set_id: 'manual-collection',
        set_name: manualCard.set_name || null,
        language_id: entry.language_id,
        variant_id: entry.variant_id,
        variant_type: entry.variant_id.split('-')[0],
        number: manualCard.number || '?',
        display_name: manualCard.name,
        category: manualCard.category,
        rarity: manualCard.rarity,
        hp: manualCard.hp,
        illustrator: manualCard.illustrator || null,
        types: manualCard.types,
        pokemon_names: manualCard.pokemon_name
          ? [pokemonIdByName.get(manualCard.pokemon_name.toLocaleLowerCase()) ?? manualCard.pokemon_name]
          : [],
        energy_costs: [],
        image_url: image?.url ?? null,
        image_language_id: image?.language_id ?? null,
        image_is_fallback: false,
        image_source: image ? 'manual' : null,
        cardmarket: null,
        is_manual: true,
        estimated_value: manualCard.estimated_value
      }];
    });
  });

  // Cards matching the search text and selected filters.
  const filteredCards = computed<DisplayCard[]>(() => {
    const query: string = search.value.trim().toLowerCase();
    const numberQuery: string = setNumber.value.trim().toLowerCase().replace(/^#/, '');
    const searchableCards = onlyMyCards.value
      ? [
        ...allCards.value.filter((card) =>
          ownedCatalogCardKeys.value.has(`${card.set_id}:${card.card_id}:${card.variant_id}`)
        ),
        ...ownedManualCards.value
      ]
      : allCards.value;

    return searchableCards
      .filter((card) => selectedRegion.value === 'all'
        || card.is_manual
        || (selectedRegion.value === 'asia' ? asiaSetIds.has(card.set_id) : !asiaSetIds.has(card.set_id)))
      .filter((card) => card.is_manual || selectedSeriesIds.value.includes(seriesIdBySetId.get(card.set_id) ?? ''))
      .filter((card) => selectedVariantTypes.value.includes(card.variant_type ?? card.variant_id.split('-')[0]))
      .filter((card) => query === '' || card.display_name.toLowerCase().includes(query))
      .filter((card) => !selectedArtist.value || card.illustrator === selectedArtist.value)
      .filter((card) => !selectedPokemon.value || card.pokemon_names.some((pokemonId) => selectedPokemonIds.value.has(pokemonId)))
      .filter((card) => !selectedEnergy.value || card.types.includes(selectedEnergy.value))
      .filter((card) => numberQuery === '' || card.number.toLowerCase().replace(/^#/, '') === numberQuery)
      .filter((card) =>
        selectedRarities.value.includes(card.rarity)
        || (card.is_manual && !rarityOptions.includes(card.rarity))
      )
      .sort((a, b) => {
        if (selectedSort.value === 'pokedex-asc' || selectedSort.value === 'pokedex-desc') {
          const leftNumbers = a.pokemon_names
            .map((pokemonId) => pokedexByPokemonId.get(pokemonId))
            .filter((number): number is number => number !== undefined);
          const rightNumbers = b.pokemon_names
            .map((pokemonId) => pokedexByPokemonId.get(pokemonId))
            .filter((number): number is number => number !== undefined);
          const leftNumber = leftNumbers.length ? Math.min(...leftNumbers) : null;
          const rightNumber = rightNumbers.length ? Math.min(...rightNumbers) : null;
          if (leftNumber === null && rightNumber !== null) return 1;
          if (leftNumber !== null && rightNumber === null) return -1;
          if (leftNumber !== null && rightNumber !== null && leftNumber !== rightNumber) {
            return selectedSort.value === 'pokedex-asc'
              ? leftNumber - rightNumber
              : rightNumber - leftNumber;
          }
        }
        if (selectedSort.value === 'price-asc' || selectedSort.value === 'price-desc') {
          const leftPrice = a.is_manual ? a.estimated_value ?? null : cardmarketDisplayPrice(a.cardmarket);
          const rightPrice = b.is_manual ? b.estimated_value ?? null : cardmarketDisplayPrice(b.cardmarket);
          if (leftPrice === null && rightPrice !== null) return 1;
          if (leftPrice !== null && rightPrice === null) return -1;
          if (leftPrice !== null && rightPrice !== null && leftPrice !== rightPrice) {
            return selectedSort.value === 'price-asc'
              ? leftPrice - rightPrice
              : rightPrice - leftPrice;
          }
        }

        const releaseComparison = compareCardReleaseAndNumber(
          setReleaseDates.get(a.set_id),
          setReleaseDates.get(b.set_id),
          a.number,
          b.number,
          selectedSort.value === 'release-asc' ? 'asc' : 'desc'
        );

        return releaseComparison
          || (a.set_name ?? '').localeCompare(b.set_name ?? '')
          || a.variant_id.localeCompare(b.variant_id);
      });
  });

  // Cards currently rendered after applying the visible result limit.
  const displayedCards = computed<DisplayCard[]>(() => filteredCards.value.slice(0, visibleCardCount.value));

  // International languages represented by the cards matching the active filters.
  const internationalLanguageIds = computed<string[]>(() => {
    const visibleSetIds = new Set(filteredCards.value.map((card) => card.set_id));
    return uniqueValues(sets
      .filter((set) => visibleSetIds.has(set.id) && !set.series_id.startsWith('asia-'))
      .flatMap((set) => set.language_ids));
  });

  // Asian languages represented by the cards matching the active filters.
  const asiaLanguageIds = computed<string[]>(() => {
    const visibleSetIds = new Set(filteredCards.value.map((card) => card.set_id));
    return uniqueValues(sets
      .filter((set) => visibleSetIds.has(set.id) && set.series_id.startsWith('asia-'))
      .flatMap((set) => set.language_ids));
  });


  /* watchers */
  // A region change exposes and selects exactly the series belonging to that region.
  watch(selectedRegion, (): void => {
    selectedSeriesIds.value = availableSeriesOptions.value.map((option) => option.value);
  });

  // Keeps route-driven filters in sync if the user opens a new search link while already on this page.
  watch(() => route.query, (): void => {
    selectedArtist.value = queryValue('artist');
    selectedPokemon.value = queryValue('pokemon');
    selectedEnergy.value = queryValue('energy');
  });

  // Keeps each preference valid as result filters change the represented sets.
  watch(internationalLanguageIds, (languageIds): void => {
    if (languageIds.length > 0 && !languageIds.includes(selectedInternationalLanguageId.value)) {
      selectedInternationalLanguageId.value = languageIds.includes('en') ? 'en' : languageIds[0];
    }
  }, { immediate: true });

  watch(asiaLanguageIds, (languageIds): void => {
    if (languageIds.length > 0 && !languageIds.includes(selectedAsiaLanguageId.value)) {
      selectedAsiaLanguageId.value = languageIds.includes('ja') ? 'ja' : languageIds[0];
    }
  }, { immediate: true });

  // Resets pagination whenever the visible result set changes.
  watch([
    search,
    selectedInternationalLanguageId,
    selectedAsiaLanguageId,
    selectedArtist,
    selectedPokemon,
    selectedEnergy,
    setNumber,
    selectedSeriesIds,
    selectedVariantTypes,
    selectedRarities,
    selectedSort,
    includeSpecialForms,
    onlyMyCards,
    selectedRegion
  ], (): void => {
    visibleCardCount.value = initialVisibleCardCount;
  });

  // Keeps all search preferences available when navigating away and returning.
  watch([
    search,
    selectedInternationalLanguageId,
    selectedAsiaLanguageId,
    selectedArtist,
    selectedPokemon,
    selectedEnergy,
    setNumber,
    selectedSeriesIds,
    selectedVariantTypes,
    selectedRarities,
    selectedSort,
    includeSpecialForms,
    onlyMyCards,
    selectedRegion,
    advancedFiltersOpen
  ], (): void => {
    store.commit('set_card_search_filters', {
      search: search.value,
      artist: selectedArtist.value,
      pokemon: selectedPokemon.value,
      energy: selectedEnergy.value,
      set_number: setNumber.value,
      series_ids: [...selectedSeriesIds.value],
      variant_types: [...selectedVariantTypes.value],
      rarities: [...selectedRarities.value],
      sort: selectedSort.value,
      include_special_forms: includeSpecialForms.value,
      only_my_cards: onlyMyCards.value,
      region: selectedRegion.value,
      international_language_id: selectedInternationalLanguageId.value,
      asia_language_id: selectedAsiaLanguageId.value,
      advanced_filters_open: advancedFiltersOpen.value
    } satisfies CardSearchFilters);
  }, { deep: true, immediate: true });


  /* methods */
  // Narrows select options using a case-insensitive prefix match.
  const filterSelectOptions = (
    inputValue: string,
    options: string[],
    filteredOptions: { value: string[]; },
    update: (callback: () => void) => void
  ): void => {
    const query: string = inputValue.trim().toLowerCase();
    update(() => {
      filteredOptions.value = query === ''
        ? options
        : options.filter((option) => option.toLowerCase().startsWith(query));
    });
  };

  // Filters artist suggestions as the user types.
  const filterArtists = (inputValue: string, update: (callback: () => void) => void): void => {
    filterSelectOptions(inputValue, artistOptions.value, filteredArtistOptions, update);
  };

  // Filters Pokemon suggestions as the user types.
  const filterPokemon = (inputValue: string, update: (callback: () => void) => void): void => {
    const query: string = inputValue.trim().toLocaleLowerCase();
    update(() => {
      filteredPokemonOptions.value = pokemonOptions.value
        .filter((option) => query === '' || option.searchNames.some((name) => name.toLocaleLowerCase().startsWith(query)));
    });
  };

  // Changes only the Pokemon filter, preserving every other search field.
  const selectAdjacentPokemon = (option: { value: string; } | null): void => {
    if (!option) return;

    // Keep the selected id-to-label mapping available after a narrowed text search.
    filteredPokemonOptions.value = pokemonOptions.value;
    selectedPokemon.value = option.value;
  };

  // Deselects every series in the active card region.
  const clearSeries = (): void => {
    selectedSeriesIds.value = [];
  };

  // Selects every series belonging to the active card region.
  const selectAllSeries = (): void => {
    selectedSeriesIds.value = availableSeriesOptions.value.map((option) => option.value);
  };

  // Deselects every broad physical card variant type.
  const clearVariants = (): void => {
    selectedVariantTypes.value = [];
  };

  // Selects every broad physical card variant type in the catalog.
  const selectAllVariants = (): void => {
    selectedVariantTypes.value = [...variantTypes];
  };

  // Deselects every rarity so the user can rebuild the filter from scratch.
  const clearRarities = (): void => {
    selectedRarities.value = [];
  };

  // Selects every rarity represented in the card catalog.
  const selectAllRarities = (): void => {
    selectedRarities.value = [...rarityOptions];
  };

  // Increases the number of rendered card results.
  const showMoreCards = (): void => {
    visibleCardCount.value += visibleCardStep;
  };

  // Opens the detail page for a card from its set.
  const goToCard = (card: DisplayCard): void => {
    if (card.is_manual) return;
    router.push({
      path: `/set/${card.set_id}/card/${card.card_id}`,
      query: { variant: card.variant_id, from: 'search' }
    });
  };
</script>
