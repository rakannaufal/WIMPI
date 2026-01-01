<script setup>
import { ref, computed, watch, nextTick } from "vue";
import { useFinanceStore } from "@/store/finance";
import feather from "feather-icons";

const financeStore = useFinanceStore();

const viewMode = ref("monthly");
const now = new Date();
const currentMonth = ref(
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
);
const currentYear = ref(now.getFullYear());

const activePeriod = computed(() => {
  return viewMode.value === "monthly"
    ? currentMonth.value
    : String(currentYear.value);
});

const showForm = ref(false);
const editingBudget = ref(null);
const initialFormState = { category: "", amount: null };
const formBudget = ref({ ...initialFormState });
const formattedAmount = ref("");

const newCategoryName = ref("");
const showNewCategoryInput = computed(() => {
  return formBudget.value.category === "Lainnya";
});

const expenseCategories = [
  "Makanan",
  "Transportasi",
  "Tagihan",
  "Hiburan",
  "Belanja",
  "Pendidikan",
  "Kesehatan",
  "Lainnya",
];
const budgetData = computed(() => financeStore.processedBudgets);

const categoryIcons = {
  Makanan: "coffee",
  Transportasi: "truck",
  Tagihan: "file-text",
  Hiburan: "film",
  Belanja: "shopping-cart",
  Pendidikan: "book-open",
  Kesehatan: "heart",
  Lainnya: "archive",
};

const summary = computed(() => {
  if (!budgetData.value.budgetItems)
    return { totalBudget: 0, totalSpent: 0, totalRemaining: 0 };
  const items = budgetData.value.budgetItems;
  const totalBudget = items.reduce((sum, item) => sum + item.amount, 0);
  const totalSpent = items.reduce((sum, item) => sum + item.spent, 0);
  return { totalBudget, totalSpent, totalRemaining: totalBudget - totalSpent };
});

const displayPeriod = computed(() => {
  if (viewMode.value === "monthly") {
    const [year, month] = currentMonth.value.split("-");
    return new Date(year, month - 1).toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric",
    });
  }
  return `Tahun ${currentYear.value}`;
});

const resetForm = () => {
  editingBudget.value = null;
  formBudget.value = { ...initialFormState };
  formattedAmount.value = "";
  newCategoryName.value = "";
  showForm.value = false;
};

const handleAddNew = () => {
  resetForm();
  showForm.value = true;
};

const startEdit = (budgetItem) => {
  editingBudget.value = budgetItem;
  formBudget.value = {
    category: budgetItem.category,
    amount: budgetItem.amount,
  };
  formattedAmount.value = new Intl.NumberFormat("id-ID").format(
    budgetItem.amount
  );

  if (!expenseCategories.includes(budgetItem.category)) {
    formBudget.value.category = "Lainnya";
    newCategoryName.value = budgetItem.category;
  } else {
    newCategoryName.value = "";
  }

  showForm.value = true;
  window.scrollTo({ top: 0, behavior: "smooth" });
};

const createBudgetFromUnbudgeted = (category) => {
  resetForm();
  if (!expenseCategories.includes(category)) {
    formBudget.value.category = "Lainnya";
    newCategoryName.value = category;
  } else {
    formBudget.value.category = category;
  }
  showForm.value = true;
  window.scrollTo({ top: 0, behavior: "smooth" });
};

watch(formattedAmount, (newValue) => {
  if (!newValue) {
    formBudget.value.amount = null;
    return;
  }
  const numericValue = parseInt(newValue.replace(/\D/g, ""), 10);
  if (!isNaN(numericValue)) {
    formBudget.value.amount = numericValue;
    const formatted = new Intl.NumberFormat("id-ID").format(numericValue);
    if (formattedAmount.value !== formatted) formattedAmount.value = formatted;
  } else {
    formBudget.value.amount = null;
  }
});

const handleSubmit = async () => {
  const dataToSave = {
    ...formBudget.value,
    period: activePeriod.value,
    type: viewMode.value,
  };

  if (dataToSave.category === "Lainnya") {
    if (newCategoryName.value.trim() === "") {
      alert("Nama kategori baru tidak boleh kosong.");
      return;
    }
    dataToSave.category = newCategoryName.value.trim();
  }

  if (editingBudget.value) dataToSave.id = editingBudget.value.id;
  try {
    await financeStore.addOrUpdateBudget(dataToSave);
    resetForm();
  } catch (e) {
    alert(e.message);
  }
};

