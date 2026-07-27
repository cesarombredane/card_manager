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
        <q-input v-model="search" dark dense outlined clearable debounce="150" label="Search a card by name">
          <template #prepend>
            <q-icon name="search" />
          </template>
        </q-input>
      </div>
      <div class="col-12 col-sm-6 col-md-4">
        <div class="row no-wrap items-center q-gutter-xs">
          <q-btn
            aria-label="Previous Pokemon"
            :disable="!previousPokemon"
            dark
            dense
            flat
            round
            icon="chevron_left"
            @click="selectAdjacentPokemon(previousPokemon)"
          >
            <q-tooltip v-if="previousPokemon">Previous: {{ previousPokemon.label }}</q-tooltip>
          </q-btn>
          <q-select
            v-model="selectedPokemon"
            class="col"
            :options="filteredPokemonOptions"
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
            @filter="filterPokemon"
          />
          <q-btn
            aria-label="Next Pokemon"
            :disable="!nextPokemon"
            dark
            dense
            flat
            round
            icon="chevron_right"
            @click="selectAdjacentPokemon(nextPokemon)"
          >
            <q-tooltip v-if="nextPokemon">Next: {{ nextPokemon.label }}</q-tooltip>
          </q-btn>
        </div>
      </div>
      <div class="col-12 col-sm-auto">
        <q-checkbox v-model="includeSpecialForms" dark label="Include regional and Mega forms" />
      </div>
      <div class="col-12 col-sm-auto">
        <q-btn
          :icon="advancedFiltersOpen ? 'expand_less' : 'tune'"
          :label="advancedFiltersOpen ? 'Hide advanced filters' : 'Advanced filters'"
          color="primary"
          flat
          @click="advancedFiltersOpen = !advancedFiltersOpen"
        />
      </div>
    </section>

    <q-slide-transition>
      <section v-show="advancedFiltersOpen" class="row q-col-gutter-md items-center q-mb-md">
        <div class="col-12">
          <div class="text-caption text-grey-5 q-mb-xs">Card region</div>
          <q-btn-toggle
            v-model="selectedRegion"
            :options="regionOptions"
            color="grey-9"
            text-color="grey-4"
            toggle-color="primary"
            toggle-text-color="black"
            unelevated
          />
        </div>
        <div v-if="selectedRegion !== 'asia' && internationalLanguageIds.length" class="col-auto">
          <div class="text-caption text-grey-5 q-mb-xs">International card language</div>
          <language-selector v-model="selectedInternationalLanguageId" :language-ids="internationalLanguageIds" />
        </div>
        <div v-if="selectedRegion !== 'intl' && asiaLanguageIds.length" class="col-auto">
          <div class="text-caption text-grey-5 q-mb-xs">Asian card language</div>
          <language-selector v-model="selectedAsiaLanguageId" :language-ids="asiaLanguageIds" />
        </div>
        <div class="col-12 col-sm-6 col-md-4">
          <q-select
            v-model="selectedArtist"
            :options="filteredArtistOptions"
            dark
            dense
            outlined
            clearable
            use-input
            input-debounce="0"
            label="Artist"
            @filter="filterArtists"
          />
        </div>
        <div class="col-12 col-sm-6 col-md-4">
          <q-select
            v-model="selectedRarities"
            :display-value="raritySelectionLabel"
            :options="rarityOptions"
            dark
            dense
            outlined
            multiple
            options-selected-class="text-primary"
            label="Rarities"
          >
            <template #append>
              <q-btn
                aria-label="Clear all rarities"
                :disable="selectedRarities.length === 0"
                dense
                flat
                round
                icon="deselect"
                @click.stop="clearRarities"
              >
                <q-tooltip>Clear all rarities</q-tooltip>
              </q-btn>
            </template>
          </q-select>
        </div>
        <div class="col-12 col-sm-6 col-md-4">
          <q-select
            v-model="selectedEnergy"
            :options="energyOptions"
            dark
            dense
            outlined
            clearable
            label="Pokémon energy"
          />
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

  // import utils
  import { getCards, getPokemon, getSetById, getSets } from '../utils/dataManagement';
  import { buildDisplayCard, cardmarketDisplayPrice, compareCardNumbers } from '../utils/cardDisplay';
  import type { DisplayCard } from '../utils/cardDisplay';
  import { localizedValue } from '../utils/localization';
  import type { Card, Pokemon, Set } from '../utils/types';
  import { uniqueValues } from '../utils/arrayUtils';
  import type { AppState, CardSearchFilters, CardSearchRegion } from '../store';
  import type { CardSort } from '../utils/cardSorting';


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

  // Every card in the local data catalog.
  const cards: Card[] = getCards();

  // Standardized Pokemon species and form catalog.
  const pokemon: Pokemon[] = getPokemon();

  // Every rarity represented in the local card catalog.
  const rarityOptions: string[] = uniqueValues(cards.map((card) => card.rarity));

  // Region choices for the complete catalog, International sets, or Asian sets.
  const regionOptions: { label: string; value: CardSearchRegion }[] = [
    { label: 'Both', value: 'all' },
    { label: 'International', value: 'intl' },
    { label: 'Asia', value: 'asia' }
  ];

  // Release dates indexed once for efficient card sorting.
  const setReleaseDates = new Map<string, string>(sets.map((set) => [set.id, set.release_date]));
  const asiaSetIds = new globalThis.Set<string>(
    sets.filter((set) => set.series_id.startsWith('asia-')).map((set) => set.id)
  );
  const pokedexByPokemonId = new Map<string, number>(pokemon.map((entry) => [entry.id, entry.pokedex_id]));


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

  // Selected rarity filters. The complete catalog is visible by default.
  const selectedRarities = ref<string[]>(storedFilters.rarities ? [...storedFilters.rarities] : [...rarityOptions]);

  // Current result ordering, newest releases first by default.
  const selectedSort = ref<CardSort>(storedFilters.sort);

  // Whether regional and Mega forms are available in Pokemon results.
  const includeSpecialForms = ref<boolean>(storedFilters.include_special_forms);

  // Catalog region currently included in results.
  const selectedRegion = ref<CardSearchRegion>(storedFilters.region);

  // Whether the secondary search controls are visible.
  const advancedFiltersOpen = ref<boolean>(storedFilters.advanced_filters_open);

  // Artist options matching the text currently typed in the select.
  const filteredArtistOptions = ref<string[]>([]);

  // Pokemon options matching the text currently typed in the select.
  const filteredPokemonOptions = ref<{ label: string; value: string; searchNames: string[] }[]>([]);

  // Number of filtered cards currently visible.
  const visibleCardCount = ref<number>(initialVisibleCardCount);


  /* computed vars */
  // Artist filter options found across every card.
  const artistOptions = computed<string[]>(() => uniqueValues(cards.map((card) => card.illustrator ?? '')));

  // Energy/type options represented by Pokemon cards in the catalog.
  const energyOptions: string[] = uniqueValues(
    cards
      .filter((card) => card.category === 'pokemon')
      .flatMap((card) => card.types ?? [])
  );

  // Pokemon filter options found across every card.
  // Base-species options display English canonical names while retaining stable ids.
  const pokemonOptions = computed<{ label: string; value: string; searchNames: string[] }[]>(() => pokemon
    .filter((entry) => entry.form === null)
    .sort((a, b) => a.pokedex_id - b.pokedex_id)
    .map((entry) => ({
      label: entry.name,
      value: entry.id,
      searchNames: uniqueValues(Object.values(entry.names).filter((name): name is string => Boolean(name)))
    })));

  // Index of the selected base species in Pokedex order.
  const selectedPokemonIndex = computed<number>(() => pokemonOptions.value.findIndex((option) => option.value === selectedPokemon.value));

  // Base species immediately before the current selection in Pokedex order.
  const previousPokemon = computed<{ label: string; value: string } | null>(() => {
    const index: number = selectedPokemonIndex.value;
    return index > 0 ? pokemonOptions.value[index - 1] : null;
  });

  // Base species immediately after the current selection in Pokedex order.
  const nextPokemon = computed<{ label: string; value: string } | null>(() => {
    const index: number = selectedPokemonIndex.value;
    return index >= 0 && index < pokemonOptions.value.length - 1 ? pokemonOptions.value[index + 1] : null;
  });

  // Compact summary shown by the multi-select instead of a long list of values.
  const raritySelectionLabel = computed<string>(() => {
    if (selectedRarities.value.length === rarityOptions.length) return 'All rarities';
    if (selectedRarities.value.length === 0) return 'No rarities';
    return `${selectedRarities.value.length} rarities selected`;
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

  // Cards matching the search text and selected filters.
  const filteredCards = computed<DisplayCard[]>(() => {
    const query: string = search.value.trim().toLowerCase();

    return allCards.value
      .filter((card) => selectedRegion.value === 'all'
        || (selectedRegion.value === 'asia' ? asiaSetIds.has(card.set_id) : !asiaSetIds.has(card.set_id)))
      .filter((card) => query === '' || card.display_name.toLowerCase().includes(query))
      .filter((card) => !selectedArtist.value || card.illustrator === selectedArtist.value)
      .filter((card) => !selectedPokemon.value || card.pokemon_names.some((pokemonId) => selectedPokemonIds.value.has(pokemonId)))
      .filter((card) => !selectedEnergy.value || card.types.includes(selectedEnergy.value))
      .filter((card) => selectedRarities.value.includes(card.rarity))
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
          const leftPrice = cardmarketDisplayPrice(a.cardmarket);
          const rightPrice = cardmarketDisplayPrice(b.cardmarket);
          if (leftPrice === null && rightPrice !== null) return 1;
          if (leftPrice !== null && rightPrice === null) return -1;
          if (leftPrice !== null && rightPrice !== null && leftPrice !== rightPrice) {
            return selectedSort.value === 'price-asc'
              ? leftPrice - rightPrice
              : rightPrice - leftPrice;
          }
        }

        const dateComparison: number = (setReleaseDates.get(a.set_id) ?? '').localeCompare(setReleaseDates.get(b.set_id) ?? '');
        const directedDateComparison: number = selectedSort.value === 'release-asc' ? dateComparison : -dateComparison;

        return directedDateComparison
          || (a.set_name ?? '').localeCompare(b.set_name ?? '')
          || compareCardNumbers(a.number, b.number)
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
    selectedRarities,
    selectedSort,
    includeSpecialForms,
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
    selectedRarities,
    selectedSort,
    includeSpecialForms,
    selectedRegion,
    advancedFiltersOpen
  ], (): void => {
    store.commit('set_card_search_filters', {
      search: search.value,
      artist: selectedArtist.value,
      pokemon: selectedPokemon.value,
      energy: selectedEnergy.value,
      rarities: [...selectedRarities.value],
      sort: selectedSort.value,
      include_special_forms: includeSpecialForms.value,
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
    filteredOptions: { value: string[] },
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
  const selectAdjacentPokemon = (option: { value: string } | null): void => {
    if (!option) return;

    // Keep the selected id-to-label mapping available after a narrowed text search.
    filteredPokemonOptions.value = pokemonOptions.value;
    selectedPokemon.value = option.value;
  };

  // Deselects every rarity so the user can rebuild the filter from scratch.
  const clearRarities = (): void => {
    selectedRarities.value = [];
  };

  // Increases the number of rendered card results.
  const showMoreCards = (): void => {
    visibleCardCount.value += visibleCardStep;
  };

  // Opens the detail page for a card from its set.
  const goToCard = (card: DisplayCard): void => {
    router.push({ path: `/set/${card.set_id}/card/${card.card_id}`, query: { variant: card.variant_id } });
  };
</script>
