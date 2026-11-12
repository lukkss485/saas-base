import { computed, type Ref } from 'vue';
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { api } from '@/api';
import type { Task } from '@/lib/types';

export type Project = {
  id: number;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
  total: number;
  done: number;
  next_due: string | null;
};

export type ProjectsRes = { projects: Project[]; plan: 'free' | 'pro'; limit: number | null };
export type ProjectDetail = { project: Project; tasks: Task[] };
export type ProjectInput = { name: string; description?: string | null; color?: string };

export const projectKeys = {
  all: ['projects'] as const,
  detail: (id: number) => ['projects', id] as const,
};

export function useProjects() {
  return useQuery({
    queryKey: projectKeys.all,
    queryFn: () => api<ProjectsRes>('/projects'),
  });
}

export function useProjectDetail(id: Ref<number | null>) {
  return useQuery({
    queryKey: computed(() => (id.value ? projectKeys.detail(id.value) : ['projects', 'none'] as const)),
    queryFn: () => api<ProjectDetail>(`/projects/${id.value}`),
    enabled: computed(() => id.value !== null),
  });
}

// Depois de qualquer mudança em projeto ou tarefa, atualiza tudo que depende disso
function useInvalidate() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ['projects'] }),
      qc.invalidateQueries({ queryKey: ['tasks'] }),
      qc.invalidateQueries({ queryKey: ['dashboard'] }),
    ]);
}

export function useSaveProject() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, body }: { id?: number; body: ProjectInput }) =>
      id
        ? api<Project>(`/projects/${id}`, { method: 'PATCH', body })
        : api<Project>('/projects', { method: 'POST', body }),
    onSuccess: invalidate,
  });
}

export function useDeleteProject() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: number) => api<void>(`/projects/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}

// Ações das tarefas dentro do projeto aberto
export function useProjectTaskActions(projectId: Ref<number | null>) {
  const invalidate = useInvalidate();

  const add = useMutation({
    mutationFn: (title: string) =>
      api<Task>('/tasks', { method: 'POST', body: { title, project_id: projectId.value } }),
    onSuccess: invalidate,
  });

  const toggle = useMutation({
    mutationFn: ({ id, done }: { id: number; done: boolean }) =>
      api<Task>(`/tasks/${id}`, { method: 'PATCH', body: { done } }),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: number) => api<void>(`/tasks/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });

  return { add, toggle, remove };
}