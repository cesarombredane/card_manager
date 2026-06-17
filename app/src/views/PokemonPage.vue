<template>
  <q-page class="bg-dark text-white q-pa-md q-pa-lg-md">
    <div class="column q-gutter-lg">
      <page-header title="Pokemon" eyebrow="Browse" description="Browse Pokemon card concepts by canonical name." />
      <q-input v-model="q" dark outlined label="Search Pokemon" @keyup.enter="load"><template #append><q-btn flat dense round icon="search" :loading="loading"
            @click="load" /></template></q-input>
      <result-list :items="results"><template #default="{ item }"><router-link class="text-primary text-subtitle1"
            :to="`/pokemon/${encodeURIComponent(String(item.name ?? ''))}`">{{
              item.name }}</router-link>
          <div class="text-caption text-grey-5">{{ item.concept_count }} concepts</div>
        </template></result-list>
    </div>
  </q-page>
</template>

<script setup lang="ts">
  import { onMounted, ref } from 'vue';
  import { apiGet, type ApiRecord } from '../api/client';
  import PageHeader from '../components/PageHeader.vue';
  import ResultList from '../components/ResultList.vue';
  const q = ref('');
  const results = ref<ApiRecord[]>([]);
  const loading = ref(false);
  async function load() {
    loading.value = true;
    try { results.value = (await apiGet<{ results: ApiRecord[]; }>('/api/pokemon', { q: q.value, limit: 10 })).results ?? []; } finally { loading.value = false; }
  }

  onMounted(load);
</script>
