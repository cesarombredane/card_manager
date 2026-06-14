<script setup>
  import { computed, onMounted } from 'vue';
  import { useStore } from 'vuex';

  const store = useStore();

  const apiStatus = computed(() => store.state.apiStatus);
  const statusColor = computed(() => (apiStatus.value === 'ok' ? 'positive' : 'warning'));

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
        <div class="col-12 col-md-6">
          <q-card flat bordered class="bg-grey-10 text-white">
            <q-card-section>
              <div class="row items-center q-gutter-sm">
                <q-icon name="view_list" color="primary" size="md" />
                <div class="text-h6">Card database</div>
              </div>
              <p class="text-grey-4 q-mb-none">
                Browse Pokemon, series, sets, cards, languages, and variants from the local database context.
              </p>
            </q-card-section>
          </q-card>
        </div>

        <div class="col-12 col-md-6">
          <q-card flat bordered class="bg-grey-10 text-white">
            <q-card-section>
              <div class="row items-center q-gutter-sm">
                <q-icon name="inventory_2" color="primary" size="md" />
                <div class="text-h6">My collection</div>
              </div>
              <p class="text-grey-4 q-mb-none">
                Keep track of owned cards, condition, quantity, language, value, storage, and trade status.
              </p>
            </q-card-section>
          </q-card>
        </div>
      </section>
    </div>
  </q-page>
</template>
