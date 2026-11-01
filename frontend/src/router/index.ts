// import hooks
import { createRouter, createWebHistory } from 'vue-router';

const series_listing_page = () => import('../views/series_listing_page.vue');
const card_detail_page = () => import('../views/card_detail_page.vue');
const card_search_page = () => import('../views/card_search_page.vue');
const set_detail_page = () => import('../views/set_detail_page.vue');
const home_page = () => import('../views/home_page.vue');
const coverage_page = () => import('../views/coverage_page.vue');
const collection_dashboard_page = () => import('../views/collection_dashboard_page.vue');
const collection_folder_page = () => import('../views/collection_folder_page.vue');
const collection_binder_page = () => import('../views/collection_binder_page.vue');

// create router instance
export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to, _from, saved_position) {
    // History navigation should restore the position captured before leaving.
    if (saved_position) return saved_position;

    // A set is an entry page: always show its heading and filters first.
    if (to.name === 'set-detail') return { top: 0, left: 0 };

    return { top: 0, left: 0 };
  },
  routes: [
    {
      path: '/:pathMatch(.*)*',
      name: 'not_found',
      component: () => import('../views/not_found_page.vue'),
    },
    {
      path: '/',
      name: 'home',
      component: home_page,
    },
    {
      path: '/series',
      name: 'series',
      component: series_listing_page,
    },
    {
      path: '/cards/search',
      name: 'card-search',
      component: card_search_page,
    },
    {
      path: '/coverage',
      name: 'coverage',
      component: coverage_page,
    },
    {
      path: '/collection',
      name: 'collection',
      component: collection_dashboard_page,
    },
    {
      path: '/collection/folder/:folderId',
      name: 'collection-folder',
      component: collection_folder_page,
    },
    {
      path: '/collection/folder/:folderId/binder',
      name: 'collection-binder',
      component: collection_binder_page,
    },
    {
      path: '/set/:setId',
      name: 'set-detail',
      component: set_detail_page,
    },
    {
      path: '/set/:setId/card/:cardId',
      name: 'card-detail',
      component: card_detail_page,
    },
  ],
});
