import "dotenv/config";
import express from "express";
import type { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { query } from "./db.js";
import authRoutes from "./routes/auth.js";
import taskRoutes from "./routes/tasks.js";
import billingRoutes from "./routes/billing.js";
import dashboardRoutes from "./routes/dashboard.js";
import projectRoutes from "./routes/projects.js";
import teamRoutes from "./routes/team.js";
import reportRoutes from "./routes/reports.js";
import dayRoutes from "./routes/days.js";
import pageRoutes from "./routes/pages.js";
import notificationRoutes from "./routes/notifications.js";
import devRoutes from "./routes/dev.js";
import financeRoutes from "./routes/finance.js";
import financeReportRoutes from './routes/finance-reports.js';


const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Necessário atrás de proxy (ngrok, Railway, Render)
app.set("trust proxy", 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(express.json({ limit: "100kb" }));
app.use(express.json({ limit: "3mb" }));

app.use("/api/pages", pageRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/team", teamRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/days", dayRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/finance", financeRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/finance', financeReportRoutes);

const allowedOrigins = [
  process.env.APP_URL,
  "http://localhost:5173",
  "http://localhost:4173",
  "http://localhost", // Capacitor (Android)
  "capacitor://localhost", // Capacitor (iOS)
  "http://tauri.localhost", // Tauri (Windows)
  "tauri://localhost", // Tauri (macOS/Linux)
].filter(Boolean) as string[];

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "100kb" }));

// Limite geral por IP
app.use(
  "/api",
  rateLimit({
    windowMs: 60_000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/dev", devRoutes);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (
    err &&
    typeof err === "object" &&
    (err as { type?: string }).type === "entity.parse.failed"
  ) {
    res.status(400).json({ error: "JSON inválido na requisição" });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Erro interno" });
});

async function start(): Promise<void> {
  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  await query(schema);

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => {
    console.log(`API rodando em http://localhost:${port}`);
  });
}

start().catch((err) => {
  console.error("Falha ao iniciar a API:", err);
  process.exit(1);
});
