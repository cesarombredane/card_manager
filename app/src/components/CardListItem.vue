<template>
  <q-card flat bordered class="bg-grey-10 text-white no-wrap cursor-pointer q-pa-none" @click="$emit('click', card)">
    <q-responsive :ratio="cardImageRatio" class="bg-grey-9">
      <q-img v-if="card.image_url" :src="card.image_url" fit="contain" class="full-height">
        <template #error>
          <div class="column items-center justify-center full-height full-width text-grey-5">
            <q-icon name="image" size="28px" />
          </div>
        </template>
      </q-img>
      <div v-else class="column items-center justify-center full-height full-width text-grey-5">
        <q-icon name="image" size="28px" />
      </div>
    </q-responsive>

    <q-card-section class="q-pa-xs column overflow-hidden no-wrap">
      <div class="text-caption text-grey-5 ellipsis overflow-hidden text-no-wrap">
        <template v-if="card.set_name">{{ card.set_name }} · </template>#{{ card.number }}
      </div>
      <div class="text-caption text-weight-bold ellipsis overflow-hidden text-no-wrap">
        {{ card.display_name }}
      </div>
      <div class="text-caption text-grey-4 ellipsis overflow-hidden text-no-wrap">
        {{ formatCardValue(card.rarity) }}
      </div>
      <div class="text-caption text-grey-5 ellipsis overflow-hidden text-no-wrap">
        <span v-if="card.types.length">{{ card.types.join(', ') }}</span>
        <span v-else-if="card.pokemon_names.length">{{ card.pokemon_names.join(', ') }}</span>
        <span v-else>No energy type</span>
      </div>
      <div class="text-caption text-grey-5 ellipsis overflow-hidden text-no-wrap">
        <span v-if="card.hp">{{ card.hp }} HP · </span>{{ card.illustrator ?? 'Unknown illustrator' }}
      </div>
      <div class="row no-wrap q-gutter-xs q-mt-auto overflow-hidden">
        <q-badge color="grey-9" text-color="white" class="ellipsis overflow-hidden text-no-wrap">
          {{ card.category }}
        </q-badge>
        <q-badge v-if="card.variant_id !== 'normal'" color="grey-9" text-color="white" class="ellipsis overflow-hidden text-no-wrap">
          {{ formatCardValue(card.variant_id) }}
        </q-badge>
        <q-badge v-for="energy in card.energy_costs" :key="energy" color="grey-9" text-color="white" class="ellipsis overflow-hidden text-no-wrap">
          {{ energy }}
        </q-badge>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
  import { cardImageRatio, formatCardValue } from '../utils/cardDisplay';
  import type { DisplayCard } from '../utils/cardDisplay';

  defineProps<{ card: DisplayCard }>();
  defineEmits<{ click: [card: DisplayCard] }>();
</script>
