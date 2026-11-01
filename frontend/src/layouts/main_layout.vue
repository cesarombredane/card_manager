<template>
  <q-layout view="hHh lpR fFf">
    <a class="skip_link" href="#main_content">Skip to content</a>
    <app-header />

    <q-page-container>
      <router-view v-slot="{ Component }">
        <component :is="Component" id="main_content" tabindex="-1" />
      </router-view>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
  // import components
  import AppHeader from '../components/common/app_header.vue';
</script>
