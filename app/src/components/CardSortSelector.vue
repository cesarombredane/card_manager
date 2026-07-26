<template>
  <q-select
    :model-value="modelValue"
    :options="cardSortOptions"
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
  import { cardSortOptions } from '../utils/cardSorting';
  import type { CardSort } from '../utils/cardSorting';

  defineProps<{ modelValue: CardSort }>();
  defineEmits<{ 'update:modelValue': [value: CardSort] }>();
</script>
