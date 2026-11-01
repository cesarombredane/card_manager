<template>
  <q-dialog v-model="show_pokedex_options">
    <q-card class="app_surface text-white" style="width: 1200px; max-width: 96vw">
      <q-card-section><div class="text-h6">Pokédex binder options</div></q-card-section>
      <q-card-section><pokedex-binder-options v-model="editing_pokedex_config" /></q-card-section>
      <q-card-actions>
        <q-space />
        <q-btn v-close-popup flat color="secondary" label="Cancel" no-caps
          ><q-tooltip :delay="1000">Cancel</q-tooltip></q-btn
        >
        <q-btn
          color="primary"
          text-color="dark"
          label="Save and recalculate"
          no-caps
          @click="save_pokedex_options"
          ><q-tooltip :delay="1000">Save and recalculate</q-tooltip></q-btn
        >
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script setup lang="ts">
  // import hooks
  import { computed, ref } from 'vue';

  // import components
  import PokedexBinderOptions from '../pokedex_binder_options.vue';

  // import utils
  import { copy_pokedex_binder_config, default_pokedex_config } from '../../utils/pokedex_binder';
  import { collection_store } from '../../store/modules/collection';

  // import types
  import type { Pokedex_Binder_Config } from '../../models/pokedex_binder';
  import type { Collection_Folder } from '../../models/collection';

  /* hooks */
  const props = defineProps<{ folder_id: string }>();

  /* reactive vars */
  const show_pokedex_options = ref<boolean>(false);

  const editing_pokedex_config = ref<Pokedex_Binder_Config>(default_pokedex_config('en'));

  /* computed vars */
  const folder_id = computed<string>(() => props.folder_id);

  const folder = computed<Collection_Folder | null>(
    () =>
      collection_store.folders.value.find((candidate) => candidate.id === folder_id.value) ?? null,
  );

  /* functions */
  const open_pokedex_options = (): void => {
    if (!folder.value?.pokedex_config) return;
    editing_pokedex_config.value = copy_pokedex_binder_config(folder.value.pokedex_config);
    show_pokedex_options.value = true;
  };

  const save_pokedex_options = (): void => {
    collection_store.update_pokedex_config(folder_id.value, editing_pokedex_config.value);
    show_pokedex_options.value = false;
  };

  /* public methods */
  defineExpose({ open: open_pokedex_options });
</script>
