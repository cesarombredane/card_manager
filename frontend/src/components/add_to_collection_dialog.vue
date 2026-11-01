<template>
  <q-dialog v-model="is_open">
    <q-card class="app_surface text-white" style="width: 420px; max-width: 90vw">
      <q-card-section>
        <div class="text-h6">Add to collection</div>
        <div class="text-body2 text_secondary">{{ card_name }}</div>
      </q-card-section>

      <q-card-section v-if="!collection_store.is_file_connected.value">
        <q-banner class="app_surface text_secondary rounded-borders">
          Loading collection.json…
          <div v-if="collection_store.save_error.value" class="text-negative q-mt-xs">
            {{ collection_store.save_error.value }}
          </div>
        </q-banner>
      </q-card-section>

      <q-card-section class="column q-gutter-md">
        <collection-folder-select
          v-model="folder_id"
          :folders="collection_store.folders.value"
          dark
          outlined
          label="Collection"
          :disable="!collection_store.is_file_connected.value"
        />
        <q-select
          v-model="condition"
          :options="condition_options"
          emit-value
          map-options
          dark
          outlined
          label="Condition"
          :disable="!collection_store.is_file_connected.value"
        />
        <q-input
          v-model.number="quantity"
          type="number"
          min="1"
          step="1"
          dark
          outlined
          label="Quantity"
          :disable="!collection_store.is_file_connected.value"
        />
        <q-select
          v-if="pokedex_requirement_options.length > 1"
          v-model="pokedex_requirement_id"
          :options="pokedex_requirement_options"
          emit-value
          map-options
          dark
          outlined
          label="Pokédex slot fulfilled by this card"
        />
        <q-banner
          v-else-if="is_pokedex_folder && pokedex_requirement_options.length === 0"
          class="status_warning text-warning rounded-borders"
        >
          This card does not satisfy the current Pokédex binder constraints. It will still be added
          and marked as not fitting this binder.
        </q-banner>
      </q-card-section>

      <q-card-actions>
        <q-space />
        <q-btn v-close-popup flat label="Cancel" color="secondary" no-caps
          ><q-tooltip :delay="1000">Cancel</q-tooltip></q-btn
        >
        <q-btn
          color="primary"
          text-color="dark"
          label="Add cards"
          :disable="
            quantity < 1 ||
            !collection_store.is_file_connected.value ||
            (pokedex_requirement_options.length > 1 && !pokedex_requirement_id)
          "
          no-caps
          @click="add_cards"
          ><q-tooltip :delay="1000">Add cards</q-tooltip></q-btn
        >
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
  // import hooks
  import { computed, ref, watch } from 'vue';

  // import components
  import CollectionFolderSelect from './collection_folder_select.vue';

  // import utils
  import { card_conditions, collection_store } from '../store/modules/collection';
  import { use_store } from '../store';

  // import types
  import type { Card_Condition } from '../store/modules/collection';

  /* hooks */
  const props = defineProps<{
    modelValue: boolean;
    set_id: string;
    card_id: string;
    variant_id: string;
    language_id: string;
    card_name: string;
  }>();
  const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    added: [];
  }>();

  /* computed vars */
  const is_open = computed<boolean>({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value),
  });

  /* hooks */
  const store = use_store();

  /* reactive vars */
  const folder_id = ref<string>(store.state.last_collection_folder_id);
  const condition = ref<Card_Condition>('NM');
  const quantity = ref<number>(1);
  const pokedex_requirement_id = ref<string>('');

  /* const vars */
  const condition_options = card_conditions.map((entry) => ({ ...entry }));

  /* computed vars */
  const is_pokedex_folder = computed<boolean>(() =>
    Boolean(
      collection_store.folders.value.find((folder) => folder.id === folder_id.value)
        ?.pokedex_config,
    ),
  );
  const pokedex_requirement_options = computed<{ label: string; value: string }[]>(() =>
    collection_store.matching_pokedex_requirements({
      folder_id: folder_id.value,
      set_id: props.set_id,
      card_id: props.card_id,
      variant_id: props.variant_id,
      language_id: props.language_id,
    }),
  );

  /* watchers */
  watch(
    pokedex_requirement_options,
    (options) => {
      pokedex_requirement_id.value = options.length === 1 ? options[0].value : '';
    },
    { immediate: true },
  );

  watch(
    [is_open, collection_store.is_file_connected],
    ([open, connected]) => {
      if (!open || !connected) return;
      const remembered_folder_id = store.state.last_collection_folder_id;
      const default_folder = collection_store.ensure_default_folder();
      folder_id.value = collection_store.folders.value.some(
        (folder) => folder.id === remembered_folder_id,
      )
        ? remembered_folder_id
        : default_folder.id;
    },
    { immediate: true },
  );

  /* functions */
  const add_cards = (): void => {
    collection_store.add_cards({
      folder_id: folder_id.value,
      set_id: props.set_id,
      card_id: props.card_id,
      variant_id: props.variant_id,
      language_id: props.language_id,
      condition: condition.value,
      quantity: quantity.value,
      pokedex_requirement_id:
        pokedex_requirement_id.value ||
        (pokedex_requirement_options.value.length === 1
          ? pokedex_requirement_options.value[0].value
          : undefined),
    });
    store.commit('set_last_collection_folder_id', folder_id.value);
    quantity.value = 1;
    is_open.value = false;
    emit('added');
  };
</script>
