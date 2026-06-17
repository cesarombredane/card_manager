<template>
  <q-page class="bg-dark text-white">
    <section class="q-pa-md q-pa-lg-xl">
      <div class="home-shell column justify-center">
        <div class="text-overline text-primary">Pokemon Card Manager</div>
        <h1 class="text-h3 text-weight-bold q-my-md">Manage your Pokemon card collection</h1>
        <p class="text-body1 text-grey-4 description">
          A personal web app designed to organize Pokemon TCG data, browse sets and cards, and help track a collection in a clear, rebuildable way.
        </p>
        <p class="text-body2 text-grey-5 q-mt-lg">
          Created by Cesar Ombredane.
        </p>
      </div>
    </section>
  </q-page>
</template>

<script setup lang="ts">

</script>

<style scoped>
  .home-shell {
    min-height: calc(100vh - 98px);
    max-width: 760px;
  }

  .description {
    max-width: 620px;
    line-height: 1.7;
  }
</style>
