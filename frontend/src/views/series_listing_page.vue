<template>
  <q-page class="bg-dark q-pa-md">
    <section class="q-mb-md">
      <div class="text-overline text-primary">Sets by series</div>
      <h1 class="text-h4 text-weight-bold q-my-none">Browse Pokemon TCG sets</h1>
      <div class="text-body2 text-secondary">
        Sets are grouped by series and filtered by printing region.
      </div>
    </section>

    <section class="row q-col-gutter-md items-center q-mb-md">
      <div class="col-auto">
        <q-btn-toggle
          v-model="selected_region_id"
          :options="region_options"
          color="dark"
          padding="sm md"
          text-color="secondary"
          toggle-color="primary"
          toggle-text-color="white"
        />
      </div>
      <div class="col-auto">
        <q-input
          v-model="sets_search_input"
          dense
          outlined
          clearable
          debounce="150"
          label="Search a set by name"
        >
          <template #prepend>
            <q-icon name="search" />
          </template>
        </q-input>
      </div>
    </section>

    <q-separator class="q-mb-md" />

    <section v-for="group in visible_series" :key="group.series.id" class="q-mb-lg">
      <div class="row items-end justify-between q-mb-md">
        <div>
          <div class="text-h5 text-weight-bold q-ma-none">
            {{ group.series.name }}
          </div>
          <div class="text-caption text_secondary">
            {{ group.region.name }} · {{ group.sets.length }} sets
          </div>
        </div>
      </div>

      <q-list bordered separator class="app_surface rounded-borders">
        <q-item v-for="set in group.sets" :key="set.id" class="q-py-md">
          <q-item-section class="col-4 col-sm-3 col-md-2">
            <q-card
              flat
              class="app_surface rounded-borders relative-position"
              style="width: 100%; height: 96px; overflow: hidden"
            >
              <div
                style="
                  display: flex;
                  width: 100%;
                  height: 96px;
                  align-items: center;
                  justify-content: center;
                  overflow: hidden;
                "
              >
                <img
                  v-if="set.title_image_url"
                  :src="set.title_image_url"
                  :alt="`${set_display_name(set)} logo`"
                  style="
                    display: block;
                    width: 100%;
                    height: 100%;
                    padding: 8px;
                    object-fit: contain;
                  "
                />
                <q-icon v-else name="image" size="30px" class="text_secondary" />
              </div>

              <q-avatar
                rounded
                text-color="secondary"
                class="absolute-bottom-right q-ma-xs"
                style="width: 30px; height: 30px; overflow: hidden"
              >
                <q-img
                  v-if="set.symbol_image_url"
                  :src="set.symbol_image_url"
                  fit="contain"
                  style="width: 100%; height: 100%; padding: 2px"
                />
              </q-avatar>
            </q-card>
          </q-item-section>

          <q-item-section>
            <q-item-label class="text-subtitle2 text-weight-bold">
              <router-link :to="`/set/${set.id}`" class="text-white">
                {{ set_display_name(set) }}
              </router-link>
            </q-item-label>
            <q-item-label caption class="text_secondary">
              <template v-if="owned_card_count(set.id) === 0">
                {{ set.card_count }} collectible cards including variants ·
              </template>
              Released {{ format_french_date(set.release_date) }}
            </q-item-label>
            <q-item-label caption class="text_secondary">
              Estimated set value {{ format_euro_price(set_value(set.id)) }}
            </q-item-label>
            <div v-if="owned_card_count(set.id) > 0" class="q-mt-sm" style="max-width: 420px">
              <div class="row justify-between text-caption text_secondary q-mb-xs">
                <span>Collection completion</span>
                <span>{{ owned_card_count(set.id) }} / {{ set.card_count }} cards</span>
              </div>
              <q-linear-progress
                rounded
                size="8px"
                color="primary"
                track-color="dark"
                :value="set_completion(set)"
              />
            </div>
            <div class="row q-gutter-xs q-mt-xs">
              <q-chip
                v-for="language_id in set.language_ids"
                :key="language_id"
                dense
                square
                color="dark"
                text-color="white"
                size="sm"
              >
                {{ language_id }}
              </q-chip>
            </div>
          </q-item-section>
        </q-item>
      </q-list>
    </section>

    <q-banner v-if="visible_series.length === 0" class="app_surface text_secondary">
      No set found for this region and search.
    </q-banner>

    <back-to-top-button />
  </q-page>
</template>

