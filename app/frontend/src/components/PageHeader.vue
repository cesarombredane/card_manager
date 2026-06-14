<template>
  <div class="row items-start justify-between q-gutter-md">
    <div>
      <div v-if="eyebrow" class="text-overline text-primary">{{ eyebrow }}</div>
      <h1 class="text-h4 text-weight-bold q-my-xs">{{ title }}</h1>
      <p v-if="description" class="text-body1 text-grey-4 q-ma-none">{{ description }}</p>
    </div>
    <slot name="actions" />
  </div>
</template>

<script setup>
  defineProps({
    eyebrow: String,
    title: {
      type: String,
      required: true
    },
    description: String
  });
</script>
