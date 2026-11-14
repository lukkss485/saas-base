import { Router } from "express";
import authRoutes from "./auth.js";
import billingRoutes from "./billing.js";
import dashboardRoutes from "./dashboard.js";
import dayRoutes from "./days.js";
import devRoutes from "./dev.js";
import financeReportRoutes from "./finance-reports.js";
import financeRoutes from "./finance.js";
import notificationRoutes from "./notifications.js";
import pageRoutes from "./pages.js";
import projectRoutes from "./projects.js";
import reportRoutes from "./reports.js";
import taskRoutes from "./tasks.js";
import teamRoutes from "./team.js";

const apiRoutes = Router();

apiRoutes.get("/health", (_req, res) => {
  res.json({ ok: true });
});

apiRoutes.use("/pages", pageRoutes);
apiRoutes.use("/dashboard", dashboardRoutes);
apiRoutes.use("/projects", projectRoutes);
apiRoutes.use("/team", teamRoutes);
apiRoutes.use("/reports", reportRoutes);
apiRoutes.use("/notifications", notificationRoutes);
apiRoutes.use("/days", dayRoutes);
apiRoutes.use("/tasks", taskRoutes);
apiRoutes.use("/finance", financeRoutes);
apiRoutes.use("/finance", financeReportRoutes);
apiRoutes.use("/auth", authRoutes);
apiRoutes.use("/billing", billingRoutes);
apiRoutes.use("/dev", devRoutes);

export default apiRoutes;
