<template>
  <q-page class="bg-dark text-white q-pa-md q-pa-lg-md">
    <q-inner-loading :showing="loading" />
    <q-banner v-if="error" class="bg-negative text-white">{{ error }}</q-banner>
    <div class="column q-gutter-lg">
      <page-header title="Languages" eyebrow="Coverage" description="Official active and former Pokémon TCG print languages." />
      <result-list :items="languages"><template #default="{ item }"><router-link class="text-primary text-subtitle1" :to="`/languages/${item.code}`">{{ item.name
      }}</router-link>
          <div class="text-caption text-grey-5">{{ item.code }} · {{ item.status }} · {{ item.set_count }} sets · {{ item.print_count }} prints</div>
        </template></result-list>
    </div>
  </q-page>
</template>

<script setup>
  import { computed } from 'vue';
  import { apiGet } from '../api/client';
  import PageHeader from '../components/PageHeader.vue';
  import ResultList from '../components/ResultList.vue';
  import { useApiResource } from '../composables/useApiResource';
  const { data, loading, error } = useApiResource(() => apiGet('/api/languages'));
  const languages = computed(() => data.value?.languages ?? []);
</script>
