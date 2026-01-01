<script setup>
import { ref } from "vue";
import supabase from "@/supabaseClient";

const email = ref("");
const loading = ref(false);
const errorMessage = ref("");
const successMessage = ref("");

const handlePasswordReset = async () => {
  loading.value = true;
  errorMessage.value = "";
  successMessage.value = "";
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email.value, {
      redirectTo: `${window.location.origin}/update-password`,
    });
    if (error) throw error;
    successMessage.value =
      "Link reset password telah dikirim. Silakan periksa inbox (dan folder spam) email Anda.";
  } catch (e) {
    errorMessage.value = e.message || "Gagal mengirim email reset.";
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="auth-container">
    <div class="auth-box">
      <div class="auth-header">
        <h1 class="logo">MAPAN</h1>
        <p class="subtitle">Lupa Password Anda?</p>
      </div>

      <div class="auth-content card">
        <form class="auth-form" @submit.prevent="handlePasswordReset">
          <p class="info-text">
            Jangan khawatir. Masukkan email Anda yang terdaftar dan kami akan
            mengirimkan link untuk membuat password baru.
          </p>
          <div class="form-group">
            <label for="email-reset">Alamat Email</label>
            <input
              v-model="email"
              id="email-reset"
              type="email"
              required
              class="form-input"
              placeholder="anda@email.com"
              autofocus
            />
          </div>
          <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>
          <p v-if="successMessage" class="success-text">{{ successMessage }}</p>
          <!-- --- PERBAIKAN UTAMA DI SINI --- -->
          <button
            type="submit"
            class="button button-primary auth-submit-button"
            :disabled="loading"
          >
            <span v-if="loading">Mengirim...</span>
            <span v-else>Kirim Link Reset</span>
          </button>
        </form>

        <p class="toggle-text">
          <router-link to="/auth">Kembali ke Halaman Masuk</router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
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
  font-size: 36px;
  font-weight: 700;
  color: var(--primary-color);
  margin: 0;
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
