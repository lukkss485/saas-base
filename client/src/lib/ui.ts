import { ref, watch } from 'vue';

export const globalSearch = ref('');
export const sidebarCollapsed = ref(localStorage.getItem('sidebar') === 'collapsed');

watch(sidebarCollapsed, (value) => {
  localStorage.setItem('sidebar', value ? 'collapsed' : 'expanded');
});