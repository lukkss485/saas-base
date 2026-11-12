import { Router } from 'express';
import type { Request, Response } from 'express';
import crypto from 'node:crypto';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { PLANS, isPlanKey } from '../plans.js';
import type { AuthRequest } from '../types/auth.js';

type Payment = { status: string };

type MpPayment = {
  id: number;
  status: string;
  external_reference?: string;
  transaction_amount: number;
};

const r = Router();
const MP = 'https://api.mercadopago.com';

const mpHeaders = (): Record<string, string> => ({
  Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
  'Content-Type': 'application/json',
});

r.get('/plans', (_req: Request, res: Response): void => {
  res.json(PLANS);
});

r.post('/checkout', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { id, email } = (req as AuthRequest).user;
  const planKey = (req.body as { plan?: unknown }).plan || 'pro';
  if (!isPlanKey(planKey)) {
    res.status(400).json({ error: 'Plano inválido' });
    return;
  }
  const plan = PLANS[planKey];

  const pref = {
    items: [{ title: plan.title, quantity: 1, unit_price: plan.price, currency_id: 'BRL' }],
    payer: { email },
    external_reference: `${id}|${planKey}`,
    back_urls: {
      success: `${process.env.APP_URL}/billing?status=success`,
      failure: `${process.env.APP_URL}/billing?status=failure`,
      pending: `${process.env.APP_URL}/billing?status=pending`,
    },
    notification_url: `${process.env.API_PUBLIC_URL}/api/billing/webhook`,
  };

  const resp = await fetch(`${MP}/checkout/preferences`, {
    method: 'POST',
    headers: mpHeaders(),
    body: JSON.stringify(pref),
  });
  const data = (await resp.json()) as { init_point?: string; sandbox_init_point?: string };
  if (!resp.ok) {
    console.error('Erro Mercado Pago (preference):', data);
    res.status(502).json({ error: 'Erro ao criar pagamento no Mercado Pago' });
    return;
  }
  res.json({ init_point: data.init_point, sandbox_init_point: data.sandbox_init_point });
});

function validSignature(req: Request, dataId: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return true; // validação desativada enquanto não houver chave

  const parts = Object.fromEntries(
    String(req.headers['x-signature'] ?? '')
      .split(',')
      .map((s) => s.trim().split('=') as [string, string])
  );
  const manifest = `id:${dataId.toLowerCase()};request-id:${req.headers['x-request-id']};ts:${parts.ts};`;
  const hmac = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
  return hmac === parts.v1;
}

r.post('/webhook', async (req: Request, res: Response): Promise<void> => {
  const body = req.body as { type?: string; data?: { id?: string | number } } | undefined;
  const isPayment = body?.type === 'payment' || req.query.topic === 'payment';
  const rawId = body?.data?.id ?? req.query['data.id'] ?? req.query.id;
  if (!isPayment || !rawId) {
    res.sendStatus(200);
    return;
  }

  const paymentId = String(rawId);
  if (!validSignature(req, paymentId)) {
    res.sendStatus(401);
    return;
  }

  // Busca o pagamento direto na API para não confiar só no corpo recebido
  const resp = await fetch(`${MP}/v1/payments/${paymentId}`, { headers: mpHeaders() });
  if (!resp.ok) {
    res.sendStatus(500); // o Mercado Pago tenta de novo
    return;
  }
  const p = (await resp.json()) as MpPayment;

  const [userId, rawPlan] = String(p.external_reference ?? '').split('|');
  const planKey = isPlanKey(rawPlan) ? rawPlan : null;
  const plan = planKey ? PLANS[planKey] : null;

  const { rows: prev } = await query<Payment>(
    'SELECT status FROM payments WHERE mp_payment_id = $1',
    [String(p.id)]
  );
  const wasApproved = prev[0]?.status === 'approved';

  await query(
    `INSERT INTO payments (user_id, mp_payment_id, plan, status, amount)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (mp_payment_id) DO UPDATE SET status = EXCLUDED.status`,
    [userId, String(p.id), planKey, p.status, p.transaction_amount]
  );

  const amountOk = plan !== null && Number(p.transaction_amount) === plan.price;
  if (p.status === 'approved' && !wasApproved && amountOk && planKey) {
    await query(
      `UPDATE users
         SET plan = $1,
             plan_expires_at = GREATEST(COALESCE(plan_expires_at, now()), now()) + interval '30 days'
       WHERE id = $2`,
      [planKey, userId]
    );
  }

  res.sendStatus(200);
});

export default r;