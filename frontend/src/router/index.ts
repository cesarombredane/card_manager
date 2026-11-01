// import vue-router
import { createRouter, createWebHistory } from 'vue-router';

// import views
import SeriesListingPage from '../views/series_listing_page.vue';
import CardDetailPage from '../views/card_detail_page.vue';
import CardSearchPage from '../views/card_search_page.vue';
import SetDetailPage from '../views/set_detail_page.vue';
import HomePage from '../views/home_page.vue';
import CoveragePage from '../views/coverage_page.vue';
import CollectionDashboardPage from '../views/collection_dashboard_page.vue';
import CollectionFolderPage from '../views/collection_folder_page.vue';
import CollectionBinderPage from '../views/collection_binder_page.vue';

// create router instance
export const router = createRouter({
  history: createWebHistory(),
  scrollBehavior(to, _from, savedPosition) {
    // History navigation should restore the position captured before leaving.
    if (savedPosition) return savedPosition;

    // A set is an entry page: always show its heading and filters first.
    if (to.name === 'set-detail') return { top: 0, left: 0 };

    return { top: 0, left: 0 };
  },
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomePage,
    },
    {
      path: '/series',
      name: 'series',
      component: SeriesListingPage,
    },
    {
      path: '/cards/search',
      name: 'card-search',
      component: CardSearchPage,
    },
    {
      path: '/coverage',
      name: 'coverage',
      component: CoveragePage,
    },
    {
      path: '/collection',
      name: 'collection',
      component: CollectionDashboardPage,
    },
    {
      path: '/collection/folder/:folderId',
      name: 'collection-folder',
      component: CollectionFolderPage,
    },
    {
      path: '/collection/folder/:folderId/binder',
      name: 'collection-binder',
      component: CollectionBinderPage,
    },
    {
      path: '/set/:setId',
      name: 'set-detail',
      component: SetDetailPage,
    },
    {
      path: '/set/:setId/card/:cardId',
      name: 'card-detail',
      component: CardDetailPage,
    },
  ],
});
