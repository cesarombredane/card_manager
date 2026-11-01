<template>
  <q-dialog v-model="show_template_dialog">
    <q-card class="app_surface text-white" style="width: 1200px; max-width: 96vw">
      <q-card-section>
        <div class="text-h6">Create binder from template</div>
        <div class="text-body2 text_secondary">Build a complete wanted list automatically.</div>
      </q-card-section>
      <q-card-section class="column q-gutter-md">
        <q-select
          v-model="template_mode"
          :options="[
            { label: 'Master Set', value: 'master-set' },
            { label: 'Pokédex', value: 'pokedex' },
          ]"
          emit-value
          map-options
          dark
          outlined
          label="Template"
        />
        <q-select
          v-if="template_mode === 'master-set'"
          v-model="template_set_id"
          :options="set_options"
          emit-value
          map-options
          use-input
          input-debounce="0"
          dark
          outlined
          label="Set"
          @filter="filter_set_options"
        />
        <q-input v-model="template_name" dark outlined label="Collection name" />
        <pokedex-binder-options
          v-if="template_mode === 'pokedex'"
          v-model="template_pokedex_config"
          class="q-ml-xs q-mt-xs"
        />
        <q-select
          v-if="template_mode === 'master-set'"
          v-model="template_language_id"
          :options="template_language_options"
          emit-value
          map-options
          dark
          outlined
          label="Preferred language"
          :disable="template_language_options.length <= 1"
        />
        <q-checkbox
          v-if="template_mode === 'master-set'"
          v-model="template_strong_language"
          dark
          label="Require wanted cards to be in this exact language"
        />
        <q-banner
          v-if="template_mode === 'master-set' && template_variant_count"
          class="app_surface text_secondary rounded-borders"
        >
          {{ template_variant_count }} card
          {{ template_variant_count === 1 ? 'entry' : 'entries' }} will be added to the wanted list.
        </q-banner>
      </q-card-section>
      <q-card-actions>
        <q-space />
        <q-btn v-close-popup flat color="secondary" label="Cancel" no-caps
          ><q-tooltip :delay="1000">Cancel</q-tooltip></q-btn
        >
        <q-btn
          color="primary"
          text-color="dark"
          :label="template_mode === 'pokedex' ? 'Create Pokédex binder' : 'Create Master Set'"
          :disable="
            !template_name.trim() ||
            (template_mode === 'master-set' && (!template_set_id || !template_language_id))
          "
          no-caps
          @click="create_template"
          ><q-tooltip :delay="1000">{{
            template_mode === 'pokedex' ? 'Create Pokédex binder' : 'Create Master Set'
          }}</q-tooltip></q-btn
        >
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script setup lang="ts">
  // import hooks
  import { computed, ref, watch } from 'vue';

  // import components
  import PokedexBinderOptions from '../pokedex_binder_options.vue';

  // import utils
  import { default_pokedex_config } from '../../utils/pokedex_binder';
  import { collection_store } from '../../store/modules/collection';
  import { localized_value } from '../../utils/localization';
  import {
    get_languages,
    get_set_by_id,
    get_sets,
    get_cards_by_set_id,
  } from '../../services/catalog_storage';
  import { store } from '../../store';

  // import types
  import type { Pokedex_Binder_Config } from '../../models/pokedex_binder';
  import type { Set } from '../../models/catalog';

  /* const vars */
  const language_names = new Map(get_languages().map((language) => [language.id, language.name]));

  const all_set_options = get_sets()
    .map((set) => ({
      label: `${localized_value(set.name, 'en') ?? Object.values(set.name)[0] ?? set.id} (${set.id})`,
      value: set.id,
    }))
    .sort((left, right) => left.label.localeCompare(right.label));

  /* reactive vars */
  const show_template_dialog = ref<boolean>(false);

  const template_set_id = ref<string>('');

  const template_name = ref<string>('');

  const template_language_id = ref<string>('');

  const template_strong_language = ref<boolean>(false);

  const template_mode = ref<'master-set' | 'pokedex'>('master-set');

  const template_pokedex_config = ref<Pokedex_Binder_Config>(
    default_pokedex_config(store.state.selected_language_id),
  );

  const set_options = ref<{ label: string; value: string }[]>([...all_set_options]);

  /* computed vars */
  const selected_template_set = computed<Set | null>(() => get_set_by_id(template_set_id.value));

  const template_language_options = computed<{ label: string; value: string }[]>(() =>
    (selected_template_set.value?.language_ids ?? []).map((id) => ({
      label: language_names.get(id) ?? id,
      value: id,
    })),
  );

  const template_variant_count = computed<number>(() =>
    get_cards_by_set_id(template_set_id.value).reduce(
      (total, card) => total + card.variants.length,
      0,
    ),
  );

  /* functions */
  const filter_set_options = (value: string, update: (callback: () => void) => void): void => {
    update(() => {
      const query = value.trim().toLocaleLowerCase();
      set_options.value = query
        ? all_set_options.filter((option) => option.label.toLocaleLowerCase().includes(query))
        : [...all_set_options];
    });
  };

  const open_template_dialog = (): void => {
    template_set_id.value = '';
    template_name.value = '';
    template_language_id.value = '';
    template_strong_language.value = false;
    template_mode.value = 'master-set';
    template_pokedex_config.value = default_pokedex_config(store.state.selected_language_id);
    set_options.value = [...all_set_options];
    show_template_dialog.value = true;
  };

  const create_master_set = (): void => {
    if (!template_set_id.value || !template_name.value.trim() || !template_language_id.value)
      return;
    const folder = collection_store.create_folder(template_name.value, 'binder');
    collection_store.add_wanted_entries(
      get_cards_by_set_id(template_set_id.value).flatMap((card) =>
        card.variants.map((variant) => ({
          folder_id: folder.id,
          set_id: card.set_id,
          card_id: card.id,
          variant_id: variant.id,
          language_id: template_language_id.value,
          quantity: 1,
          strong_language: template_strong_language.value,
        })),
      ),
    );
    show_template_dialog.value = false;
  };

  const create_template = (): void => {
    if (template_mode.value === 'pokedex') {
      if (!template_name.value.trim()) return;
      collection_store.create_pokedex_folder(template_name.value, template_pokedex_config.value);
      show_template_dialog.value = false;
      return;
    }
    create_master_set();
  };

  /* watchers */
  watch(template_set_id, () => {
    const set = selected_template_set.value;
    if (!set) {
      template_name.value = '';
      template_language_id.value = '';
      return;
    }
    const preferred_language = set.language_ids.includes('en') ? 'en' : (set.language_ids[0] ?? '');
    template_language_id.value = preferred_language;
    template_name.value = `${localized_value(set.name, preferred_language) ?? localized_value(set.name, 'en') ?? set.id} Master Set`;
  });

  watch(template_mode, (mode) => {
    if (mode === 'pokedex') template_name.value = 'National Pokédex';
  });

  /* public methods */
  defineExpose({ open: open_template_dialog });
</script>
