import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
  type RouteLocationRaw,
} from "vue-router";
import Landing from "./views/Landing.vue";
import Login from "./views/Login.vue";
import ForgotPassword from "./views/ForgotPassword.vue";
import ResetPassword from "./views/ResetPassword.vue";
import Dashboard from "./views/Dashboard.vue";
import Billing from "./views/Billing.vue";
import Config from "./views/Config.vue";
import Projects from "./views/Projects.vue";
import Tasks from "./views/Tasks.vue";
import Calendar from "./views/Calendar.vue";
import Reports from "./views/Reports.vue";
import Team from "./views/team.vue";
import Notifications from "./views/Notifications.vue";
import Profile from "./views/Perfiole.vue";
import ProjectNotes from "./views/ProjectsNotes.vue";

const routes: RouteRecordRaw[] = [
  { path: "/", component: Landing, meta: { wide: true } },
  { path: "/login", component: Login },
  { path: "/forgot-password", component: ForgotPassword },
  { path: "/reset-password", component: ResetPassword },

  {
    path: "/register",
    redirect: (): RouteLocationRaw => {
      if (localStorage.getItem("token")) {
        return { path: "/dashboard" };
      }

      return {
        path: "/login",
        query: { mode: "register" },
      };
    },
  },

  // Rotas privadas: sem header e footer, exigem sessão
  { path: "/dashboard", component: Dashboard, meta: { private: true } },
  { path: "/billing", component: Billing, meta: { private: true } },
  { path: "/projects", component: Projects, meta: { private: true } },
  { path: "/tasks", component: Tasks, meta: { private: true } },
  { path: "/calendar", component: Calendar, meta: { private: true } },
  { path: "/reports", component: Reports, meta: { private: true } },
  { path: "/team", component: Team, meta: { private: true } },
  { path: "/notifications", component: Notifications, meta: { private: true } },
  { path: "/profile", component: Profile, meta: { private: true } },
  { path: "/settings", component: Config, meta: { private: true } },
  {
    path: "/projects/:projectId",
    component: ProjectNotes,
    meta: { private: true },
  },
  {
    path: "/finance",
    name: "finance",
    component: () => import("@/views/Financeiro.vue"),
    meta: { private: true },
  },
  {
    path: "/ui-kit",
    name: "ui-kit",
    component: () => import("@/views/UiKit.vue"),
    meta: { private: false },
  },
];

const router = createRouter({ history: createWebHistory(), routes });

// Guard: rota privada sem sessão vai para o login e volta depois
router.beforeEach((to) => {
  const logged = !!localStorage.getItem("token");
  if (to.meta.private && !logged) {
    return { path: "/login", query: { redirect: to.fullPath } };
  }
});

export default router;
