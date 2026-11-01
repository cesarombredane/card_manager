<template>
  <div class="empty_state text-center q-pa-xl">
    <q-icon v-if="icon" :name="icon" size="36px" color="secondary" class="q-mb-md" />
    <h2 class="text-h6 q-my-sm">{{ title }}</h2>
    <p class="text_secondary q-mb-lg">{{ description }}</p>
    <slot />
  </div>
</template>

<script setup lang="ts">
  /* initialization */
  defineProps<{
    title: string;
    description: string;
    icon?: string;
  }>();
</script>
