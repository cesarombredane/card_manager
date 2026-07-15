<template>
  <section class="row q-col-gutter-md">
    <div v-for="card in cards" :key="card.id" class="col-6 col-sm-4 col-md-3 col-lg-2">
      <card-list-item :card="card" @click="$emit('card-click', $event)" />
    </div>
  </section>
</template>

<script setup lang="ts">
  import CardListItem from './CardListItem.vue';
  import type { DisplayCard } from '../utils/cardDisplay';

  defineProps<{ cards: DisplayCard[] }>();
  defineEmits<{ 'card-click': [card: DisplayCard] }>();
</script>
