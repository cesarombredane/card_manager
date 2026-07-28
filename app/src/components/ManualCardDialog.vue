<template>
  <q-dialog v-model="isOpen">
    <q-card class="bg-grey-10 text-white" style="width: 720px; max-width: 94vw">
      <q-card-section>
        <div class="text-h6">Add a manual card</div>
        <div class="text-body2 text-grey-4">This card will exist only in your collection.</div>
      </q-card-section>

      <q-card-section class="row q-col-gutter-md">
        <div class="col-12 col-sm-6"><q-input v-model="name" dark outlined label="Card name *" /></div>
        <div class="col-12 col-sm-6"><q-input v-model="setName" dark outlined label="Set name" /></div>
        <div class="col-12 col-sm-4"><q-input v-model="number" dark outlined label="Set number" /></div>
        <div class="col-12 col-sm-4">
          <q-select v-model="languageId" :options="languageOptions" emit-value map-options dark outlined label="Language *" />
        </div>
        <div class="col-12 col-sm-4"><q-input v-model="variantId" dark outlined label="Variant" hint="For example: normal, holo" /></div>
        <div class="col-12 col-sm-4">
          <q-select v-model="condition" :options="conditionOptions" emit-value map-options dark outlined label="Condition" />
        </div>
        <div class="col-12 col-sm-4"><q-input v-model.number="quantity" type="number" min="1" dark outlined label="Quantity" /></div>
        <div class="col-12 col-sm-4">
          <collection-folder-select
            v-model="folderId"
            :folders="collectionStore.folders.value"
            dark
            outlined
            label="Collection"
          />
        </div>
        <div class="col-12 col-sm-4"><q-select v-model="category" :options="categoryOptions" dark outlined label="Category" /></div>
        <div class="col-12 col-sm-4"><q-input v-model="rarity" dark outlined label="Rarity" /></div>
        <div class="col-12 col-sm-4"><q-input v-model="pokemonName" dark outlined label="Pokémon name" /></div>
        <div class="col-12 col-sm-4"><q-input v-model.number="hp" type="number" min="1" dark outlined label="HP" /></div>
        <div class="col-12 col-sm-6"><q-input v-model="typesText" dark outlined label="Types" hint="Comma-separated" /></div>
        <div class="col-12 col-sm-6"><q-input v-model="illustrator" dark outlined label="Illustrator" /></div>
        <div class="col-12 col-sm-6"><q-input v-model.number="estimatedValue" type="number" min="0" step="0.01" dark outlined label="Estimated value (€)" /></div>
        <div class="col-12 col-sm-6">
          <q-input v-model="releaseDate" mask="##-##-####" dark outlined label="Release date" hint="DD-MM-YYYY" />
        </div>
        <div class="col-12"><q-input v-model="notes" type="textarea" dark outlined label="Notes" /></div>
        <div class="col-12">
          <q-file
            v-model="imageFile"
            dark
            outlined
            accept="image/jpeg,image/png,image/webp"
            label="Card image"
            @update:model-value="prepareImage"
          >
            <template #prepend><q-icon name="image" /></template>
          </q-file>
        </div>
        <div v-if="imagePreview" class="col-12">
          <q-img :src="imagePreview" fit="contain" class="bg-grey-9 rounded-borders" style="max-height: 440px" />
        </div>
        <div v-if="saveError" class="col-12 text-negative">{{ saveError }}</div>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat color="grey-4" label="Cancel" v-close-popup />
        <q-btn
          color="primary"
          text-color="black"
          label="Add manual card"
          :disable="!name.trim() || !folderId || quantity < 1"
          :loading="saving"
          @click="save"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
  import { computed, ref, watch } from 'vue';
  import { cardConditions, collectionStore } from '../utils/collection';
  import type { CardCondition, CollectionEntry, ManualCollectionCard } from '../utils/collection';
  import { getLanguages } from '../utils/dataManagement';
  import { manualImageStore } from '../utils/manualImages';
  import { parseFrenchDate } from '../utils/dates';
  import CollectionFolderSelect from './CollectionFolderSelect.vue';

  const props = withDefaults(defineProps<{ modelValue: boolean; initialFolderId?: string }>(), {
    initialFolderId: ''
  });
  const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    created: [];
  }>();

  const isOpen = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
  });
  const name = ref('');
  const setName = ref('');
  const number = ref('');
  const languageId = ref('en');
  const variantId = ref('normal');
  const condition = ref<CardCondition>('NM');
  const quantity = ref(1);
  const folderId = ref(props.initialFolderId);
  const category = ref('pokemon');
  const rarity = ref('');
  const pokemonName = ref('');
  const hp = ref<number | null>(null);
  const typesText = ref('');
  const illustrator = ref('');
  const notes = ref('');
  const estimatedValue = ref<number | null>(null);
  const releaseDate = ref('');
  const imageFile = ref<File | null>(null);
  const imageDataUrl = ref<string | null>(null);
  const imagePreview = ref<string | null>(null);
  const saveError = ref<string | null>(null);
  const saving = ref(false);
  const pendingCreated = ref<{ card: ManualCollectionCard; entry: CollectionEntry } | null>(null);

  const languageOptions = getLanguages().map((language) => ({ label: language.name, value: language.id }));
  const conditionOptions = cardConditions.map((entry) => ({ ...entry }));
  const categoryOptions = ['pokemon', 'trainer', 'energy'];

  watch(isOpen, (open) => {
    if (!open) return;
    const defaultFolder = collectionStore.ensureDefaultFolder();
    folderId.value = collectionStore.folders.value.some((folder) => folder.id === props.initialFolderId)
      ? props.initialFolderId
      : defaultFolder.id;
    saveError.value = null;
  });

  const prepareImage = (file: File | null): void => {
    imageDataUrl.value = null;
    imagePreview.value = null;
    pendingCreated.value = null;
    saveError.value = null;
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 15_000_000) {
      saveError.value = 'Choose a JPEG, PNG, or WebP image smaller than 15 MB.';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      imageDataUrl.value = typeof reader.result === 'string' ? reader.result : null;
      imagePreview.value = imageDataUrl.value;
    };
    reader.onerror = () => { saveError.value = 'Unable to read the selected image.'; };
    reader.readAsDataURL(file);
  };

  const reset = (): void => {
    name.value = '';
    setName.value = '';
    number.value = '';
    variantId.value = 'normal';
    condition.value = 'NM';
    quantity.value = 1;
    rarity.value = '';
    pokemonName.value = '';
    hp.value = null;
    typesText.value = '';
    illustrator.value = '';
    notes.value = '';
    estimatedValue.value = null;
    releaseDate.value = '';
    imageFile.value = null;
    imageDataUrl.value = null;
    imagePreview.value = null;
  };

  const save = async (): Promise<void> => {
    if (!name.value.trim() || !folderId.value || quantity.value < 1) return;
    const parsedReleaseDate = parseFrenchDate(releaseDate.value);
    if (releaseDate.value && !parsedReleaseDate) {
      saveError.value = 'Release date must use DD-MM-YYYY and be a valid date.';
      return;
    }
    saving.value = true;
    saveError.value = null;
    try {
      const result = pendingCreated.value ?? collectionStore.createManualCard({
          folder_id: folderId.value,
          name: name.value,
          set_name: setName.value,
          number: number.value,
          language_id: languageId.value,
          variant_id: variantId.value,
          condition: condition.value,
          quantity: quantity.value,
          category: category.value,
          rarity: rarity.value,
          pokemon_name: pokemonName.value,
          hp: hp.value,
          types: typesText.value.split(','),
          illustrator: illustrator.value,
          notes: notes.value,
          estimated_value: estimatedValue.value,
          release_date: parsedReleaseDate
        });
      pendingCreated.value = result;
      if (imageDataUrl.value) {
        await manualImageStore.upload({
          set_id: 'manual-collection',
          card_id: result.card.id,
          variant_id: result.entry.variant_id,
          language_id: result.entry.language_id,
          data_url: imageDataUrl.value
        });
      }
      pendingCreated.value = null;
      reset();
      isOpen.value = false;
      emit('created');
    } catch (error) {
      saveError.value = error instanceof Error ? error.message : String(error);
    } finally {
      saving.value = false;
    }
  };
</script>
