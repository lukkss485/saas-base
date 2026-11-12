export const FINANCE_TZ = 'America/Sao_Paulo';
export const UPCOMING_DAYS = 7;

export type FinancePeriod =
  | 'this-month' | 'previous-month' | 'last-30-days' | 'last-90-days' | 'custom';

export type TransactionStatus = 'settled' | 'pending' | 'overdue' | 'upcoming';

/** Data de hoje no fuso de São Paulo, no formato "YYYY-MM-DD". */
export function todayInSaoPaulo(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: FINANCE_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const pick = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${pick('year')}-${pick('month')}-${pick('day')}`;
}

/** Soma dias a uma data "YYYY-MM-DD" sem depender do fuso do servidor. */
export function addDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Deriva o status exibido. Datas "YYYY-MM-DD" se comparam corretamente como texto. */
export function deriveStatus(
  state: 'settled' | 'pending',
  dueDate: string | null,
  today: string,
  upcomingDays: number = UPCOMING_DAYS,
): TransactionStatus {
  if (state === 'settled') return 'settled';
  if (!dueDate) return 'pending';
  if (dueDate < today) return 'overdue';
  if (dueDate <= addDays(today, upcomingDays)) return 'upcoming';
  return 'pending';
}

export function periodRange(
  period: FinancePeriod,
  today: string,
  custom?: { from: string; to: string },
): { from: string; to: string } {
  const [y, m] = today.split('-').map(Number);
  switch (period) {
    case 'this-month':
      return { from: `${today.slice(0, 8)}01`, to: today };
    case 'previous-month': {
      const from = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 10);
      const to = new Date(Date.UTC(y, m - 1, 0)).toISOString().slice(0, 10);
      return { from, to };
    }
    case 'last-30-days':
      return { from: addDays(today, -29), to: today };
    case 'last-90-days':
      return { from: addDays(today, -89), to: today };
    case 'custom':
      if (!custom) throw new Error('Período personalizado exige from e to');
      return custom;
  }
}

/** Variação percentual. Retorna null quando o período anterior é zero. */
export function changePercent(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}