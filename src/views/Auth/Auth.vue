<script setup>
import { ref, onMounted, nextTick, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import supabase from "@/supabaseClient";
import feather from "feather-icons";

const router = useRouter();
const route = useRoute();

const view = ref("login");
const email = ref("");
const phone = ref("");
const password = ref("");
const confirmPassword = ref("");
const loading = ref(false);
const errorMessage = ref("");
const successMessage = ref("");

onMounted(() => {
  if (route.query.message) {
    successMessage.value = route.query.message;
  }
  nextTick(() => feather.replace());
});

const handleAuth = async () => {
  loading.value = true;
  errorMessage.value = "";
  successMessage.value = "";
  try {
    if (view.value === "login") {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.value,
        password: password.value,
      });
      if (error) throw error;
      router.push("/");
    } else if (view.value === "register") {
      if (password.value !== confirmPassword.value)
        throw new Error("Konfirmasi password tidak cocok.");
      if (password.value.length < 6)
        throw new Error("Password harus terdiri dari minimal 6 karakter.");
      const { error } = await supabase.auth.signUp({
        email: email.value,
        password: password.value,
        options: { data: { phone: `+62${phone.value}` } },
      });
      if (error) throw error;
      successMessage.value =
        "Pendaftaran berhasil! Silakan cek email Anda untuk verifikasi.";
      view.value = "login";
    }
  } catch (e) {
    errorMessage.value = e.message || "Terjadi kesalahan.";
  } finally {
    loading.value = false;
  }
};

const signInWithGoogle = async () => {
  loading.value = true;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin },
  });
  if (error) {
    errorMessage.value = error.message;
    loading.value = false;
  }
};

watch(phone, (newValue) => {
  const digitsOnly = newValue.replace(/\D/g, "");
  phone.value = digitsOnly.slice(0, 12);
});

watch(view, () => nextTick(() => feather.replace()));
</script>

<template>
  <div class="auth-container">
    <div class="auth-box">
      <div class="auth-header">
        <h1 class="logo">WIMPI</h1>
        <p class="subtitle">
          {{
            view === "login" ? "Masuk untuk melanjutkan" : "Buat akun baru Anda"
          }}
        </p>
      </div>
      <div class="auth-content card">
        <form
          v-if="view === 'login'"
          class="auth-form"
          @submit.prevent="handleAuth"
        >
          <div class="form-group">
            <label for="email">Alamat Email</label>
            <input
              v-model="email"
              id="email"
              type="email"
              required
              class="form-input"
              placeholder="anda@email.com"
            />
          </div>
          <div class="form-group">
            <label for="password">Password</label>
            <input
              v-model="password"
              id="password"
              type="password"
              required
              class="form-input"
              placeholder="••••••••"
            />
          </div>
          <router-link to="/forgot-password" class="forgot-password"
            >Lupa Password?</router-link
          >
          <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>
          <p v-if="successMessage" class="success-text">{{ successMessage }}</p>
          <button
            type="submit"
            class="button button-primary auth-submit-button"
            :disabled="loading"
          >
            <span v-if="loading">Memproses...</span>
            <span v-else>Masuk</span>
          </button>
        </form>

        <form
          v-if="view === 'register'"
          class="auth-form"
          @submit.prevent="handleAuth"
        >
          <div class="form-group">
            <label for="email-reg">Alamat Email</label>
            <input
              v-model="email"
              id="email-reg"
              type="email"
              required
              class="form-input"
              placeholder="anda@email.com"
            />
          </div>
          <div class="form-group">
            <label for="phone-reg">Nomor HP</label>
            <div class="phone-input-group">
              <span class="country-code">+62</span>
              <input
                v-model="phone"
                id="phone-reg"
                type="tel"
                inputmode="numeric"
                required
                class="form-input phone-input"
                placeholder="81234567890"
              />
            </div>
          </div>
          <div class="form-group">
            <label for="password-reg">Password</label>
            <input
              v-model="password"
              id="password-reg"
              type="password"
              required
              class="form-input"
              placeholder="Minimal 6 karakter"
            />
          </div>
          <div class="form-group">
            <label for="confirm-password-reg">Konfirmasi Password</label>
            <input
              v-model="confirmPassword"
              id="confirm-password-reg"
              type="password"
              required
              class="form-input"
              placeholder="Ulangi password"
            />
          </div>
          <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>
          <button
            type="submit"
            class="button button-primary auth-submit-button"
            :disabled="loading"
          >
            <span v-if="loading">Memproses...</span>
            <span v-else>Daftar Akun</span>
          </button>
        </form>

        <template v-if="view === 'login' || view === 'register'">
          <div class="divider"><span>Atau</span></div>
          <button
            @click="signInWithGoogle"
            class="button button-secondary google-btn"
            :disabled="loading"
          >
            <svg class="google-icon" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            <span>Masuk dengan Google</span>
          </button>
          <p class="toggle-text">
            {{ view === "login" ? "Belum punya akun?" : "Sudah punya akun?" }}
            <a
              href="#"
              @click.prevent="view = view === 'login' ? 'register' : 'login'"
              >{{ view === "login" ? "Daftar di sini" : "Masuk di sini" }}</a
            >
          </p>
        </template>
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
.forgot-password {
  font-size: 13px;
  text-align: right;
  color: var(--primary-color);
  margin-top: -12px;
  text-decoration: none;
}
.forgot-password:hover {
  text-decoration: underline;
}
.divider {
  display: flex;
  align-items: center;
  text-align: center;
  margin: 24px 0;
  color: var(--text-secondary);
  font-size: 14px;
}
.divider::before,
.divider::after {
  content: "";
  flex: 1;
  border-bottom: 1px solid var(--border-color);
}
.divider:not(:empty)::before {
  margin-right: 0.75em;
}
.divider:not(:empty)::after {
  margin-left: 0.75em;
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
  color: var(--text-secondary);
}
.toggle-text a {
  font-weight: 600;
  text-decoration: none;
}
.phone-input-group {
  position: relative;
  display: flex;
  align-items: center;
}
.country-code {
  position: absolute;
  left: 12px;
  color: var(--text-secondary);
  font-size: 14px;
  pointer-events: none;
}
.phone-input {
  padding-left: 45px;
}
.google-btn {
  width: 100%;
  justify-content: center;
  gap: 12px;
  background-color: var(--surface-color);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}
.google-btn:hover:not(:disabled) {
  background-color: #f7fafc;
}
.google-icon {
  width: 18px;
  height: 18px;
}
</style>
