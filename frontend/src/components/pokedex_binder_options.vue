<template>
  <div class="row q-col-gutter-md q-row-gutter-md items-start">
    <div class="col-12 col-sm-6">
      <q-checkbox v-model="config.include_regional_forms" dark label="Include regional forms" />
    </div>
    <div class="col-12 col-sm-6">
      <q-checkbox v-model="config.include_mega_forms" dark label="Include Mega forms" />
    </div>
    <div class="col-12">
      <div class="text-caption text_secondary q-mb-xs">Card region</div>
      <q-btn-toggle
        v-model="config.region"
        :options="region_options"
        color="dark"
        text-color="secondary"
        toggle-color="primary"
        toggle-text-color="dark"
        unelevated
      />
    </div>
    <div class="col-12">
      <div class="text-caption text_secondary q-mb-xs">International card language</div>
      <language-selector
        v-model="config.international_language_id"
        :language_ids="international_language_ids"
        :disable="config.region === 'asia'"
      />
    </div>
    <div class="col-12">
      <div class="text-caption text_secondary q-mb-xs">Asian card language</div>
      <language-selector
        v-model="config.asia_language_id"
        :language_ids="asia_language_ids"
        :disable="config.region === 'intl'"
      />
    </div>
    <div class="col-12">
      <q-select
        v-model="config.series_ids"
        :options="series_options"
        dark
        outlined
        multiple
        emit-value
        map-options
        options-selected-class="text-primary"
        :display-value="selection_label(config.series_ids.length, series_options.length, 'series')"
        label="Series"
      >
        <template #append>
          <q-btn
            aria-label="Select all series"
            :disable="config.series_ids.length === series_options.length"
            dense
            flat
            round
            icon="select_all"
            no-caps
            @click.stop="select_all_series"
            ><q-tooltip :delay="1000">Select all series</q-tooltip></q-btn
          >
          <q-btn
            aria-label="Clear all series"
            :disable="config.series_ids.length === 0"
            dense
            flat
            round
            icon="deselect"
            no-caps
            @click.stop="clear_series"
            ><q-tooltip :delay="1000">Clear all series</q-tooltip></q-btn
          >
        </template>
      </q-select>
    </div>
    <div class="col-12">
      <q-select
        v-model="config.variant_types"
        :options="variant_options"
        dark
        outlined
        multiple
        emit-value
        map-options
        options-selected-class="text-primary"
        :display-value="
          selection_label(config.variant_types.length, variant_options.length, 'variants')
        "
        label="Variants"
      >
        <template #append>
          <q-btn
            aria-label="Select all variants"
            :disable="config.variant_types.length === variant_options.length"
            dense
            flat
            round
            icon="select_all"
            no-caps
            @click.stop="select_all_variants"
            ><q-tooltip :delay="1000">Select all variants</q-tooltip></q-btn
          >
          <q-btn
            aria-label="Clear all variants"
            :disable="config.variant_types.length === 0"
            dense
            flat
            round
            icon="deselect"
            no-caps
            @click.stop="clear_variants"
            ><q-tooltip :delay="1000">Clear all variants</q-tooltip></q-btn
          >
        </template>
      </q-select>
    </div>
    <div class="col-12">
      <q-select
        v-model="config.rarities"
        :options="rarity_options"
        dark
        outlined
        multiple
        options-selected-class="text-primary"
        :display-value="selection_label(config.rarities.length, rarity_options.length, 'rarities')"
        label="Rarities"
      >
        <template #append>
          <q-btn
            aria-label="Select all rarities"
            :disable="config.rarities.length === rarity_options.length"
            dense
            flat
            round
            icon="select_all"
            no-caps
            @click.stop="select_all_rarities"
            ><q-tooltip :delay="1000">Select all rarities</q-tooltip></q-btn
          >
          <q-btn
            aria-label="Clear all rarities"
            :disable="config.rarities.length === 0"
            dense
            flat
            round
            icon="deselect"
            no-caps
            @click.stop="clear_rarities"
            ><q-tooltip :delay="1000">Clear all rarities</q-tooltip></q-btn
          >
        </template>
      </q-select>
    </div>
  </div>
</template>

<script setup lang="ts">
  // import hooks
  import { computed, watch } from 'vue';

  // import components
  import LanguageSelector from './language_selector.vue';

  // import utils
  import { get_sets } from '../services/catalog_storage';
  import { unique_values } from '../utils/array_utils';
  import {
    pokedex_rarities,
    pokedex_series_options,
    pokedex_variant_types,
  } from '../utils/pokedex_binder';

  // import types
  import type { Pokedex_Binder_Config } from '../utils/pokedex_binder';

  /* const vars */
  const config = defineModel<Pokedex_Binder_Config>({ required: true });
  const region_options = [
    { label: 'Both', value: 'all' },
    { label: 'International', value: 'intl' },
    { label: 'Asia', value: 'asia' },
  ];
  const sets = get_sets();
  const international_language_ids = unique_values(
    sets.filter((set) => !set.series_id.startsWith('asia-')).flatMap((set) => set.language_ids),
  );
  const asia_language_ids = unique_values(
    sets.filter((set) => set.series_id.startsWith('asia-')).flatMap((set) => set.language_ids),
  );

  /* computed vars */
  const series_options = computed<{ label: string; value: string; region_id: string }[]>(() =>
    pokedex_series_options.filter(
      (option) =>
        config.value.region === 'all' ||
        option.region_id === (config.value.region === 'asia' ? 'ASIA' : 'INTL'),
    ),
  );

  /* const vars */
  const variant_options = pokedex_variant_types.map((value) => ({
    value,
    label: value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase()),
  }));
  const rarity_options = [...pokedex_rarities];

  /* functions */
  const selection_label = (selected: number, available: number, noun: string): string => {
    if (selected === available) return `All ${noun}`;
    if (selected === 0) return `No ${noun}`;
    return `${selected} ${noun} selected`;
  };
  const select_all_series = (): void => {
    config.value.series_ids = series_options.value.map((option) => option.value);
  };
  const clear_series = (): void => {
    config.value.series_ids = [];
  };
  const select_all_variants = (): void => {
    config.value.variant_types = [...pokedex_variant_types];
  };
  const clear_variants = (): void => {
    config.value.variant_types = [];
  };
  const select_all_rarities = (): void => {
    config.value.rarities = [...pokedex_rarities];
  };
  const clear_rarities = (): void => {
    config.value.rarities = [];
  };

  /* watchers */
  watch(
    () => config.value.region,
    () => {
      config.value.series_ids = series_options.value.map((option) => option.value);
    },
  );
</script>
