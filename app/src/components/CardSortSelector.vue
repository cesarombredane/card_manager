<template>
  <q-select
    :model-value="modelValue"
    :options="options"
    emit-value
    map-options
    dark
    dense
    outlined
    label="Sort by"
    @update:model-value="$emit('update:modelValue', $event)"
  />
</template>

<script setup lang="ts">
  import { computed } from 'vue';
  import { cardSortOptions, setCardSortOptions } from '../utils/cardSorting';
  import type { CardSort } from '../utils/cardSorting';

  const props = withDefaults(defineProps<{
    modelValue: CardSort;
    includeSetOrder?: boolean;
  }>(), {
    includeSetOrder: false
  });
  defineEmits<{ 'update:modelValue': [value: CardSort] }>();

  const options = computed(() => props.includeSetOrder ? setCardSortOptions : cardSortOptions);
</script>