const handleDelete = async (id) => {
  if (confirm("Yakin ingin menghapus anggaran ini?")) {
    await financeStore.deleteBudget(id);
  }
};

const handleCopyFromLastMonth = () => {
  const [year, month] = currentMonth.value.split("-").map(Number);
  const lastMonthDate = new Date(year, month - 2, 1);
  const lastPeriod = `${lastMonthDate.getFullYear()}-${String(
    lastMonthDate.getMonth() + 1
  ).padStart(2, "0")}`;
  if (confirm(`Salin & gabungkan anggaran dari ${lastPeriod}?`)) {
    financeStore.copyBudgetsFromLastMonth(currentMonth.value, lastPeriod);
  }
};

const changePeriod = (direction) => {
  if (viewMode.value === "monthly") {
    const [year, month] = currentMonth.value.split("-").map(Number);
    const date = new Date(year, month - 1, 1);
    date.setMonth(date.getMonth() + direction);
    currentMonth.value = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}`;
  } else {
    currentYear.value += direction;
  }
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value || 0);

watch(
  activePeriod,
  (newPeriod) => {
    if (newPeriod) financeStore.fetchBudgetsForPeriod(newPeriod);
  },
  { immediate: true }
);

watch(
  () => [budgetData.value, showForm.value],
  () => nextTick(() => feather.replace()),
  { deep: true, immediate: true }
);
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">Anggaran</h1>
      <button class="button button-primary" @click="handleAddNew">
        <i data-feather="plus" style="margin-right: 8px; width: 18px"></i>
        <span>Tambah Anggaran</span>
      </button>
    </div>

    <div v-if="showForm" class="card form-card fade-in">
      <form @submit.prevent="handleSubmit">
        <h3 class="form-title">
          {{ editingBudget ? "Edit Anggaran" : "Anggaran Baru" }}
        </h3>
        <div class="form-grid">
          <div class="form-group">
            <label>Kategori</label>
            <select
              v-model="formBudget.category"
              class="form-select"
              required
              :disabled="!!editingBudget"
            >
              <option disabled value="">Pilih Kategori</option>
              <option v-for="cat in expenseCategories" :key="cat" :value="cat">
                {{ cat }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>Jumlah Anggaran (Rp)</label>
            <input
              v-model="formattedAmount"
              type="text"
              inputmode="numeric"
              placeholder="0"
              required
              class="form-input text-right"
            />
          </div>
          <div
            v-if="showNewCategoryInput"
            class="form-group full-width fade-in"
          >
            <label>Nama Kategori Baru</label>
            <input
              v-model="newCategoryName"
              type="text"
              placeholder="Contoh: Dana Darurat"
              class="form-input"
              required
            />
          </div>
        </div>
        <div class="form-actions">
          <button
            type="button"
            class="button button-secondary"
            @click="resetForm"
          >
            Batal
          </button>
          <button type="submit" class="button button-primary">
            {{ editingBudget ? "Perbarui" : "Simpan" }}
          </button>
        </div>
      </form>
    </div>

    <div class="card period-controls">
      <div class="view-switcher">
        <button
          :class="{ active: viewMode === 'monthly' }"
          @click="viewMode = 'monthly'"
        >
          Bulanan
        </button>
        <button
          :class="{ active: viewMode === 'yearly' }"
          @click="viewMode = 'yearly'"
        >
          Tahunan
        </button>
      </div>
      <div class="period-navigation">
        <button class="nav-btn" @click="changePeriod(-1)">
          <i data-feather="chevron-left"></i>
        </button>
        <span class="period-display">{{ displayPeriod }}</span>
        <button class="nav-btn" @click="changePeriod(1)">
          <i data-feather="chevron-right"></i>
        </button>
      </div>
      <button
        v-if="viewMode === 'monthly'"
        class="button button-secondary copy-btn"
        @click="handleCopyFromLastMonth"
        title="Salin dari bulan lalu"
      >
        <i data-feather="copy" class="icon-sm"></i>
        <span class="desktop-only">Salin</span>
      </button>
    </div>

    <div class="main-layout">
      <div class="main-content">
        <div v-if="financeStore.loading" class="skeleton-loader-container">
          <div v-for="n in 3" :key="n" class="card skeleton-card"></div>
        </div>
        <div
          v-else-if="budgetData.budgetItems.length === 0"
          class="card empty-state"
        >
          <i data-feather="archive" class="empty-icon"></i>
          <h3>Belum Ada Anggaran</h3>
          <p>
            Buat anggaran baru untuk periode ini atau salin dari bulan
            sebelumnya.
          </p>
        </div>
        <div v-else class="budget-list">
          <div
            v-for="item in budgetData.budgetItems"
            :key="item.id"
            class="card budget-card"
          >
            <div class="card-header">
              <div class="category-info">
                <div class="icon-wrapper">
                  <i
                    :data-feather="categoryIcons[item.category] || 'archive'"
                  ></i>
                </div>
                <h4>{{ item.category }}</h4>
              </div>
              <div class="action-menu">
                <button @click="startEdit(item)">
                  <i data-feather="edit-2"></i>
                </button>
                <button @click="handleDelete(item.id)" class="delete-btn">
                  <i data-feather="trash"></i>
                </button>
              </div>
            </div>
            <div class="progress-bar-container">
              <div
                class="progress-bar"
                :style="{ width: Math.min(item.percentage, 100) + '%' }"
                :class="{
                  over: item.percentage > 100,
                  warn: item.percentage > 80 && item.percentage <= 100,
                }"
              ></div>
            </div>
            <div class="amount-details">
              <span class="spent-amount">{{ formatCurrency(item.spent) }}</span>
              <span class="budget-amount"
                >/ {{ formatCurrency(item.amount) }}</span
              >
            </div>
            <!-- --- PERBAIKAN UTAMA DI SINI --- -->
            <p
              class="remaining-amount"
              :class="{ red: item.remaining < 0, green: item.remaining >= 0 }"
            >
              <span v-if="item.remaining >= 0"
                >Sisa: {{ formatCurrency(item.remaining) }}</span
              >
              <span v-else
                >Kelebihan: {{ formatCurrency(Math.abs(item.remaining)) }}</span
              >
            </p>
          </div>
        </div>
      </div>

      <aside class="sidebar">
        <div class="card sticky-card">
          <h3 class="sidebar-title">Ringkasan</h3>
          <div class="summary-item">
            <span>Total Anggaran</span>
            <strong>{{ formatCurrency(summary.totalBudget) }}</strong>
          </div>
          <div class="summary-item">
            <span>Total Pengeluaran</span>
            <strong class="red">{{
              formatCurrency(summary.totalSpent)
            }}</strong>
          </div>
          <hr />
          <div class="summary-item total">
            <span>Sisa Keseluruhan</span>
            <strong
              :class="{
                green: summary.totalRemaining >= 0,
                red: summary.totalRemaining < 0,
              }"
            >
              {{ formatCurrency(summary.totalRemaining) }}
            </strong>
          </div>
        </div>

        <div
          v-if="
            !financeStore.loading && budgetData.unbudgetedSpending.length > 0
          "
          class="card sticky-card"
        >
          <h3 class="sidebar-title">Di Luar Anggaran</h3>
          <ul>
            <li
              v-for="item in budgetData.unbudgetedSpending"
              :key="item.category"
              class="unbudgeted-item"
            >
              <span>{{ item.category }}</span>
              <div class="unbudgeted-actions">
                <span class="red">{{ formatCurrency(item.spent) }}</span>
                <button
                  @click="createBudgetFromUnbudgeted(item.category)"
                  title="Buat Anggaran"
                  class="add-budget-btn"
                >
                  <i data-feather="plus-circle"></i>
                </button>
              </div>
            </li>
          </ul>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}
.page-title {
  font-size: 28px;
}
.main-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  margin-top: 24px;
}
@media (min-width: 1024px) {
  .main-layout {
    grid-template-columns: 2fr 1fr;
  }
}
.main-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.sidebar {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.sticky-card {
  position: sticky;
  top: 24px;
}
.icon-sm {
  width: 18px;
  height: 18px;
  margin-right: 8px;
}
.desktop-only {
  display: none;
}
@media (min-width: 768px) {
  .desktop-only {
    display: inline;
  }
}
.fade-in {
  animation: fadeIn 0.3s ease-out;
}
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
.form-card {
  margin-bottom: 24px;
}
.form-title {
  font-size: 18px;
  margin-bottom: 24px;
  font-weight: 600;
}
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  align-items: end;
}
.form-group {
  display: flex;
  flex-direction: column;
}
.form-group.full-width {
  grid-column: 1 / -1;
}
.form-group label {
  font-size: 14px;
  margin-bottom: 6px;
  font-weight: 500;
}
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}
.period-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}
.view-switcher {
  display: flex;
  background-color: #f3f4f6;
  border-radius: 8px;
  padding: 4px;
}
.view-switcher button {
  background: none;
  border: none;
  padding: 6px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  color: var(--text-secondary);
  transition: all 0.2s ease;
}
.view-switcher button.active {
  background-color: var(--surface-color);
  color: var(--primary-color);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
.period-navigation {
  display: flex;
  align-items: center;
  gap: 12px;
}
.period-display {
  font-weight: 600;
  font-size: 18px;
  min-width: 150px;
  text-align: center;
}
.nav-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-primary);
  padding: 8px;
  border-radius: 50%;
  line-height: 1;
}
.nav-btn:hover {
  background-color: var(--background-color-light);
}
.copy-btn {
  padding-left: 12px;
  padding-right: 12px;
}
.budget-card {
  padding: 20px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.category-info {
  display: flex;
  align-items: center;
  gap: 12px;
}
.category-info h4 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}
.icon-wrapper {
  background-color: var(--background-color-light);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-color);
}
.icon-wrapper i {
  width: 20px;
  height: 20px;
}
.action-menu {
  display: flex;
  gap: 8px;
}
.action-menu button {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 4px;
}
.action-menu button:hover {
  color: var(--primary-color);
}
.action-menu button.delete-btn:hover {
  color: var(--accent-red);
}
.progress-bar-container {
  width: 100%;
  background-color: #e9ecef;
  border-radius: 99px;
  height: 10px;
  overflow: hidden;
  margin-bottom: 8px;
}
body.dark-theme .progress-bar-container {
  background-color: var(--background-color);
}
.progress-bar {
  height: 100%;
  background-color: var(--accent-green);
  border-radius: 99px;
  transition: width 0.5s ease;
}
.progress-bar.warn {
  background-color: #f6ad55;
}
.progress-bar.over {
  background-color: var(--accent-red);
}
.amount-details {
  font-size: 16px;
}
.spent-amount {
  font-weight: 600;
}
.budget-amount {
  color: var(--text-secondary);
  font-size: 14px;
}
.remaining-amount {
  font-size: 13px;
  margin-top: 4px;
}
.red {
  color: var(--accent-red) !important;
}
.green {
  color: var(--accent-green) !important;
}
.sidebar-title {
  font-size: 18px;
  margin-bottom: 16px;
}
.summary-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  font-size: 14px;
}
.summary-item.total {
  font-size: 16px;
  margin-top: 12px;
}
hr {
  border: none;
  height: 1px;
  background-color: var(--border-color);
  margin: 12px 0;
}
.unbudgeted-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid var(--border-color);
  list-style-type: none;
}
.unbudgeted-item:last-child {
  border: none;
}
.unbudgeted-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.add-budget-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--accent-green);
  padding: 0;
  line-height: 1;
}
.add-budget-btn i {
  width: 20px;
  height: 20px;
}
.empty-state {
  text-align: center;
  padding: 60px 20px;
}
.empty-icon {
  width: 64px;
  height: 64px;
  color: var(--text-secondary);
  margin-bottom: 16px;
}
.empty-state h3 {
  font-size: 20px;
  margin-bottom: 8px;
}
.empty-state p {
  color: var(--text-secondary);
  max-width: 300px;
  margin: auto;
}
.skeleton-loader-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.skeleton-card {
  height: 180px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
}
@keyframes skeleton-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
@media (max-width: 768px) {
  .page-title {
    font-size: 24px;
  }
}
</style>
