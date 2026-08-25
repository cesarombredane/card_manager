<template>
  <div class="row q-col-gutter-md q-row-gutter-md items-start">
    <div class="col-12 col-sm-6">
      <q-checkbox v-model="config.include_regional_forms" dark label="Include regional forms" />
    </div>
    <div class="col-12 col-sm-6">
      <q-checkbox v-model="config.include_mega_forms" dark label="Include Mega forms" />
    </div>
    <div class="col-12">
      <div class="text-caption text-grey-5 q-mb-xs">Card region</div>
      <q-btn-toggle v-model="config.region" :options="regionOptions" color="grey-9" text-color="grey-4" toggle-color="primary"
        toggle-text-color="black" unelevated />
    </div>
    <div class="col-12">
      <div class="text-caption text-grey-5 q-mb-xs">International card language</div>
      <language-selector v-model="config.international_language_id" :language-ids="internationalLanguageIds" :disable="config.region === 'asia'" />
    </div>
    <div class="col-12">
      <div class="text-caption text-grey-5 q-mb-xs">Asian card language</div>
      <language-selector v-model="config.asia_language_id" :language-ids="asiaLanguageIds" :disable="config.region === 'intl'" />
    </div>
    <div class="col-12">
      <q-select v-model="config.series_ids" :options="seriesOptions" dark outlined multiple emit-value map-options options-selected-class="text-primary"
        :display-value="selectionLabel(config.series_ids.length, seriesOptions.length, 'series')" label="Series">
        <template #append>
          <q-btn aria-label="Select all series" :disable="config.series_ids.length === seriesOptions.length" dense flat round icon="select_all"
            @click.stop="selectAllSeries"><q-tooltip>Select all series</q-tooltip></q-btn>
          <q-btn aria-label="Clear all series" :disable="config.series_ids.length === 0" dense flat round icon="deselect"
            @click.stop="clearSeries"><q-tooltip>Clear all series</q-tooltip></q-btn>
        </template>
      </q-select>
    </div>
    <div class="col-12">
      <q-select v-model="config.variant_types" :options="variantOptions" dark outlined multiple emit-value map-options options-selected-class="text-primary"
        :display-value="selectionLabel(config.variant_types.length, variantOptions.length, 'variants')" label="Variants">
        <template #append>
          <q-btn aria-label="Select all variants" :disable="config.variant_types.length === variantOptions.length" dense flat round icon="select_all"
            @click.stop="selectAllVariants"><q-tooltip>Select all variants</q-tooltip></q-btn>
          <q-btn aria-label="Clear all variants" :disable="config.variant_types.length === 0" dense flat round icon="deselect"
            @click.stop="clearVariants"><q-tooltip>Clear all variants</q-tooltip></q-btn>
        </template>
      </q-select>
    </div>
    <div class="col-12">
      <q-select v-model="config.rarities" :options="rarityOptions" dark outlined multiple options-selected-class="text-primary"
        :display-value="selectionLabel(config.rarities.length, rarityOptions.length, 'rarities')" label="Rarities">
        <template #append>
          <q-btn aria-label="Select all rarities" :disable="config.rarities.length === rarityOptions.length" dense flat round icon="select_all"
            @click.stop="selectAllRarities"><q-tooltip>Select all rarities</q-tooltip></q-btn>
          <q-btn aria-label="Clear all rarities" :disable="config.rarities.length === 0" dense flat round icon="deselect"
            @click.stop="clearRarities"><q-tooltip>Clear all rarities</q-tooltip></q-btn>
        </template>
      </q-select>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, watch } from 'vue';
  import LanguageSelector from './LanguageSelector.vue';
  import { getSets } from '../utils/dataManagement';
  import { uniqueValues } from '../utils/arrayUtils';
  import { pokedexRarities, pokedexSeriesOptions, pokedexVariantTypes } from '../utils/pokedexBinder';
  import type { PokedexBinderConfig } from '../utils/pokedexBinder';

  const config = defineModel<PokedexBinderConfig>({ required: true });
  const regionOptions = [
    { label: 'Both', value: 'all' },
    { label: 'International', value: 'intl' },
    { label: 'Asia', value: 'asia' }
  ];
  const sets = getSets();
  const internationalLanguageIds = uniqueValues(sets.filter((set) => !set.series_id.startsWith('asia-')).flatMap((set) => set.language_ids));
  const asiaLanguageIds = uniqueValues(sets.filter((set) => set.series_id.startsWith('asia-')).flatMap((set) => set.language_ids));
  const seriesOptions = computed(() => pokedexSeriesOptions.filter((option) => config.value.region === 'all'
    || option.region_id === (config.value.region === 'asia' ? 'ASIA' : 'INTL')));
  const variantOptions = pokedexVariantTypes.map((value) => ({
    value,
    label: value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase())
  }));
  const rarityOptions = [...pokedexRarities];
  const selectionLabel = (selected: number, available: number, noun: string): string => {
    if (selected === available) return `All ${noun}`;
    if (selected === 0) return `No ${noun}`;
    return `${selected} ${noun} selected`;
  };
  const selectAllSeries = (): void => { config.value.series_ids = seriesOptions.value.map((option) => option.value); };
  const clearSeries = (): void => { config.value.series_ids = []; };
  const selectAllVariants = (): void => { config.value.variant_types = [...pokedexVariantTypes]; };
  const clearVariants = (): void => { config.value.variant_types = []; };
  const selectAllRarities = (): void => { config.value.rarities = [...pokedexRarities]; };
  const clearRarities = (): void => { config.value.rarities = []; };

  watch(() => config.value.region, () => {
    config.value.series_ids = seriesOptions.value.map((option) => option.value);
  });
</script>
