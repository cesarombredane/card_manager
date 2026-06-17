<template>
  <q-page class="bg-dark text-white q-pa-md q-pa-lg-xl">
    <div class="column q-gutter-lg">
      <div>
        <div class="text-overline text-yellow-6">
          Sets by series
        </div>
        <h1 class="text-h4 text-weight-bold q-my-sm">
          Browse Pokemon TCG sets
        </h1>
        <p class="text-body2 text-grey-4 q-ma-none">
          Sets are grouped by series and filtered by printing region.
        </p>
      </div>

      <div class="row q-col-gutter-md items-center">
        <div class="col-12 col-md-auto">
          <q-btn-toggle v-model="selectedRegionId" :options="regionOptions" color="grey-9" padding="sm md" text-color="grey-4" toggle-color="grey-7"
            toggle-text-color="white" unelevated />
        </div>
        <div class="col-12 col-sm-8 col-md-5 col-lg-4">
          <q-input v-model="search" dark dense outlined clearable debounce="150" label="Search a set by name">
            <template #prepend>
              <q-icon name="search" />
            </template>
          </q-input>
        </div>
      </div>

      <section v-for="group in visibleSeries" :key="group.series.id">
        <q-separator color="grey-9" class="q-mb-lg" />
        <div class="row items-end justify-between q-mb-md">
          <div>
            <h2 class="text-h5 text-weight-bold q-ma-none">
              {{ group.series.name }}
            </h2>
            <div class="text-caption text-grey-5">
              {{ group.region.name }} · {{ group.sets.length }} sets
            </div>
          </div>
        </div>

        <q-list bordered separator class="bg-grey-10 rounded-borders">
          <q-item v-for="set in group.sets" :key="set.id" class="q-py-md">
            <q-item-section class="col-4 col-sm-3 col-md-2">
              <q-card flat class="bg-grey-9 rounded-borders relative-position">
                <q-responsive :ratio="16 / 9">
                  <q-img v-if="set.title_image_url" :src="set.title_image_url" fit="contain" class="full-height" />
                  <template v-else>
                    <div class="column items-center justify-center full-height text-grey-5">
                      <q-icon name="image" size="30px" />
                    </div>
                  </template>
                </q-responsive>

                <q-avatar rounded size="26px" color="grey-10" text-color="grey-5" class="absolute-bottom-right q-ma-xs">
                  <q-img v-if="set.symbol_image_url" :src="set.symbol_image_url" fit="contain" />
                  <q-icon v-else name="auto_awesome" size="16px" />
                </q-avatar>
              </q-card>
            </q-item-section>

            <q-item-section>
              <q-item-label class="text-subtitle2 text-weight-bold">
                {{ set.name }}
              </q-item-label>
              <q-item-label v-if="set.local_name" caption class="text-grey-5">
                {{ set.local_name }}
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

      <q-banner v-if="visibleSeries.length === 0" class="bg-grey-10 text-grey-4">
        No set found for this region and search.
      </q-banner>
    </div>
  </q-page>
</template>

<script setup lang="ts">
  // import hooks
  import { computed, ref } from 'vue';

  // import utils
  import { getRegions, getSeries, getSets } from '../utils/dataManagement';
  import type { Region, Series, Set } from '../utils/types';
  import type { ComputedRef, Ref } from 'vue';


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


  /* reactive vars */
  // Currently selected printing region. International is the default view.
  const selectedRegionId: Ref<string> = ref('INTL');

  // Search text used to filter set names and local names.
  const search: Ref<string> = ref('');


  /* computed vars */
  // Region options rendered by the q-btn-toggle.
  const regionOptions: ComputedRef<RegionOption[]> = computed(() => regions.map((region) => ({
    label: regionFlag(region.id),
    value: region.id
  })));

  // Series groups shown on the page after region and search filtering.
  const visibleSeries: ComputedRef<SeriesSetGroup[]> = computed(() => {
    const query: string = search.value.trim().toLowerCase();
    const regionById: Map<string, Region> = new Map(regions.map((region) => [region.id, region]));
    const setsBySeries: Map<string, Set[]> = new Map();

    for (const set of sets) {
      const matchesSearch: boolean = query === '' || set.name.toLowerCase().includes(query) || String(set.local_name ?? '').toLowerCase().includes(query);
      if (!matchesSearch) continue;
      if (!setsBySeries.has(set.series_id)) setsBySeries.set(set.series_id, []);
      setsBySeries.get(set.series_id)?.push(set);
    }

    return series
      .filter((item) => item.region_id === selectedRegionId.value)
      .map((item): SeriesSetGroup => ({
        series: item,
        region: regionById.get(item.region_id) ?? { id: item.region_id, name: item.region_id },
        sets: [...(setsBySeries.get(item.id) ?? [])].sort((a, b) => b.release_date.localeCompare(a.release_date))
      }))
      .filter((group) => group.sets.length > 0)
      .sort((a, b) => b.series.start_date.localeCompare(a.series.start_date));
  });


  /* methods */
  // Returns the display flag for a region switcher button.
  const regionFlag = (regionId: string): string => {
    const flags: Record<string, string> = {
      CN: '🇨🇳',
      ID: '🇮🇩',
      INTL: '🌐',
      JP: '🇯🇵',
      KR: '🇰🇷',
      TH: '🇹🇭',
      TW: '🇹🇼'
    };

    return flags[regionId] ?? regionId;
  };
</script>
