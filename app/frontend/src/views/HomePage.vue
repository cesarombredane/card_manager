<script setup>
import { computed, onMounted } from 'vue';
import { useStore } from 'vuex';

const store = useStore();

const apiStatus = computed(() => store.state.apiStatus);
const statusColor = computed(() => (apiStatus.value === 'ok' ? 'positive' : 'warning'));
const sections = [
  { title: 'Global search', caption: 'Search concepts, prints, sets, series, and artists.', icon: 'search', to: '/search' },
  { title: 'Advanced cards', caption: 'Filter by language, print, variant, artist, release date, and more.', icon: 'tune', to: '/cards' },
  { title: 'Sets', caption: 'Browse language-specific sets and relationships.', icon: 'folder', to: '/sets' },
  { title: 'Languages', caption: 'Check coverage across official print languages.', icon: 'translate', to: '/languages' },
  { title: 'Artists', caption: 'Explore artists and their illustrated cards.', icon: 'brush', to: '/artists' },
  { title: 'Pokemon', caption: 'Browse Pokemon by concept names in the catalog.', icon: 'catching_pokemon', to: '/pokemon' }
];

  onMounted(() => {
    store.dispatch('checkApiStatus');
  });
</script>

<template>
  <q-page class="bg-dark text-white q-pa-md q-pa-lg-md">
    <div class="column q-gutter-lg">
      <section class="row items-center justify-between q-gutter-md">
        <div>
          <div class="text-overline text-primary">Pokemon card collection</div>
          <h1 class="text-h3 text-weight-bold q-my-sm">Card Manager</h1>
          <p class="text-body1 text-grey-4 q-ma-none">
            Track the card catalog and manage your personal collection from one place.
          </p>
        </div>

        <q-chip square :color="statusColor" text-color="white" icon="dns">
          API {{ apiStatus }}
        </q-chip>
      </section>

      <section class="row q-col-gutter-md">
        <div v-for="section in sections" :key="section.to" class="col-12 col-md-6 col-lg-4">
          <q-card flat bordered class="bg-grey-10 text-white">
            <q-card-section>
              <div class="row items-center q-gutter-sm">
                <q-icon :name="section.icon" color="primary" size="md" />
                <div class="text-h6">{{ section.title }}</div>
              </div>
              <p class="text-grey-4">{{ section.caption }}</p>
              <q-btn color="primary" flat no-caps :to="section.to" label="Open" />
            </q-card-section>
          </q-card>
        </div>
      </section>
    </div>
  </q-page>
</template>
