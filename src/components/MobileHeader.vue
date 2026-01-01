<template>
  <header class="mobile-header no-print">
    <button @click="$emit('toggle-sidebar')" class="hamburger-button">
      <i data-feather="menu"></i>
    </button>
    <h1 class="logo">Mapan</h1>
  </header>
</template>

<script setup>
import { onMounted, nextTick } from "vue";
import feather from "feather-icons";

defineEmits(["toggle-sidebar"]);

onMounted(() => {
  nextTick(() => {
    feather.replace();
  });
});
</script>
<style scoped>
.mobile-header {
  display: none;
  position: sticky;
  top: 0;
  width: 100%;
  background-color: var(--surface-color);
  padding: 16px 24px;
  align-items: center;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.logo {
  font-size: 22px;
  font-weight: 700;
  color: var(--primary-color);
  margin: 0;
}

.hamburger-button {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-primary);
  margin-right: 16px;
  padding: 4px;
}

@media (max-width: 768px) {
  .mobile-header {
    display: flex;
  }
}
</style>
