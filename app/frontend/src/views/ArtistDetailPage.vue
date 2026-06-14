<template>
  <q-page class="bg-dark text-white q-pa-md q-pa-lg-md">
    <q-inner-loading :showing="loading" />
    <q-banner v-if="error" class="bg-negative text-white">{{ error }}</q-banner>
    <div v-if="data" class="column q-gutter-lg">
      <page-header :title="data.artist" eyebrow="Artist" />
      <result-list :items="concepts"><template #default="{ item }"><router-link class="text-primary" :to="`/card-concepts/${item.id}`">{{ item.canonical_name
            }}</router-link>
          <div class="text-caption text-grey-5">{{ item.card_category }}</div>
        </template></result-list>
    </div>
  </q-page>
</template>

<script setup>
  import { computed } from 'vue';
  import { useRoute } from 'vue-router';
  import { apiGet } from '../api/client';
  import PageHeader from '../components/PageHeader.vue';
  import ResultList from '../components/ResultList.vue';
  import { useApiResource } from '../composables/useApiResource';
  const route = useRoute();
  const artistName = computed(() => route.params.name);
  const { data, loading, error } = useApiResource(() => apiGet(`/api/artists/${encodeURIComponent(artistName.value)}`));
  const concepts = computed(() => data.value?.concepts ?? []);
</script>
