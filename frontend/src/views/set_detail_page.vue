<template>
  <q-page class="bg-dark q-pa-md">
    <section class="q-mb-md">
      <q-btn
        flat
        dense
        color="secondary"
        icon="arrow_back"
        label="Back to series"
        no-caps
        class="q-mb-sm"
        @click="go_back_to_series"
        ><q-tooltip :delay="1000">Back to series</q-tooltip></q-btn
      >
      <div class="text-overline text-primary">Set cards</div>
      <h1 class="text-h4 text-weight-bold q-my-none">
        {{
          current_set
            ? (localized_value(current_set.name, selected_language_id) ?? current_set.id)
            : 'Unknown set'
        }}
      </h1>
      <div class="text-body2 text-secondary">
        {{ current_series?.name ?? 'Unknown series' }} · {{ all_cards.length }} total collectible
        cards including variants · Released
        {{ current_set ? format_french_date(current_set.release_date) : 'Unknown' }} · Estimated set
        value {{ format_euro_price(set_value) }}
      </div>
    </section>

    <section class="row q-col-gutter-md items-center q-mb-md">
      <div class="col-auto">
        <language-selector
          v-model="selected_language_id"
          :language_ids="current_set?.language_ids ?? []"
        />
      </div>
      <div class="col-auto">
        <q-input
          v-model="search"
          dark
          dense
          outlined
          clearable
          debounce="150"
          label="Search a card by name or number"
        >
          <template #prepend>
            <q-icon name="search" />
          </template>
        </q-input>
      </div>
      <div class="col-auto">
        <q-toggle v-model="show_variants" dark color="primary" label="Show variants" />
      </div>
      <div class="col-12 col-sm-auto" style="min-width: 250px">
        <card-sort-selector v-model="selected_sort" include_set_order />
      </div>
    </section>

    <section class="row q-col-gutter-md tems-center q-mb-md">
      <div class="col-12 col-sm-6 col-md-3">
        <q-select
          v-model="selected_rarity"
          :options="rarity_options"
          dark
          dense
          outlined
          clearable
          label="Rarity"
        />
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <q-select
          v-model="selected_type"
          :options="type_options"
          dark
          dense
          outlined
          clearable
          label="Type"
        />
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <q-select
          v-model="selected_category"
          :options="category_options"
          dark
          dense
          outlined
          clearable
          label="Category"
        />
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <q-select
          v-model="selected_variant"
          :options="variant_options"
          :disable="!show_variants"
          dark
          dense
          outlined
          clearable
          label="Variant"
        />
      </div>
    </section>

    <q-separator class="q-mb-md" />

    <card-list :cards="displayed_cards" @card-click="go_to_card" />

    <q-banner v-if="displayed_cards.length === 0" class="app_surface text_secondary">
      No card found for these filters.
    </q-banner>

    <back-to-top-button />
  </q-page>
</template>

