<template>
  <q-page class="bg-dark q-pa-md">
    <section class="q-mb-md">
      <div class="text-overline text-primary">
        Sets by series
      </div>
      <div class="text-h4 text-weight-bold">
        Browse Pokemon TCG sets
      </div>
      <div class="text-body2 text-secondary">
        Sets are grouped by series and filtered by printing region.
      </div>
    </section>

    <section class="row q-col-gutter-md items-center q-mb-md">
      <div class="col-auto">
        <q-btn-toggle v-model="selected_region_id" :options="region_options" color="grey-9" padding="sm md" text-color="grey-4" toggle-color="grey-7"
          toggle-text-color="white" />
      </div>
      <div class="col-auto">
        <q-input v-model="sets_search_input" dense outlined clearable debounce="150" label="Search a set by name">
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
          <div class="text-caption text-grey-5">
            {{ group.region.name }} · {{ group.sets.length }} sets
          </div>
        </div>
      </div>

      <q-list bordered separator class="bg-grey-10 rounded-borders">
        <q-item v-for="set in group.sets" :key="set.id" class="q-py-md">
          <q-item-section class="col-4 col-sm-3 col-md-2">
            <q-card flat class="bg-grey-9 rounded-borders relative-position" style="width: 100%; height: 96px; overflow: hidden;">
              <div style="display: flex; width: 100%; height: 96px; align-items: center; justify-content: center; overflow: hidden;">
                <img v-if="set.title_image_url" :src="set.title_image_url" :alt="`${setDisplayName(set)} logo`"
                  style="display: block; width: 100%; height: 100%; padding: 8px; object-fit: contain;" />
                <q-icon v-else name="image" size="30px" class="text-grey-5" />
              </div>

              <q-avatar rounded text-color="grey-5" class="absolute-bottom-right q-ma-xs" style="width: 30px; height: 30px; overflow: hidden;">
                <q-img v-if="set.symbol_image_url" :src="set.symbol_image_url" fit="contain" style="width: 100%; height: 100%; padding: 2px;" />
              </q-avatar>
            </q-card>
          </q-item-section>

          <q-item-section>
            <q-item-label class="text-subtitle2 text-weight-bold">
              <router-link :to="`/set/${set.id}`" class="text-white">
                {{ setDisplayName(set) }}
              </router-link>
            </q-item-label>
            <q-item-label caption class="text-grey-4">
              {{ set.card_count }} collectible cards including variants · Released {{ set.release_date }}
            </q-item-label>
            <div class="row q-gutter-xs q-mt-xs">
              <q-chip v-for="languageId in set.language_ids" :key="languageId" dense square color="grey-9" text-color="white" size="sm">
                {{ languageId }}
              </q-chip>
            </div>
          </q-item-section>
        </q-item>
      </q-list>
    </section>

    <q-banner v-if="visible_series.length === 0" class="bg-grey-10 text-grey-4">
      No set found for this region and search.
    </q-banner>
  </q-page>
</template>

<script setup lang="ts">
  // import hooks
  import { computed, ref, watch } from 'vue';
  import { useStore } from 'vuex';

  // import utils
  import { getRegions, getSeries, getSets } from '../utils/dataManagement';
  import { localizedValue } from '../utils/localization';
  import type { Region, Series, Set } from '../utils/types';
  import type { AppState } from '../store';


  /* types */
  // A region selector option formatted for q-btn-toggle.
  type RegionOption = {
    label: string;
    value: string;
  };

  // A series and its filtered, ordered sets for display.
  type SeriesSetGroup = {
    series: Series;
    region: Region;
    sets: Set[];
  };


  /* constant vars */
  // All configured regions available to the region switcher.
  const regions: Region[] = getRegions();

  // All configured series used to group sets.
  const series: Series[] = getSeries();

  // All sets loaded from per-series JSON files.
  const sets: Set[] = getSets();

  // Shared application state.
  const store = useStore<AppState>();


  /* reactive vars */
  // Search text used to filter set names in every available language.
  const sets_search_input = ref<string>('');

  // Currently selected printing region. International is the default view.
  const selected_region_id = ref<string>(store.state.selected_region_id);


  /* computed vars */
  // Region options rendered by the q-btn-toggle.
  const region_options = computed<RegionOption[]>(() => regions.map(r => ({ label: r.id, value: r.id })));

  // Series groups shown on the page after region and search filtering.
  const visible_series = computed<SeriesSetGroup[]>(() => {
    const query: string = (sets_search_input.value || '').trim().toLowerCase();
    const regionById: Map<string, Region> = new Map(regions.map((region) => [region.id, region]));
    const setsBySeries: Map<string, Set[]> = new Map();

    for (const set of sets) {
      const matchesSearch: boolean = query === '' || Object.values(set.name).some((name) => name?.toLowerCase().includes(query));
      if (!matchesSearch) continue;
      if (!setsBySeries.has(set.series_id)) setsBySeries.set(set.series_id, []);
      setsBySeries.get(set.series_id)?.push(set);
    }

    return series
      .filter(item => item.region_id === selected_region_id.value)
      .map((item): SeriesSetGroup => ({
        series: item,
        region: regionById.get(item.region_id) ?? { id: item.region_id, name: item.region_id },
        sets: [...(setsBySeries.get(item.id) ?? [])].sort((a, b) => b.release_date.localeCompare(a.release_date))
      }))
      .filter((group) => group.sets.length > 0)
      .sort((a, b) => b.series.start_date.localeCompare(a.series.start_date));
  });


  /* methods */
  // Resolves a set name using the shared language preference and stable fallbacks.
  const setDisplayName = (set: Set): string => {
    return localizedValue(set.name, store.state.selected_language_id) ?? set.id;
  };


  /* watchers */
  // Update the store when the selected region changes.
  watch(selected_region_id, v => store.commit('set_selected_region_id', v));
</script>
