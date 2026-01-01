<script setup>
import { ref, watch, onMounted, nextTick } from "vue";
import { useRouter } from "vue-router";
import { useFinanceStore } from "@/store/finance";
import feather from "feather-icons";

const financeStore = useFinanceStore();
const router = useRouter();

// State lokal untuk form
const phone = ref("");
const loading = ref(false);
const successMessage = ref("");
const errorMessage = ref("");

// --- PERUBAHAN #1: State baru untuk modal konfirmasi ---
const showConfirmationModal = ref(false);

// Fungsi untuk mengisi form saat komponen dimuat
const populateForm = () => {
  if (financeStore.user && financeStore.user.user_metadata.phone) {
    phone.value = financeStore.user.user_metadata.phone.replace("+62", "");
  }
};

onMounted(() => {
  populateForm();
  nextTick(() => feather.replace());
});

// Watcher untuk format input nomor HP
watch(phone, (newValue) => {
  const digitsOnly = newValue.replace(/\D/g, "");
  phone.value = digitsOnly.slice(0, 12);
});

// Fungsi untuk menyimpan perubahan nomor HP
const handleSubmit = async () => {
  loading.value = true;
  errorMessage.value = "";
  successMessage.value = "";
  try {
    const currentUserPhone = financeStore.user?.user_metadata?.phone || "";
    if (phone.value && `+62${phone.value}` !== currentUserPhone) {
      if (phone.value.length < 9) {
        throw new Error("Nomor HP tidak valid. Minimal 9 digit setelah +62.");
      }
      const newData = {
        phone: `+62${phone.value}`,
      };
      await financeStore.updateUserProfile(newData);
      successMessage.value = "Nomor HP berhasil diperbarui!";
    } else {
      successMessage.value = "Tidak ada perubahan untuk disimpan.";
    }
  } catch (e) {
    errorMessage.value = e.message || "Gagal memperbarui profil.";
  } finally {
    loading.value = false;
  }
};

// --- PERUBAHAN #2: Fungsi baru untuk mengarahkan ke halaman update password ---
const redirectToUpdatePassword = () => {
  showConfirmationModal.value = false;
  router.push("/update-password");
};
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">Profil</h1>
    </div>

    <div class="card profile-card">
      <form @submit.prevent="handleSubmit">
        <h3 class="form-title">Informasi Pengguna</h3>

        <div class="form-group">
          <label for="email">Alamat Email</label>
          <input
            :value="financeStore.user?.email"
            id="email"
            type="email"
            class="form-input"
            disabled
          />
          <small>Alamat email tidak dapat diubah.</small>
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <div class="password-input-group">
            <input
              id="password"
              type="password"
              class="form-input"
              value="••••••••"
              disabled
            />
            <button
              type="button"
              class="button button-secondary change-password-btn"
              @click="showConfirmationModal = true"
            >
              Ubah
            </button>
          </div>
        </div>
        <div class="form-group">
          <label for="phone">Nomor HP</label>
          <div class="phone-input-group">
            <span class="country-code">+62</span>
            <input
              v-model="phone"
              id="phone"
              type="tel"
              inputmode="numeric"
              class="form-input phone-input"
              placeholder="81234567890"
              required
            />
          </div>
          <small v-if="!financeStore.user?.user_metadata.phone"
            >Tambahkan nomor HP Anda untuk keamanan.</small
          >
        </div>

        <div class="form-actions">
          <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>
          <p v-if="successMessage" class="success-text">{{ successMessage }}</p>
          <button
            type="submit"
            class="button button-primary"
            :disabled="loading"
          >
            <span v-if="loading">Menyimpan...</span>
            <span v-else>Simpan Perubahan</span>
          </button>
        </div>
      </form>

      <hr class="divider" />
    </div>

    <!-- --- PERUBAHAN #4: Modal Konfirmasi Baru --- -->
    <div
      v-if="showConfirmationModal"
      class="modal-overlay"
      @click.self="showConfirmationModal = false"
    >
      <div class="modal-content card fade-in">
        <h3 class="form-title">Konfirmasi Ubah Password</h3>
        <p class="info-text">
          Anda akan diarahkan ke halaman update password untuk membuat password
          baru. Sesi Anda saat ini akan tetap aktif. Lanjutkan?
        </p>
        <div class="modal-actions">
          <button
            type="button"
            class="button button-secondary"
            @click="showConfirmationModal = false"
          >
            Batal
          </button>
          <button
            type="button"
            class="button button-primary"
            @click="redirectToUpdatePassword"
          >
            Iya, Lanjutkan
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-header {
  margin-bottom: 24px;
}
.page-title {
  font-size: 28px;
}
.profile-card {
  max-width: 600px;
  margin: 0 auto;
}
.form-title {
  font-size: 18px;
  margin-bottom: 24px;
  font-weight: 600;
}
.form-group {
  display: flex;
  flex-direction: column;
  margin-bottom: 20px;
}
.form-group label {
  font-size: 14px;
  margin-bottom: 8px;
  font-weight: 500;
}
.form-group small {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 6px;
}
.form-input[disabled] {
  background-color: var(--background-color-light);
  cursor: not-allowed;
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
.form-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
  margin-top: 24px;
}
.error-text,
.success-text {
  width: 100%;
  text-align: center;
  font-size: 14px;
}
.error-text {
  color: var(--accent-red);
}
.success-text {
  color: var(--accent-green);
}
.divider {
  border: none;
  height: 1px;
  background-color: var(--border-color);
  margin: 32px 0;
}
.info-text {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
  text-align: center;
  margin-bottom: 24px;
}
.password-input-group {
  display: flex;
  gap: 12px;
}
.change-password-btn {
  flex-shrink: 0;
}
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
}
.modal-content {
  width: 100%;
  max-width: 400px;
  animation: fadeIn 0.3s ease-out;
}
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}
</style>
