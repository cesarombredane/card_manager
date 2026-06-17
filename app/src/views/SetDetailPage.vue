<template>
  <q-page class="bg-dark text-white q-pa-md q-pa-lg-md">
    <q-inner-loading :showing="loading" />
    <q-banner v-if="error" class="bg-negative text-white">{{ error }}</q-banner>
    <div v-if="data" class="column q-gutter-lg">
      <page-header :title="data.set.name" eyebrow="Set" :description="`${data.set.region.id} · ${data.set.language_codes.join(', ')}`" />
      <q-card v-if="data.set.based_on_sets?.length" flat bordered class="bg-grey-10">
        <q-card-section>
          <div class="text-caption text-grey-5">Based on</div>
          <div>{{ basedOnSetsLabel }}</div>
        </q-card-section>
      </q-card>
      <q-card flat bordered class="bg-grey-10"><q-card-section>{{ data.stats }}</q-card-section></q-card>
      <result-list :items="cards" empty-title="No prints in this set">
        <template #default="{ item }">
          <router-link class="text-primary" :to="`/card-prints/${item.id}`">{{ item.printed_name }}</router-link>
          <div class="text-caption text-grey-5">{{ item.card_number }} · {{ item.rarity }}</div>
        </template>
      </result-list>
    </div>
  </q-page>
</template>

<script setup lang="ts">
  import { computed } from 'vue';
  import { useRoute } from 'vue-router';
  import { apiGet } from '../api/client';
  import PageHeader from '../components/PageHeader.vue';
  import ResultList from '../components/ResultList.vue';
  import { useApiResource } from '../composables/useApiResource';

  const route = useRoute();
  const { data, loading, error } = useApiResource(() => apiGet(`/api/sets/${route.params.id}`));
  const cards = computed(() => data.value?.cards ?? []);
  const basedOnSetsLabel = computed(() => (data.value?.set?.based_on_sets ?? []).map((set: { id: string; name: string }) => `${set.name} (${set.id})`).join(', '));
</script>
