<template>
  <q-page class="bg-dark flex flex-center">
    <section class="full-width q-pl-xl">
      <div class="text-overline text-primary">Pokemon Card Manager</div>
      <h1 class="text-h3 text-weight-bold q-mt-md q-my-none">
        Manage your Pokemon card collection
      </h1>
      <div class="text-body1 q-mt-md">
        A personal web app designed to organize Pokemon TCG data, browse sets and cards, and help
        track a collection in a clear, rebuildable way.
      </div>
      <div class="text-body2 text-secondary q-mt-md">Created by Cesar Ombredane.</div>
      <div class="row q-col-gutter-md q-mt-lg">
        <div class="col-auto">
          <q-btn
            color="primary"
            icon-right="arrow_forward"
            label="Browse series"
            size="lg"
            text-color="dark"
            to="/series"
            no-caps
            ><q-tooltip :delay="1000">Browse series</q-tooltip></q-btn
          >
        </div>
        <div class="col-auto">
          <q-btn
            color="dark"
            icon-right="search"
            label="Search cards"
            size="lg"
            text-color="white"
            to="/cards/search"
            no-caps
            ><q-tooltip :delay="1000">Search cards</q-tooltip></q-btn
          >
        </div>
        <div class="col-auto">
          <q-btn
            color="dark"
            icon-right="inventory_2"
            label="My collection"
            size="lg"
            text-color="white"
            to="/collection"
            no-caps
            ><q-tooltip :delay="1000">My collection</q-tooltip></q-btn
          >
        </div>
      </div>
    </section>
  </q-page>
</template>
