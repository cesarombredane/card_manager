<template>
  <q-card flat bordered class="bg-grey-10 text-white">
    <q-card-section>
      <div class="row no-wrap items-start justify-between">
        <div>
          <div class="text-h6">{{ folder.name }}</div>
          <div class="text-caption text-grey-4">
            {{ cards }} owned cards · {{ wanted }} wanted · {{ entries }} owned entries
          </div>
        </div>
        <q-icon :name="icon" color="yellow-6" size="32px" />
      </div>
      <div class="text-h5 text-yellow-6 text-weight-bold q-mt-md">
        {{ formatEuroPrice(value) }}
      </div>
    </q-card-section>
    <q-card-actions>
      <q-btn
        class="full-width"
        unelevated
        size="lg"
        color="primary"
        text-color="black"
        icon-right="arrow_forward"
        :label="`Open ${folder.type}`"
        no-caps
        :to="`/collection/folder/${folder.id}`"
      />
    </q-card-actions>
    <q-card-actions>
      <q-space />
      <q-btn flat round dense color="grey-4" icon="edit" @click="$emit('settings', folder)">
        <q-tooltip>Collection settings</q-tooltip>
      </q-btn>
      <q-btn
        flat
        round
        dense
        color="negative"
        icon="delete"
        @click="$emit('delete', folder)"
      >
        <q-tooltip>Delete collection</q-tooltip>
      </q-btn>
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
  import { computed } from 'vue';
  import { formatEuroPrice } from '../utils/cardDisplay';
  import type { CollectionFolder } from '../utils/collection';

  const props = defineProps<{
    folder: CollectionFolder;
    entries: number;
    cards: number;
    wanted: number;
    value: number;
  }>();
  defineEmits<{
    settings: [folder: CollectionFolder];
    delete: [folder: CollectionFolder];
  }>();

  const icon = computed(() => props.folder.type === 'box' ? 'inventory' : 'auto_stories');
</script>
