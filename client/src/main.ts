import { createApp } from 'vue';
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query';
import App from './App.vue';
import router from './router';
import ripple from './directives/ripple';
import './style.css';
import { installDevApiMonitor } from '@/lib/devApiMonitor'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

const app = createApp(App);
app.use(router).use(VueQueryPlugin, { queryClient });
app.directive('ripple', ripple);
if (import.meta.env.DEV) {
  installDevApiMonitor()
}
app.mount('#app');