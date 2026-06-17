<template>
  <q-page class="bg-dark text-white q-pa-md q-pa-lg-md">
    <div class="column q-gutter-lg">
      <page-header title="Sets" eyebrow="Browse" description="Region-specific sets with their printed languages." />
      <q-input v-model="q" dark outlined label="Search sets" @keyup.enter="load">
        <template #append><q-btn flat dense round icon="search" :loading="loading" @click="load" /></template>
      </q-input>
      <result-list :items="results">
        <template #default="{ item }">
          <router-link class="text-primary text-subtitle1" :to="`/sets/${item.id}`">{{ item.name }}</router-link>
          <div class="text-caption text-grey-5">{{ item.id }} · {{ item.region_code }} · {{ item.language_codes.join(', ') }} · {{ item.release_date }}</div>
        </template>
      </result-list>
    </div>
  </q-page>
</template>

<script setup lang="ts">
  import { onMounted, ref } from 'vue';
  import { apiGet } from '../api/client';
  import PageHeader from '../components/PageHeader.vue';
  import ResultList from '../components/ResultList.vue';

  const q = ref('');
  const results = ref([]);
  const loading = ref(false);

  async function load() {
    loading.value = true;
    try {
      results.value = (await apiGet('/api/sets', { q: q.value, limit: 10 })).results ?? [];
    } finally {
      loading.value = false;
    }
  }

  onMounted(load);
</script>