<script setup lang="ts">
  // import hooks
  import { computed, ref, watch } from 'vue';

  // import components
  import BackToTopButton from '../components/back_to_top_button.vue';

  // import utils
  import { cardmarket_display_price, format_euro_price } from '../utils/card_display';
  import { collection_store } from '../store/modules/collection';
  import { localized_value } from '../utils/localization';
  import { format_french_date } from '../utils/dates';
  import {
    get_cards_by_set_id,
    get_regions,
    get_series,
    get_sets,
  } from '../services/catalog_storage';
  import { use_store } from '../store';

  // import types
  import type { Region, Series, Set } from '../models/catalog';

  /* types */
  // A region selector option formatted for q-btn-toggle.

  type Region_Option = {
    label: string;
    value: string;
  };

  // A series and its filtered, ordered sets for display.
  type Series_Set_Group = {
    series: Series;
    region: Region;
    sets: Set[];
  };

  /* hooks */
  // Shared application state.

  const store = use_store();

  /* const vars */
  // All configured regions available to the region switcher.

  const regions: Region[] = get_regions();

  // All configured series used to group sets.
  const series: Series[] = get_series();

  // All sets loaded from per-series JSON files.
  const sets: Set[] = get_sets();

  // Combined market value of one copy of every collectible variant per set.
  const set_values_by_id = new Map(
    sets.map((set) => [
      set.id,
      get_cards_by_set_id(set.id).reduce(
        (set_total, card) =>
          set_total +
          card.variants.reduce(
            (card_total, variant) =>
              card_total + (cardmarket_display_price(variant.cardmarket) ?? 0),
            0,
          ),
        0,
      ),
    ]),
  );

  /* reactive vars */
  // Search text used to filter set names in every available language.

  const sets_search_input = ref<string>(store.state.sets_search_input);

  // Currently selected printing region. International is the default view.
  const selected_region_id = ref<string>(store.state.selected_region_id);

  /* computed vars */
  // Region options rendered by the q-btn-toggle.

  const region_options = computed<Region_Option[]>(() =>
    regions.map((r) => ({ label: r.id, value: r.id })),
  );

  // Series groups shown on the page after region and search filtering.
  const visible_series = computed<Series_Set_Group[]>(() => {
    const query: string = (sets_search_input.value || '').trim().toLowerCase();
    const region_by_id: Map<string, Region> = new Map(regions.map((region) => [region.id, region]));
    const sets_by_series: Map<string, Set[]> = new Map();

    for (const set of sets) {
      const matches_search: boolean =
        query === '' || Object.values(set.name).some((name) => name?.toLowerCase().includes(query));
      if (!matches_search) continue;
      if (!sets_by_series.has(set.series_id)) sets_by_series.set(set.series_id, []);
      sets_by_series.get(set.series_id)?.push(set);
    }

    return series
      .filter((item) => item.region_id === selected_region_id.value)
      .map((item): Series_Set_Group => ({
        series: item,
        region: region_by_id.get(selected_region_id.value) ?? {
          id: selected_region_id.value,
          name: selected_region_id.value,
        },
        sets: [...(sets_by_series.get(item.id) ?? [])].sort((a, b) =>
          b.release_date.localeCompare(a.release_date),
        ),
      }))
      .filter((group) => group.sets.length > 0)
      .sort((a, b) => b.series.start_date.localeCompare(a.series.start_date));
  });

  // Distinct card variants owned per set. Quantities, languages, conditions,
  // and collection folders do not increase completion more than once.
  const owned_cards_by_set = computed<Map<string, number>>(() => {
    const variants_by_set = new Map<string, globalThis.Set<string>>();
    for (const entry of collection_store.entries.value) {
      if (entry.wanted || entry.set_id === 'manual-collection') continue;
      if (!variants_by_set.has(entry.set_id))
        variants_by_set.set(entry.set_id, new globalThis.Set());
      variants_by_set.get(entry.set_id)?.add(`${entry.card_id}:${entry.variant_id}`);
    }
    return new Map([...variants_by_set].map(([set_id, variants]) => [set_id, variants.size]));
  });

  /* functions */
  // Resolves a set name using the shared language preference and stable fallbacks.

  const set_display_name = (set: Set): string => {
    return localized_value(set.name, store.state.selected_language_id) ?? set.id;
  };

  const owned_card_count = (set_id: string): number => owned_cards_by_set.value.get(set_id) ?? 0;

  const set_value = (set_id: string): number => set_values_by_id.get(set_id) ?? 0;

  const set_completion = (set: Set): number => {
    return set.card_count > 0 ? Math.min(owned_card_count(set.id) / set.card_count, 1) : 0;
  };

  /* watchers */
  // Update the store when the selected region changes.

  watch(selected_region_id, (region_id): void => {
    store.commit('set_selected_region_id', region_id);
  });

  // Keep the current search available when this page is unmounted during navigation.
  watch(sets_search_input, (search): void => {
    store.commit('set_sets_search_input', search ?? '');
  });
</script>
