import { Router } from "express";
import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { sendMail } from "../mail.js";
import type { AuthRequest } from "../types/auth.js";

const r = Router();

// ===== Limites de tentativas =====
const FIFTEEN_MIN = 15 * 60 * 1000;

const limitLogin = rateLimit({
  windowMs: FIFTEEN_MIN,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas tentativas de login. Aguarde alguns minutos." },
});

const limitRecovery = rateLimit({
  windowMs: FIFTEEN_MIN,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas tentativas. Tente novamente em alguns minutos." },
});

// ===== Helpers =====
const sha256 = (s: string): string =>
  crypto.createHash("sha256").update(s).digest("hex");

const sign = (u: { id: number; email: string }): string =>
  jwt.sign({ id: u.id, email: u.email }, process.env.JWT_SECRET as string, {
    expiresIn: "7d",
  });

// HMAC com o JWT_SECRET: o código de 6 dígitos não pode ser revertido sem a chave
const codeHash = (code: string): string =>
  crypto
    .createHmac("sha256", process.env.JWT_SECRET as string)
    .update(code)
    .digest("hex");

const safeEqual = (a: string, b: string): boolean => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

const CODE_TTL_MIN = 10;
const MAX_ATTEMPTS = 5;
const FORGOT_MSG =
  "Se o e-mail estiver cadastrado, enviamos um código de verificação.";

// ===== Login e cadastro =====
r.post("/register", async (req: Request, res: Response): Promise<void> => {
  const { email, password, name } = req.body as {
    email?: string;
    password?: string;
    name?: string;
  };
  if (!email || !password || password.length < 6) {
    res
      .status(400)
      .json({ error: "E-mail e senha (mín. 6 caracteres) são obrigatórios" });
    return;
  }

  const hash = await bcrypt.hash(password, 10);
  try {
    const { rows } = await query<{
      id: number;
      email: string;
      name: string | null;
    }>(
      "INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name",
      [email.toLowerCase(), hash, name || null],
    );
    // Ativa convites pendentes para este e-mail
    await query(
      `UPDATE team_members SET status = 'ativo' WHERE email = $1 AND status = 'pendente'`,
      [email.toLowerCase()],
    );
    res.status(201).json({ token: sign(rows[0]), user: rows[0] });
  } catch (e) {
    if ((e as { code?: string }).code === "23505") {
      res.status(409).json({ error: "E-mail já cadastrado" });
      return;
    }
    throw e;
  }
});

r.post(
  "/login",
  limitLogin,
  async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body as { email?: string; password?: string };
    const { rows } = await query<{ id: number; email: string; name: string | null; password_hash: string }>(
      'SELECT id, email, name, password_hash FROM users WHERE email = $1',
      [String(email ?? '').toLowerCase()]
    );
    const u = rows[0];
    if (!u || !(await bcrypt.compare(String(password ?? ''), u.password_hash))) {
      res.status(401).json({ error: 'E-mail ou senha inválidos' });
      return;
    }

    // Ativa convites pendentes para este e-mail
    await query(
      `UPDATE team_members SET status = 'ativo' WHERE email = $1 AND status = 'pendente'`,
      [u.email.toLowerCase()]
    );

    res.json({ token: sign(u), user: { id: u.id, email: u.email, name: u.name } });
  }
);

// ===== Perfil =====
const profileSchema = z.object({
  name: z.string().trim().max(80, "Nome muito longo").nullable().optional(),
  avatar: z
    .string()
    .startsWith("data:image/", "Imagem inválida")
    .max(80_000, "Imagem muito grande")
    .nullable()
    .optional(),
});

const passwordSchema = z.object({
  current: z.string().min(1, "Informe a senha atual"),
  next: z.string().min(6, "A nova senha precisa ter 6 caracteres").max(200),
});

const PROFILE_COLS = `id, email, name, avatar,
  CASE WHEN plan_expires_at > now() THEN plan ELSE 'free' END AS plan`;

r.get(
  "/me",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const { id } = (req as AuthRequest).user;
    const {
      rows: [u],
    } = await query(`SELECT ${PROFILE_COLS} FROM users WHERE id = $1`, [id]);
    if (!u) {
      res.status(404).json({ error: "Usuário não encontrado" });
      return;
    }
    res.json(u);
  },
);

// Atualiza nome e/ou foto. Campos não enviados ficam como estão.
r.patch(
  "/me",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const { id } = (req as AuthRequest).user;
    const parsed = profileSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" });
      return;
    }

    const {
      rows: [cur],
    } = await query<{ name: string | null; avatar: string | null }>(
      "SELECT name, avatar FROM users WHERE id = $1",
      [id],
    );
    if (!cur) {
      res.status(404).json({ error: "Usuário não encontrado" });
      return;
    }

    const d = parsed.data;
    const name = d.name !== undefined ? d.name || null : cur.name;
    const avatar = d.avatar !== undefined ? d.avatar : cur.avatar;

    const {
      rows: [u],
    } = await query(
      `UPDATE users SET name = $1, avatar = $2 WHERE id = $3 RETURNING ${PROFILE_COLS}`,
      [name, avatar, id],
    );
    res.json(u);
  },
);

// Exclui a conta (exige digitar o e-mail)
r.delete(
  "/me",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const { id } = (req as AuthRequest).user;
    const confirm = String(
      (req.body as { confirm?: string } | undefined)?.confirm ?? "",
    )
      .trim()
      .toLowerCase();

    const {
      rows: [u],
    } = await query<{ email: string }>(
      "SELECT email FROM users WHERE id = $1",
      [id],
    );
    if (!u) {
      res.status(404).json({ error: "Conta não encontrada" });
      return;
    }
    if (confirm !== u.email.toLowerCase()) {
      res
        .status(400)
        .json({ error: "Digite seu e-mail exatamente para confirmar" });
      return;
    }

    await query("DELETE FROM users WHERE id = $1", [id]);
    res.sendStatus(204);
  },
);

