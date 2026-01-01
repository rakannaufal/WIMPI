<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import supabase from "@/supabaseClient";
import logoMapan from "@/assets/logo-auth.png";

const router = useRouter();

const newPassword = ref("");
const loading = ref(false);
const errorMessage = ref("");
const successMessage = ref(""); // Kita tambahkan ini untuk pesan sukses

const handleUpdatePassword = async () => {
  loading.value = true;
  errorMessage.value = "";
  successMessage.value = "";
  try {
    if (newPassword.value.length < 6) {
      throw new Error("Password baru harus minimal 6 karakter.");
    }
    const { error } = await supabase.auth.updateUser({
      password: newPassword.value,
    });
    if (error) throw error;

    // Tampilkan pesan sukses, lalu arahkan setelah beberapa saat
    successMessage.value = "Password berhasil diperbarui!";
    setTimeout(() => {
      // Jika pengguna datang dari alur "Lupa Password", mereka perlu login ulang
      // Jika dari halaman profil, mereka bisa kembali ke profil
      // Untuk simplicity, kita bisa arahkan ke profil saja.
      router.push("/profile");
    }, 2000);
  } catch (e) {
    errorMessage.value = e.message || "Gagal memperbarui password.";
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="auth-container">
    <div class="auth-box">
      <div class="auth-header">
        <img :src="logoMapan" alt="Mapan Logo" class="logo" />
        <p class="subtitle">Buat Password Baru</p>
      </div>

      <div class="auth-content card">
        <!-- Form langsung ditampilkan -->
        <form class="auth-form" @submit.prevent="handleUpdatePassword">
          <p class="info-text">
            Silakan masukkan password baru Anda. Anda akan tetap login setelah
            menyimpan.
          </p>
          <div class="form-group">
            <label for="new-password">Password Baru</label>
            <input
              v-model="newPassword"
              id="new-password"
              type="password"
              required
              class="form-input"
              placeholder="Minimal 6 karakter"
              autofocus
            />
          </div>
          <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>
          <p v-if="successMessage" class="success-text">{{ successMessage }}</p>
          <button
            type="submit"
            class="button button-primary auth-submit-button"
            :disabled="loading"
          >
            <span v-if="loading">Menyimpan...</span>
            <span v-else>Simpan Password Baru</span>
          </button>
        </form>

        <p class="toggle-text">
          <router-link to="/profile">Kembali ke Profil</router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Style ini bisa disalin dari halaman Auth lainnya untuk konsistensi */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.auth-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #eef2f7 100%);
  padding: 20px;
}
.auth-box {
  width: 100%;
  max-width: 400px;
  animation: fadeIn 0.5s ease-out;
}
.auth-header {
  text-align: center;
  margin-bottom: 32px;
}
.logo {
  max-width: 130px;
  height: auto;
  margin: 0 auto;
  margin-bottom: 12px;
}
.subtitle {
  margin-top: 0;
  color: var(--text-secondary);
  font-size: 16px;
}
.auth-content.card {
  padding: 32px;
}
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.info-text {
  font-size: 14px;
  color: var(--text-secondary);
  text-align: center;
  margin-bottom: 8px;
  line-height: 1.6;
}
.form-group {
  display: flex;
  flex-direction: column;
}
.form-group label {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
}
.auth-submit-button {
  width: 100%;
  padding-top: 12px;
  padding-bottom: 12px;
}
.error-text {
  color: var(--accent-red);
  font-size: 14px;
  text-align: center;
}
.success-text {
  color: var(--accent-green);
  font-size: 14px;
  text-align: center;
}
.toggle-text {
  font-size: 14px;
  text-align: center;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--border-color);
}
.toggle-text a {
  font-weight: 600;
  text-decoration: none;
  color: var(--primary-color);
}
</style>
