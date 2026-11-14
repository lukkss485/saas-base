import express from "express";
import type { NextFunction, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import apiRoutes from "./routes/index.js";

export function createApp(): express.Express {
  const app = express();

  app.set("trust proxy", 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

  const allowedOrigins = [
    process.env.APP_URL,
    "http://localhost:5173",
    "http://localhost:4173",
    "http://localhost",
    "capacitor://localhost",
    "http://tauri.localhost",
    "tauri://localhost",
  ].filter((origin): origin is string => Boolean(origin));

  app.use(cors({ origin: allowedOrigins }));
  app.use(express.json({ limit: "100kb" }));
  app.use(
    "/api",
    rateLimit({
      windowMs: 60_000,
      limit: 300,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );
  app.use("/api", apiRoutes);

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (
      typeof err === "object" &&
      err !== null &&
      "type" in err &&
      err.type === "entity.parse.failed"
    ) {
      res.status(400).json({ error: "JSON inválido na requisição" });
      return;
    }

    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  });

  return app;
}
