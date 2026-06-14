<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { apiGet } from '../api/client';
import PageHeader from '../components/PageHeader.vue';
import ResultList from '../components/ResultList.vue';
import { useApiResource } from '../composables/useApiResource';
const route = useRoute();
const { data, loading, error } = useApiResource(() => apiGet(`/api/series/${route.params.id}`));
const sets = computed(() => data.value?.sets ?? []);
</script>
<template>
  <q-page class="bg-dark text-white q-pa-md q-pa-lg-md">
    <q-inner-loading :showing="loading" />
    <q-banner v-if="error" class="bg-negative text-white">{{ error }}</q-banner>
    <div v-if="data" class="column q-gutter-lg">
      <page-header :title="data.series.name" eyebrow="Series" :description="`${data.series.language.code} · ${data.series.region.code}`" />
      <result-list :items="sets"><template #default="{ item }"><router-link class="text-primary" :to="`/sets/${item.id}`">{{ item.name }}</router-link><div class="text-caption text-grey-5">{{ item.set_code }} · {{ item.release_date }}</div></template></result-list>
    </div>
  </q-page>
</template>
