<template>
  <q-page class="bg-dark q-pa-md">
    <section class="q-mb-md">
      <q-btn flat dense color="grey-4" icon="arrow_back" label="Back to series" no-caps class="q-mb-sm" @click="goBackToSeries" />
      <div class="text-overline text-primary">
        Set cards
      </div>
      <div class="text-h4 text-weight-bold">
        {{ currentSet?.name ?? 'Unknown set' }}
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
        <q-select v-model="selectedEnergy" :options="energyOptions" dark dense outlined clearable label="Energy" />
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <q-select v-model="selectedCategory" :options="categoryOptions" dark dense outlined clearable label="Type" />
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <q-select v-model="selectedVariant" :options="variantOptions" dark dense outlined clearable label="Variant" />
      </div>
    </section>

    <q-separator class="q-mb-md" />

    <section class="row q-col-gutter-md">
      <div v-for="card in displayedCards" :key="card.id" class="col-6 col-sm-4 col-md-3 col-lg-2">
        <q-card flat bordered class="bg-grey-10 text-white full-height column no-wrap cursor-pointer" @click="goToCard(card.card_id)">
          <q-responsive :ratio="5 / 6" class="bg-grey-9">
            <div class="column items-center justify-center full-height text-grey-5">
              <q-icon name="image" size="28px" />
            </div>
          </q-responsive>

          <q-card-section class="q-pa-xs column col overflow-hidden no-wrap">
            <div class="text-caption text-grey-5 ellipsis overflow-hidden text-no-wrap">
              #{{ card.number }}
            </div>
            <div class="text-caption text-weight-bold ellipsis overflow-hidden text-no-wrap">
              {{ card.display_name }}
            </div>
            <div class="text-caption text-grey-4 ellipsis overflow-hidden text-no-wrap">
              {{ formatValue(card.rarity) }}
            </div>
            <div class="text-caption text-grey-5 ellipsis overflow-hidden text-no-wrap">
              <span v-if="card.types.length">{{ card.types.join(', ') }}</span>
              <span v-else>No energy type</span>
            </div>
            <div class="text-caption text-grey-5 ellipsis overflow-hidden text-no-wrap">
              <span v-if="card.hp">{{ card.hp }} HP · </span>{{ card.illustrator || 'Unknown illustrator' }}
            </div>
            <div class="row no-wrap q-gutter-xs q-mt-auto overflow-hidden">
              <q-badge color="grey-9" text-color="white" class="ellipsis overflow-hidden text-no-wrap">
                {{ card.category }}
              </q-badge>
              <q-badge v-if="card.variant_id !== 'normal'" color="grey-9" text-color="white" class="ellipsis overflow-hidden text-no-wrap">
                {{ formatValue(card.variant_id) }}
              </q-badge>
              <q-badge v-for="energy in card.energy_costs" :key="energy" color="grey-9" text-color="white" class="ellipsis overflow-hidden text-no-wrap">
                {{ energy }}
              </q-badge>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </section>

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

  // import utils
  import { getCardsBySetId, getSetById, getSeriesById } from '../utils/dataManagement';
  import type { Card, CardVariant, Series, Set } from '../utils/types';
  import type { AppState } from '../store';

  // A flattened card variant row ready for display and filtering.
  type DisplayCard = {
    id: string;
    card_id: string;
    variant_id: string;
    number: string;
    display_name: string;
    category: string;
    rarity: string;
    hp: number | null;
    illustrator: string | null;
    types: string[];
    energy_costs: string[];
  };


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

  // Selected attack energy filter.
  const selectedEnergy = ref<string | null>(null);

  // Selected card category filter.
  const selectedCategory = ref<string | null>(null);

  // Selected variant filter.
  const selectedVariant = ref<string | null>(null);


  /* computed vars */
  // Every card variant in this set as an individual display row.
  const allCards = computed<DisplayCard[]>(() => cards.flatMap((card) => card.variants.map((variant) => buildDisplayCard(card, variant))));

  // Rarity filter options found in this set.
  const rarityOptions = computed<string[]>(() => uniqueValues(allCards.value.map((card) => card.rarity)));

  // Energy filter options found in this set.
  const energyOptions = computed<string[]>(() => uniqueValues(allCards.value.flatMap((card) => card.energy_costs)));

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
      .filter((card) => !selectedEnergy.value || card.energy_costs.includes(selectedEnergy.value))
      .filter((card) => !selectedCategory.value || card.category === selectedCategory.value)
      .filter((card) => !selectedVariant.value || card.variant_id === selectedVariant.value)
      .sort((a, b) => a.number.localeCompare(b.number) || a.variant_id.localeCompare(b.variant_id));
  });


  /* methods */
  // Creates a display row for one physical card variant.
  const buildDisplayCard = (card: Card, variant: CardVariant): DisplayCard => {
    const cardName: string = localizedValue(card.name, selectedLanguageId.value) ?? card.id;
    const variantSuffix: string = variant.id !== 'normal' ? ` (${formatValue(variant.id)})` : '';

    return {
      id: `${card.id}-${variant.id}`,
      card_id: card.id,
      variant_id: variant.id,
      number: card.number,
      display_name: `${cardName}${variantSuffix}`,
      category: card.category,
      rarity: card.rarity,
      hp: card.hp ?? null,
      illustrator: card.illustrator ?? null,
      types: card.types ?? [],
      energy_costs: uniqueValues((card.attacks ?? []).flatMap((attack) => attack.cost))
    };
  };

  // Formats enum-like values for display.
  const formatValue = (value: string): string => {
    return value.replaceAll('_', ' ');
  };

  // Returns a localized field value for the selected language.
  const localizedValue = (value: Record<string, string | null>, languageId: string): string | null => {
    return value[languageId] ?? Object.values(value).find((item) => item) ?? null;
  };

  // Returns sorted unique string values.
  const uniqueValues = (values: string[]): string[] => {
    return [...new Set(values.filter(Boolean))].sort();
  };

  // Stores the current set region and navigates back to the series page.
  const goBackToSeries = (): void => {
    if (currentSeries) store.commit('set_selected_region_id', currentSeries.region_id);
    router.push('/series');
  };

  // Opens the detail page for a card from this set.
  const goToCard = (cardId: string): void => {
    router.push(`/set/${setId}/card/${cardId}`);
  };
</script>