// Troca de senha (exige a senha atual)
r.post(
  "/password",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const { id } = (req as AuthRequest).user;
    const parsed = passwordSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" });
      return;
    }

    const {
      rows: [u],
    } = await query<{ password_hash: string }>(
      "SELECT password_hash FROM users WHERE id = $1",
      [id],
    );
    if (!u || !(await bcrypt.compare(parsed.data.current, u.password_hash))) {
      res.status(400).json({ error: "Senha atual incorreta" });
      return;
    }

    const hash = await bcrypt.hash(parsed.data.next, 10);
    await query("UPDATE users SET password_hash = $1 WHERE id = $2", [
      hash,
      id,
    ]);
    res.sendStatus(204);
  },
);

// ===== Recuperação de senha por código =====

// 1) Pede o código por e-mail
r.post(
  "/forgot",
  limitRecovery,
  async (req: Request, res: Response): Promise<void> => {
    const email = String((req.body as { email?: string }).email ?? "")
      .toLowerCase()
      .trim();

    if (email) {
      const {
        rows: [u],
      } = await query<{ id: number; email: string }>(
        "SELECT id, email FROM users WHERE email = $1",
        [email],
      );

      if (u) {
        const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");

        // Invalida códigos anteriores
        await query(
          "UPDATE password_codes SET used_at = now() WHERE user_id = $1 AND used_at IS NULL",
          [u.id],
        );
        await query(
          `INSERT INTO password_codes (user_id, code_hash, expires_at)
         VALUES ($1, $2, now() + make_interval(mins => $3::int))`,
          [u.id, codeHash(code), CODE_TTL_MIN],
        );

        try {
          await sendMail({
            to: u.email,
            subject: "Seu código de verificação",
            text: `Seu código de verificação é ${code}. Ele vale por ${CODE_TTL_MIN} minutos.`,
            html: `<p>Seu código de verificação é <strong style="font-size:20px;letter-spacing:4px">${code}</strong>.</p><p>Ele vale por ${CODE_TTL_MIN} minutos.</p>`,
          });
        } catch (e) {
          console.error("Falha ao enviar código:", e);
        }
      }
    }

    // Sempre a mesma resposta, para não revelar se o e-mail existe
    res.json({ message: FORGOT_MSG });
  },
);

// 2) Confere o código
r.post(
  "/forgot/verify",
  limitRecovery,
  async (req: Request, res: Response): Promise<void> => {
    const body = req.body as { email?: string; code?: string };
    const email = String(body.email ?? "")
      .toLowerCase()
      .trim();
    const code = String(body.code ?? "").trim();

    const fail = (): void => {
      res
        .status(400)
        .json({ verified: false, error: "Código inválido ou expirado" });
    };

    if (!email || !/^\d{6}$/.test(code)) {
      fail();
      return;
    }

    const {
      rows: [u],
    } = await query<{ id: number }>("SELECT id FROM users WHERE email = $1", [
      email,
    ]);
    if (!u) {
      fail();
      return;
    }

    const {
      rows: [c],
    } = await query<{ id: number; code_hash: string; attempts: number }>(
      `SELECT id, code_hash, attempts FROM password_codes
     WHERE user_id = $1 AND used_at IS NULL AND expires_at > now()
     ORDER BY created_at DESC LIMIT 1`,
      [u.id],
    );
    if (!c || c.attempts >= MAX_ATTEMPTS) {
      fail();
      return;
    }

    if (!safeEqual(codeHash(code), c.code_hash)) {
      await query(
        "UPDATE password_codes SET attempts = attempts + 1 WHERE id = $1",
        [c.id],
      );
      fail();
      return;
    }

    // Código correto: consome o código e emite o token de troca
    await query("UPDATE password_codes SET used_at = now() WHERE id = $1", [
      c.id,
    ]);

    const {
      rows: [pw],
    } = await query<{ password_hash: string }>(
      "SELECT password_hash FROM users WHERE id = $1",
      [u.id],
    );

    const resetToken = jwt.sign(
      { id: u.id, ph: sha256(pw.password_hash), purpose: "pwd-reset" },
      process.env.JWT_SECRET as string,
      { expiresIn: "10m" },
    );

    res.json({ verified: true, resetToken });
  },
);

// 3) Define a nova senha
r.post("/forgot/reset", async (req: Request, res: Response): Promise<void> => {
  const { resetToken, password } = req.body as {
    resetToken?: string;
    password?: string;
  };

  if (!resetToken || !password || password.length < 6) {
    res.status(400).json({ error: "Senha inválida (mín. 6 caracteres)" });
    return;
  }

  let payload: { id: number; ph: string; purpose: string };
  try {
    payload = jwt.verify(
      resetToken,
      process.env.JWT_SECRET as string,
    ) as typeof payload;
  } catch {
    res.status(401).json({
      error: "Sessão de recuperação expirada. Solicite um novo código.",
    });
    return;
  }

  const {
    rows: [u],
  } = await query<{ password_hash: string }>(
    "SELECT password_hash FROM users WHERE id = $1",
    [payload.id],
  );

  // Se a senha já mudou, o token deixa de valer (uso único)
  if (
    payload.purpose !== "pwd-reset" ||
    !u ||
    payload.ph !== sha256(u.password_hash)
  ) {
    res.status(401).json({
      error: "Sessão de recuperação inválida. Solicite um novo código.",
    });
    return;
  }

  const hash = await bcrypt.hash(password, 10);
  await query("UPDATE users SET password_hash = $1 WHERE id = $2", [
    hash,
    payload.id,
  ]);

  res.json({ ok: true });
});

export default r;
