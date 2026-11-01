<template>
  <q-header bordered class="app_header">
    <q-toolbar class="page_content">
      <q-toolbar-title class="text-weight-bold">
        <router-link to="/" class="text-white">{{ app_config.title }}</router-link>
      </q-toolbar-title>
      <nav aria-label="Main navigation" class="row no-wrap q-gutter-xs">
        <q-btn
          flat
          no-caps
          round
          dense
          icon="inventory_2"
          aria-label="My collection"
          to="/collection"
        >
          <q-tooltip :delay="1000">Open your collection dashboard</q-tooltip>
        </q-btn>
        <q-btn flat no-caps round dense icon="analytics" aria-label="Data coverage" to="/coverage">
          <q-tooltip :delay="1000">Inspect catalog and image coverage</q-tooltip>
        </q-btn>
      </nav>
    </q-toolbar>
  </q-header>
</template>
<script setup lang="ts">
  // import utils
  import { app_config } from '../../app_config';
</script>
