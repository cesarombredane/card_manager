<template>
  <q-dialog v-model="show_edit_dialog">
    <q-card class="app_surface text-white" style="width: 720px; max-width: 94vw">
      <q-card-section>
        <div class="text-h6">
          {{ editing_entry?.entry.wanted ? 'Edit wanted card' : 'Edit collection card' }}
        </div>
        <div class="text-body2 text_secondary">{{ editing_entry?.card.display_name }}</div>
      </q-card-section>
      <q-card-section class="row q-col-gutter-md q-row-gutter-md">
        <template v-if="editing_manual_card">
          <div class="col-12">
            <q-input v-model="edit_manual_name" dark outlined label="Card name *" />
          </div>
          <div class="col-12 col-sm-6">
            <q-input v-model="edit_manual_set_name" dark outlined label="Set name" />
          </div>
          <div class="col-12 col-sm-6">
            <q-input v-model="edit_manual_number" dark outlined label="Set number" />
          </div>
          <div class="col-12 col-sm-6">
            <q-select
              v-model="edit_manual_category"
              :options="category_options"
              dark
              outlined
              label="Category"
            />
          </div>
          <div class="col-12 col-sm-6">
            <q-input v-model="edit_manual_rarity" dark outlined label="Rarity" />
          </div>
          <div class="col-12 col-sm-6">
            <q-input v-model="edit_manual_pokemon_name" dark outlined label="Pokémon name" />
          </div>
          <div class="col-12 col-sm-6">
            <q-input
              v-model.number="edit_manual_hp"
              type="number"
              min="1"
              dark
              outlined
              label="HP"
            />
          </div>
          <div class="col-12 col-sm-6">
            <q-input v-model="edit_manual_types" dark outlined label="Types (comma-separated)" />
          </div>
          <div class="col-12 col-sm-6">
            <q-input v-model="edit_manual_illustrator" dark outlined label="Illustrator" />
          </div>
          <div class="col-12 col-sm-6">
            <q-input
              v-model.number="edit_manual_value"
              type="number"
              min="0"
              step="0.01"
              dark
              outlined
              label="Estimated value (€)"
            />
          </div>
          <div class="col-12 col-sm-6">
            <q-input
              v-model="edit_manual_release_date"
              mask="##-##-####"
              dark
              outlined
              label="Release date"
              hint="DD-MM-YYYY"
            />
          </div>
          <div class="col-12">
            <q-input v-model="edit_manual_notes" type="textarea" dark outlined label="Notes" />
          </div>
          <div class="col-12">
            <q-file
              v-model="edit_manual_image_file"
              dark
              outlined
              accept="image/jpeg,image/png,image/webp"
              label="Replace or add image"
              @update:model-value="prepare_edit_manual_image"
            >
              <template #prepend><q-icon name="image" /></template>
            </q-file>
          </div>
          <div v-if="edit_manual_image_preview" class="col-12">
            <q-img
              :src="edit_manual_image_preview"
              fit="contain"
              class="app_surface rounded-borders"
              style="max-height: 400px"
            />
          </div>
          <div v-if="edit_save_error" class="col-12 text-negative">{{ edit_save_error }}</div>
        </template>
        <div class="col-12 col-sm-6">
          <q-input
            v-model.number="edit_quantity"
            type="number"
            min="1"
            step="1"
            dark
            outlined
            label="Quantity"
          />
        </div>
        <div class="col-12 col-sm-6">
          <q-select
            v-model="edit_language_id"
            :options="edit_language_options"
            emit-value
            map-options
            dark
            outlined
            label="Language"
          />
        </div>
        <div v-if="editing_manual_card" class="col-12 col-sm-6">
          <q-input v-model="edit_variant_id" dark outlined label="Variant" />
        </div>
        <div v-if="!editing_entry?.entry.wanted" class="col-12 col-sm-6">
          <q-select
            v-model="edit_condition"
            :options="condition_options"
            emit-value
            map-options
            dark
            outlined
            label="Condition"
          />
        </div>
        <div v-else class="col-12 col-sm-6 flex items-center">
          <q-checkbox v-model="edit_strong_language" dark label="Require this exact language" />
        </div>
        <div class="col-12" :class="{ 'col-sm-6': editing_manual_card }">
          <collection-folder-select
            v-model="edit_folder_id"
            :folders="collection_store.folders.value"
            dark
            outlined
            label="Collection"
          />
        </div>
      </q-card-section>
      <q-card-actions>
        <q-space />
        <q-btn v-close-popup flat color="secondary" label="Cancel" no-caps
          ><q-tooltip :delay="1000">Cancel</q-tooltip></q-btn
        >
        <q-btn
          color="primary"
          text-color="dark"
          label="Save changes"
          :disable="edit_quantity < 1 || !edit_language_id || !edit_folder_id"
          no-caps
          @click="save_entry"
          ><q-tooltip :delay="1000">Save changes</q-tooltip></q-btn
        >
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script setup lang="ts">
  // import hooks
  import { computed, ref } from 'vue';

  // import components
  import CollectionFolderSelect from '../collection_folder_select.vue';

  // import utils
  import { get_languages, get_card_by_id, get_set_by_id } from '../../services/catalog_storage';
  import { card_conditions, collection_store } from '../../store/modules/collection';
  import { format_french_date, parse_french_date } from '../../utils/dates';
  import { manual_image_store } from '../../store/modules/manual_images';

  // import types
  import type { Card_Condition, Manual_Collection_Card } from '../../models/collection';
  import type { Collection_Row } from '../../models/collection_view';

  /* const vars */
  const language_names = new Map(get_languages().map((language) => [language.id, language.name]));

  const condition_options = card_conditions.map((entry) => ({ ...entry }));

  const category_options = ['pokemon', 'trainer', 'energy'];

  /* reactive vars */
  const show_edit_dialog = ref<boolean>(false);

  const editing_entry = ref<Collection_Row | null>(null);

  const edit_quantity = ref<number>(1);

  const edit_language_id = ref<string>('');

  const edit_strong_language = ref<boolean>(false);

  const edit_condition = ref<Card_Condition>('NM');

  const edit_folder_id = ref<string>('');

  const edit_variant_id = ref<string>('normal');

  const edit_manual_name = ref<string>('');

  const edit_manual_set_name = ref<string>('');

  const edit_manual_number = ref<string>('');

  const edit_manual_category = ref<string>('pokemon');

  const edit_manual_rarity = ref<string>('');

  const edit_manual_pokemon_name = ref<string>('');

  const edit_manual_hp = ref<number | null>(null);

  const edit_manual_types = ref<string>('');

  const edit_manual_illustrator = ref<string>('');

  const edit_manual_notes = ref<string>('');

  const edit_manual_value = ref<number | null>(null);

  const edit_manual_release_date = ref<string>('');

  const edit_manual_image_file = ref<File | null>(null);

  const edit_manual_image_data_url = ref<string | null>(null);

  const edit_manual_image_preview = ref<string | null>(null);

  const edit_save_error = ref<string | null>(null);

  /* computed vars */
  const edit_language_options = computed<{ label: string; value: string }[]>(() => {
    if (!editing_entry.value) return [];
    if (editing_entry.value.entry.set_id === 'manual-collection') {
      return get_languages().map((language) => ({ label: language.name, value: language.id }));
    }
    const set = get_set_by_id(editing_entry.value.entry.set_id);
    const card = get_card_by_id(
      editing_entry.value.entry.set_id,
      editing_entry.value.entry.card_id,
    );
    const variant = card?.variants.find(
      (candidate) => candidate.id === editing_entry.value?.entry.variant_id,
    );
    const language_ids = variant?.language_ids?.length
      ? variant.language_ids
      : (set?.language_ids ?? []);
    return language_ids.map((language_id) => ({
      label: language_names.get(language_id) ?? language_id.toUpperCase(),
      value: language_id,
    }));
  });

  const editing_manual_card = computed<Manual_Collection_Card | null>(() =>
    editing_entry.value?.entry.set_id === 'manual-collection'
      ? (collection_store.manual_cards.value.find(
          (card) => card.id === editing_entry.value?.entry.card_id,
        ) ?? null)
      : null,
  );

  /* functions */
  const open_edit_entry = (row: Collection_Row): void => {
    editing_entry.value = row;
    edit_quantity.value = row.entry.quantity;
    edit_language_id.value = row.entry.language_id;
    edit_strong_language.value = row.entry.strong_language === true;
    edit_condition.value = row.entry.condition;
    edit_folder_id.value = row.entry.folder_id;
    edit_variant_id.value = row.entry.variant_id;
    edit_manual_image_file.value = null;
    edit_manual_image_data_url.value = null;
    edit_save_error.value = null;
    const manual_card =
      row.entry.set_id === 'manual-collection'
        ? collection_store.manual_cards.value.find((card) => card.id === row.entry.card_id)
        : null;
    if (manual_card) {
      edit_manual_name.value = manual_card.name;
      edit_manual_set_name.value = manual_card.set_name;
      edit_manual_number.value = manual_card.number;
      edit_manual_category.value = manual_card.category;
      edit_manual_rarity.value = manual_card.rarity;
      edit_manual_pokemon_name.value = manual_card.pokemon_name;
      edit_manual_hp.value = manual_card.hp;
      edit_manual_types.value = manual_card.types.join(', ');
      edit_manual_illustrator.value = manual_card.illustrator;
      edit_manual_notes.value = manual_card.notes;
      edit_manual_value.value = manual_card.estimated_value;
      edit_manual_release_date.value = manual_card.release_date
        ? format_french_date(manual_card.release_date)
        : '';
      const image = manual_image_store.find(
        'manual-collection',
        manual_card.id,
        row.entry.variant_id,
        row.entry.language_id,
      );
      edit_manual_image_preview.value = image
        ? `${image.url}?v=${encodeURIComponent(image.updated_at)}`
        : null;
    }
    show_edit_dialog.value = true;
  };

  const prepare_edit_manual_image = (file: File | null): void => {
    edit_manual_image_data_url.value = null;
    edit_save_error.value = null;
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 15_000_000) {
      edit_save_error.value = 'Choose a JPEG, PNG, or WebP image smaller than 15 MB.';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      edit_manual_image_data_url.value = typeof reader.result === 'string' ? reader.result : null;
      edit_manual_image_preview.value = edit_manual_image_data_url.value;
    };
    reader.onerror = () => {
      edit_save_error.value = 'Unable to read the image.';
    };
    reader.readAsDataURL(file);
  };

  const save_entry = async (): Promise<void> => {
    if (
      !editing_entry.value ||
      edit_quantity.value < 1 ||
      !edit_language_id.value ||
      !edit_folder_id.value
    )
      return;
    const entry = editing_entry.value.entry;
    const manual_card = editing_manual_card.value;
    if (manual_card) {
      if (!edit_manual_name.value.trim()) return;
      const parsed_release_date = parse_french_date(edit_manual_release_date.value);
      if (edit_manual_release_date.value && !parsed_release_date) {
        edit_save_error.value = 'Release date must use DD-MM-YYYY and be a valid date.';
        return;
      }
      collection_store.update_manual_card(manual_card.id, {
        name: edit_manual_name.value,
        set_name: edit_manual_set_name.value,
        number: edit_manual_number.value,
        category: edit_manual_category.value,
        rarity: edit_manual_rarity.value,
        pokemon_name: edit_manual_pokemon_name.value,
        hp: edit_manual_hp.value,
        types: edit_manual_types.value.split(','),
        illustrator: edit_manual_illustrator.value,
        notes: edit_manual_notes.value,
        estimated_value: edit_manual_value.value,
        release_date: parsed_release_date,
      });

      if (edit_manual_image_data_url.value) {
        try {
          await manual_image_store.upload({
            set_id: 'manual-collection',
            card_id: manual_card.id,
            variant_id: edit_variant_id.value.trim() || 'normal',
            language_id: edit_language_id.value,
            data_url: edit_manual_image_data_url.value,
          });
        } catch (err) {
          edit_save_error.value = err instanceof Error ? err.message : String(err);
          return;
        }
      }
    }
    collection_store.update_entry(entry.id, {
      folder_id: edit_folder_id.value,
      language_id: edit_language_id.value,
      condition: edit_condition.value,
      quantity: edit_quantity.value,
      strong_language: edit_strong_language.value,
      variant_id: manual_card ? edit_variant_id.value : undefined,
    });
    show_edit_dialog.value = false;
    editing_entry.value = null;
  };

  /* public methods */
  defineExpose({ open: open_edit_entry });
</script>
