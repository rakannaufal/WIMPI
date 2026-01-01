<script setup>
import { computed, onMounted, nextTick } from "vue";
import feather from "feather-icons";

// --- PERUBAHAN #1: Definisikan nomor WhatsApp dan buat link ---
const whatsappNumber = "6282299044050";
const whatsappMessage = "Halo tim Mapan, saya butuh bantuan.";

const whatsappLink = computed(() => {
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
    whatsappMessage
  )}`;
});

onMounted(() => {
  nextTick(() => {
    feather.replace();
  });
});
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">Bantuan via WhatsApp</h1>
    </div>

    <div class="contact-layout">
      <div class="card contact-card">
        <div class="icon-wrapper">
          <i data-feather="message-square"></i>
        </div>
        <h3 class="card-title">Butuh Bantuan atau Saran?</h3>
        <p class="info-text">
          Tim kami siap membantu Anda. Klik tombol di bawah ini untuk memulai
          percakapan langsung di WhatsApp.
        </p>
        <a :href="whatsappLink" target="_blank" class="button button-whatsapp">
          <i data-feather="send" class="button-icon"></i>
          <span>Chat di WhatsApp</span>
        </a>
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
.contact-layout {
  max-width: 500px;
  margin: 40px auto;
  text-align: center;
}
.contact-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 32px;
}
.icon-wrapper {
  background-color: #e6f8f0;
  color: #34d399;
  border-radius: 50%;
  width: 64px;
  height: 64px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 24px;
}
body.dark-theme .icon-wrapper {
  background-color: #2f4c47;
  color: #68d391;
}
.icon-wrapper i {
  width: 32px;
  height: 32px;
}
.card-title {
  font-size: 22px;
  margin-bottom: 12px;
  font-weight: 600;
  color: var(--text-primary);
}
.info-text {
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 32px;
  max-width: 350px;
}
.button-whatsapp {
  background-color: #25d366;
  color: white;
  font-weight: 600;
  padding: 12px 24px;
  text-decoration: none;
}
.button-whatsapp:hover {
  background-color: #1eae54;
  box-shadow: 0 6px 14px rgba(37, 211, 102, 0.3);
}
.button-icon {
  width: 18px;
  height: 18px;
  margin-right: 8px;
}
</style>
