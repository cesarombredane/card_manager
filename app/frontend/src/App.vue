<script setup>
const links = [
  { label: 'Search', to: '/search' },
  { label: 'Cards', to: '/cards' },
  { label: 'Sets', to: '/sets' },
  { label: 'Series', to: '/series' },
  { label: 'Languages', to: '/languages' },
  { label: 'Artists', to: '/artists' },
  { label: 'Pokemon', to: '/pokemon' },
  { label: 'Compare', to: '/compare' }
];
</script>

<template>
  <q-layout view="hHh lpR fFf" class="bg-dark text-white">
    <q-header elevated class="bg-grey-10 text-white">
      <q-toolbar>
        <q-toolbar-title>
          <router-link to="/" class="text-white">Card Manager</router-link>
        </q-toolbar-title>
        <q-btn
          v-for="link in links"
          :key="link.to"
          flat
          dense
          no-caps
          :label="link.label"
          :to="link.to"
          class="gt-sm"
        />
        <q-btn-dropdown flat dense icon="menu" class="lt-md">
          <q-list class="bg-grey-10 text-white">
            <q-item v-for="link in links" :key="link.to" clickable v-close-popup :to="link.to">
              <q-item-section>{{ link.label }}</q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>
