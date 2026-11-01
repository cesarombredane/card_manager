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
  // import hooks
  import { computed } from 'vue';

  // import utils
  import { card_sort_options, set_card_sort_options } from '../utils/card_sorting';

  // import types
  import type { Card_Sort } from '../utils/card_sorting';

  /* hooks */
  const props = withDefaults(
    defineProps<{
      modelValue: Card_Sort;
      include_set_order?: boolean;
    }>(),
    {
      include_set_order: false,
    },
  );

  /* computed vars */
  const options = computed<{ label: string; value: Card_Sort }[]>(() =>
    props.include_set_order ? set_card_sort_options : card_sort_options,
  );

  /* initialization */
  defineEmits<{ 'update:modelValue': [value: Card_Sort] }>();
</script>
