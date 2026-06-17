<template>
  <q-page class="bg-dark text-white q-pa-md q-pa-lg-md">
    <q-inner-loading :showing="loading" />
    <q-banner v-if="error" class="bg-negative text-white">{{ error }}</q-banner>
    <div class="column q-gutter-lg">
      <page-header title="Languages" eyebrow="Coverage" description="Languages used by the current fake print regions." />
      <result-list :items="languages"><template #default="{ item }"><router-link class="text-primary text-subtitle1" :to="`/languages/${item.id}`">{{ item.name
      }}</router-link>
          <div class="text-caption text-grey-5">{{ item.id }} · {{ item.region_codes.join(', ') }} · {{ item.set_count }} sets</div>
        </template></result-list>
    </div>
  </q-page>
</template>

<script setup lang="ts">
  import { computed } from 'vue';
  import { apiGet } from '../api/client';
  import PageHeader from '../components/PageHeader.vue';
  import ResultList from '../components/ResultList.vue';
  import { useApiResource } from '../composables/useApiResource';
  const { data, loading, error } = useApiResource(() => apiGet('/api/languages'));
  const languages = computed(() => data.value?.languages ?? []);
</script>
