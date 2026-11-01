<template>
  <q-dialog v-model="show_bulk_edit_dialog">
    <q-card class="app_surface text-white" style="width: 480px; max-width: 94vw">
      <q-card-section>
        <div class="text-h6">Edit selected cards</div>
        <div class="text-body2 text_secondary">
          Change the language of {{ selected_entry_ids.size }} selected
          {{ selected_entry_ids.size === 1 ? 'entry' : 'entries' }}.
        </div>
      </q-card-section>
      <q-card-section>
        <q-select
          v-model="bulk_edit_language_id"
          :options="all_language_options"
          emit-value
          map-options
          dark
          outlined
          label="Language"
        />
      </q-card-section>
      <q-card-actions>
        <q-space />
        <q-btn v-close-popup flat color="secondary" label="Cancel" no-caps
          ><q-tooltip :delay="1000">Cancel</q-tooltip></q-btn
        >
        <q-btn
          color="primary"
          text-color="dark"
          label="Apply changes"
          :disable="!bulk_edit_language_id"
          no-caps
          @click="confirm_bulk_edit"
          ><q-tooltip :delay="1000">Apply changes</q-tooltip></q-btn
        >
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script setup lang="ts">
  // import hooks
  import { computed, ref } from 'vue';

  // import utils
  import { collection_store } from '../../store/modules/collection';
  import { get_languages } from '../../services/catalog_storage';

  /* hooks */
  const props = defineProps<{ entry_ids: string[] }>();

  const emit = defineEmits<{ saved: [] }>();

  /* const vars */
  const all_language_options = get_languages().map((language) => ({
    label: language.name,
    value: language.id,
  }));

  /* reactive vars */
  const show_bulk_edit_dialog = ref<boolean>(false);

  const bulk_edit_language_id = ref<string>('');

  /* computed vars */
  const selected_entry_ids = computed<Set<string>>(() => new Set(props.entry_ids));

  /* functions */
  const open_bulk_edit_dialog = (): void => {
    const selected_entries = collection_store.entries.value.filter((entry) =>
      selected_entry_ids.value.has(entry.id),
    );
    const selected_languages = new Set(selected_entries.map((entry) => entry.language_id));
    bulk_edit_language_id.value =
      selected_languages.size === 1 ? (selected_entries[0]?.language_id ?? '') : '';
    show_bulk_edit_dialog.value = true;
  };

  const confirm_bulk_edit = (): void => {
    if (!bulk_edit_language_id.value) return;
    collection_store.update_entries_language(
      [...selected_entry_ids.value],
      bulk_edit_language_id.value,
    );
    emit('saved');
    show_bulk_edit_dialog.value = false;
    bulk_edit_language_id.value = '';
  };

  /* public methods */
  defineExpose({ open: open_bulk_edit_dialog });
</script>
