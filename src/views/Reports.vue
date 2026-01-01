<script setup>
import { ref, computed, watch, nextTick } from "vue";
import { useFinanceStore } from "@/store/finance";
import { useThemeStore } from "@/store/theme";
import { Doughnut as DoughnutChart } from "vue-chartjs";
import {
  Chart,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";
import feather from "feather-icons";

Chart.register(
  Title,
  Tooltip,
  Legend,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement
);

const financeStore = useFinanceStore();
const themeStore = useThemeStore();

// --- STATE LOKAL ---
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

// --- COMPUTED PROPERTIES ---
const filteredData = computed(() => {
  const start = new Date(
    viewMode.value === "monthly"
      ? activePeriod.value
      : `${activePeriod.value}-01-01`
  );
  const end = new Date(start);

  if (viewMode.value === "monthly") {
    end.setMonth(end.getMonth() + 1, 0);
  } else {
    end.setFullYear(end.getFullYear() + 1, 0);
  }
  end.setHours(23, 59, 59, 999);

  const transactions = financeStore.transactions.filter((tx) => {
    // --- PERBAIKAN UTAMA: Menggunakan `transaction_at` ---
    const txDate = new Date(tx.transaction_at);
    return txDate >= start && txDate <= end;
  });

  const budgets = financeStore.budgets.filter(
    (b) => b.period === activePeriod.value
  );

  return { transactions, budgets };
});

const reportSummary = computed(() => {
  let income = 0,
    expense = 0;
  for (const tx of filteredData.value.transactions) {
    if (tx.type === "Pemasukan") income += tx.amount;
    else expense += tx.amount;
  }
  const netCashFlow = income - expense;
  const savingsRate = income > 0 ? (netCashFlow / income) * 100 : 0;
  return { income, expense, netCashFlow, savingsRate };
});

const processedReportBudgets = computed(() => {
  const actualSpending = filteredData.value.transactions
    .filter((tx) => tx.type === "Pengeluaran")
    .reduce((acc, tx) => {
      acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
      return acc;
    }, {});
  return filteredData.value.budgets
    .map((budget) => {
      const spent = actualSpending[budget.category] || 0;
      return {
        ...budget,
        spent,
        remaining: budget.amount - spent,
        percentage: budget.amount > 0 ? (spent / budget.amount) * 100 : 0,
      };
    })
    .sort((a, b) => b.percentage - a.percentage);
});

// Opsi chart reaktif terhadap tema
const chartTextColor = computed(() =>
  themeStore.theme === "dark" ? "#A0AEC0" : "#718096"
);
const doughnutExpenseColors = computed(() => {
  return themeStore.theme === "dark"
    ? [
        "#818CF8",
        "#F6E05E",
        "#FC8181",
        "#FDBA74",
        "#60A5FA",
        "#C4B5FD",
        "#9AE6B4",
      ]
    : [
        "#1A237E",
        "#ECC94B",
        "#EF5350",
        "#ED8936",
        "#2196F3",
        "#9C27B0",
        "#48BB78",
      ];
});
const doughnutIncomeColors = computed(() => {
  return themeStore.theme === "dark"
    ? ["#68D391", "#4FD1C5", "#63B3ED", "#B794F4", "#F6AD55"]
    : ["#2F855A", "#38B2AC", "#3182CE", "#805AD5", "#D69E2E"];
});

const expenseChartData = computed(() => {
  const expenseMap = new Map();
  filteredData.value.transactions
    .filter((tx) => tx.type === "Pengeluaran")
    .forEach((tx) => {
      let key = tx.category;
      if (tx.category === "Tabungan Target" && tx.notes) {
        const targetName = tx.notes.replace("Menambah dana ke target: ", "");
        key = `Tabungan: ${targetName}`;
      }
      expenseMap.set(key, (expenseMap.get(key) || 0) + tx.amount);
    });
  const labels = Array.from(expenseMap.keys());
  const data = Array.from(expenseMap.values());
  return {
    labels,
    datasets: [{ backgroundColor: doughnutExpenseColors.value, data }],
  };
});

// --- CHART BARU UNTUK PEMASUKAN ---
const incomeChartData = computed(() => {
  const incomeMap = new Map();
  filteredData.value.transactions
    .filter((tx) => tx.type === "Pemasukan")
    .forEach((tx) => {
      incomeMap.set(tx.category, (incomeMap.get(tx.category) || 0) + tx.amount);
    });
  const labels = Array.from(incomeMap.keys());
  const data = Array.from(incomeMap.values());
  return {
    labels,
    datasets: [{ backgroundColor: doughnutIncomeColors.value, data }],
  };
});

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: "bottom", labels: { color: chartTextColor.value } },
  },
}));

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

