<template>
  <q-page class="bg-dark q-pa-md">
    <section class="q-mb-md">
      <q-btn flat dense color="grey-4" icon="arrow_back" label="Back to series" no-caps class="q-mb-sm" @click="goBackToSeries" />
      <div class="text-overline text-primary">
        Set cards
      </div>
      <div class="text-h4 text-weight-bold">
        {{ currentSet ? localizedValue(currentSet.name, selectedLanguageId) ?? currentSet.id : 'Unknown set' }}
      </div>
      <div class="text-body2 text-secondary">
        {{ currentSeries?.name ?? 'Unknown series' }} · {{ allCards.length }} total collectible cards including variants ·
        Released {{ currentSet ? formatFrenchDate(currentSet.release_date) : 'Unknown' }} ·
        Estimated set value {{ formatEuroPrice(setValue) }}
      </div>
    </section>

    <section class="row q-col-gutter-md items-center q-mb-md">
      <div class="col-auto">
        <language-selector v-model="selectedLanguageId" :language-ids="currentSet?.language_ids ?? []" />
      </div>
      <div class="col-auto">
        <q-input v-model="search" dark dense outlined clearable debounce="150" label="Search a card by name or number">
          <template #prepend>
            <q-icon name="search" />
          </template>
        </q-input>
      </div>
      <div class="col-auto">
        <q-toggle v-model="showVariants" dark color="yellow-7" label="Show variants" />
      </div>
      <div class="col-12 col-sm-auto" style="min-width: 250px">
        <card-sort-selector v-model="selectedSort" include-set-order />
      </div>
    </section>

    <section class="row q-col-gutter-md tems-center q-mb-md">
      <div class="col-12 col-sm-6 col-md-3">
        <q-select v-model="selectedRarity" :options="rarityOptions" dark dense outlined clearable label="Rarity" />
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <q-select v-model="selectedType" :options="typeOptions" dark dense outlined clearable label="Type" />
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <q-select v-model="selectedCategory" :options="categoryOptions" dark dense outlined clearable label="Category" />
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <q-select v-model="selectedVariant" :options="variantOptions" :disable="!showVariants" dark dense outlined clearable label="Variant" />
      </div>
    </section>

    <q-separator class="q-mb-md" />

    <card-list :cards="displayedCards" @card-click="goToCard" />

    <q-banner v-if="displayedCards.length === 0" class="bg-grey-10 text-grey-4">
      No card found for these filters.
    </q-banner>

    <back-to-top-button />
  </q-page>
</template>

