<template>
  <section class="row q-col-gutter-md">
    <div v-for="(card, index) in cards" :key="collectionEntries[index]?.id ?? card.id" class="col-6 col-sm-4 col-md-3 col-lg-2">
      <card-list-item
        :card="card"
        :collection-entry="collectionEntries[index]"
        @click="$emit('card-click', $event)"
        @add-to-collection="openCollectionDialog"
        @edit-entry="$emit('edit-entry', $event)"
        @delete-entry="$emit('delete-entry', $event)"
      />
    </div>
  </section>

  <add-to-collection-dialog
    v-if="selectedCard"
    v-model="showCollectionDialog"
    :set-id="selectedCard.set_id"
    :card-id="selectedCard.card_id"
    :variant-id="selectedCard.variant_id"
    :language-id="selectedCard.language_id"
    :card-name="selectedCard.display_name"
  />
</template>

<script setup lang="ts">
  import { ref } from 'vue';
  import AddToCollectionDialog from './AddToCollectionDialog.vue';
  import CardListItem from './CardListItem.vue';
  import type { DisplayCard } from '../utils/cardDisplay';
  import type { CollectionEntry } from '../utils/collection';

  withDefaults(defineProps<{
    cards: DisplayCard[];
    collectionEntries?: CollectionEntry[];
  }>(), {
    collectionEntries: () => []
  });
  defineEmits<{
    'card-click': [card: DisplayCard];
    'edit-entry': [entry: CollectionEntry];
    'delete-entry': [entry: CollectionEntry];
  }>();

  const selectedCard = ref<DisplayCard | null>(null);
  const showCollectionDialog = ref(false);

  const openCollectionDialog = (card: DisplayCard): void => {
    selectedCard.value = card;
    showCollectionDialog.value = true;
  };
</script>
