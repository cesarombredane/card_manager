<template>
  <q-card flat bordered class="app_surface text-white">
    <q-card-section>
      <div class="row no-wrap items-start justify-between">
        <div>
          <div class="text-h6">{{ folder.name }}</div>
          <div class="text-caption text_secondary">
            {{ cards }} owned cards · {{ wanted }} wanted · {{ entries }} owned entries
          </div>
        </div>
        <q-icon :name="locked ? 'lock' : icon" color="primary" size="32px" />
      </div>
      <div class="text-h5 text-primary text-weight-bold q-mt-md">
        {{ format_euro_price(value) }}
      </div>
    </q-card-section>
    <q-card-actions>
      <q-space />
      <q-btn
        class="full-width"
        unelevated
        size="lg"
        color="primary"
        text-color="dark"
        icon-right="arrow_forward"
        :label="`Open ${folder.type}`"
        no-caps
        :to="`/collection/folder/${folder.id}`"
        ><q-tooltip :delay="1000">{{ `Open ${folder.type}` }}</q-tooltip></q-btn
      >
    </q-card-actions>
    <q-card-actions>
      <q-space />
      <q-btn
        v-if="!locked"
        flat
        round
        dense
        color="secondary"
        icon="edit"
        no-caps
        :aria-label="`Edit ${folder.name} collection settings`"
        @click="$emit('settings', folder)"
      >
        <q-tooltip :delay="1000">Collection settings</q-tooltip>
      </q-btn>
      <q-btn
        v-if="!locked"
        flat
        round
        dense
        color="negative"
        icon="delete"
        no-caps
        :aria-label="`Delete ${folder.name} collection`"
        @click="$emit('delete', folder)"
      >
        <q-tooltip :delay="1000">Delete collection</q-tooltip>
      </q-btn>
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
  // import hooks
  import { computed } from 'vue';

  // import utils
  import { format_euro_price } from '../utils/card_display';

  // import types
  import type { Collection_Folder } from '../store/modules/collection';

  /* hooks */
  const props = defineProps<{
    folder: Collection_Folder;
    entries: number;
    cards: number;
    wanted: number;
    value: number;
    locked?: boolean;
  }>();

  /* computed vars */
  const icon = computed<'inventory' | 'auto_stories'>(() =>
    props.folder.type === 'box' ? 'inventory' : 'auto_stories',
  );

  /* initialization */
  defineEmits<{
    settings: [folder: Collection_Folder];
    delete: [folder: Collection_Folder];
  }>();
</script>
