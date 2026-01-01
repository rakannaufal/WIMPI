<script setup>
import { ref, watch, nextTick, computed, onMounted } from "vue";
import { useFinanceStore } from "@/store/finance";
import feather from "feather-icons";

const financeStore = useFinanceStore();
const showForm = ref(false);
const editingTxId = ref(null);

// --- STATE BARU UNTUK FILTER ---
const filterMode = ref("monthly"); // Opsi: 'daily', 'monthly', 'yearly', 'custom'
const now = new Date();
const currentDay = ref(now.toISOString().slice(0, 10));
const currentMonth = ref(
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
);
const currentYear = ref(now.getFullYear());
const customStartDate = ref(
  new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
);
const customEndDate = ref(now.toISOString().slice(0, 10));

// --- STATE BARU UNTUK PENCARIAN ---
const searchKeyword = ref("");

// --- STATE BARU UNTUK PENGURUTAN (SORTING) ---
const sortKey = ref("transaction_at"); // Default: urutkan berdasarkan waktu
const sortDirection = ref("desc"); // Default: dari yang terbaru

// --- COMPUTED PROPERTIES BARU UNTUK FILTER & SORTING ---
const displayPeriod = computed(() => {
  if (filterMode.value === "daily") {
    return new Date(currentDay.value).toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }
  if (filterMode.value === "monthly") {
    const [year, month] = currentMonth.value.split("-");
    return new Date(year, month - 1).toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric",
    });
  }
  if (filterMode.value === "yearly") {
    return `Tahun ${currentYear.value}`;
  }
  return "Pilih Rentang Tanggal";
});

const sortedAndFilteredTransactions = computed(() => {
  if (!financeStore.transactions) return [];

  // 1. FILTER BERDASARKAN TANGGAL
  let dateFiltered;
  let start, end;

  switch (filterMode.value) {
    case "monthly":
      start = new Date(currentMonth.value);
      end = new Date(
        start.getFullYear(),
        start.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      );
      break;
    case "yearly":
      start = new Date(currentYear.value, 0, 1);
      end = new Date(currentYear.value, 11, 31, 23, 59, 59, 999);
      break;
    case "custom":
      start = new Date(customStartDate.value);
      start.setHours(0, 0, 0, 0);
      end = new Date(customEndDate.value);
      end.setHours(23, 59, 59, 999);
      break;
    case "daily":
    default:
      const today = new Date(currentDay.value);
      start = new Date(today.setUTCHours(0, 0, 0, 0));
      end = new Date(today.setUTCHours(23, 59, 59, 999));
      break;
  }

  dateFiltered = financeStore.transactions.filter((tx) => {
    const txDate = new Date(tx.transaction_at);
    return txDate >= start && txDate <= end;
  });

  // 2. FILTER BERDASARKAN KEYWORD PENCARIAN
  let finalFiltered = dateFiltered;
  if (searchKeyword.value.trim() !== "") {
    const searchTerm = searchKeyword.value.trim().toLowerCase();
    finalFiltered = dateFiltered.filter((tx) => {
      const categoryMatch = tx.category.toLowerCase().includes(searchTerm);
      const notesMatch =
        tx.notes && tx.notes.toLowerCase().includes(searchTerm);
      return categoryMatch || notesMatch;
    });
  }

  // 3. TERAPKAN PENGURUTAN (SORTING)
  return [...finalFiltered].sort((a, b) => {
    let valA = a[sortKey.value];
    let valB = b[sortKey.value];

    if (sortKey.value === "transaction_at") {
      valA = new Date(valA).getTime();
      valB = new Date(valB).getTime();
    }

    if (sortDirection.value === "asc") {
      return valA > valB ? 1 : -1;
    } else {
      return valA < valB ? 1 : -1;
    }
  });
});