<script setup lang="ts">
  // import hooks
  import { computed, ref } from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  import { useStore } from 'vuex';

  // import components
  import LanguageSelector from '../components/LanguageSelector.vue';
  import CardList from '../components/CardList.vue';
  import CardSortSelector from '../components/CardSortSelector.vue';
  import BackToTopButton from '../components/BackToTopButton.vue';

  // import utils
  import { getCardsBySetId, getPokemon, getSetById, getSeriesById } from '../utils/dataManagement';
  import {
    buildDisplayCard,
    cardmarketDisplayPrice,
    compareCardNumbers,
    formatCardValue,
    formatEuroPrice
  } from '../utils/cardDisplay';
  import type { DisplayCard } from '../utils/cardDisplay';
  import { localizedValue } from '../utils/localization';
  import type { Card, Series, Set } from '../utils/types';
  import type { AppState } from '../store';
  import type { CardSort } from '../utils/cardSorting';
  import { formatFrenchDate } from '../utils/dates';

  /* constant vars */
  // Current route used to identify the selected set.
  const route = useRoute();

  // Router used to navigate back to the series listing page.
  const router = useRouter();

  // Shared application state.
  const store = useStore<AppState>();

  // The current set id read from the route.
  const setId: string = String(route.params.setId ?? '');

  // The selected set metadata.
  const currentSet: Set | null = getSetById(setId);

  // The current set series, available for future breadcrumbs.
  const currentSeries: Series | null = currentSet ? getSeriesById(currentSet.series_id) : null;

  // Cards belonging to the selected set.
  const cards: Card[] = getCardsBySetId(setId);

  // Pokédex numbers used by the Pokédex sorting modes.
  const pokedexByPokemonId = new Map(getPokemon().map((pokemon) => [pokemon.id, pokemon.pokedex_id]));


  /* reactive vars */
  // Currently selected language for localized card names.
  const selectedLanguageId = computed({
    get: (): string => {
      const preferredLanguageId: string = store.state.selected_language_id;
      return currentSet?.language_ids.includes(preferredLanguageId) ? preferredLanguageId : currentSet?.language_ids[0] ?? 'en';
    },
    set: (languageId: string): void => store.commit('set_sekected_language_id', languageId)
  });

  // Search text used to filter card names and numbers.
  const search = ref<string>('');

  // Selected rarity filter.
  const selectedRarity = ref<string | null>(null);

  // Selected Pokemon type filter.
  const selectedType = ref<string | null>(null);

  // Selected card category filter.
  const selectedCategory = ref<string | null>(null);

  // Selected variant filter.
  const selectedVariant = ref<string | null>(null);

  // Whether every declared collectible variant is displayed.
  const showVariants = ref<boolean>(true);

  // The printed card number order is the natural default inside a set.
  const selectedSort = ref<CardSort>('set-order');

  /* computed vars */
  // Every card variant in this set as an individual display row.
  const allCards = computed<DisplayCard[]>(() => cards.flatMap((card) => card.variants.map((variant) => buildDisplayCard(card, variant, selectedLanguageId.value))));

  // Combined current market value of one copy of every collectible variant.
  const setValue = computed<number>(() => allCards.value.reduce(
    (total, card) => total + (cardmarketDisplayPrice(card.cardmarket) ?? 0),
    0
  ));

  // Rarity filter options found in this set.
  const rarityOptions = computed<string[]>(() => uniqueValues(allCards.value.map((card) => card.rarity)));

  // Pokemon type filter options found in this set.
  const typeOptions = computed<string[]>(() => uniqueValues(allCards.value.flatMap((card) => card.types)));

  // Card category filter options found in this set.
  const categoryOptions = computed<string[]>(() => uniqueValues(allCards.value.map((card) => card.category)));

  // Variant filter options found in this set.
  const variantOptions = computed<string[]>(() => uniqueValues(allCards.value.map((card) => card.variant_id)));

  // Full variants or one representative printing per card, depending on the toggle.
  const listedCards = computed<DisplayCard[]>(() => {
    if (showVariants.value) return allCards.value;

    const representativeCards = new Map<string, DisplayCard>();
    for (const card of allCards.value) {
      const current = representativeCards.get(card.card_id);
      if (!current || (card.variant_id === 'normal' && current.variant_id !== 'normal')) {
        representativeCards.set(card.card_id, card);
      }
    }
    return [...representativeCards.values()];
  });

  // Cards shown after applying search and filters.
  const displayedCards = computed<DisplayCard[]>(() => {
    const query: string = search.value.trim().toLowerCase();

    return listedCards.value
      .filter((card) => query === '' || card.display_name.toLowerCase().includes(query) || card.number.toLowerCase().includes(query))
      .filter((card) => !selectedRarity.value || card.rarity === selectedRarity.value)
      .filter((card) => !selectedType.value || card.types.includes(selectedType.value))
      .filter((card) => !selectedCategory.value || card.category === selectedCategory.value)
      .filter((card) => !showVariants.value || !selectedVariant.value || card.variant_id === selectedVariant.value)
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

        const numberComparison = compareCardNumbers(a.number, b.number);
        if (selectedSort.value === 'release-desc') {
          return -numberComparison || a.variant_id.localeCompare(b.variant_id);
        }

        return numberComparison || a.variant_id.localeCompare(b.variant_id);
      });
  });


  /* methods */
  // Formats enum-like values for display.
  const formatValue = (value: string): string => {
    return formatCardValue(value);
  };

  // Returns sorted unique string values.
  const uniqueValues = (values: string[]): string[] => {
    return [...new Set(values.filter(Boolean))].sort();
  };

  // Stores the current set region and returns to the existing series history
  // entry so Vue Router can restore its saved scroll position.
  const goBackToSeries = (): void => {
    if (currentSeries) {
      store.commit('set_selected_region_id', currentSeries.region_id);
    }

    const previousPath = window.history.state?.back;
    if (typeof previousPath === 'string' && previousPath.split(/[?#]/, 1)[0] === '/series') {
      router.back();
      return;
    }

    // A directly opened or refreshed set page has no series entry to restore.
    router.push('/series');
  };

  // Opens the detail page for a card from this set.
  const goToCard = (card: DisplayCard): void => {
    router.push({ path: `/set/${setId}/card/${card.card_id}`, query: { variant: card.variant_id } });
  };

</script>
