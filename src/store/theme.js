import { defineStore } from "pinia";
import { ref } from "vue";

export const useThemeStore = defineStore("theme", () => {
  // Secara default, tema diatur ke 'light'
  const theme = ref("light");

  // Fungsi untuk menerapkan tema ke seluruh aplikasi
  function applyTheme(newTheme) {
    theme.value = newTheme;
    // Simpan pilihan pengguna di localStorage agar diingat
    localStorage.setItem("user-theme", newTheme);
    // Tambahkan atau hapus kelas 'dark-theme' dari <body>
    if (newTheme === "dark") {
      document.body.classList.add("dark-theme");
    } else {
      document.body.classList.remove("dark-theme");
    }
  }

  // Fungsi untuk mengganti tema
  function toggleTheme() {
    const newTheme = theme.value === "light" ? "dark" : "light";
    applyTheme(newTheme);
  }

  // Fungsi yang dipanggil saat aplikasi pertama kali dimuat
  function loadTheme() {
    const savedTheme = localStorage.getItem("user-theme");
    // Cek preferensi sistem pengguna (apakah OS mereka dalam mode gelap)
    const prefersDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;

    if (savedTheme) {
      applyTheme(savedTheme);
    } else if (prefersDark) {
      applyTheme("dark");
    } else {
      applyTheme("light");
    }
  }

  return { theme, toggleTheme, loadTheme };
});
