<template>
  <section class="row q-col-gutter-md">
    <div v-for="card in cards" :key="card.id" class="col-6 col-sm-4 col-md-3 col-lg-2">
      <card-list-item :card="card" @click="$emit('card-click', $event)" @add-to-collection="openCollectionDialog" />
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

  defineProps<{ cards: DisplayCard[] }>();
  defineEmits<{ 'card-click': [card: DisplayCard] }>();

  const selectedCard = ref<DisplayCard | null>(null);
  const showCollectionDialog = ref(false);

  const openCollectionDialog = (card: DisplayCard): void => {
    selectedCard.value = card;
    showCollectionDialog.value = true;
  };
</script>
