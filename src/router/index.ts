import { createRouter, createWebHistory } from "vue-router";
import { auth } from "@/firebase";
import type { RouteRecordRaw } from "vue-router";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "dashboard",
    component: () => import("@/views/DashboardView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/login",
    name: "login",
    component: () => import("@/views/LoginView.vue"),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Auth guard: redirect unauthenticated users to /login
router.beforeEach((to, _from, next) => {
  if (to.meta.requiresAuth) {
    const user = auth.currentUser;
    if (!user) {
      next({ name: "login", query: { redirect: to.fullPath } });
    } else {
      next();
    }
  } else {
    next();
  }
});

export default router;
