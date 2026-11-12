export type Priority = 'alta' | 'media' | 'baixa';
export type Filter = 'todas' | 'pendentes' | 'concluidas' | 'atrasadas';
export type Range = 7 | 30;
export type EventKind = 'created' | 'completed' | 'reopened' | 'edited' | 'deleted';

export type Task = {
  id: number;
  title: string;
  done: boolean;
  priority: Priority;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  project_id: number | null;
};

export type TasksRes = { tasks: Task[]; plan: 'free' | 'pro'; limit: number | null };

export type ActivityEvent = { id: number; kind: EventKind; title: string; created_at: string };

export type DashboardData = {
  range: Range;
  plan: 'free' | 'pro';
  limit: number | null;
  totals: { total: number; done: number; overdue: number; due_today: number; high_open: number };
  series: { day: string; created: number; completed: number }[];
  priorities: Record<Priority, number>;
  upcoming: { id: number; title: string; priority: Priority; due_date: string }[];
  events: ActivityEvent[];
};
