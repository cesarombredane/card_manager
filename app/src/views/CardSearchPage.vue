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
          v-model="selectedPokemon"
          :options="filteredPokemonOptions"
          emit-value
          map-options
          dark
          dense
          outlined
          clearable
          use-input
          input-debounce="0"
          label="Pokemon"
          @filter="filterPokemon"
        />
      </div>
      <div class="col-12 col-sm-auto">
        <q-checkbox v-model="includeSpecialForms" dark label="Include regional and Mega forms" />
      </div>
    </section>

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

  // import utils
  import { getCards, getPokemon, getSetById, getSets } from '../utils/dataManagement';
  import { buildDisplayCard, compareCardNumbers } from '../utils/cardDisplay';
  import type { DisplayCard } from '../utils/cardDisplay';
  import { localizedValue } from '../utils/localization';
  import type { Card, Pokemon, Set } from '../utils/types';
  import { uniqueValues } from '../utils/arrayUtils';
  import type { AppState } from '../store';


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

  // Whether regional and Mega forms are available in Pokemon results.
  const includeSpecialForms = ref<boolean>(false);

  // Artist options matching the text currently typed in the select.
  const filteredArtistOptions = ref<string[]>([]);

  // Pokemon options matching the text currently typed in the select.
  const filteredPokemonOptions = ref<{ label: string; value: string; searchNames: string[] }[]>([]);

  // Number of filtered cards currently visible.
  const visibleCardCount = ref<number>(initialVisibleCardCount);


  /* computed vars */
  // Language ids available across every set.
  const languageIds = computed<string[]>(() => uniqueValues(sets.flatMap((set) => set.language_ids)));

  // Artist filter options found across every card.
  const artistOptions = computed<string[]>(() => uniqueValues(cards.map((card) => card.illustrator ?? '')));

  // Pokemon filter options found across every card.
  // Base-species options display English canonical names while retaining stable ids.
  const pokemonOptions = computed<{ label: string; value: string; searchNames: string[] }[]>(() => pokemon.filter((entry) => entry.form === null).map((entry) => ({
    label: entry.name,
    value: entry.id,
    searchNames: uniqueValues(Object.values(entry.names).filter((name): name is string => Boolean(name)))
  })));

  // Selected catalog ids, broadened to requested forms sharing the same Pokedex number.
  const selectedPokemonIds = computed<globalThis.Set<string>>(() => {
    if (!selectedPokemon.value) return new Set();
    const selectedEntry = pokemon.find((entry) => entry.id === selectedPokemon.value);
    if (!includeSpecialForms.value || !selectedEntry) return new Set([selectedPokemon.value]);
    return new Set(pokemon.filter((entry) => entry.pokedex_id === selectedEntry.pokedex_id).map((entry) => entry.id));
  });

  // Every card variant as an individual display row.
  const allCards = computed<DisplayCard[]>(() => cards.flatMap((card) => card.variants.map((variant) => {
    const set: Set | null = getSetById(card.set_id);
    const setName: string | null = set ? localizedValue(set.name, selectedLanguageId.value) ?? set.id : 'Unknown set';
    return buildDisplayCard(card, variant, selectedLanguageId.value, setName);
  })));

  // Cards matching the search text and selected filters.
  const filteredCards = computed<DisplayCard[]>(() => {
    const query: string = search.value.trim().toLowerCase();

    return allCards.value
      .filter((card) => query === '' || card.display_name.toLowerCase().includes(query))
      .filter((card) => !selectedArtist.value || card.illustrator === selectedArtist.value)
      .filter((card) => !selectedPokemon.value || card.pokemon_names.some((pokemonId) => selectedPokemonIds.value.has(pokemonId)))
      .sort((a, b) => (a.set_name ?? '').localeCompare(b.set_name ?? '') || compareCardNumbers(a.number, b.number) || a.variant_id.localeCompare(b.variant_id));
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
  watch([search, selectedLanguageId, selectedArtist, selectedPokemon, includeSpecialForms], (): void => {
    visibleCardCount.value = initialVisibleCardCount;
  });


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

  // Increases the number of rendered card results.
  const showMoreCards = (): void => {
    visibleCardCount.value += visibleCardStep;
  };

  // Opens the detail page for a card from its set.
  const goToCard = (card: DisplayCard): void => {
    router.push(`/set/${card.set_id}/card/${card.card_id}`);
  };
</script>