<script setup lang="ts">
  // import hooks
  import { useRoute, useRouter } from 'vue-router';
  import { computed, ref } from 'vue';

  // import components
  import CardSortSelector from '../components/card_sort_selector.vue';
  import LanguageSelector from '../components/language_selector.vue';
  import BackToTopButton from '../components/back_to_top_button.vue';
  import CardList from '../components/card_list.vue';

  // import utils
  import { localized_value } from '../utils/localization';
  import { format_french_date } from '../utils/dates';
  import {
    get_cards_by_set_id,
    get_pokemon,
    get_set_by_id,
    get_series_by_id,
  } from '../services/catalog_storage';
  import { use_store } from '../store';
  import {
    build_display_card,
    cardmarket_display_price,
    compare_card_numbers,
    format_euro_price,
  } from '../utils/card_display';

  // import types
  import type { Card, Series, Set } from '../models/catalog';
  import type { Display_Card } from '../utils/card_display';
  import type { Card_Sort } from '../utils/card_sorting';

  // Current route used to identify the selected set.

  /* hooks */
  const route = useRoute();

  // Router used to navigate back to the series listing page.
  const router = useRouter();

  // Shared application state.
  const store = use_store();

  // The current set id read from the route.

  /* const vars */
  const set_id: string = String(route.params.setId ?? '');

  // The selected set metadata.
  const current_set: Set | null = get_set_by_id(set_id);

  // The current set series, available for future breadcrumbs.
  const current_series: Series | null = current_set
    ? get_series_by_id(current_set.series_id)
    : null;

  // Cards belonging to the selected set.
  const cards: Card[] = get_cards_by_set_id(set_id);

  // Pokédex numbers used by the Pokédex sorting modes.
  const pokedex_by_pokemon_id = new Map(
    get_pokemon().map((pokemon) => [pokemon.id, pokemon.pokedex_id]),
  );

  // Currently selected language for localized card names.

  /* computed vars */
  const selected_language_id = computed<string>({
    get: (): string => {
      const preferred_language_id: string = store.state.selected_language_id;
      return current_set?.language_ids.includes(preferred_language_id)
        ? preferred_language_id
        : (current_set?.language_ids[0] ?? 'en');
    },
    set: (language_id: string): void => store.commit('set_selected_language_id', language_id),
  });

  // Search text used to filter card names and numbers.

  /* reactive vars */
  const search = ref<string>('');

  // Selected rarity filter.
  const selected_rarity = ref<string | null>(null);

  // Selected Pokemon type filter.
  const selected_type = ref<string | null>(null);

  // Selected card category filter.
  const selected_category = ref<string | null>(null);

  // Selected variant filter.
  const selected_variant = ref<string | null>(null);

  // Whether every declared collectible variant is displayed.
  const show_variants = ref<boolean>(true);

  // The printed card number order is the natural default inside a set.
  const selected_sort = ref<Card_Sort>('set-order');

  // Every card variant in this set as an individual display row.

  /* computed vars */
  const all_cards = computed<Display_Card[]>(() =>
    cards.flatMap((card) =>
      card.variants.map((variant) => build_display_card(card, variant, selected_language_id.value)),
    ),
  );

  // Combined current market value of one copy of every collectible variant.
  const set_value = computed<number>(() =>
    all_cards.value.reduce(
      (total, card) => total + (cardmarket_display_price(card.cardmarket) ?? 0),
      0,
    ),
  );

  // Rarity filter options found in this set.
  const rarity_options = computed<string[]>(() =>
    unique_values(all_cards.value.map((card) => card.rarity)),
  );

  // Pokemon type filter options found in this set.
  const type_options = computed<string[]>(() =>
    unique_values(all_cards.value.flatMap((card) => card.types)),
  );

  // Card category filter options found in this set.
  const category_options = computed<string[]>(() =>
    unique_values(all_cards.value.map((card) => card.category)),
  );

  // Variant filter options found in this set.
  const variant_options = computed<string[]>(() =>
    unique_values(all_cards.value.map((card) => card.variant_id)),
  );

  // Full variants or one representative printing per card, depending on the toggle.
  const listed_cards = computed<Display_Card[]>(() => {
    if (show_variants.value) return all_cards.value;

    const representative_cards = new Map<string, Display_Card>();
    for (const card of all_cards.value) {
      const current = representative_cards.get(card.card_id);
      if (!current || (card.variant_id === 'normal' && current.variant_id !== 'normal')) {
        representative_cards.set(card.card_id, card);
      }
    }
    return [...representative_cards.values()];
  });

  // Cards shown after applying search and filters.
  const displayed_cards = computed<Display_Card[]>(() => {
    const query: string = search.value.trim().toLowerCase();

    return listed_cards.value
      .filter(
        (card) =>
          query === '' ||
          card.display_name.toLowerCase().includes(query) ||
          card.number.toLowerCase().includes(query),
      )
      .filter((card) => !selected_rarity.value || card.rarity === selected_rarity.value)
      .filter((card) => !selected_type.value || card.types.includes(selected_type.value))
      .filter((card) => !selected_category.value || card.category === selected_category.value)
      .filter(
        (card) =>
          !show_variants.value ||
          !selected_variant.value ||
          card.variant_id === selected_variant.value,
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
          const left_price = cardmarket_display_price(a.cardmarket);
          const right_price = cardmarket_display_price(b.cardmarket);

          if (left_price === null && right_price !== null) return 1;
          if (left_price !== null && right_price === null) return -1;
          if (left_price !== null && right_price !== null && left_price !== right_price) {
            return selected_sort.value === 'price-asc'
              ? left_price - right_price
              : right_price - left_price;
          }
        }

        const number_comparison = compare_card_numbers(a.number, b.number);
        if (selected_sort.value === 'release-desc') {
          return -number_comparison || a.variant_id.localeCompare(b.variant_id);
        }

        return number_comparison || a.variant_id.localeCompare(b.variant_id);
      });
  });

  // Returns sorted unique string values.

  /* functions */
  const unique_values = (values: string[]): string[] => {
    return [...new Set(values.filter(Boolean))].sort();
  };

  // Stores the current set region and returns to the existing series history
  // entry so Vue Router can restore its saved scroll position.
  const go_back_to_series = (): void => {
    if (current_series) {
      store.commit('set_selected_region_id', current_series.region_id);
    }

    const previous_path = window.history.state?.back;
    if (typeof previous_path === 'string' && previous_path.split(/[?#]/, 1)[0] === '/series') {
      router.back();
      return;
    }

    // A directly opened or refreshed set page has no series entry to restore.
    router.push('/series');
  };

  // Opens the detail page for a card from this set.
  const go_to_card = (card: Display_Card): void => {
    router.push({
      path: `/set/${set_id}/card/${card.card_id}`,
      query: { variant: card.variant_id },
    });
  };
</script>
