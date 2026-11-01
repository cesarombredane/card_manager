<template>
  <q-btn
    v-show="visible"
    class="fixed-bottom-right q-ma-lg z-top"
    round
    color="primary"
    text-color="dark"
    icon="arrow_upward"
    aria-label="Return to top"
    no-caps
    @click="scroll_to_top"
  >
    <q-tooltip :delay="1000">Return to top</q-tooltip>
  </q-btn>
</template>

<script setup lang="ts">
  // import hooks
  import { onBeforeUnmount, onMounted, ref } from 'vue';

  /* reactive vars */
  const visible = ref<boolean>(false);

  /* functions */
  const update_visibility = (): void => {
    visible.value = window.scrollY > 200;
  };

  const scroll_to_top = (): void => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* watchers */
  onMounted(() => {
    update_visibility();
    window.addEventListener('scroll', update_visibility, { passive: true });
  });

  onBeforeUnmount(() => {
    window.removeEventListener('scroll', update_visibility);
  });
</script>
