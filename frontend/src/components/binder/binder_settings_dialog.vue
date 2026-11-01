<template>
  <q-dialog v-model="is_open">
    <q-card class="app_surface text-white" style="width: 460px; max-width: 90vw">
      <q-card-section>
        <div class="text-h6">Binder settings</div>
      </q-card-section>
      <q-card-section class="column q-gutter-md">
        <q-input
          v-model.number="settings_page_count"
          type="number"
          min="1"
          max="200"
          dark
          outlined
          label="Number of pages"
        />
        <q-select
          v-model="settings_layout"
          :options="layout_options"
          emit-value
          map-options
          dark
          outlined
          label="Cards per page"
        />
        <q-banner class="app_surface text_secondary rounded-borders">
          New capacity: {{ settings_page_count * 2 * binder_slots_per_page(settings_layout) }} cards
          (recto and verso)
        </q-banner>
        <q-banner v-if="settings_changed" class="status_error text-white rounded-borders">
          <template #avatar><q-icon name="warning" color="white" /></template>
          Changing these settings will reset the binder and permanently remove every card from its
          current slot. Cards will remain safely in the collection.
        </q-banner>
      </q-card-section>
      <q-card-actions>
        <q-space />
        <q-btn v-close-popup flat color="secondary" label="Cancel" no-caps
          ><q-tooltip :delay="1000">Cancel</q-tooltip></q-btn
        >
        <q-btn
          color="negative"
          :label="settings_changed ? 'Reset and save' : 'Save'"
          :disable="settings_page_count < 1 || !settings_changed"
          no-caps
          @click="save_settings"
          ><q-tooltip :delay="1000">{{
            settings_changed ? 'Reset and save' : 'Save'
          }}</q-tooltip></q-btn
        >
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script setup lang="ts">
  // import hooks
  import { computed, ref, watch } from 'vue';

  // import utils
  import { binder_store, binder_slots_per_page } from '../../store/modules/binders';

  // import types
  import type { Binder_Layout, Collection_Binder } from '../../models/binders';

  /* hooks */
  const props = defineProps<{ modelValue: boolean; folder_id: string }>();

  const emit = defineEmits<{ 'update:modelValue': [value: boolean]; saved: [] }>();

  /* const vars */
  const layout_options = [
    { label: '2 × 2 — 4 cards per page', value: '2x2' },
    { label: '3 × 3 — 9 cards per page', value: '3x3' },
  ];

  /* reactive vars */
  const settings_page_count = ref<number>(1);

  const settings_layout = ref<Binder_Layout>('3x3');

  /* computed vars */
  const is_open = computed<boolean>({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value),
  });

  const binder = computed<Collection_Binder | null>(() => binder_store.get(props.folder_id));

  const settings_changed = computed<boolean>(() =>
    Boolean(
      binder.value &&
      (settings_page_count.value !== binder.value.page_count ||
        settings_layout.value !== binder.value.layout),
    ),
  );

  /* functions */
  const save_settings = (): void => {
    if (
      binder.value?.locked_pages.length ||
      !settings_changed.value ||
      settings_page_count.value < 1
    )
      return;
    binder_store.reset_settings(props.folder_id, settings_page_count.value, settings_layout.value);
    is_open.value = false;
    emit('saved');
  };

  /* watchers */
  watch(
    () => props.modelValue,
    (value) => {
      if (value && binder.value) {
        settings_page_count.value = binder.value.page_count;
        settings_layout.value = binder.value.layout;
      }
    },
  );
</script>
