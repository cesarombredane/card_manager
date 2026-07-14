<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated class="bg-grey-10 text-white">
      <q-toolbar>
        <q-toolbar-title>
          <router-link to="/" class="text-white">Card Manager</router-link>
        </q-toolbar-title>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>
