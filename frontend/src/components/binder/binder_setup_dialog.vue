<template>
  <q-dialog :model-value="modelValue" persistent>
    <q-card class="app_surface text-white" style="width: 440px; max-width: 90vw">
      <q-card-section>
        <div class="text-h6">Create binder</div>
        <div class="text-body2 text_secondary">One binder can be created for this collection.</div>
      </q-card-section>
      <q-card-section class="column q-gutter-md">
        <q-input
          v-model.number="new_page_count"
          type="number"
          min="1"
          max="200"
          dark
          outlined
          label="Number of pages"
        />
        <q-select
          v-model="new_layout"
          :options="layout_options"
          emit-value
          map-options
          dark
          outlined
          label="Cards per page"
        />
        <q-banner class="app_surface text_secondary rounded-borders">
          Capacity: {{ new_page_count * 2 * binder_slots_per_page(new_layout) }} cards (recto and
          verso)
        </q-banner>
      </q-card-section>
      <q-card-actions>
        <q-space />
        <q-btn flat color="secondary" label="Cancel" :to="`/collection/folder/${folder_id}`" no-caps
          ><q-tooltip :delay="1000">Cancel</q-tooltip></q-btn
        >
        <q-btn
          color="primary"
          text-color="dark"
          label="Create binder"
          :disable="new_page_count < 1"
          no-caps
          @click="create_binder"
          ><q-tooltip :delay="1000">Create binder</q-tooltip></q-btn
        >
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script setup lang="ts">
  // import hooks
  import { ref } from 'vue';

  // import utils
  import { binder_store, binder_slots_per_page } from '../../store/modules/binders';

  // import types
  import type { Binder_Layout } from '../../models/binders';

  /* hooks */
  const props = defineProps<{ modelValue: boolean; folder_id: string }>();

  /* const vars */
  const layout_options = [
    { label: '2 × 2 — 4 cards per page', value: '2x2' },
    { label: '3 × 3 — 9 cards per page', value: '3x3' },
  ];

  /* reactive vars */
  const new_page_count = ref<number>(20);

  const new_layout = ref<Binder_Layout>('3x3');

  /* functions */
  const create_binder = (): void => {
    binder_store.create(props.folder_id, new_page_count.value, new_layout.value);
  };
</script>
