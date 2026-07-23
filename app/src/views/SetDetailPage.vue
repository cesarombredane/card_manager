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
        {{ currentSeries?.name ?? 'Unknown series' }} · {{ allCards.length }} total collectible cards including variants
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
        <q-select v-model="selectedVariant" :options="variantOptions" dark dense outlined clearable label="Variant" />
      </div>
    </section>

    <q-separator class="q-mb-md" />

    <card-list :cards="displayedCards" @card-click="goToCard" />

    <q-banner v-if="displayedCards.length === 0" class="bg-grey-10 text-grey-4">
      No card found for these filters.
    </q-banner>
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

  // import utils
  import { getCardsBySetId, getSetById, getSeriesById } from '../utils/dataManagement';
  import { buildDisplayCard, compareCardNumbers, formatCardValue } from '../utils/cardDisplay';
  import type { DisplayCard } from '../utils/cardDisplay';
  import { localizedValue } from '../utils/localization';
  import type { Card, Series, Set } from '../utils/types';
  import type { AppState } from '../store';

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


  /* computed vars */
  // Every card variant in this set as an individual display row.
  const allCards = computed<DisplayCard[]>(() => cards.flatMap((card) => card.variants.map((variant) => buildDisplayCard(card, variant, selectedLanguageId.value))));

  // Rarity filter options found in this set.
  const rarityOptions = computed<string[]>(() => uniqueValues(allCards.value.map((card) => card.rarity)));

  // Pokemon type filter options found in this set.
  const typeOptions = computed<string[]>(() => uniqueValues(allCards.value.flatMap((card) => card.types)));

  // Card category filter options found in this set.
  const categoryOptions = computed<string[]>(() => uniqueValues(allCards.value.map((card) => card.category)));

  // Variant filter options found in this set.
  const variantOptions = computed<string[]>(() => uniqueValues(allCards.value.map((card) => card.variant_id)));

  // Cards shown after applying search and filters.
  const displayedCards = computed<DisplayCard[]>(() => {
    const query: string = search.value.trim().toLowerCase();

    return allCards.value
      .filter((card) => query === '' || card.display_name.toLowerCase().includes(query) || card.number.toLowerCase().includes(query))
      .filter((card) => !selectedRarity.value || card.rarity === selectedRarity.value)
      .filter((card) => !selectedType.value || card.types.includes(selectedType.value))
      .filter((card) => !selectedCategory.value || card.category === selectedCategory.value)
      .filter((card) => !selectedVariant.value || card.variant_id === selectedVariant.value)
      .sort((a, b) => compareCardNumbers(a.number, b.number) || a.variant_id.localeCompare(b.variant_id));
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

  // Stores the current set region and navigates back to the series page.
  const goBackToSeries = (): void => {
    if (currentSet?.language_ids.includes('zh-CN') && selectedLanguageId.value === 'zh-CN') {
      store.commit('set_selected_region_id', 'CHN');
    } else if (currentSet?.language_ids.includes('ja')) {
      store.commit('set_selected_region_id', 'JPN');
    } else if (currentSeries) {
      store.commit('set_selected_region_id', currentSeries.region_id);
    }
    router.push('/series');
  };

  // Opens the detail page for a card from this set.
  const goToCard = (card: DisplayCard): void => {
    router.push(`/set/${setId}/card/${card.card_id}`);
  };
</script>
