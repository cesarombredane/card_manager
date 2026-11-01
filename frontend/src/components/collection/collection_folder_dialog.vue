<template>
  <q-dialog v-model="show_folder_dialog">
    <q-card class="app_surface text-white" style="width: 560px; max-width: 94vw">
      <q-card-section>
        <div class="text-h6">
          {{ editing_folder ? 'Collection settings' : 'Create collection' }}
        </div>
      </q-card-section>
      <q-card-section class="column q-gutter-md">
        <div>
          <div class="text-caption text_secondary q-mb-xs">Collection type</div>
          <div class="row items-center no-wrap q-gutter-sm">
            <q-btn-toggle
              v-model="folder_type"
              :options="folder_type_options"
              color="dark"
              text-color="secondary"
              toggle-color="primary"
              toggle-text-color="dark"
              unelevated
            />
            <q-btn
              v-if="!editing_folder && folder_type === 'binder'"
              flat
              dense
              color="primary"
              icon="auto_awesome"
              label="Create from template"
              no-caps
              @click="create_from_template"
              ><q-tooltip :delay="1000">Create from template</q-tooltip></q-btn
            >
          </div>
        </div>
        <q-input
          v-model="folder_name"
          dark
          outlined
          autofocus
          label="Collection name"
          @keyup.enter="save_folder"
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
          label="Save"
          :disable="!folder_name.trim()"
          no-caps
          @click="save_folder"
          ><q-tooltip :delay="1000">Save</q-tooltip></q-btn
        >
      </q-card-actions>
    </q-card>
  </q-dialog>
  <confirm-dialog
    v-model="show_binder_conversion_warning"
    persistent
    destructive
    title="Convert this binder to a box?"
    message="This binder contains placed cards or custom assets. Converting it to a box will permanently delete its binder layout and configuration."
    confirm_label="Convert and delete binder layout"
    cancel_label="Keep as binder"
    confirm_tooltip="Convert to a box and permanently remove its layout"
    cancel_tooltip="Keep the binder and its layout"
    @confirm="confirm_binder_conversion"
    @cancel="cancel_binder_conversion"
  >
    <q-banner class="status_error text-white rounded-borders q-mt-md">
      The cards remain in the collection, but page layout, slots, proxies, and decorative images in
      this binder will be removed.
    </q-banner>
  </confirm-dialog>
</template>
<script setup lang="ts">
  // import hooks
  import { ref } from 'vue';

  // import components
  import ConfirmDialog from '../common/confirm_dialog.vue';

  // import utils
  import { collection_store } from '../../store/modules/collection';
  import { binder_store } from '../../store/modules/binders';

  // import types
  import type { Collection_Folder, Collection_Folder_Type } from '../../models/collection';

  /* hooks */
  const emit = defineEmits<{ create_template: [] }>();

  /* const vars */
  const folder_type_options = [
    { label: 'Box', value: 'box', icon: 'inventory' },
    { label: 'Binder', value: 'binder', icon: 'auto_stories' },
  ];

  /* reactive vars */
  const show_folder_dialog = ref<boolean>(false);

  const editing_folder = ref<Collection_Folder | null>(null);

  const folder_name = ref<string>('');

  const folder_type = ref<Collection_Folder_Type>('box');

  const show_binder_conversion_warning = ref<boolean>(false);

  const pending_binder_conversion = ref<Collection_Folder | null>(null);

  /* functions */
  const open_create_folder = (): void => {
    editing_folder.value = null;
    folder_name.value = '';
    folder_type.value = 'box';
    show_folder_dialog.value = true;
  };

  const open_rename_folder = (folder: Collection_Folder): void => {
    editing_folder.value = folder;
    folder_name.value = folder.name;
    folder_type.value = folder.type ?? 'binder';
    show_folder_dialog.value = true;
  };

  const save_folder = (): void => {
    if (!folder_name.value.trim()) return;
    if (editing_folder.value) {
      if (editing_folder.value.type === 'binder' && folder_type.value === 'box') {
        const binder = binder_store.get(editing_folder.value.id);
        const binder_has_content = Boolean(
          binder?.slots.some((slot) => slot !== null) ||
          binder?.proxies.length ||
          binder?.images.length ||
          binder?.image_placements.length,
        );
        if (binder_has_content) {
          pending_binder_conversion.value = editing_folder.value;
          show_binder_conversion_warning.value = true;
          return;
        }
        binder_store.remove(editing_folder.value.id);
      }
      collection_store.update_folder(editing_folder.value.id, folder_name.value, folder_type.value);
    } else {
      collection_store.create_folder(folder_name.value, folder_type.value);
    }
    show_folder_dialog.value = false;
  };

  const cancel_binder_conversion = (): void => {
    show_binder_conversion_warning.value = false;
    pending_binder_conversion.value = null;
    folder_type.value = 'binder';
  };

  const confirm_binder_conversion = (): void => {
    const folder = pending_binder_conversion.value;
    if (!folder) return;
    binder_store.remove(folder.id);
    collection_store.update_folder(folder.id, folder_name.value, 'box');
    show_binder_conversion_warning.value = false;
    show_folder_dialog.value = false;
    pending_binder_conversion.value = null;
    editing_folder.value = null;
  };

  const create_from_template = (): void => {
    show_folder_dialog.value = false;
    emit('create_template');
  };

  /* public methods */
  defineExpose({ create: open_create_folder, edit: open_rename_folder });
</script>
