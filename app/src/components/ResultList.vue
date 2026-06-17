<template>
  <div class="column q-gutter-sm">
    <empty-state v-if="items.length === 0" :title="emptyTitle" :message="emptyMessage" />
    <q-card v-for="item in items" v-else :key="item.id || item.name || item.code" flat bordered class="bg-grey-10 text-white">
      <q-card-section>
        <slot :item="item" />
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup lang="ts">
  // imports //
  import EmptyState from './EmptyState.vue';


  // types //
  export type ResultItem = Record<string, any> & {
    id?: string | number;
    name?: string;
    code?: string;
  };


  // props //
  withDefaults(defineProps<{
    items?: ResultItem[];
    emptyTitle?: string;
    emptyMessage?: string;
  }>(), {
    items: () => [],
    emptyTitle: 'Nothing found',
    emptyMessage: 'The API returned no rows for this view.'
  });


  // slots //
  defineSlots<{
    default(props: { item: ResultItem; }): unknown;
  }>();
</script>
