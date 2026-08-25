<template>
  <q-page class="bg-dark text-white q-pa-md q-pa-lg-xl">
    <section class="q-mb-lg">
      <q-btn flat dense color="grey-4" icon="arrow_back" label="Collection dashboard" no-caps to="/collection" />
      <div class="text-overline text-primary q-mt-sm">Collection folder</div>
      <div class="text-h4 text-weight-bold">{{ folder?.name ?? 'Unknown folder' }}</div>
      <div class="text-body2 text-grey-4">
        {{ cardCount }} owned cards · {{ wantedCount }} wanted · Estimated collection value {{ formatEuroPrice(folderValue) }}
      </div>
      <div class="text-caption text-grey-5 q-mt-xs">
        Catalog cards use current Cardmarket trend prices; manual cards use their entered estimated value.
      </div>
    </section>

    <q-tabs
      v-if="folder"
      v-model="collectionTab"
      align="left"
      active-color="primary"
      indicator-color="primary"
      class="q-mb-md"
    >
      <q-tab name="owned" :label="`Owned (${cardCount})`" />
      <q-tab name="wanted" :label="`Wanted (${wantedCount})`" />
    </q-tabs>

    <section v-if="folder" class="row q-col-gutter-md items-center q-mb-md">
      <div class="col-12 col-sm-6 col-md-3">
        <q-input
          v-model="search"
          dark
          dense
          outlined
          clearable
          debounce="150"
          label="Search cards by name"
          @clear="search = ''"
        >
          <template #prepend><q-icon name="search" /></template>
        </q-input>
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <q-select
          v-model="selectedLanguageId"
          :options="languageOptions"
          emit-value
          map-options
          dark
          dense
          outlined
          clearable
          label="Language"
        />
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <card-sort-selector v-model="selectedSort" />
      </div>
      <div v-if="folder.pokedex_config && collectionTab === 'owned'" class="col-12 col-md-auto">
        <q-toggle
          v-model="onlyNonFitting"
          color="primary"
          label="Only non-fitting cards"
        />
      </div>
      <div class="col-12 col-md-auto">
        <q-btn color="primary" text-color="black" icon="add_photo_alternate" label="Add manual card" no-caps @click="showManualCardDialog = true" />
      </div>
      <div class="col-12 col-md-auto">
        <q-btn
          v-if="folder.type === 'binder'"
          outline
          color="primary"
          icon="auto_stories"
          :label="binderStore.get(folderId) ? 'Open binder' : 'Create binder'"
          no-caps
          :to="`/collection/folder/${folderId}/binder`"
        />
      </div>
      <div v-if="folder.pokedex_config" class="col-12 col-md-auto">
        <q-btn
          outline
          color="primary"
          icon="filter_alt"
          label="Pokédex options"
          no-caps
          @click="openPokedexOptions"
        />
      </div>
      <div v-if="collectionTab === 'wanted'" class="col-12 col-md-auto">
        <q-btn
          outline
          color="grey-3"
          icon="picture_as_pdf"
          label="Print placeholder"
          no-caps
          :loading="generatingPlaceholders"
          :disable="wantedRows.length === 0"
          @click="printWantedPlaceholders"
        />
      </div>
      <div class="col-12 col-md-auto">
        <q-btn
          :outline="!selectionMode"
          color="primary"
          icon="checklist"
          :label="selectionMode ? 'Cancel selection' : 'Select cards'"
          no-caps
          @click="toggleSelectionMode"
        />
      </div>
    </section>

    <q-banner v-if="placeholderError" class="bg-red-10 text-negative q-mb-md rounded-borders">
      {{ placeholderError }}
    </q-banner>

    <section v-if="folder && selectionMode" class="row items-center q-gutter-sm q-mb-md">
      <q-checkbox
        :model-value="allDisplayedSelected"
        :indeterminate="someDisplayedSelected && !allDisplayedSelected"
        dark
        color="primary"
        :label="`Select all visible (${displayedRows.length})`"
        @update:model-value="toggleSelectAllDisplayed"
      />
      <q-space />
      <span class="text-body2 text-grey-4">{{ selectedEntryIds.size }} selected</span>
      <q-btn
        outline
        color="negative"
        icon="delete"
        label="Delete selected"
        no-caps
        :disable="selectedEntryIds.size === 0"
        @click="showBulkDeleteDialog = true"
      />
      <q-btn
        outline
        color="primary"
        icon="edit"
        label="Edit selected"
        no-caps
        :disable="selectedEntryIds.size === 0"
        @click="openBulkEditDialog"
      />
      <q-btn
        color="primary"
        text-color="black"
        icon="drive_file_move"
        label="Move to collection"
        no-caps
        :disable="selectedEntryIds.size === 0 || destinationFolders.length === 0"
        @click="openTransferDialog"
      />
    </section>

    <q-banner v-if="!folder" class="bg-grey-10 text-grey-4">
      This collection folder does not exist.
    </q-banner>

    <q-banner v-else-if="activeRows.length === 0" class="bg-grey-10 text-grey-4">
      <template v-if="collectionTab === 'wanted'">
        This want list is empty. Use the heart button on a card to add it.
      </template>
      <template v-else>
        This folder has no owned cards. Add cards from a set, search result, or card detail page.
      </template>
    </q-banner>

    <q-banner v-else-if="filteredRows.length === 0" class="bg-grey-10 text-grey-4">
      No card matches these filters.
    </q-banner>

    <card-list
      v-else
      :cards="displayedRows.map((row) => row.card)"
      :collection-entries="displayedRows.map((row) => row.entry)"
      :selectable="selectionMode"
      :selected-entry-ids="[...selectedEntryIds]"
      :protected-entry-ids="displayedRows.filter((row) => row.entry.wanted && row.entry.pokedex_requirement_id).map((row) => row.entry.id)"
      :status-overlays="Object.fromEntries(displayedRows.flatMap((row) => {
        const status = collectionStore.pokedexEntryStatus(row.entry.id);
        return status ? [[row.entry.id, status]] : [];
      }))"
      @card-click="openCard"
      @edit-entry="openEditEntryById"
      @delete-entry="setEntryToDelete"
      @toggle-selection="toggleEntrySelection"
    />

    <div v-if="displayedRows.length < filteredRows.length" class="row justify-center q-mt-xl q-pb-md">
      <q-btn
        color="primary"
        text-color="black"
        unelevated
        :label="`Show more (${filteredRows.length - displayedRows.length} remaining)`"
        @click="visibleRowCount += collectionRowStep"
      />
    </div>

    <back-to-top-button />

    <q-dialog v-model="showTransferDialog">
      <q-card class="bg-grey-10 text-white" style="width: 480px; max-width: 94vw">
        <q-card-section>
          <div class="text-h6">Move selected cards</div>
          <div class="text-body2 text-grey-4">
            Move {{ selectedEntryIds.size }} selected {{ selectedEntryIds.size === 1 ? 'entry' : 'entries' }} to another collection.
          </div>
        </q-card-section>
        <q-card-section>
          <collection-folder-select
            v-model="transferFolderId"
            :folders="destinationFolders"
            dark
            outlined
            label="Destination collection"
          />
          <q-list v-if="selectedTransferRows.length > 0" class="q-mt-md" separator>
            <q-item v-for="row in selectedTransferRows" :key="row.entry.id" class="q-px-none">
              <q-item-section>
                <q-item-label>{{ row.card.display_name }}</q-item-label>
                <q-item-label caption class="text-grey-5">
                  {{ row.entry.language_id.toUpperCase() }} · {{ row.entry.condition }}
                </q-item-label>
                <q-select
                  v-if="transferPokedexOptions(row).length > 1"
                  v-model="transferPokedexRequirements[row.entry.id]"
                  :options="transferPokedexOptions(row)"
                  emit-value
                  map-options
                  dark
                  dense
                  outlined
                  class="q-mt-sm"
                  label="Pokédex slot"
                />
              </q-item-section>
              <q-item-section side>
                <div v-if="row.entry.quantity > 1" class="row items-center no-wrap q-gutter-xs">
                  <q-btn
                    flat
                    round
                    dense
                    icon="remove"
                    color="grey-4"
                    :disable="transferQuantities[row.entry.id] <= 1"
                    aria-label="Move one fewer copy"
                    @click="changeTransferQuantity(row.entry.id, -1, row.entry.quantity)"
                  />
                  <span class="text-body1 text-center" style="min-width: 24px">
                    {{ transferQuantities[row.entry.id] }}
                  </span>
                  <q-btn
                    flat
                    round
                    dense
                    icon="add"
                    color="primary"
                    :disable="transferQuantities[row.entry.id] >= row.entry.quantity"
                    aria-label="Move one more copy"
                    @click="changeTransferQuantity(row.entry.id, 1, row.entry.quantity)"
                  />
                </div>
                <span v-else class="text-caption text-grey-5">1 copy</span>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat color="grey-4" label="Cancel" v-close-popup />
          <q-btn
            color="primary"
            text-color="black"
            label="Move cards"
            :disable="!transferFolderId || missingTransferPokedexChoices"
            @click="confirmBulkTransfer"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showBulkEditDialog">
      <q-card class="bg-grey-10 text-white" style="width: 480px; max-width: 94vw">
        <q-card-section>
          <div class="text-h6">Edit selected cards</div>
          <div class="text-body2 text-grey-4">
            Change the language of {{ selectedEntryIds.size }} selected
            {{ selectedEntryIds.size === 1 ? 'entry' : 'entries' }}.
          </div>
        </q-card-section>
        <q-card-section>
          <q-select
            v-model="bulkEditLanguageId"
            :options="allLanguageOptions"
            emit-value
            map-options
            dark
            outlined
            label="Language"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat color="grey-4" label="Cancel" v-close-popup />
          <q-btn
            color="primary"
            text-color="black"
            label="Apply changes"
            :disable="!bulkEditLanguageId"
            @click="confirmBulkEdit"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showEditDialog">
      <q-card class="bg-grey-10 text-white" style="width: 720px; max-width: 94vw">
        <q-card-section>
          <div class="text-h6">{{ editingEntry?.entry.wanted ? 'Edit wanted card' : 'Edit collection card' }}</div>
          <div class="text-body2 text-grey-4">{{ editingEntry?.card.display_name }}</div>
        </q-card-section>
        <q-card-section class="row q-col-gutter-md q-row-gutter-md">
          <template v-if="editingManualCard">
            <div class="col-12"><q-input v-model="editManualName" dark outlined label="Card name *" /></div>
            <div class="col-12 col-sm-6"><q-input v-model="editManualSetName" dark outlined label="Set name" /></div>
            <div class="col-12 col-sm-6"><q-input v-model="editManualNumber" dark outlined label="Set number" /></div>
            <div class="col-12 col-sm-6"><q-select v-model="editManualCategory" :options="categoryOptions" dark outlined label="Category" /></div>
            <div class="col-12 col-sm-6"><q-input v-model="editManualRarity" dark outlined label="Rarity" /></div>
            <div class="col-12 col-sm-6"><q-input v-model="editManualPokemonName" dark outlined label="Pokémon name" /></div>
            <div class="col-12 col-sm-6"><q-input v-model.number="editManualHp" type="number" min="1" dark outlined label="HP" /></div>
            <div class="col-12 col-sm-6"><q-input v-model="editManualTypes" dark outlined label="Types (comma-separated)" /></div>
            <div class="col-12 col-sm-6"><q-input v-model="editManualIllustrator" dark outlined label="Illustrator" /></div>
            <div class="col-12 col-sm-6"><q-input v-model.number="editManualValue" type="number" min="0" step="0.01" dark outlined label="Estimated value (€)" /></div>
            <div class="col-12 col-sm-6">
              <q-input v-model="editManualReleaseDate" mask="##-##-####" dark outlined label="Release date" hint="DD-MM-YYYY" />
            </div>
            <div class="col-12"><q-input v-model="editManualNotes" type="textarea" dark outlined label="Notes" /></div>
            <div class="col-12">
              <q-file
                v-model="editManualImageFile"
                dark
                outlined
                accept="image/jpeg,image/png,image/webp"
                label="Replace or add image"
                @update:model-value="prepareEditManualImage"
              >
                <template #prepend><q-icon name="image" /></template>
              </q-file>
            </div>
            <div v-if="editManualImagePreview" class="col-12">
              <q-img :src="editManualImagePreview" fit="contain" class="bg-grey-9 rounded-borders" style="max-height: 400px" />
            </div>
            <div v-if="editSaveError" class="col-12 text-negative">{{ editSaveError }}</div>
          </template>
          <div class="col-12 col-sm-6"><q-input v-model.number="editQuantity" type="number" min="1" step="1" dark outlined label="Quantity" /></div>
          <div class="col-12 col-sm-6">
            <q-select v-model="editLanguageId" :options="editLanguageOptions" emit-value map-options dark outlined label="Language" />
          </div>
          <div v-if="editingManualCard" class="col-12 col-sm-6"><q-input v-model="editVariantId" dark outlined label="Variant" /></div>
          <div v-if="!editingEntry?.entry.wanted" class="col-12 col-sm-6">
            <q-select v-model="editCondition" :options="conditionOptions" emit-value map-options dark outlined label="Condition" />
          </div>
          <div v-else class="col-12 col-sm-6 flex items-center">
            <q-checkbox v-model="editStrongLanguage" dark label="Require this exact language" />
          </div>
          <div class="col-12" :class="{ 'col-sm-6': editingManualCard }">
            <collection-folder-select
              v-model="editFolderId"
              :folders="collectionStore.folders.value"
              dark
              outlined
              label="Collection"
            />
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat color="grey-4" label="Cancel" v-close-popup />
          <q-btn
            color="primary"
            text-color="black"
            label="Save changes"
            :disable="editQuantity < 1 || !editLanguageId || !editFolderId"
            @click="saveEntry"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog :model-value="entryToDelete !== null" @update:model-value="value => { if (!value) entryToDelete = null; }">
      <q-card class="bg-grey-10 text-white">
        <q-card-section>
          <div class="text-h6">Remove this card?</div>
          <div class="text-body2 text-grey-4 q-mt-sm">
            <template v-if="entryToDelete?.entry.wanted">
              Remove {{ entryToDelete.card.display_name }} from this want list?
            </template>
            <template v-else>
              Remove {{ entryToDelete?.entry.quantity }} × {{ entryToDelete?.card.display_name }}
              ({{ entryToDelete?.entry.condition }}) from this folder?
            </template>
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat color="grey-4" label="Cancel" @click="entryToDelete = null" />
          <q-btn color="negative" label="Remove card" @click="confirmRemoveEntry" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showBulkDeleteDialog">
      <q-card class="bg-grey-10 text-white" style="width: 440px; max-width: 94vw">
        <q-card-section>
          <div class="text-h6">Delete selected cards?</div>
          <div class="text-body2 text-grey-4 q-mt-sm">
            This will remove all copies of the {{ selectedEntryIds.size }} selected
            {{ selectedEntryIds.size === 1 ? 'entry' : 'entries' }} from this collection.
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat color="grey-4" label="Cancel" v-close-popup />
          <q-btn color="negative" icon="delete" label="Delete selected" @click="confirmBulkDelete" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showPokedexOptions">
      <q-card class="bg-grey-10 text-white" style="width: 1200px; max-width: 96vw">
        <q-card-section><div class="text-h6">Pokédex binder options</div></q-card-section>
        <q-card-section><pokedex-binder-options v-model="editingPokedexConfig" /></q-card-section>
        <q-card-actions align="right">
          <q-btn flat color="grey-4" label="Cancel" v-close-popup />
          <q-btn color="primary" text-color="black" label="Save and recalculate" @click="savePokedexOptions" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <manual-card-dialog v-model="showManualCardDialog" :initial-folder-id="folderId" />
  </q-page>
