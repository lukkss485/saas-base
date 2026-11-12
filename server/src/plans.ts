export type PlanKey = 'pro';

export type Plan = { title: string; price: number };

export const PLANS: Record<PlanKey, Plan> = {
  pro: { title: 'Plano Pro (30 dias)', price: 29.9 },
};

export function isPlanKey(value: unknown): value is PlanKey {
  return typeof value === 'string' && Object.hasOwn(PLANS, value);
}