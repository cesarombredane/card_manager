<template>
  <q-btn
    v-show="visible"
    class="fixed-bottom-right q-ma-lg z-top"
    round
    color="primary"
    text-color="grey-10"
    icon="arrow_upward"
    aria-label="Return to top"
    @click="scrollToTop"
  >
    <q-tooltip>Return to top</q-tooltip>
  </q-btn>
</template>

<script setup lang="ts">
  import { onBeforeUnmount, onMounted, ref } from 'vue';

  const visible = ref(false);

  const updateVisibility = (): void => {
    visible.value = window.scrollY > 200;
  };

  const scrollToTop = (): void => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  onMounted(() => {
    updateVisibility();
    window.addEventListener('scroll', updateVisibility, { passive: true });
  });

  onBeforeUnmount(() => {
    window.removeEventListener('scroll', updateVisibility);
  });
</script>
