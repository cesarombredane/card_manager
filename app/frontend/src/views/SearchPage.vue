<script setup>
import { ref } from 'vue';

import { apiGet } from '../api/client';
import PageHeader from '../components/PageHeader.vue';
import ResultList from '../components/ResultList.vue';

const query = ref('');
const type = ref('all');
const loading = ref(false);
const error = ref('');
const results = ref(null);
const types = ['all', 'cards', 'concepts', 'prints', 'sets', 'series', 'artists'];

async function search() {
  loading.value = true;
  error.value = '';
  try {
    results.value = await apiGet('/api/search', { q: query.value, type: type.value, limit: 20 });
  } catch (requestError) {
    error.value = requestError.message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <q-page class="bg-dark text-white q-pa-md q-pa-lg-md">
    <div class="column q-gutter-lg">
      <page-header title="Search" eyebrow="Database" description="Search across concepts, prints, sets, series, and artists." />

      <q-card flat bordered class="bg-grey-10">
        <q-card-section class="row q-col-gutter-md">
          <div class="col-12 col-md-8">
            <q-input v-model="query" dark outlined label="Search" debounce="250" @keyup.enter="search" />
          </div>
          <div class="col-12 col-md-2">
            <q-select v-model="type" dark outlined :options="types" label="Type" />
          </div>
          <div class="col-12 col-md-2">
            <q-btn color="primary" class="full-width full-height" label="Search" no-caps :loading="loading" @click="search" />
          </div>
        </q-card-section>
      </q-card>

      <q-banner v-if="error" class="bg-negative text-white">{{ error }}</q-banner>

      <div v-if="results" class="column q-gutter-md">
        <q-expansion-item v-for="(items, group) in results" :key="group" default-open class="bg-grey-10 text-white" :label="group" :caption="`${items.length} results`">
          <result-list :items="items">
            <template #default="{ item }">
              <div class="text-subtitle1">{{ item.canonical_name || item.printed_name || item.name || item.artist }}</div>
              <div class="text-caption text-grey-5">{{ item.id || item.set_code || item.language }}</div>
            </template>
          </result-list>
        </q-expansion-item>
      </div>
    </div>
  </q-page>
</template>
