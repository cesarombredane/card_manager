<template>
  <q-page class="bg-dark text-white flex flex-center q-pa-md q-pa-lg-xl">
    <section class="full-width">
      <div class="column">
        <div class="text-overline text-yellow-6">
          Pokemon Card Manager
        </div>
        <h1 class="text-h3 text-weight-bold q-my-md">
          Manage your Pokemon card collection
        </h1>
        <p class="text-body1 text-grey-4">
          A personal web app designed to organize Pokemon TCG data, browse sets and cards, and help track a collection in a clear, rebuildable way.
        </p>
        <p class="text-body2 text-grey-5 q-mt-lg">
          Created by Cesar Ombredane.
        </p>
        <div class="row q-col-gutter-md q-mt-xl">
          <div class="col-12 col-sm-auto">
            <q-btn color="yellow-7" icon-right="arrow_forward" label="Browse series" size="lg" text-color="black" unelevated to="/series" />
          </div>
          <div class="col-12 col-sm-auto">
            <q-btn color="grey-9" icon-right="search" label="Search cards" size="lg" text-color="white" unelevated to="/cards/search" />
          </div>
        </div>
      </div>
    </section>
  </q-page>
</template>
