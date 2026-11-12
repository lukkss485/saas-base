import { reactive } from 'vue';

export type ToastItem = {
  id: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  timeout: number;
};

const state = reactive<{ items: ToastItem[] }>({ items: [] });
let seq = 0;

export function useToasts() {
  return state;
}

export function dismiss(id: number): void {
  state.items = state.items.filter((t) => t.id !== id);
}

export function toast(
  message: string,
  opts: { actionLabel?: string; onAction?: () => void; timeout?: number } = {}
): number {
  const id = ++seq;
  const timeout = opts.timeout ?? 4000;
  state.items.push({ id, message, actionLabel: opts.actionLabel, onAction: opts.onAction, timeout });
  setTimeout(() => dismiss(id), timeout);
  return id;
}