</template>

<script setup lang="ts">
  import { computed, ref, watch } from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  import CardList from '../components/CardList.vue';
  import ManualCardDialog from '../components/ManualCardDialog.vue';
  import CardSortSelector from '../components/CardSortSelector.vue';
  import BackToTopButton from '../components/BackToTopButton.vue';
  import CollectionFolderSelect from '../components/CollectionFolderSelect.vue';
  import PokedexBinderOptions from '../components/PokedexBinderOptions.vue';
  import { buildDisplayCard, cardmarketDisplayPrice, compareCardReleaseAndNumber, formatEuroPrice } from '../utils/cardDisplay';
  import type { DisplayCard } from '../utils/cardDisplay';
  import { getCardById, getLanguages, getPokemon, getSetById } from '../utils/dataManagement';
  import { localizedValue } from '../utils/localization';
  import { cardConditions, collectionStore } from '../utils/collection';
  import type { CardCondition, CollectionEntry, CollectionFolder } from '../utils/collection';
  import { resolveCardImage } from '../utils/cardImages';
  import { manualImageStore } from '../utils/manualImages';
  import { formatFrenchDate, parseFrenchDate } from '../utils/dates';
  import { binderStore } from '../utils/binders';
  import type { CardSort } from '../utils/cardSorting';
  import { downloadWantedPlaceholdersPdf } from '../utils/wantedPlaceholdersPdf';
  import { store } from '../store';
  import type { CollectionFolderFilters } from '../store';
  import type { PokedexBinderConfig } from '../utils/pokedexBinder';
  import { copyPokedexBinderConfig, pokedexPlaceholderCard } from '../utils/pokedexBinder';

  type CollectionRow = {
    entry: CollectionEntry;
    card: DisplayCard;
    releaseDate: string | null;
    pokedexNumber: number | null;
    unitPrice: number | null;
    totalValue: number;
  };
  const route = useRoute();
  const router = useRouter();
  const initialFolderId = String(route.params.folderId ?? '');
  const storedFilters = store.state.collection_folder_filters[initialFolderId];
  const search = ref(storedFilters?.search ?? '');
  const collectionTab = ref<'owned' | 'wanted'>(storedFilters?.tab ?? 'owned');
  const selectedLanguageId = ref<string | null>(storedFilters?.language_id ?? null);
  const onlyNonFitting = ref(storedFilters?.only_non_fitting ?? false);
  const selectedSort = ref<CardSort>(storedFilters?.sort ?? 'release-desc');
  const collectionRowStep = 48;
  const visibleRowCount = ref(collectionRowStep);
  const selectionMode = ref(false);
  const selectedEntryIds = ref(new Set<string>());
  const showTransferDialog = ref(false);
  const transferFolderId = ref('');
  const transferQuantities = ref<Record<string, number>>({});
  const transferPokedexRequirements = ref<Record<string, string>>({});
  const showBulkEditDialog = ref(false);
  const showBulkDeleteDialog = ref(false);
  const bulkEditLanguageId = ref('');
  const entryToDelete = ref<CollectionRow | null>(null);
  const showManualCardDialog = ref(false);
  const showPokedexOptions = ref(false);
  const editingPokedexConfig = ref<PokedexBinderConfig>({} as PokedexBinderConfig);
  const showEditDialog = ref(false);
  const editingEntry = ref<CollectionRow | null>(null);
  const editQuantity = ref(1);
  const editLanguageId = ref('');
  const editStrongLanguage = ref(false);
  const editCondition = ref<CardCondition>('NM');
  const editFolderId = ref('');
  const editVariantId = ref('normal');
  const editManualName = ref('');
  const editManualSetName = ref('');
  const editManualNumber = ref('');
  const editManualCategory = ref('pokemon');
  const editManualRarity = ref('');
  const editManualPokemonName = ref('');
  const editManualHp = ref<number | null>(null);
  const editManualTypes = ref('');
  const editManualIllustrator = ref('');
  const editManualNotes = ref('');
  const editManualValue = ref<number | null>(null);
  const editManualReleaseDate = ref('');
  const editManualImageFile = ref<File | null>(null);
  const editManualImageDataUrl = ref<string | null>(null);
  const editManualImagePreview = ref<string | null>(null);
  const editSaveError = ref<string | null>(null);
  const generatingPlaceholders = ref(false);
  const placeholderError = ref<string | null>(null);
  const folderId = computed(() => String(route.params.folderId ?? ''));
  const folder = computed<CollectionFolder | null>(() =>
    collectionStore.folders.value.find((candidate) => candidate.id === folderId.value) ?? null
  );
  const openPokedexOptions = (): void => {
    if (!folder.value?.pokedex_config) return;
    editingPokedexConfig.value = copyPokedexBinderConfig(folder.value.pokedex_config);
    showPokedexOptions.value = true;
  };
  const savePokedexOptions = (): void => {
    collectionStore.updatePokedexConfig(folderId.value, editingPokedexConfig.value);
    showPokedexOptions.value = false;
  };
  const destinationFolders = computed(() =>
    collectionStore.folders.value.filter((candidate) => candidate.id !== folderId.value)
  );
  const languageNames = new Map(getLanguages().map((language) => [language.id, language.name]));
  const allLanguageOptions = getLanguages().map((language) => ({
    label: language.name,
    value: language.id
  }));
  const pokemon = getPokemon();
  const pokedexByPokemonId = new Map(pokemon.map((entry) => [entry.id, entry.pokedex_id]));
  const pokedexByPokemonName = new Map(pokemon.flatMap((entry) =>
    [entry.name, ...Object.values(entry.names).filter((name): name is string => Boolean(name))]
      .map((name) => [name.toLocaleLowerCase(), entry.pokedex_id] as const)
  ));
  const editLanguageOptions = computed(() => {
    if (!editingEntry.value) return [];
    if (editingEntry.value.entry.set_id === 'manual-collection') {
      return getLanguages().map((language) => ({ label: language.name, value: language.id }));
    }
    const set = getSetById(editingEntry.value.entry.set_id);
    const card = getCardById(editingEntry.value.entry.set_id, editingEntry.value.entry.card_id);
    const variant = card?.variants.find((candidate) => candidate.id === editingEntry.value?.entry.variant_id);
    const languageIds = variant?.language_ids?.length ? variant.language_ids : set?.language_ids ?? [];
    return languageIds.map((languageId) => ({
      label: languageNames.get(languageId) ?? languageId.toUpperCase(),
      value: languageId
    }));
  });
  const conditionOptions = cardConditions.map((entry) => ({ ...entry }));
  const categoryOptions = ['pokemon', 'trainer', 'energy'];
  const editingManualCard = computed(() =>
    editingEntry.value?.entry.set_id === 'manual-collection'
      ? collectionStore.manualCards.value.find((card) => card.id === editingEntry.value?.entry.card_id) ?? null
      : null
  );

  const collectionRows = computed<CollectionRow[]>(() => collectionStore.entries.value
    .filter((entry) => entry.folder_id === folderId.value)
    .flatMap((entry): CollectionRow[] => {
      if (entry.set_id === 'pokedex-requirement' && entry.pokedex_requirement_id) {
        const card = pokedexPlaceholderCard(
          entry.pokedex_requirement_id,
          entry.pokedex_candidate_count ?? 0,
          folder.value?.pokedex_config?.international_language_id ?? 'en',
          folder.value?.pokedex_config
        );
        return card ? [{ entry, card, releaseDate: null, pokedexNumber: Number(card.number), unitPrice: null, totalValue: 0 }] : [];
      }
      if (entry.set_id === 'manual-collection') {
        const manualCard = collectionStore.manualCards.value.find((candidate) => candidate.id === entry.card_id);
        if (!manualCard) return [];
        const image = resolveCardImage({}, entry.language_id, entry.language_id, {
          setId: 'manual-collection',
          cardId: manualCard.id,
          variantId: entry.variant_id
        });
        return [{
          entry,
          card: {
            id: manualCard.id,
            card_id: manualCard.id,
            set_id: 'manual-collection',
            set_name: manualCard.set_name || null,
            language_id: entry.language_id,
            variant_id: entry.variant_id,
            number: manualCard.number || '?',
            display_name: manualCard.name,
            category: manualCard.category,
            rarity: manualCard.rarity,
            hp: manualCard.hp,
            illustrator: manualCard.illustrator || null,
            types: manualCard.types,
            pokemon_names: manualCard.pokemon_name ? [manualCard.pokemon_name] : [],
            energy_costs: [],
            image_url: image.url,
            image_language_id: image.languageId,
            image_is_fallback: false,
            image_source: image.source,
            cardmarket: null,
            is_manual: true,
            estimated_value: manualCard.estimated_value
          },
          releaseDate: manualCard.release_date,
          pokedexNumber: manualCard.pokemon_name
            ? pokedexByPokemonName.get(manualCard.pokemon_name.toLocaleLowerCase()) ?? null
            : null,
          unitPrice: manualCard.estimated_value,
          totalValue: (manualCard.estimated_value ?? 0) * entry.quantity
        }];
      }
      const card = getCardById(entry.set_id, entry.card_id);
      const set = getSetById(entry.set_id);
      const variant = card?.variants.find((candidate) => candidate.id === entry.variant_id);
      if (!card || !variant) return [];
      const languageId = entry.language_id;
      const setName = set ? localizedValue(set.name, languageId) ?? set.id : null;
      const displayCard = buildDisplayCard(card, variant, languageId, setName);
      const unitPrice = cardmarketDisplayPrice(variant.cardmarket);
      const pokedexNumbers = (card.pokemon ?? [])
        .map((pokemonId) => pokedexByPokemonId.get(pokemonId))
        .filter((number): number is number => number !== undefined);
      return [{
        entry,
        card: displayCard,
        releaseDate: set?.release_date ?? null,
        pokedexNumber: pokedexNumbers.length ? Math.min(...pokedexNumbers) : null,
        unitPrice,
        totalValue: (unitPrice ?? 0) * entry.quantity
      }];
    }));

  const activeRows = computed<CollectionRow[]>(() =>
    collectionRows.value.filter((row) => row.entry.wanted === (collectionTab.value === 'wanted'))
  );
  const selectedTransferRows = computed(() =>
    collectionRows.value.filter((row) => selectedEntryIds.value.has(row.entry.id))
  );
  const wantedRows = computed<CollectionRow[]>(() => collectionRows.value.filter((row) => row.entry.wanted));

  const languageOptions = computed(() => [...new Set(activeRows.value.map((row) => row.entry.language_id))]
    .map((languageId) => ({
      label: languageNames.get(languageId) ?? languageId.toUpperCase(),
      value: languageId
    }))
    .sort((left, right) => left.label.localeCompare(right.label)));

  const filteredRows = computed<CollectionRow[]>(() => {
    const query = search.value.trim().toLocaleLowerCase();
    return activeRows.value
      .filter((row) => query === '' || row.card.display_name.toLocaleLowerCase().includes(query))
      .filter((row) => !selectedLanguageId.value || row.entry.language_id === selectedLanguageId.value)
      .filter((row) => !onlyNonFitting.value || !folder.value?.pokedex_config || collectionTab.value !== 'owned'
        || collectionStore.pokedexEntryStatus(row.entry.id) === 'This card no longer fits this binder')
      .sort((left, right) => {
        if (selectedSort.value === 'price-asc' || selectedSort.value === 'price-desc') {
          if (left.unitPrice === null && right.unitPrice !== null) return 1;
          if (left.unitPrice !== null && right.unitPrice === null) return -1;
          if (left.unitPrice !== null && right.unitPrice !== null && left.unitPrice !== right.unitPrice) {
            return selectedSort.value === 'price-asc'
              ? left.unitPrice - right.unitPrice
              : right.unitPrice - left.unitPrice;
          }
        }
        if (selectedSort.value === 'release-desc' || selectedSort.value === 'release-asc') {
          const comparison = compareCardReleaseAndNumber(
            left.releaseDate,
            right.releaseDate,
            left.card.number,
            right.card.number,
            selectedSort.value === 'release-asc' ? 'asc' : 'desc'
          );
          if (comparison !== 0) return comparison;
        }
        if (selectedSort.value === 'pokedex-asc' || selectedSort.value === 'pokedex-desc') {
          if (left.pokedexNumber === null && right.pokedexNumber !== null) return 1;
          if (left.pokedexNumber !== null && right.pokedexNumber === null) return -1;
          if (left.pokedexNumber !== null && right.pokedexNumber !== null && left.pokedexNumber !== right.pokedexNumber) {
            return selectedSort.value === 'pokedex-asc'
              ? left.pokedexNumber - right.pokedexNumber
              : right.pokedexNumber - left.pokedexNumber;
          }
        }
        return left.card.display_name.localeCompare(right.card.display_name);
      });
  });
  const displayedRows = computed<CollectionRow[]>(() => filteredRows.value.slice(0, visibleRowCount.value));

  const cardCount = computed(() => collectionRows.value
    .filter((row) => !row.entry.wanted)
    .reduce((total, row) => total + row.entry.quantity, 0));
  const wantedCount = computed(() => collectionRows.value
    .filter((row) => row.entry.wanted)
    .reduce((total, row) => total + row.entry.quantity, 0));
  const folderValue = computed(() => collectionRows.value
    .filter((row) => !row.entry.wanted)
    .reduce((total, row) => total + row.totalValue, 0));
  const displayedEntryIds = computed(() => displayedRows.value
    .filter((row) => !row.entry.pokedex_requirement_id || !row.entry.wanted)
    .map((row) => row.entry.id));
  const allDisplayedSelected = computed(() =>
    displayedEntryIds.value.length > 0
    && displayedEntryIds.value.every((entryId) => selectedEntryIds.value.has(entryId))
  );
  const someDisplayedSelected = computed(() =>
    displayedEntryIds.value.some((entryId) => selectedEntryIds.value.has(entryId))
  );

  watch(collectionTab, () => {
    selectedEntryIds.value = new Set();
    selectedLanguageId.value = null;
    onlyNonFitting.value = false;
    visibleRowCount.value = collectionRowStep;
  });
  watch([search, selectedLanguageId, onlyNonFitting, selectedSort], () => {
    visibleRowCount.value = collectionRowStep;
  });
  watch([folderId, search, collectionTab, selectedLanguageId, onlyNonFitting, selectedSort], () => {
    store.commit('set_collection_folder_filters', {
      folder_id: folderId.value,
      filters: {
        search: search.value,
        tab: collectionTab.value,
        language_id: selectedLanguageId.value,
        only_non_fitting: onlyNonFitting.value,
        sort: selectedSort.value
      } satisfies CollectionFolderFilters
    });
  }, { immediate: true });

  const toggleSelectionMode = (): void => {
    selectionMode.value = !selectionMode.value;
    if (!selectionMode.value) selectedEntryIds.value = new Set();
  };

  const toggleEntrySelection = (entry: CollectionEntry): void => {
    if (entry.wanted && entry.pokedex_requirement_id) return;
    const next = new Set(selectedEntryIds.value);
    next.has(entry.id) ? next.delete(entry.id) : next.add(entry.id);
    selectedEntryIds.value = next;
  };

  const toggleSelectAllDisplayed = (): void => {
    const next = new Set(selectedEntryIds.value);
    if (allDisplayedSelected.value) {
      displayedEntryIds.value.forEach((entryId) => next.delete(entryId));
    } else {
      displayedEntryIds.value.forEach((entryId) => next.add(entryId));
    }
    selectedEntryIds.value = next;
  };

  const openTransferDialog = (): void => {
    transferFolderId.value = destinationFolders.value[0]?.id ?? '';
    transferQuantities.value = Object.fromEntries(
      selectedTransferRows.value.map((row) => [row.entry.id, 1])
    );
    transferPokedexRequirements.value = {};
    showTransferDialog.value = true;
  };

  const transferPokedexOptionsByEntry = computed<Record<string, Array<{ label: string; value: string; }>>>(() => Object.fromEntries(
    selectedTransferRows.value.map((row) => [row.entry.id, collectionStore.matchingPokedexRequirements({
      folder_id: transferFolderId.value,
      set_id: row.entry.set_id,
      card_id: row.entry.card_id,
      variant_id: row.entry.variant_id,
      language_id: row.entry.language_id
    })])
  ));
  const transferPokedexOptions = (row: CollectionRow): Array<{ label: string; value: string; }> =>
    transferPokedexOptionsByEntry.value[row.entry.id] ?? [];

  const missingTransferPokedexChoices = computed(() => selectedTransferRows.value.some((row) =>
    transferPokedexOptions(row).length > 1 && !transferPokedexRequirements.value[row.entry.id]
  ));

  const changeTransferQuantity = (entryId: string, change: number, maximum: number): void => {
    const current = transferQuantities.value[entryId] ?? 1;
    transferQuantities.value[entryId] = Math.min(maximum, Math.max(1, current + change));
  };

  const confirmBulkTransfer = (): void => {
    if (!transferFolderId.value) return;
    collectionStore.transferEntryQuantities(
      selectedTransferRows.value.map((row) => ({
        entryId: row.entry.id,
        quantity: Math.min(
          row.entry.quantity,
          Math.max(1, Math.floor(Number(transferQuantities.value[row.entry.id]) || 1))
        ),
        pokedex_requirement_id: transferPokedexRequirements.value[row.entry.id]
          || (transferPokedexOptions(row).length === 1 ? transferPokedexOptions(row)[0].value : undefined)
      })),
      transferFolderId.value
    );
    selectedEntryIds.value = new Set();
    selectionMode.value = false;
    showTransferDialog.value = false;
    transferFolderId.value = '';
    transferQuantities.value = {};
    transferPokedexRequirements.value = {};
  };

  const openBulkEditDialog = (): void => {
    const selectedEntries = collectionStore.entries.value.filter((entry) => selectedEntryIds.value.has(entry.id));
    const selectedLanguages = new Set(selectedEntries.map((entry) => entry.language_id));
    bulkEditLanguageId.value = selectedLanguages.size === 1 ? selectedEntries[0]?.language_id ?? '' : '';
    showBulkEditDialog.value = true;
  };

  const confirmBulkEdit = (): void => {
    if (!bulkEditLanguageId.value) return;
    collectionStore.updateEntriesLanguage([...selectedEntryIds.value], bulkEditLanguageId.value);
    selectedEntryIds.value = new Set();
    selectionMode.value = false;
    showBulkEditDialog.value = false;
    bulkEditLanguageId.value = '';
  };

  const confirmBulkDelete = (): void => {
    for (const entryId of selectedEntryIds.value) {
      collectionStore.removeEntry(entryId);
    }
    selectedEntryIds.value = new Set();
    selectionMode.value = false;
    showBulkDeleteDialog.value = false;
  };

  const openEditEntry = (row: CollectionRow): void => {
    editingEntry.value = row;
    editQuantity.value = row.entry.quantity;
    editLanguageId.value = row.entry.language_id;
    editStrongLanguage.value = row.entry.strong_language === true;
    editCondition.value = row.entry.condition;
    editFolderId.value = row.entry.folder_id;
    editVariantId.value = row.entry.variant_id;
    editManualImageFile.value = null;
    editManualImageDataUrl.value = null;
    editSaveError.value = null;
    const manualCard = row.entry.set_id === 'manual-collection'
      ? collectionStore.manualCards.value.find((card) => card.id === row.entry.card_id)
      : null;
    if (manualCard) {
      editManualName.value = manualCard.name;
      editManualSetName.value = manualCard.set_name;
      editManualNumber.value = manualCard.number;
      editManualCategory.value = manualCard.category;
      editManualRarity.value = manualCard.rarity;
      editManualPokemonName.value = manualCard.pokemon_name;
      editManualHp.value = manualCard.hp;
      editManualTypes.value = manualCard.types.join(', ');
      editManualIllustrator.value = manualCard.illustrator;
      editManualNotes.value = manualCard.notes;
      editManualValue.value = manualCard.estimated_value;
      editManualReleaseDate.value = manualCard.release_date ? formatFrenchDate(manualCard.release_date) : '';
      const image = manualImageStore.find('manual-collection', manualCard.id, row.entry.variant_id, row.entry.language_id);
      editManualImagePreview.value = image ? `${image.url}?v=${encodeURIComponent(image.updated_at)}` : null;
    }
    showEditDialog.value = true;
  };

  const prepareEditManualImage = (file: File | null): void => {
    editManualImageDataUrl.value = null;
    editSaveError.value = null;
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 15_000_000) {
      editSaveError.value = 'Choose a JPEG, PNG, or WebP image smaller than 15 MB.';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      editManualImageDataUrl.value = typeof reader.result === 'string' ? reader.result : null;
      editManualImagePreview.value = editManualImageDataUrl.value;
    };
    reader.onerror = () => { editSaveError.value = 'Unable to read the image.'; };
    reader.readAsDataURL(file);
  };

  const openEditEntryById = (entry: CollectionEntry): void => {
    const row = collectionRows.value.find((candidate) => candidate.entry.id === entry.id);
    if (row) openEditEntry(row);
  };

  const setEntryToDelete = (entry: CollectionEntry): void => {
    entryToDelete.value = collectionRows.value.find((candidate) => candidate.entry.id === entry.id) ?? null;
  };

  const openCard = (card: DisplayCard): void => {
    if (card.set_id === 'pokedex-requirement') return;
    if (card.is_manual) {
      const row = collectionRows.value.find((candidate) => candidate.entry.card_id === card.card_id);
      if (row) openEditEntry(row);
      return;
    }
    void router.push({
      path: `/set/${card.set_id}/card/${card.card_id}`,
      query: { variant: card.variant_id, from: 'collection', folder: folderId.value }
    });
  };

  const saveEntry = async (): Promise<void> => {
    if (!editingEntry.value || editQuantity.value < 1 || !editLanguageId.value || !editFolderId.value) return;
    const entry = editingEntry.value.entry;
    const manualCard = editingManualCard.value;
    if (manualCard) {
      if (!editManualName.value.trim()) return;
      const parsedReleaseDate = parseFrenchDate(editManualReleaseDate.value);
      if (editManualReleaseDate.value && !parsedReleaseDate) {
        editSaveError.value = 'Release date must use DD-MM-YYYY and be a valid date.';
        return;
      }
      collectionStore.updateManualCard(manualCard.id, {
        name: editManualName.value,
        set_name: editManualSetName.value,
        number: editManualNumber.value,
        category: editManualCategory.value,
        rarity: editManualRarity.value,
        pokemon_name: editManualPokemonName.value,
        hp: editManualHp.value,
        types: editManualTypes.value.split(','),
        illustrator: editManualIllustrator.value,
        notes: editManualNotes.value,
        estimated_value: editManualValue.value,
        release_date: parsedReleaseDate
      });
      entry.variant_id = editVariantId.value.trim() || 'normal';
      if (editManualImageDataUrl.value) {
        try {
          await manualImageStore.upload({
            set_id: 'manual-collection',
            card_id: manualCard.id,
            variant_id: entry.variant_id,
            language_id: editLanguageId.value,
            data_url: editManualImageDataUrl.value
          });
        } catch (error) {
          editSaveError.value = error instanceof Error ? error.message : String(error);
          return;
        }
      }
    }
    collectionStore.updateEntry(entry.id, {
      folder_id: editFolderId.value,
      language_id: editLanguageId.value,
      condition: editCondition.value,
      quantity: editQuantity.value,
      strong_language: editStrongLanguage.value
    });
    showEditDialog.value = false;
    editingEntry.value = null;
  };

  const confirmRemoveEntry = (): void => {
    if (entryToDelete.value) collectionStore.removeEntry(entryToDelete.value.entry.id);
    entryToDelete.value = null;
  };

  const printWantedPlaceholders = async (): Promise<void> => {
    if (!folder.value || wantedRows.value.length === 0) return;
    generatingPlaceholders.value = true;
    placeholderError.value = null;
    try {
      await downloadWantedPlaceholdersPdf(
        folder.value.name,
        wantedRows.value.map((row) => ({ card: row.card, quantity: row.entry.quantity }))
      );
    } catch (error) {
      placeholderError.value = error instanceof Error ? error.message : String(error);
    } finally {
      generatingPlaceholders.value = false;
    }
  };
</script>
