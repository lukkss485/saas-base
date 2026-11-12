import { computed, type Ref } from 'vue';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { api } from '@/api';
import type { ActivityEvent } from '@/lib/types';

export type Role = 'admin' | 'membro' | 'visualizador';

export type TeamMember = {
  id: number;
  email: string;
  name: string | null;
  role: Role;
  status: string;
  invited_at: string;
};

export type ReportRange = 7 | 30 | 90;

export type Report = {
  range: ReportRange;
  series: { day: string; created: number; completed: number }[];
  completed: number;
  created: number;
  rate: number;
  avgHours: number | null;
  byWeekday: { dow: number; n: number }[];
  byPriority: { priority: 'alta' | 'media' | 'baixa'; total: number; done: number }[];
  projects: { name: string; color: string; total: number; done: number }[];
};

// Equipe
export function useTeam() {
  return useQuery({
    queryKey: ['team'],
    queryFn: () => api<{ members: TeamMember[] }>('/team'),
  });
}

export function useTeamActions() {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ['team'] });

  return {
    invite: useMutation({
      mutationFn: (body: { email: string; role: Role }) =>
        api<TeamMember>('/team', { method: 'POST', body }),
      onSuccess: refresh,
    }),
    setRole: useMutation({
      mutationFn: ({ id, role }: { id: number; role: Role }) =>
        api<TeamMember>(`/team/${id}`, { method: 'PATCH', body: { role } }),
      onSuccess: refresh,
    }),
    remove: useMutation({
      mutationFn: (id: number) => api<void>(`/team/${id}`, { method: 'DELETE' }),
      onSuccess: refresh,
    }),
  };
}

// Relatórios
export function useReports(range: Ref<ReportRange>) {
  return useQuery({
    queryKey: computed(() => ['reports', range.value] as const),
    queryFn: () => api<Report>(`/reports?range=${range.value}`),
    placeholderData: keepPreviousData,
  });
}

// Notificações
export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => api<{ events: ActivityEvent[] }>('/notifications?limit=100'),
  });
}

// Perfil e segurança
export function useProfileActions() {
  const qc = useQueryClient();

  return {
    saveProfile: useMutation({
      mutationFn: (body: { name?: string; avatar?: string | null }) =>
        api<unknown>('/auth/me', { method: 'PATCH', body }),
      onSuccess: (me) => qc.setQueryData(['me'], me),
    }),
    changePassword: useMutation({
      mutationFn: (body: { current: string; next: string }) =>
        api<void>('/auth/password', { method: 'POST', body }),
    }),
  };
}

// Dias marcados como importantes
export function useImportantDays() {
  return useQuery({
    queryKey: ['important-days'],
    queryFn: () => api<{ days: string[] }>('/days'),
  });
}

export function useSetImportantDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ day, important }: { day: string; important: boolean }) =>
      api<{ day: string; important: boolean }>(`/days/${day}`, {
        method: 'PUT',
        body: { important },
      }),
    onMutate: async ({ day, important }) => {
      await qc.cancelQueries({ queryKey: ['important-days'] });
      const prev = qc.getQueryData<{ days: string[] }>(['important-days']);
      if (prev) {
        const days = important
          ? [...new Set([...prev.days, day])]
          : prev.days.filter((d) => d !== day);
        qc.setQueryData(['important-days'], { days });
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['important-days'], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['important-days'] }),
  });
}