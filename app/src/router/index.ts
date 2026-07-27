// import vue-router
import { createRouter, createWebHistory } from 'vue-router';

// import views
import SeriesListingPage from '../views/SeriesListingPage.vue';
import CardDetailPage from '../views/CardDetailPage.vue';
import CardSearchPage from '../views/CardSearchPage.vue';
import SetDetailPage from '../views/SetDetailPage.vue';
import HomePage from '../views/HomePage.vue';
import CoveragePage from '../views/CoveragePage.vue';
import CollectionDashboardPage from '../views/CollectionDashboardPage.vue';
import CollectionFolderPage from '../views/CollectionFolderPage.vue';
import CollectionBinderPage from '../views/CollectionBinderPage.vue';


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
      component: HomePage
    },
    {
      path: '/series',
      name: 'series',
      component: SeriesListingPage
    },
    {
      path: '/cards/search',
      name: 'card-search',
      component: CardSearchPage
    },
    {
      path: '/coverage',
      name: 'coverage',
      component: CoveragePage
    },
    {
      path: '/collection',
      name: 'collection',
      component: CollectionDashboardPage
    },
    {
      path: '/collection/folder/:folderId',
      name: 'collection-folder',
      component: CollectionFolderPage
    },
    {
      path: '/collection/folder/:folderId/binder',
      name: 'collection-binder',
      component: CollectionBinderPage
    },
    {
      path: '/set/:setId',
      name: 'set-detail',
      component: SetDetailPage
    },
    {
      path: '/set/:setId/card/:cardId',
      name: 'card-detail',
      component: CardDetailPage
    }
  ]
});
