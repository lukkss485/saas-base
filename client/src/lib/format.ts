import type { Priority, Task } from './types';

export const todayIso = (): string => new Date().toLocaleDateString('en-CA'); // AAAA-MM-DD local

export const isOverdue = (t: Pick<Task, 'done' | 'due_date'>): boolean =>
  !t.done && !!t.due_date && t.due_date < todayIso();

export function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'agora';
  if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
  const d = Math.floor(s / 86400);
  return `há ${d} dia${d > 1 ? 's' : ''}`;
}

export const shortDay = (ymd: string): string => `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}`;

export const fullDay = (ymd: string): string =>
  new Date(`${ymd}T00:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });

export function dueLabel(ymd: string): { text: string; tone: 'late' | 'today' | 'soon' | 'ok' } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = ymd.split('-').map(Number);
  const due = new Date(y, m - 1, d);
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return { text: `atrasada ${-diff}d`, tone: 'late' };
  if (diff === 0) return { text: 'hoje', tone: 'today' };
  if (diff === 1) return { text: 'amanhã', tone: 'soon' };
  return { text: `em ${diff} dias`, tone: 'ok' };
}

export const DUE_CLASS = {
  late: 'text-red-600 dark:text-red-400',
  today: 'text-amber-600 dark:text-amber-400',
  soon: 'text-amber-500',
  ok: 'text-slate-500 dark:text-slate-400',
} as const;

export const PRIORITY_LABEL: Record<Priority, string> = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };
export const PRIORITY_DOT: Record<Priority, string> = {
  alta: 'bg-red-500',
  media: 'bg-amber-400',
  baixa: 'bg-slate-400',
};