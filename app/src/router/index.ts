// import vue-router
import { createRouter, createWebHistory } from 'vue-router';

// import views
import SeriesListingPage from '../views/SeriesListingPage.vue';
import SetDetailPage from '../views/SetDetailPage.vue';
import CardDetailPage from '../views/CardDetailPage.vue';
import HomePage from '../views/HomePage.vue';


// create router instance
export const router = createRouter({
  history: createWebHistory(),
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