// --- FUNGSI BARU UNTUK NAVIGASI PERIODE & PENGURUTAN ---
const changePeriod = (direction) => {
  if (filterMode.value === "daily") {
    const date = new Date(currentDay.value);
    date.setDate(date.getDate() + direction);
    currentDay.value = date.toISOString().slice(0, 10);
  } else if (filterMode.value === "monthly") {
    const [year, month] = currentMonth.value.split("-").map(Number);
    const date = new Date(year, month - 1, 1);
    date.setMonth(date.getMonth() + direction);
    currentMonth.value = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}`;
  } else if (filterMode.value === "yearly") {
    currentYear.value += direction;
  }
};

const setSort = (key) => {
  if (sortKey.value === key) {
    sortDirection.value = sortDirection.value === "asc" ? "desc" : "asc";
  } else {
    sortKey.value = key;
    sortDirection.value = key === "transaction_at" ? "desc" : "asc"; // Default asc untuk jumlah
  }
};

// --- SISA KODE (TIDAK BERUBAH) ---
const getCurrentTime = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes()
  ).padStart(2, "0")}`;
};
const initialFormState = {
  date: new Date().toISOString().slice(0, 10),
  time: getCurrentTime(),
  category: "",
  amount: null,
  type: "Pengeluaran",
  notes: "",
};
const formTx = ref({ ...initialFormState });
const formattedAmount = ref("");
const newCategoryName = ref("");
const expenseCategories = [
  "Makanan",
  "Jajan",
  "Transportasi",
  "Tagihan",
  "Hiburan",
  "Belanja",
  "Pendidikan",
  "Kesehatan",
  "Tabungan Target",
  "Lainnya",
];
const incomeCategories = [
  "Gaji",
  "Jajan",
  "Bonus",
  "Freelance",
  "Investasi",
  "Hadiah",
  "Lainnya",
];
const currentCategories = computed(() =>
  formTx.value.type === "Pemasukan" ? incomeCategories : expenseCategories
);
const showNewCategoryInput = computed(
  () => formTx.value.category === "Lainnya"
);

const resetForm = () => {
  editingTxId.value = null;
  formTx.value = { ...initialFormState, time: getCurrentTime() };
  formattedAmount.value = "";
  newCategoryName.value = "";
  showForm.value = false;
};

const handleAddNew = () => {
  resetForm();
  showForm.value = true;
};

const startEdit = (tx) => {
  const txDate = new Date(tx.transaction_at);
  formTx.value = {
    ...tx,
    date: txDate.toISOString().slice(0, 10),
    time: txDate.toTimeString().slice(0, 5),
  };
  formattedAmount.value = new Intl.NumberFormat("id-ID").format(tx.amount);
  editingTxId.value = tx.id;
  const standardCategories =
    tx.type === "Pemasukan" ? incomeCategories : expenseCategories;
  if (!standardCategories.includes(tx.category)) {
    formTx.value.category = "Lainnya";
    newCategoryName.value = tx.category;
  } else {
    newCategoryName.value = "";
  }
  showForm.value = true;
};

watch(
  () => formTx.value.type,
  (newType, oldType) => {
    if (newType !== oldType) {
      formTx.value.category = "";
      newCategoryName.value = "";
    }
  }
);

watch(formattedAmount, (newValue) => {
  if (!newValue) {
    formTx.value.amount = null;
    return;
  }
  const numericValue = parseInt(newValue.replace(/\D/g, ""), 10);
  if (!isNaN(numericValue)) {
    formTx.value.amount = numericValue;
    const formatted = new Intl.NumberFormat("id-ID").format(numericValue);
    if (formattedAmount.value !== formatted) formattedAmount.value = formatted;
  } else {
    formTx.value.amount = null;
  }
});

const handleSubmit = async () => {
  const dataToSave = { ...formTx.value };
  if (dataToSave.category === "Lainnya") {
    if (!newCategoryName.value.trim()) {
      alert("Nama kategori baru tidak boleh kosong.");
      return;
    }
    dataToSave.category = newCategoryName.value.trim();
  }
  const combinedDateTime = new Date(`${dataToSave.date}T${dataToSave.time}`);
  dataToSave.transaction_at = combinedDateTime.toISOString();
  delete dataToSave.date;
  delete dataToSave.time;
  try {
    if (editingTxId.value) {
      await financeStore.updateTransaction(editingTxId.value, dataToSave);
    } else {
      await financeStore.addTransaction(dataToSave);
    }
    resetForm();
  } catch (e) {
    alert(e.message);
  }
};

const handleDelete = async (id) => {
  if (confirm("Apakah Anda yakin ingin menghapus transaksi ini?")) {
    try {
      await financeStore.deleteTransaction(id);
    } catch (e) {
      alert(e.message);
    }
  }
};

const formatDateTime = (isoString) => {
  if (!isoString) return "";
  return new Date(isoString).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);

onMounted(() => {
  financeStore.fetchAllTransactions();
});

