<template>
  <q-dialog v-model="is_open">
    <q-card class="app_surface text-white" style="width: 720px; max-width: 94vw">
      <q-card-section>
        <div class="text-h6">Add a manual card</div>
        <div class="text-body2 text_secondary">This card will exist only in your collection.</div>
      </q-card-section>

      <q-card-section class="row q-col-gutter-md">
        <div class="col-12 col-sm-6">
          <q-input v-model="name" dark outlined label="Card name *" />
        </div>
        <div class="col-12 col-sm-6">
          <q-input v-model="set_name" dark outlined label="Set name" />
        </div>
        <div class="col-12 col-sm-4">
          <q-input v-model="number" dark outlined label="Set number" />
        </div>
        <div class="col-12 col-sm-4">
          <q-select
            v-model="language_id"
            :options="language_options"
            emit-value
            map-options
            dark
            outlined
            label="Language *"
          />
        </div>
        <div class="col-12 col-sm-4">
          <q-input
            v-model="variant_id"
            dark
            outlined
            label="Variant"
            hint="For example: normal, holo"
          />
        </div>
        <div class="col-12 col-sm-4">
          <q-select
            v-model="condition"
            :options="condition_options"
            emit-value
            map-options
            dark
            outlined
            label="Condition"
          />
        </div>
        <div class="col-12 col-sm-4">
          <q-input v-model.number="quantity" type="number" min="1" dark outlined label="Quantity" />
        </div>
        <div class="col-12 col-sm-4">
          <collection-folder-select
            v-model="folder_id"
            :folders="collection_store.folders.value"
            dark
            outlined
            label="Collection"
          />
        </div>
        <div class="col-12 col-sm-4">
          <q-select v-model="category" :options="category_options" dark outlined label="Category" />
        </div>
        <div class="col-12 col-sm-4"><q-input v-model="rarity" dark outlined label="Rarity" /></div>
        <div class="col-12 col-sm-4">
          <q-input v-model="pokemon_name" dark outlined label="Pokémon name" />
        </div>
        <div class="col-12 col-sm-4">
          <q-input v-model.number="hp" type="number" min="1" dark outlined label="HP" />
        </div>
        <div class="col-12 col-sm-6">
          <q-input v-model="types_text" dark outlined label="Types" hint="Comma-separated" />
        </div>
        <div class="col-12 col-sm-6">
          <q-input v-model="illustrator" dark outlined label="Illustrator" />
        </div>
        <div class="col-12 col-sm-6">
          <q-input
            v-model.number="estimated_value"
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
            v-model="release_date"
            mask="##-##-####"
            dark
            outlined
            label="Release date"
            hint="DD-MM-YYYY"
          />
        </div>
        <div class="col-12">
          <q-input v-model="notes" type="textarea" dark outlined label="Notes" />
        </div>
        <div class="col-12">
          <q-file
            v-model="image_file"
            dark
            outlined
            accept="image/jpeg,image/png,image/webp"
            label="Card image"
            @update:model-value="prepare_image"
          >
            <template #prepend><q-icon name="image" /></template>
          </q-file>
        </div>
        <div v-if="image_preview" class="col-12">
          <q-img
            :src="image_preview"
            fit="contain"
            class="app_surface rounded-borders"
            style="max-height: 440px"
          />
        </div>
        <div v-if="save_error" class="col-12 text-negative">{{ save_error }}</div>
      </q-card-section>

      <q-card-actions>
        <q-space />
        <q-btn v-close-popup flat color="secondary" label="Cancel" no-caps
          ><q-tooltip :delay="1000">Cancel</q-tooltip></q-btn
        >
        <q-btn
          color="primary"
          text-color="dark"
          label="Add manual card"
          :disable="!name.trim() || !folder_id || quantity < 1"
          :loading="saving"
          no-caps
          @click="save"
          ><q-tooltip :delay="1000">Add manual card</q-tooltip></q-btn
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
  import { manual_image_store } from '../store/modules/manual_images';
  import { get_languages } from '../services/catalog_storage';
  import { parse_french_date } from '../utils/dates';

  // import types
  import type {
    Card_Condition,
    Collection_Entry,
    Manual_Collection_Card,
  } from '../store/modules/collection';

  /* hooks */
  const props = withDefaults(defineProps<{ modelValue: boolean; initial_folder_id?: string }>(), {
    initial_folder_id: '',
  });

  const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    created: [];
  }>();

  /* const vars */
  const language_options = get_languages().map((language) => ({
    label: language.name,
    value: language.id,
  }));

  const condition_options = card_conditions.map((entry) => ({ ...entry }));

  const category_options = ['pokemon', 'trainer', 'energy'];

  /* reactive vars */
  const name = ref<string>('');

  const set_name = ref<string>('');

  const number = ref<string>('');

  const language_id = ref<string>('en');

  const variant_id = ref<string>('normal');

  const condition = ref<Card_Condition>('NM');

  const quantity = ref<number>(1);

  const folder_id = ref<string>(props.initial_folder_id);

  const category = ref<string>('pokemon');

  const rarity = ref<string>('');

  const pokemon_name = ref<string>('');

  const hp = ref<number | null>(null);

  const types_text = ref<string>('');

  const illustrator = ref<string>('');

  const notes = ref<string>('');

  const estimated_value = ref<number | null>(null);

  const release_date = ref<string>('');

  const image_file = ref<File | null>(null);

  const image_data_url = ref<string | null>(null);

  const image_preview = ref<string | null>(null);

  const save_error = ref<string | null>(null);

  const saving = ref<boolean>(false);

  const pending_created = ref<{ card: Manual_Collection_Card; entry: Collection_Entry } | null>(
    null,
  );

  /* computed vars */
  const is_open = computed<boolean>({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value),
  });

  /* functions */
  const prepare_image = (file: File | null): void => {
    image_data_url.value = null;
    image_preview.value = null;
    pending_created.value = null;
    save_error.value = null;
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 15_000_000) {
      save_error.value = 'Choose a JPEG, PNG, or WebP image smaller than 15 MB.';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      image_data_url.value = typeof reader.result === 'string' ? reader.result : null;
      image_preview.value = image_data_url.value;
    };
    reader.onerror = () => {
      save_error.value = 'Unable to read the selected image.';
    };
    reader.readAsDataURL(file);
  };

  const reset = (): void => {
    name.value = '';
    set_name.value = '';
    number.value = '';
    variant_id.value = 'normal';
    condition.value = 'NM';
    quantity.value = 1;
    rarity.value = '';
    pokemon_name.value = '';
    hp.value = null;
    types_text.value = '';
    illustrator.value = '';
    notes.value = '';
    estimated_value.value = null;
    release_date.value = '';
    image_file.value = null;
    image_data_url.value = null;
    image_preview.value = null;
  };

  const save = async (): Promise<void> => {
    if (!name.value.trim() || !folder_id.value || quantity.value < 1) return;
    const parsed_release_date = parse_french_date(release_date.value);
    if (release_date.value && !parsed_release_date) {
      save_error.value = 'Release date must use DD-MM-YYYY and be a valid date.';
      return;
    }
    saving.value = true;
    save_error.value = null;
    try {
      const result =
        pending_created.value ??
        collection_store.create_manual_card({
          folder_id: folder_id.value,
          name: name.value,
          set_name: set_name.value,
          number: number.value,
          language_id: language_id.value,
          variant_id: variant_id.value,
          condition: condition.value,
          quantity: quantity.value,
          category: category.value,
          rarity: rarity.value,
          pokemon_name: pokemon_name.value,
          hp: hp.value,
          types: types_text.value.split(','),
          illustrator: illustrator.value,
          notes: notes.value,
          estimated_value: estimated_value.value,
          release_date: parsed_release_date,
        });
      pending_created.value = result;
      if (image_data_url.value) {
        await manual_image_store.upload({
          set_id: 'manual-collection',
          card_id: result.card.id,
          variant_id: result.entry.variant_id,
          language_id: result.entry.language_id,
          data_url: image_data_url.value,
        });
      }
      pending_created.value = null;
      reset();
      is_open.value = false;
      emit('created');
    } catch (err) {
      save_error.value = err instanceof Error ? err.message : String(err);
    } finally {
      saving.value = false;
    }
  };

  /* watchers */
  watch(is_open, (open) => {
    if (!open) return;
    const default_folder = collection_store.ensure_default_folder();
    folder_id.value = collection_store.folders.value.some(
      (folder) => folder.id === props.initial_folder_id,
    )
      ? props.initial_folder_id
      : default_folder.id;
    save_error.value = null;
  });
</script>
