<template>
  <q-card flat bordered class="bg-grey-10 text-grey-4">
    <q-card-section class="column items-center text-center q-gutter-sm">
      <q-icon name="search_off" size="40px" color="grey-6" />
      <div class="text-subtitle1 text-white">{{ title }}</div>
      <div class="text-body2">{{ message }}</div>
    </q-card-section>
  </q-card>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    default: 'No results'
  },
  message: {
    type: String,
    default: 'Try another search or add data to the database context.'
  }
});
</script>
