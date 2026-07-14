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
      <div class="col-auto">
        <language-selector v-model="selectedLanguageId" :language-ids="languageIds" />
      </div>
      <div class="col-auto">
        <q-input v-model="search" dark dense outlined clearable debounce="150" label="Search a card by name">
          <template #prepend>
            <q-icon name="search" />
          </template>
        </q-input>
      </div>
    </section>

    <section class="row q-col-gutter-md items-center q-mb-md">
      <div class="col-12 col-sm-6 col-md-4">
        <q-select v-model="selectedArtist" :options="artistOptions" dark dense outlined clearable label="Artist" />
      </div>
      <div class="col-12 col-sm-6 col-md-4">
        <q-select v-model="selectedPokemon" :options="pokemonOptions" dark dense outlined clearable label="Pokemon" />
      </div>
    </section>

    <q-separator class="q-mb-md" />

    <section class="row q-col-gutter-md">
      <div v-for="card in displayedCards" :key="card.id" class="col-6 col-sm-4 col-md-3 col-lg-2">
        <q-card class="bg-grey-10 text-white no-wrap cursor-pointer q-pa-none" flat bordered @click="goToCard(card.set_id, card.card_id)">
          <q-responsive :ratio="5 / 6" class="bg-grey-9">
            <q-img v-if="card.image_url" :src="card.image_url">
              <template #error>
                <div class="column items-center justify-center">
                  <q-icon name="image" size="28px" />
                </div>
              </template>
            </q-img>
            <div v-else class="column items-center justify-center">
              <q-icon name="image" size="28px" />
            </div>
          </q-responsive>

          <q-card-section class="q-pa-xs column overflow-hidden no-wrap">
            <div class="text-caption text-grey-5 ellipsis overflow-hidden text-no-wrap">
              {{ card.set_name }} · #{{ card.number }}
            </div>
            <div class="text-caption text-weight-bold ellipsis overflow-hidden text-no-wrap">
              {{ card.display_name }}
            </div>
            <div class="text-caption text-grey-4 ellipsis overflow-hidden text-no-wrap">
              {{ formatValue(card.rarity) }}
            </div>
            <div class="text-caption text-grey-5 ellipsis overflow-hidden text-no-wrap">
              {{ card.artist ?? 'Unknown illustrator' }}
            </div>
            <div class="text-caption text-grey-5 ellipsis overflow-hidden text-no-wrap">
              {{ card.pokemon_names.length ? card.pokemon_names.join(', ') : 'No linked Pokemon' }}
            </div>
            <div class="row no-wrap q-gutter-xs q-mt-auto overflow-hidden">
              <q-badge color="grey-9" text-color="white" class="ellipsis overflow-hidden text-no-wrap">
                {{ card.category }}
              </q-badge>
              <q-badge v-if="card.variant_id !== 'normal'" color="grey-9" text-color="white" class="ellipsis overflow-hidden text-no-wrap">
                {{ formatValue(card.variant_id) }}
              </q-badge>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </section>

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

  // import utils
  import { getCards, getSetById, getSets } from '../utils/dataManagement';
  import type { Card, CardVariant, Set } from '../utils/types';
  import { uniqueValues } from '../utils/arrayUtils';
  import type { AppState } from '../store';


  /* types */
  // A flattened card variant row ready for global search results.
  type DisplayCard = {
    id: string;
    card_id: string;
    set_id: string;
    set_name: string;
    variant_id: string;
    number: string;
    display_name: string;
    category: string;
    rarity: string;
    artist: string | null;
    pokemon_names: string[];
    image_url: string | null;
  };


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


  /* methods */
  // Reads a string query parameter from the current route.
  const queryValue = (key: string): string | null => {
    const value = route.query[key];
    return typeof value === 'string' && value !== '' ? value : null;
  };


  /* reactive vars */
  // Currently selected language for localized names and images.
  const selectedLanguageId = computed({
    get: (): string => {
      const preferredLanguageId: string = store.state.selected_language_id;
      return languageIds.value.includes(preferredLanguageId) ? preferredLanguageId : languageIds.value[0] ?? 'en';
    },
    set: (languageId: string): void => store.commit('set_sekected_language_id', languageId)
  });

  // Search text used to filter card names.
  const search = ref<string>('');

  // Selected artist filter.
  const selectedArtist = ref<string | null>(queryValue('artist'));

  // Selected Pokemon filter.
  const selectedPokemon = ref<string | null>(queryValue('pokemon'));

  // Number of filtered cards currently visible.
  const visibleCardCount = ref<number>(initialVisibleCardCount);


  /* computed vars */
  // Language ids available across every set.
  const languageIds = computed<string[]>(() => uniqueValues(sets.flatMap((set) => set.language_ids)));

  // Artist filter options found across every card.
  const artistOptions = computed<string[]>(() => uniqueValues(cards.map((card) => card.illustrator ?? '')));

  // Pokemon filter options found across every card.
  const pokemonOptions = computed<string[]>(() => uniqueValues(cards.flatMap((card) => card.pokemon ?? [])));

  // Every card variant as an individual display row.
  const allCards = computed<DisplayCard[]>(() => cards.flatMap((card) => card.variants.map((variant) => buildDisplayCard(card, variant))));

  // Cards matching the search text and selected filters.
  const filteredCards = computed<DisplayCard[]>(() => {
    const query: string = search.value.trim().toLowerCase();

    return allCards.value
      .filter((card) => query === '' || card.display_name.toLowerCase().includes(query))
      .filter((card) => !selectedArtist.value || card.artist === selectedArtist.value)
      .filter((card) => !selectedPokemon.value || card.pokemon_names.includes(selectedPokemon.value))
      .sort((a, b) => a.set_name.localeCompare(b.set_name) || a.number.localeCompare(b.number) || a.variant_id.localeCompare(b.variant_id));
  });

  // Cards currently rendered after applying the visible result limit.
  const displayedCards = computed<DisplayCard[]>(() => filteredCards.value.slice(0, visibleCardCount.value));


  /* watchers */
  // Keeps route-driven filters in sync if the user opens a new search link while already on this page.
  watch(() => route.query, (): void => {
    selectedArtist.value = queryValue('artist');
    selectedPokemon.value = queryValue('pokemon');
  });

  // Resets pagination whenever the visible result set changes.
  watch([search, selectedLanguageId, selectedArtist, selectedPokemon], (): void => {
    visibleCardCount.value = initialVisibleCardCount;
  });


  /* methods */
  // Creates a display row for one physical card variant.
  const buildDisplayCard = (card: Card, variant: CardVariant): DisplayCard => {
    const set: Set | null = getSetById(card.set_id);
    const cardName: string = localizedValue(card.name, selectedLanguageId.value) ?? card.id;
    const variantSuffix: string = variant.id !== 'normal' ? ` (${formatValue(variant.id)})` : '';

    return {
      id: `${card.id}-${variant.id}`,
      card_id: card.id,
      set_id: card.set_id,
      set_name: set?.name ?? 'Unknown set',
      variant_id: variant.id,
      number: card.number,
      display_name: `${cardName}${variantSuffix}`,
      category: card.category,
      rarity: card.rarity,
      artist: card.illustrator ?? null,
      pokemon_names: card.pokemon ?? [],
      image_url: variant.images[selectedLanguageId.value] ?? null
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

  // Increases the number of rendered card results.
  const showMoreCards = (): void => {
    visibleCardCount.value += visibleCardStep;
  };

  // Opens the detail page for a card from its set.
  const goToCard = (setId: string, cardId: string): void => {
    router.push(`/set/${setId}/card/${cardId}`);
  };
</script>
