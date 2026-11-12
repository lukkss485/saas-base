import { computed, type Ref } from 'vue';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { api } from '@/api';
import { projectKeys } from '@/queries/projects';
import type { DashboardData, Priority, Range, Task, TasksRes } from '@/lib/types';

export type Me = { id: number; email: string; name: string | null; plan: 'free' | 'pro'; avatar?: string | null };
export type TaskPatch = Partial<Pick<Task, 'title' | 'done' | 'priority' | 'due_date'>>;

export const keys = {
  me: ['me'] as const,
  tasks: ['tasks'] as const,
  dashboard: ['dashboard'] as const,
  dashboardRange: (range: Range) => ['dashboard', range] as const,
};

export function useMe() {
  return useQuery({
    queryKey: keys.me,
    queryFn: () => api<Me>('/auth/me'),
    staleTime: Infinity,
  });
}

export function useTasks() {
  return useQuery({
    queryKey: keys.tasks,
    queryFn: () => api<TasksRes>('/tasks'),
  });
}

export function useDashboard(range: Ref<Range>) {
  return useQuery({
    queryKey: computed(() => keys.dashboardRange(range.value)),
    queryFn: () => api<DashboardData>(`/dashboard?range=${range.value}`),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
    refetchIntervalInBackground: true,
  });
}

// Depois de qualquer mudança, atualiza a lista, os números da dashboard e os projetos
// (a chave ['projects'] também cobre o detalhe de cada projeto, ['projects', id])
function useInvalidate() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: keys.tasks }),
      qc.invalidateQueries({ queryKey: keys.dashboard }),
      qc.invalidateQueries({ queryKey: projectKeys.all }),
    ]);
}

export function useCreateTask() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (body: { title: string; priority: Priority; due_date: string | null }) =>
      api<Task>('/tasks', { method: 'POST', body }),
    onSuccess: invalidate,
  });
}

// Atualização otimista: muda na tela antes da resposta e desfaz se der erro
export function useUpdateTask() {
  const qc = useQueryClient();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: TaskPatch }) =>
      api<Task>(`/tasks/${id}`, { method: 'PATCH', body }),
    onMutate: async ({ id, body }) => {
      await qc.cancelQueries({ queryKey: keys.tasks });
      const prev = qc.getQueryData<TasksRes>(keys.tasks);
      if (prev) {
        qc.setQueryData<TasksRes>(keys.tasks, {
          ...prev,
          tasks: prev.tasks.map((t) => (t.id === id ? { ...t, ...body } : t)),
        });
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(keys.tasks, ctx.prev);
    },
    onSettled: invalidate,
  });
}

export function useDeleteTask() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: number) => api<void>(`/tasks/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}

export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string }) => api<Me>('/auth/me', { method: 'PATCH', body }),
    onSuccess: (me) => qc.setQueryData(keys.me, me),
  });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: (confirm: string) =>
      api<void>('/auth/me', { method: 'DELETE', body: { confirm } }),
  });
}

export function useClearCompleted() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: () => api<{ deleted: number }>('/tasks/completed', { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}