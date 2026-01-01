<script setup>
import { ref, watch, nextTick, computed, onMounted, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useFinanceStore } from "@/store/finance";
import { useThemeStore } from "@/store/theme";
import Sidebar from "@/components/sidebar.vue";
import AiChatWidget from "@/components/AiChatWidget.vue";
import feather from "feather-icons";

const financeStore = useFinanceStore();
const themeStore = useThemeStore();
const route = useRoute();
const router = useRouter();

// --- LOGIKA AUTO LOGOUT ---
let inactivityTimer = null;
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 menit
const activityEvents = [
  "mousemove",
  "mousedown",
  "keypress",
  "scroll",
  "touchstart",
];

const logoutDueToInactivity = () => {
  stopInactivityDetection();
  alert(
    "Anda telah keluar secara otomatis karena tidak ada aktivitas selama 30 menit."
  );
  financeStore.signOut();
  router.push("/auth");
};

const resetInactivityTimer = () => {
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(logoutDueToInactivity, INACTIVITY_TIMEOUT);
};

const startInactivityDetection = () => {
  activityEvents.forEach((event) => {
    window.addEventListener(event, resetInactivityTimer);
  });
  resetInactivityTimer();
};

const stopInactivityDetection = () => {
  activityEvents.forEach((event) => {
    window.removeEventListener(event, resetInactivityTimer);
  });
  clearTimeout(inactivityTimer);
};

watch(
  () => financeStore.user,
  (newUser) => {
    if (newUser) {
      startInactivityDetection();
    } else {
      stopInactivityDetection();
    }
  },
  { immediate: true }
);

onUnmounted(() => {
  stopInactivityDetection();
});

// --- LOGIKA TAMPILAN & SIDEBAR ---
const isSidebarOpen = ref(false);
const toggleSidebar = () => (isSidebarOpen.value = !isSidebarOpen.value);
const closeSidebar = () => (isSidebarOpen.value = false);

const isAuthPage = computed(() => {
  const authRoutes = [
    "Auth",
    "ForgotPassword",
    "UpdatePassword",
    "Login",
    "Register",
  ];
  return authRoutes.includes(route.name);
});

watch(isSidebarOpen, (isOpen) => {
  if (isOpen) document.body.classList.add("no-scroll");
  else document.body.classList.remove("no-scroll");
});

watch(
  () => route.path,
  () => {
    closeSidebar(); // Tutup sidebar secara otomatis saat pindah halaman
    nextTick(() => feather.replace());
  },
  { immediate: true }
);

onMounted(() => {
  financeStore.handleAuthStateChange();
  themeStore.loadTheme();
});
</script>

<template>
  <!-- Jika ini BUKAN halaman otentikasi DAN pengguna sudah login, tampilkan layout utama -->
  <div v-if="!isAuthPage && financeStore.user" class="app-layout">
    <header class="mobile-header no-print">
      <h1 class="mobile-logo">Wimpi</h1>
      <button
        @click="toggleSidebar"
        class="hamburger-btn"
        aria-label="Buka menu"
      >
        <i data-feather="menu"></i>
      </button>
    </header>

    <!-- PERBAIKAN UTAMA: Pindahkan urutan agar overlay berada SETELAH sidebar -->
    <Sidebar :is-open="isSidebarOpen" @close-sidebar="closeSidebar" />
    <div
      v-if="isSidebarOpen"
      @click="closeSidebar"
      class="sidebar-overlay"
    ></div>

    <main class="main-content">
      <router-view />
    </main>

    <!-- AI Chatbot Widget - tersedia di semua halaman -->
    <AiChatWidget />
  </div>

  <!-- Jika ini adalah halaman otentikasi ATAU pengguna belum login, tampilkan kontennya saja -->
  <div v-else>
    <router-view />
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  min-height: 100vh;
  background-color: var(--background-color);
}
.main-content {
  flex-grow: 1;
  overflow-y: auto;
  padding: 24px;
}
.mobile-header {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  background-color: var(--surface-color);
  border-bottom: 1px solid var(--border-color);
  padding: 0 16px;
  align-items: center;
  justify-content: space-between;
  z-index: 100;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}
.mobile-logo {
  font-size: 20px;
  font-weight: 700;
  color: var(--primary-color);
}
.hamburger-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  color: var(--text-primary);
  line-height: 1;
}
.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 998;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
  backdrop-filter: blur(2px);
}
@media (max-width: 768px) {
  .app-layout {
    flex-direction: column;
  }
  .main-content {
    padding-top: 84px;
    padding-left: 16px;
    padding-right: 16px;
  }
  .mobile-header {
    display: flex;
  }
  /* Tampilkan overlay HANYA jika sidebar terbuka */
  .sidebar.is-open + .sidebar-overlay {
    opacity: 1;
    pointer-events: auto;
  }
}
</style>