watch(
  () => [
    financeStore.transactions,
    filterMode.value,
    showForm.value,
    sortKey.value,
    sortDirection.value,
    searchKeyword.value, // Tambahkan searchKeyword ke watcher
  ],
  () => {
    nextTick(() => feather.replace());
  },
  { deep: true, immediate: true }
);
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">Transaksi</h1>
      <button class="button button-primary" @click="handleAddNew">
        <i data-feather="plus" style="margin-right: 8px; width: 18px"></i>
        Tambah Transaksi
      </button>
    </div>

    <div v-if="showForm" class="card form-card">
      <form @submit.prevent="handleSubmit">
        <h3 class="form-title">
          {{ editingTxId ? "Edit Transaksi" : "Transaksi Baru" }}
        </h3>
        <div class="form-grid">
          <div class="form-group">
            <label>Jenis</label
            ><select v-model="formTx.type" class="form-select">
              <option>Pengeluaran</option>
              <option>Pemasukan</option>
            </select>
          </div>
          <div class="form-group">
            <label>Jumlah (Rp)</label
            ><input
              v-model="formattedAmount"
              type="text"
              inputmode="numeric"
              placeholder="0"
              required
              class="form-input text-right"
            />
          </div>
          <div class="form-group">
            <label>Kategori</label
            ><select v-model="formTx.category" class="form-select" required>
              <option disabled value="">Pilih Kategori</option>
              <option v-for="cat in currentCategories" :key="cat">
                {{ cat }}
              </option>
            </select>
          </div>
          <div v-if="showNewCategoryInput" class="form-group">
            <label>Nama Kategori Baru</label
            ><input
              v-model="newCategoryName"
              type="text"
              placeholder="Contoh: Donasi"
              class="form-input"
              required
            />
          </div>
          <div class="form-group">
            <label>Tanggal</label
            ><input
              v-model="formTx.date"
              type="date"
              required
              class="form-input"
            />
          </div>
          <div class="form-group">
            <label>Waktu</label
            ><input
              v-model="formTx.time"
              type="time"
              required
              class="form-input"
            />
          </div>
          <div class="form-group full-width">
            <label>Catatan (Opsional)</label
            ><textarea
              v-model="formTx.notes"
              class="form-textarea"
              rows="2"
            ></textarea>
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
            {{ editingTxId ? "Perbarui" : "Simpan" }}
          </button>
        </div>
      </form>
    </div>

    <div class="card period-controls">
      <div class="view-switcher">
        <button
          :class="{ active: filterMode === 'daily' }"
          @click="
            filterMode = 'daily';
            currentDay = new Date().toISOString().slice(0, 10);
          "
        >
          Harian
        </button>
        <button
          :class="{ active: filterMode === 'monthly' }"
          @click="filterMode = 'monthly'"
        >
          Bulanan
        </button>
        <button
          :class="{ active: filterMode === 'yearly' }"
          @click="filterMode = 'yearly'"
        >
          Tahunan
        </button>
        <button
          :class="{ active: filterMode === 'custom' }"
          @click="filterMode = 'custom'"
        >
          Kustom
        </button>
      </div>

      <div class="search-wrapper">
        <i data-feather="search" class="search-icon"></i>
        <input
          v-model="searchKeyword"
          type="text"
          placeholder="Cari kategori atau catatan..."
          class="search-input"
        />
      </div>

      <div v-if="filterMode !== 'custom'" class="period-navigation">
        <button class="nav-btn" @click="changePeriod(-1)">
          <i data-feather="chevron-left"></i>
        </button>
        <span class="period-display">{{ displayPeriod }}</span>
        <button class="nav-btn" @click="changePeriod(1)">
          <i data-feather="chevron-right"></i>
        </button>
      </div>

      <div v-if="filterMode === 'custom'" class="custom-date-range">
        <div class="form-group">
          <label for="start-date">Dari Tanggal</label>
          <input
            v-model="customStartDate"
            id="start-date"
            type="date"
            class="form-input"
          />
        </div>
        <div class="form-group">
          <label for="end-date">Sampai Tanggal</label>
          <input
            v-model="customEndDate"
            id="end-date"
            type="date"
            class="form-input"
          />
        </div>
      </div>
    </div>

    <div class="card table-container">
      <table class="transaction-table">
        <thead>
          <tr>
            <th @click="setSort('transaction_at')" class="sortable">
              Waktu
              <i
                v-if="sortKey === 'transaction_at'"
                :data-feather="
                  sortDirection === 'asc' ? 'arrow-up' : 'arrow-down'
                "
                class="sort-icon"
              ></i>
            </th>
            <th>Kategori</th>
            <th>Keterangan</th>
            <th @click="setSort('amount')" class="text-right sortable">
              <i
                v-if="sortKey === 'amount'"
                :data-feather="
                  sortDirection === 'asc' ? 'arrow-up' : 'arrow-down'
                "
                class="sort-icon"
              ></i>
              Jumlah
            </th>
            <th class="action-header">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="financeStore.loading">
            <td colspan="5" class="state-cell">Memuat...</td>
          </tr>
          <tr v-else-if="sortedAndFilteredTransactions.length === 0">
            <td colspan="5" class="state-cell">
              Tidak ada transaksi yang cocok dengan filter atau pencarian Anda.
            </td>
          </tr>
          <tr v-for="tx in sortedAndFilteredTransactions" :key="tx.id">
            <td>{{ formatDateTime(tx.transaction_at) }}</td>
            <td>{{ tx.category }}</td>
            <td class="notes-cell">{{ tx.notes }}</td>
            <td
              class="text-right"
              :class="tx.type === 'Pemasukan' ? 'green' : 'red'"
            >
              {{ tx.type === "Pemasukan" ? "+" : "-" }}
              {{ formatCurrency(tx.amount) }}
            </td>
            <td class="action-cell">
              <div class="action-buttons-wrapper">
                <button
                  class="action-btn edit-btn"
                  @click="startEdit(tx)"
                  title="Edit"
                >
                  <i data-feather="edit-2"></i>
                </button>
                <button
                  class="action-btn delete-btn"
                  @click="handleDelete(tx.id)"
                  title="Hapus"
                >
                  <i data-feather="trash"></i>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
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
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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
.table-container {
  overflow-x: auto;
}
.transaction-table {
  width: 100%;
  border-collapse: collapse;
}
.transaction-table th,
.transaction-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
  white-space: nowrap;
  vertical-align: middle;
}
.transaction-table th {
  font-weight: 600;
  color: var(--text-secondary);
  font-size: 12px;
  text-transform: uppercase;
}
.transaction-table tbody tr:last-child td {
  border-bottom: none;
}
.notes-cell {
  white-space: normal;
  max-width: 300px;
}
.state-cell {
  text-align: center;
  padding: 40px;
  color: var(--text-secondary);
}
.text-right {
  text-align: right;
}
.green {
  color: var(--accent-green);
  font-weight: 600;
}
.red {
  color: var(--accent-red);
  font-weight: 600;
}
.action-header {
  text-align: center;
  width: 120px;
}
.action-cell {
  text-align: center;
}
.action-buttons-wrapper {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.action-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  line-height: 1;
  padding: 6px;
  border-radius: 50%;
}
.action-btn:hover {
  background-color: var(--background-color-light);
}
.edit-btn:hover {
  color: var(--primary-color);
}
.delete-btn:hover {
  color: var(--accent-red);
}

