<template>
  <q-page class="bg-dark text-white q-pa-md q-pa-lg-md">
    <q-inner-loading :showing="loading" />
    <q-banner v-if="error" class="bg-negative text-white">{{ error }}</q-banner>
    <div v-if="data" class="column q-gutter-lg">
      <page-header :title="data.artist" eyebrow="Artist" />
      <result-list :items="concepts">
        <template #default="{ item }">
          <router-link class="text-primary" :to="`/card-concepts/${item.id}`">
            {{ item.canonical_name }}
          </router-link>
          <div class="text-caption text-grey-5">
            {{ item.card_category }}
          </div>
        </template>
      </result-list>
    </div>
  </q-page>
</template>

<script setup lang="ts">
  // imports hooks //
  import { useRoute } from 'vue-router';
  import { computed } from 'vue';

  // import components //
  import PageHeader from '../components/PageHeader.vue';
  import ResultList from '../components/ResultList.vue';

  // import utils //
  import { useApiResource } from '../composables/useApiResource';
  import { apiGet, type ApiRecord } from '../api/client';


  // hooks //
  const route = useRoute();


  // computed vars //
  const artistName = computed<string>(() => String(route.params.name ?? ''));
  const concepts = computed<ApiRecord[]>(() => data.value?.concepts ?? []);


  // api call //
  const { data, loading, error } = useApiResource(() => apiGet(`/api/artists/${encodeURIComponent(artistName.value)}`));
</script>
