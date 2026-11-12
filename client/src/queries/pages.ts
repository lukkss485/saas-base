import { computed, type Ref } from 'vue';
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { api } from '@/api';

export type Doc = Record<string, unknown>;

export type PageSummary = {
  id: number;
  project_id: number;
  title: string;
  icon: string | null;
  position: number;
  created_at: string;
  updated_at: string;
};

export type PageFull = PageSummary & { content: Doc };

export function usePages(projectId: Ref<number | null>) {
  return useQuery({
    queryKey: computed(() => ['pages', projectId.value] as const),
    queryFn: () => api<{ pages: PageSummary[] }>(`/pages?projectId=${projectId.value}`),
    enabled: computed(() => projectId.value !== null),
  });
}

export function usePage(pageId: Ref<number | null>) {
  return useQuery({
    queryKey: computed(() => ['page', pageId.value] as const),
    queryFn: () => api<PageFull>(`/pages/${pageId.value}`),
    enabled: computed(() => pageId.value !== null),
  });
}

export function useCreatePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { projectId: number; title?: string }) =>
      api<PageFull>('/pages', { method: 'POST', body }),
    onSuccess: (page) => {
      qc.setQueryData(['page', page.id], page);
      qc.invalidateQueries({ queryKey: ['pages', page.project_id] });
    },
  });
}

export function useUpdatePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: { title?: string; icon?: string | null; content?: Doc } }) =>
      api<PageFull>(`/pages/${id}`, { method: 'PATCH', body }),
    onSuccess: (page) => {
      qc.setQueryData(['page', page.id], page);
      qc.invalidateQueries({ queryKey: ['pages', page.project_id] });
    },
  });
}

export function useDeletePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number; projectId: number }) =>
      api<void>(`/pages/${id}`, { method: 'DELETE' }).then(() => id),
    onSuccess: (id, vars) => {
      qc.removeQueries({ queryKey: ['page', id] });
      qc.invalidateQueries({ queryKey: ['pages', vars.projectId] });
    },
  });
}