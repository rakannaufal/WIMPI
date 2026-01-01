import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import { useThemeStore } from "@/store/theme"; // <-- Impor theme store
import "@/assets/style.css";

const app = createApp(App);
const pinia = createPinia(); // <-- Buat instance pinia
app.use(pinia);

// --- PERUBAHAN DI SINI ---
// Muat tema SEBELUM aplikasi di-mount untuk mencegah "flash"
const themeStore = useThemeStore();
themeStore.loadTheme();
// --- AKHIR PERUBAHAN ---

app.use(router);
app.mount("#app");
