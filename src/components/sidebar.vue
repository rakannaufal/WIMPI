<script setup>
import { onMounted, nextTick, computed, watch } from "vue";
import { useRouter } from "vue-router";
import { useFinanceStore } from "@/store/finance";
import { useThemeStore } from "@/store/theme";
import feather from "feather-icons";
import logoDark from "@/assets/logo-dark.png";
import logoLight from "@/assets/logo-light.png";

const props = defineProps({
  isOpen: Boolean,
});
const emit = defineEmits(["close-sidebar"]);

const financeStore = useFinanceStore();
const themeStore = useThemeStore();
const router = useRouter();

const appVersion = "1.4.0";

const currentLogo = computed(() => {
  return themeStore.theme === "light" ? logoDark : logoLight;
});

const userName = computed(() => {
  if (financeStore.user && financeStore.user.email) {
    return financeStore.user.email.split("@")[0];
  }
  return "Pengguna";
});

const userInitial = computed(() => userName.value.charAt(0).toUpperCase());

const navItems = [
  { name: "Dashboard", path: "/", icon: "home" },
  { name: "Transaksi", path: "/transactions", icon: "list" },
  { name: "Target", path: "/goals", icon: "flag" },
  { name: "Anggaran", path: "/budgets", icon: "target" },
  { name: "Laporan", path: "/reports", icon: "bar-chart-2" },
  { name: "Profil ", path: "/profile", icon: "user" },
  { name: "Hubungi Kami", path: "/contact", icon: "mail" },
];

const logout = async () => {
  await financeStore.signOut();
  router.push("/auth");
};

const handleNavLinkClick = () => {
  if (props.isOpen) {
    emit("close-sidebar");
  }
};

watch(
  () => [props.isOpen, themeStore.theme],
  () => {
    nextTick(() => {
      feather.replace();
    });
  },
  { deep: true, immediate: true }
);
</script>

<template>
  <aside class="sidebar no-print" :class="{ 'is-open': isOpen }">
    <div class="sidebar-header">
      <img :src="currentLogo" alt="Mapan Logo" class="logo-img" />
    </div>

    <div class="user-profile-section">
      <div class="avatar">{{ userInitial }}</div>
      <div class="user-info">
        <span class="user-name">{{ userName }}</span>
        <span class="user-email">{{ financeStore.user?.email || "" }}</span>
      </div>
    </div>

    <nav class="sidebar-nav">
      <ul>
        <li v-for="item in navItems" :key="item.path">
          <router-link
            :to="item.path"
            class="nav-link"
            @click="handleNavLinkClick"
          >
            <i :data-feather="item.icon" class="nav-icon"></i>
            <span>{{ item.name }}</span>
          </router-link>
        </li>

        <li class="nav-divider"></li>

        <li class="theme-switcher-container">
          <span class="theme-label">{{
            themeStore.theme === "light" ? "Mode Terang" : "Mode Gelap"
          }}</span>
          <label class="theme-switch">
            <input
              type="checkbox"
              :checked="themeStore.theme === 'dark'"
              @change="themeStore.toggleTheme"
              aria-label="Ganti tema"
            />
            <span class="switch-track">
              <span class="switch-thumb">
                <i
                  :key="themeStore.theme"
                  :data-feather="themeStore.theme === 'light' ? 'sun' : 'moon'"
                  class="theme-icon"
                ></i>
              </span>
            </span>
          </label>
        </li>

        <li>
          <button @click="logout" class="nav-link logout-button">
            <i data-feather="log-out" class="nav-icon"></i>
            <span>Keluar</span>
          </button>
        </li>
      </ul>

      <div class="app-version">Wimpi v{{ appVersion }}</div>
    </nav>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 256px;
  background-color: var(--surface-color);
  box-shadow: var(--shadow);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: transform 0.3s ease-in-out, background-color 0.3s ease;
  z-index: 1001;
}
.sidebar-header {
  padding: 24px;
  text-align: center;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
  transition: border-color 0.3s ease;
}
.logo-img {
  max-width: 120px;
  height: auto;
  margin: 0 auto;
}
.user-profile-section {
  display: flex;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
  transition: border-color 0.3s ease;
}
.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: var(--primary-color);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 18px;
  flex-shrink: 0;
  transition: background-color 0.3s ease;
}
.user-info {
  margin-left: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.user-name {
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}
.user-email {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}
.sidebar-nav {
  flex-grow: 1;
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}
.sidebar-nav ul {
  list-style: none;
  padding: 0;
  margin: 0;
}
.nav-link {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 12px 16px;
  margin-bottom: 8px;
  color: var(--text-secondary);
  border-radius: var(--border-radius);
  transition: all 0.2s ease;
  font-weight: 500;
  font-family: var(--font-family);
  font-size: 14px;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  text-decoration: none;
}
.nav-link:hover {
  background-color: var(--background-color-light, #f3f4f6);
  text-decoration: none;
  color: var(--primary-color);
}
.nav-link.router-link-exact-active {
  background-color: var(--primary-color);
  color: white;
  font-weight: 600;
  box-shadow: 0 4px 10px rgba(26, 35, 126, 0.2);
}
body.dark-theme .nav-link.router-link-exact-active {
  box-shadow: 0 4px 10px rgba(129, 140, 248, 0.2);
}
.nav-icon {
  width: 20px;
  height: 20px;
  margin-right: 16px;
}
.nav-divider {
  height: 1px;
  background-color: var(--border-color);
  margin: 8px 16px 16px;
  transition: background-color 0.3s ease;
}
.logout-button:hover {
  background-color: #fef2f2;
  color: var(--accent-red);
}
body.dark-theme .logout-button:hover {
  background-color: rgba(252, 129, 129, 0.1);
}
.theme-switcher-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  margin-bottom: 8px;
}
.theme-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
}
.theme-switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 28px;
}
.theme-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}
.switch-track {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--background-color-light, #ccc);
  transition: 0.4s;
  border-radius: 28px;
}
.switch-thumb {
  position: absolute;
  content: "";
  height: 22px;
  width: 22px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.4s;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.theme-icon {
  width: 14px;
  height: 14px;
  transition: transform 0.4s ease;
  color: #f6ad55;
}
input:checked + .switch-track {
  background-color: var(--primary-color);
}
input:checked + .switch-track .switch-thumb {
  transform: translateX(22px);
}
input:checked + .switch-track .theme-icon {
  color: var(--primary-color);
}
.app-version {
  margin-top: auto;
  padding-top: 16px;
  text-align: center;
  font-size: 12px;
  color: var(--text-secondary);
  user-select: none;
}
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    height: 100vh;
    transform: translateX(-100%);
    border-right: 1px solid var(--border-color);
  }
  .sidebar.is-open {
    transform: translateX(0);
  }
}
</style>
