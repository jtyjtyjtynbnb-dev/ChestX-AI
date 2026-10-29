import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { createRouter, createWebHistory } from 'vue-router';
import * as echarts from 'echarts';
import App from './App.vue';
import { i18n } from './i18n/index.js';
import { installAutoTranslate } from './i18n/autoTranslate.js';
import HomeView from './views/HomeView.vue';
import InterpretView from './views/InterpretView.vue';
import RecordsView from './views/RecordsView.vue';
import KnowledgeView from './views/KnowledgeView.vue';
import AcademyView from './views/AcademyView.vue';
import AboutView from './views/AboutView.vue';
import './style.css';
import './legacy.css';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/home' },
    { path: '/home', name: 'home', component: HomeView },
    { path: '/interpret', name: 'interpret', component: InterpretView },
    { path: '/records', name: 'records', component: RecordsView },
    { path: '/knowledge', name: 'knowledge', component: KnowledgeView },
    { path: '/academy', name: 'academy', component: AcademyView },
    { path: '/about', name: 'about', component: AboutView },
    { path: '/:pathMatch(.*)*', redirect: '/home' }
  ]
});

window.echarts = echarts;

const app = createApp(App);
app.use(createPinia());
app.use(i18n);
app.use(router);
router.isReady().then(() => {
  app.mount('#app');
  installAutoTranslate();
});
