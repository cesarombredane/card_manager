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

<script setup>
import EmptyState from './EmptyState.vue';

defineProps({
  items: {
    type: Array,
    default: () => []
  },
  emptyTitle: {
    type: String,
    default: 'Nothing found'
  },
  emptyMessage: {
    type: String,
    default: 'The API returned no rows for this view.'
  }
});
</script>