const handlePrint = () => {
  window.print();
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
  () => [filteredData.value, financeStore.goals, themeStore.theme],
  () => {
    nextTick(() => {
      feather.replace();
    });
  },
  { deep: true, immediate: true }
);
</script>

<template>
  <div class="page-container">
    <div class="page-header no-print">
      <h1 class="page-title">Laporan Keuangan</h1>
      <button class="button button-primary print-btn" @click="handlePrint">
        <i data-feather="printer" style="width: 18px; margin-right: 8px"></i>
        Cetak / Simpan PDF
      </button>
    </div>

    <div class="card period-controls no-print">
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
    </div>

    <div class="printable-area card">
      <div class="report-header">
        <h2>Laporan Keuangan Mapan</h2>
        <p>Periode: {{ displayPeriod }}</p>
      </div>
      <section class="report-section">
        <h3 class="section-title">Ringkasan Utama</h3>
        <div class="summary-grid">
          <div class="summary-item">
            <h4>Total Pemasukan</h4>
            <strong class="green">{{
              formatCurrency(reportSummary.income)
            }}</strong>
          </div>
          <div class="summary-item">
            <h4>Total Pengeluaran</h4>
            <strong class="red">{{
              formatCurrency(reportSummary.expense)
            }}</strong>
          </div>
          <div class="summary-item">
            <h4>Arus Kas Bersih</h4>
            <strong
              :class="{
                green: reportSummary.netCashFlow >= 0,
                red: reportSummary.netCashFlow < 0,
              }"
              >{{ formatCurrency(reportSummary.netCashFlow) }}</strong
            >
          </div>
          <div class="summary-item">
            <h4>Tingkat Tabungan</h4>
            <strong class="blue"
              >{{ reportSummary.savingsRate.toFixed(1) }}%</strong
            >
          </div>
        </div>
      </section>
      <section class="report-section">
        <h3 class="section-title">Perbandingan Anggaran</h3>
        <div v-if="processedReportBudgets.length > 0" class="budget-list">
          <div
            v-for="item in processedReportBudgets"
            :key="item.id"
            class="budget-item"
          >
            <div class="budget-info">
              <strong>{{ item.category }}</strong>
              <span
                >{{ formatCurrency(item.spent) }} /
                {{ formatCurrency(item.amount) }}</span
              >
            </div>
            <div class="progress-bar-container">
              <div
                class="progress-bar"
                :class="{
                  warn: item.percentage > 80 && item.percentage <= 100,
                  over: item.percentage > 100,
                }"
                :style="{ width: Math.min(item.percentage, 100) + '%' }"
              ></div>
            </div>
          </div>
        </div>
        <p v-else class="no-data">Tidak ada data anggaran untuk periode ini.</p>
      </section>
      <section class="report-section">
        <div class="chart-grid-double">
          <div class="chart-container">
            <h3 class="section-title">Pemasukan</h3>
            <div class="chart-wrapper">
              <DoughnutChart
                v-if="incomeChartData.labels.length"
                :data="incomeChartData"
                :options="chartOptions"
              />
              <p v-else class="no-data">Tidak ada data pemasukan.</p>
            </div>
          </div>
          <div class="chart-container">
            <h3 class="section-title">Pengeluaran</h3>
            <div class="chart-wrapper">
              <DoughnutChart
                v-if="expenseChartData.labels.length"
                :data="expenseChartData"
                :options="chartOptions"
              />
              <p v-else class="no-data">Tidak ada data pengeluaran.</p>
            </div>
          </div>
        </div>
      </section>
      <section class="report-section">
        <h3 class="section-title">Progres Target Finansial</h3>
        <div v-if="financeStore.goals.length > 0" class="goals-list">
          <div
            v-for="goal in financeStore.goals"
            :key="goal.id"
            class="goal-item"
          >
            <span>{{ goal.name }}</span>
            <div class="goal-progress">
              <div class="progress-bar-container">
                <div
                  class="progress-bar"
                  :style="{
                    width:
                      (goal.current_amount / goal.target_amount) * 100 + '%',
                  }"
                ></div>
              </div>
              <span class="percentage-label"
                >{{
                  ((goal.current_amount / goal.target_amount) * 100).toFixed(1)
                }}%</span
              >
            </div>
          </div>
        </div>
        <p v-else class="no-data">Belum ada target yang dibuat.</p>
      </section>
      <section class="report-section">
        <h3 class="section-title">Rincian Transaksi</h3>
        <div class="table-wrapper">
          <table class="transaction-table">
            <thead>
              <tr>
                <th class="col-date">Tanggal</th>
                <th class="col-category">Kategori</th>
                <th class="col-notes">Keterangan</th>
                <th class="col-amount text-right">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="filteredData.transactions.length === 0">
                <td colspan="4" class="no-data">
                  Tidak ada transaksi pada periode ini.
                </td>
              </tr>
              <tr v-for="tx in filteredData.transactions" :key="tx.id">
                <td>
                  {{ new Date(tx.transaction_at).toLocaleDateString("id-ID") }}
                </td>
                <!-- <-- PERBAIKAN -->
                <td>{{ tx.category }}</td>
                <td class="notes-cell">{{ tx.notes }}</td>
                <td
                  class="text-right"
                  :class="tx.type === 'Pemasukan' ? 'green' : 'red'"
                >
                  {{ tx.type === "Pemasukan" ? "+" : "-" }}
                  {{ formatCurrency(tx.amount) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}
.page-title {
  font-size: 28px;
}
.print-btn {
  background-color: var(--accent-green);
}
.print-btn:hover {
  background-color: #38a169;
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
  background-color: #f3f4f6;
}
.printable-area {
  padding: 32px;
}
.report-header {
  text-align: center;
  margin-bottom: 32px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color);
}
.report-header h2 {
  font-size: 24px;
}
.report-header p {
  color: var(--text-secondary);
  font-size: 14px;
  margin-top: 4px;
}
.report-section {
  margin-bottom: 40px;
  page-break-inside: avoid;
}
.section-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
}
.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}
.summary-item {
  background-color: var(--border-color);
  padding: 16px;
  border-radius: 8px;
  text-align: center;
}
.summary-item h4 {
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 8px;
  font-weight: 500;
}
.summary-item strong {
  font-size: 22px;
  font-weight: 600;
}
.green {
  color: var(--accent-green);
}
.red {
  color: var(--accent-red);
}
.blue {
  color: var(--primary-color);
}
.chart-section {
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}
.chart-wrapper {
  position: relative;
  height: 300px;
}
.goals-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.goal-item {
  background-color: var(--border-color);
  padding: 16px;
  border-radius: 8px;
  text-align: center;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.goal-progress {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 50%;
}
.progress-bar-container {
  flex-grow: 1;
  background-color: #f5eeee;
  border-radius: 99px;
  height: 8px;
}
.progress-bar {
  height: 100%;
  background-color: var(--primary-color);
  border-radius: 99px;
}
.percentage-label {
  font-size: 12px;
  font-weight: 600;
}
.table-wrapper {
  overflow-x: auto;
}
.transaction-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 600px;
}
.transaction-table th,
.transaction-table td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
  font-size: 14px;
}
.transaction-table th {
  font-weight: 600;
  color: var(--text-secondary);
  font-size: 12px;
}
.text-right {
  text-align: right;
}
.no-data {
  text-align: center;
  color: var(--text-secondary);
  padding: 20px 0;
}
.col-date {
  width: 20%;
}
.col-category {
  width: 25%;
}
.col-notes {
  width: 35%;
}
.col-amount {
  width: 20%;
  white-space: nowrap;
}
.notes-cell {
  white-space: normal;
  word-break: break-word;
}
.budget-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.budget-item {
  background-color: var(--border-color);
  padding: 12px;
  border-radius: 8px;
}
.budget-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
}
.budget-info span {
  color: var(--text-secondary);
}
.progress-bar.warn {
  background-color: #f6ad55;
}
.progress-bar.over {
  background-color: var(--accent-red);
}
.chart-grid-double {
  display: grid;
  grid-template-columns: 1fr;
  gap: 32px;
}
@media (min-width: 768px) {
  .chart-grid-double {
    grid-template-columns: 1fr 1fr;
  }
}
@media print {
  .no-print,
  .sidebar {
    display: none !important;
  }
  .page-container {
    width: 100%;
    margin: 0;
    padding: 0;
  }
  .main-content {
    padding: 0 !important;
  }
  .printable-area {
    box-shadow: none !important;
    border: none !important;
    padding: 0 !important;
  }
  @page {
    size: A4;
    margin: 20mm;
  }
  body {
    background-color: white !important;
  }
  .card,
  .report-section {
    page-break-inside: avoid;
  }
  .table-wrapper {
    overflow: visible;
  }
}
@media (max-width: 768px) {
  .page-title {
    font-size: 24px;
  }
}
</style>
