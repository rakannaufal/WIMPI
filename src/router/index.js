import { createRouter, createWebHistory } from "vue-router";
import supabase from "@/supabaseClient";

const routes = [
  {
    path: "/",
    name: "Dashboard",
    component: () => import("@/views/Dashboard.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/transactions",
    name: "Transactions",
    component: () => import("@/views/Transactions.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/goals",
    name: "Goals",
    component: () => import("@/views/Goals.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/budgets",
    name: "Budgets",
    component: () => import("@/views/Budgets.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/reports",
    name: "Reports",
    component: () => import("@/views/Reports.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/profile",
    name: "Profile",
    component: () => import("@/views/Profile.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/contact",
    name: "Contact",
    component: () => import("@/views/Contact.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/auth",
    name: "Auth",
    component: () => import("@/views/Auth/Auth.vue"),
  },
  {
    path: "/forgot-password",
    name: "ForgotPassword",
    component: () => import("@/views/Auth/ForgotPassword.vue"),
  },
  {
    path: "/update-password",
    name: "UpdatePassword",
    component: () => import("@/views/Auth/UpdatePassword.vue"),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// --- NAVIGATION GUARD YANG DIPERBARUI ---
router.beforeEach(async (to, from, next) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);

  // Cek apakah ini adalah alur pemulihan password dari email
  const isPasswordRecovery =
    to.path === "/update-password" && to.hash.includes("type=recovery");

  if (isPasswordRecovery) {
    // Jika ini adalah link dari email, SELALU IZINKAN akses ke halaman update password
    // Abaikan semua aturan redirect lainnya.
    next();
    return;
  }

  if (requiresAuth && !session) {
    // Jika halaman butuh login tapi tidak ada sesi, paksa ke halaman Auth
    next({ name: "Auth" });
  } else if (session && (to.name === "Auth" || to.name === "ForgotPassword")) {
    // Jika sudah login dan mencoba akses halaman Auth atau Lupa Password, arahkan ke Dashboard
    next({ name: "Dashboard" });
  } else {
    // Dalam semua kasus lain, izinkan akses
    next();
  }
});

export default router;