/* --- STYLE BARU UNTUK FILTER --- */
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
/* --- STYLE BARU UNTUK PENCARIAN --- */
.search-wrapper {
  position: relative;
  flex-grow: 1;
  max-width: 350px;
}
.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary);
  width: 18px;
  height: 18px;
}
.search-input {
  width: 100%;
  padding: 8px 12px 8px 38px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background-color: var(--background-color);
  color: var(--text-primary);
  transition: border-color 0.2s ease;
}
.search-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(var(--primary-color-rgb), 0.2);
}

.period-navigation {
  display: flex;
  align-items: center;
  gap: 12px;
}
.period-display {
  font-weight: 600;
  font-size: 16px;
  min-width: 220px;
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
.custom-date-range {
  display: flex;
  gap: 16px;
  align-items: flex-end;
}
.custom-date-range .form-group {
  margin-bottom: 0;
}
.custom-date-range label {
  font-size: 12px;
  margin-bottom: 4px;
}
.sortable {
  cursor: pointer;
  user-select: none;
}
.sortable:hover {
  color: var(--text-primary);
}
.sort-icon {
  width: 14px;
  height: 14px;
  vertical-align: middle;
  margin-left: 4px;
}
.text-right.sortable .sort-icon {
  margin-left: 0;
  margin-right: 4px;
}
@media (max-width: 992px) {
  .period-controls {
    flex-direction: column;
    align-items: stretch;
  }
  .search-wrapper {
    max-width: 100%;
    order: -1; /* Pindahkan search ke atas pada mobile */
  }
  .period-navigation {
    justify-content: center;
  }
}
</style>
