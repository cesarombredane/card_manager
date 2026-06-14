<template>
  <q-page class="bg-dark text-white q-pa-md q-pa-lg-md">
    <div class="column q-gutter-lg">
      <page-header title="Compare concepts" eyebrow="Compare" description="Paste comma-separated concept UUIDs." />
      <q-input v-model="ids" dark outlined label="Concept IDs" @keyup.enter="compare"><template #append><q-btn flat dense round icon="compare_arrows"
            @click="compare" /></template></q-input>
      <result-list :items="concepts"><template #default="{ item }">
          <div class="text-subtitle1">{{ item.canonical_name }}</div>
          <div class="text-caption text-grey-5">{{ item.print_count }} prints · {{ item.variant_count }} variants</div>
        </template></result-list>
    </div>
  </q-page>
</template>

<script setup>
  import { ref } from 'vue';
  import { apiGet } from '../api/client';
  import PageHeader from '../components/PageHeader.vue';
  import ResultList from '../components/ResultList.vue';
  const ids = ref('');
  const concepts = ref([]);
  async function compare() {
    concepts.value = (await apiGet('/api/compare/concepts', { ids: ids.value })).concepts ?? [];
  }
</script>
