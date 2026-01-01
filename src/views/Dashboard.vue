<script setup>
import { computed, onMounted, nextTick, ref, watch } from "vue";
import { useFinanceStore } from "@/store/finance";
import { useThemeStore } from "@/store/theme";
import {
  Doughnut as DoughnutChart,
  Line as LineChart,
  Bar as BarChart,
} from "vue-chartjs";
import {
  Chart,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  BarElement,
} from "chart.js";
import feather from "feather-icons";

// Daftarkan semua elemen Chart.js yang dibutuhkan
Chart.register(
  Title,
  Tooltip,
  Legend,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  BarElement
);

const financeStore = useFinanceStore();
const themeStore = useThemeStore();

// State untuk filter chart Pemasukan vs Pengeluaran
const activeFilter = ref("7d");
const filters = [
  { key: "7d", label: "7H" },
  { key: "1m", label: "1B" },
  { key: "6m", label: "6B" },
  { key: "1y", label: "1T" },
  { key: "5y", label: "5T" },
];

// --- COMPUTED PROPERTIES ---

const greeting = computed(() => {
  const hour = new Date().getHours();
  const userName = financeStore.user?.email.split("@")[0] || "Pengguna";
  const capitalizedUserName =
    userName.charAt(0).toUpperCase() + userName.slice(1);
  if (hour < 11) return `Selamat Pagi, ${capitalizedUserName}!`;
  if (hour < 15) return `Selamat Siang, ${capitalizedUserName}!`;
  if (hour < 19) return `Selamat Sore, ${capitalizedUserName}!`;
  return `Selamat Malam, ${capitalizedUserName}!`;
});

const formatCurrency = (value) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value || 0);

const keyInsight = computed(() => {
  if (financeStore.loading)
    return { message: "Menganalisis data...", icon: "loader" };
  const { income, expense } = financeStore.currentMonthCashFlow;
  if (income === 0 && expense === 0 && financeStore.transactions.length === 0)
    return {
      message: "Selamat datang! Mulai catat transaksi pertamamu.",
      icon: "edit-3",
    };
  if (expense > income)
    return {
      message: `Pengeluaran bulan ini lebih besar dari pemasukan.`,
      icon: "trending-down",
    };

  // PERBAIKAN DILAKUKAN DI STORE, SEHINGGA DATA DI SINI OTOMATIS BENAR
  const expenses = financeStore.expenseByCategory;
  const largestExpense = Object.entries(expenses).sort(
    (a, b) => b[1] - a[1]
  )[0];

  if (largestExpense) {
    const category = largestExpense[0];
    const amount = formatCurrency(largestExpense[1]);
    return {
      message: `Pengeluaran terbesarmu bulan ini adalah <strong>${category}</strong> sebesar <strong>${amount}</strong>.`,
      icon: "alert-triangle",
    };
  }

  if (income > expense)
    return {
      message: "Manajemen keuanganmu bulan ini terlihat baik!",
      icon: "check-circle",
    };
  return { message: "Terus pantau kondisi keuanganmu.", icon: "eye" };
});

const sortedActiveGoals = computed(() => {
  if (!financeStore.goals || financeStore.goals.length === 0) return [];
  return [...financeStore.goals]
    .map((g) => ({
      ...g,
      progress:
        g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0,
    }))
    .filter((g) => g.progress < 100)
    .sort((a, b) => b.progress - a.progress);
});

// Opsi chart reaktif terhadap tema
const chartTextColor = computed(() =>
  themeStore.theme === "dark" ? "#A0AEC0" : "#718096"
);
const chartGridColor = computed(() =>
  themeStore.theme === "dark"
    ? "rgba(74, 85, 104, 0.5)"
    : "rgba(226, 232, 240, 0.8)"
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
const lineChartBorderColor = computed(() =>
  themeStore.theme === "dark" ? "#818CF8" : "#1A237E"
);
const lineChartBgColor = computed(() =>
  themeStore.theme === "dark"
    ? "rgba(129, 140, 248, 0.1)"
    : "rgba(26, 35, 126, 0.1)"
);

const expenseChartData = computed(() => {
  // PERBAIKAN DILAKUKAN DI STORE, SEHINGGA DATA DI SINI OTOMATIS BENAR
  const expenses = financeStore.expenseByCategory;
  if (!expenses) return { labels: [], datasets: [] };
  return {
    labels: Object.keys(expenses),
    datasets: [
      {
        backgroundColor: doughnutExpenseColors.value,
        data: Object.values(expenses),
      },
    ],
  };
});
const incomeChartData = computed(() => {
  // PERBAIKAN DILAKUKAN DI STORE, SEHINGGA DATA DI SINI OTOMATIS BENAR
  const incomes = financeStore.incomeByCategory;
  if (!incomes) return { labels: [], datasets: [] };
  return {
    labels: Object.keys(incomes),
    datasets: [
      {
        backgroundColor: doughnutIncomeColors.value,
        data: Object.values(incomes),
      },
    ],
  };
});
const lineChartData = computed(() => {
  const trend = financeStore.netWorthTrend;
  if (trend && trend.datasets[0]) {
    trend.datasets[0].borderColor = lineChartBorderColor.value;
    trend.datasets[0].backgroundColor = lineChartBgColor.value;
  }
  return trend;
});
const barChartData = computed(() =>
  financeStore.getCashFlowTrendByPeriod(activeFilter.value)
);

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: "bottom", labels: { color: chartTextColor.value } },
  },
}));
const lineChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    y: {
      beginAtZero: false,
      ticks: { color: chartTextColor.value },
      grid: { color: chartGridColor.value },
    },
    x: {
      ticks: { color: chartTextColor.value },
      grid: { color: "transparent" },
    },
  },
}));
const barChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: "top", labels: { color: chartTextColor.value } },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: { color: chartTextColor.value },
      grid: { color: chartGridColor.value },
    },
    x: {
      ticks: { color: chartTextColor.value },
      grid: { color: "transparent" },
    },
  },
}));

watch(
  () => [
    financeStore.loading,
    sortedActiveGoals.value,
    activeFilter.value,
    themeStore.theme,
  ],
  (values) => {
    if (!values[0]) {
      nextTick(() => {
        feather.replace();
      });
    }
  },
  { deep: true, immediate: true }
);
</script>

<template>
  <div class="page-container">
    <div class="header-section">
      <div>
        <h1 class="page-title">Dashboard</h1>
        <p class="greeting-text">{{ greeting }}</p>
      </div>
    </div>

    <div v-if="financeStore.loading">
      <div
        class="card insight-card skeleton"
        style="height: 78px; margin-bottom: 24px"
      ></div>
      <div class="dashboard-grid">
        <div v-for="n in 4" :key="n" class="card summary-card skeleton"></div>
      </div>
      <div class="chart-grid">
        <div class="card chart-card skeleton main-chart"></div>
        <div class="card chart-card skeleton"></div>
        <div class="card chart-card skeleton"></div>
      </div>
    </div>

    <div v-else>
      <div class="card insight-card fade-in">
        <div class="icon-wrapper bg-blue">
          <i :data-feather="keyInsight.icon"></i>
        </div>
        <p v-html="keyInsight.message"></p>
      </div>
      <div class="dashboard-grid">
        <div class="card summary-card fade-in" style="animation-delay: 100ms">
          <div class="icon-wrapper bg-gradient-blue">
            <i data-feather="dollar-sign"></i>
          </div>
          <div class="text-content">
            <h3>Kekayaan Bersih</h3>
            <p
              class="amount"
              :class="{
                green: financeStore.netWorth >= 0,
                red: financeStore.netWorth < 0,
              }"
            >
              {{ formatCurrency(financeStore.netWorth) }}
            </p>
          </div>
        </div>
        <div class="card summary-card fade-in" style="animation-delay: 200ms">
          <div class="icon-wrapper bg-gradient-green">
            <i data-feather="arrow-down-circle"></i>
          </div>
          <div class="text-content">
            <h3>Pemasukan Bulan Ini</h3>
            <p class="amount green">
              {{ formatCurrency(financeStore.currentMonthCashFlow.income) }}
            </p>
          </div>
        </div>
        <div class="card summary-card fade-in" style="animation-delay: 300ms">
          <div class="icon-wrapper bg-gradient-red">
            <i data-feather="arrow-up-circle"></i>
          </div>
          <div class="text-content">
            <h3>Pengeluaran Bulan Ini</h3>
            <p class="amount red">
              {{ formatCurrency(financeStore.currentMonthCashFlow.expense) }}
            </p>
          </div>
        </div>
        <div class="card summary-card fade-in" style="animation-delay: 400ms">
          <div class="icon-wrapper bg-gradient-purple">
            <i data-feather="shield"></i>
          </div>
          <div class="text-content">
            <h3>Sisa Anggaran</h3>
            <p
              class="amount"
              :class="{
                green: financeStore.budgetSummary.totalRemaining >= 0,
                red: financeStore.budgetSummary.totalRemaining < 0,
              }"
            >
              {{ formatCurrency(financeStore.budgetSummary.totalRemaining) }}
            </p>
          </div>
        </div>
      </div>
      <div class="section-container fade-in" style="animation-delay: 500ms">
        <h3 class="section-title">Progres Target Aktif</h3>
        <div v-if="sortedActiveGoals.length > 0" class="goals-slider-container">
          <div class="goals-slider">
            <div
              v-for="goal in sortedActiveGoals"
              :key="goal.id"
              class="goal-card card"
            >
              <h4>{{ goal.name }}</h4>
              <p class="goal-amount">
                {{ formatCurrency(goal.current_amount) }} /
                <span>{{ formatCurrency(goal.target_amount) }}</span>
              </p>
              <div class="progress-bar-container">
                <div
                  class="progress-bar"
                  :style="{ width: goal.progress + '%' }"
                ></div>
              </div>
              <p class="percentage-label">{{ goal.progress.toFixed(1) }}%</p>
            </div>
          </div>
        </div>
        <p v-else class="no-data-small">
          Belum ada target yang sedang berjalan.
        </p>
      </div>

      <div class="chart-grid">
        <div
          class="card chart-card fade-in main-chart"
          style="animation-delay: 600ms"
        >
          <div class="chart-header">
            <h3>Pemasukan vs Pengeluaran</h3>
            <div class="filter-pills">
              <button
                v-for="filter in filters"
                :key="filter.key"
                :class="{ active: activeFilter === filter.key }"
                @click="activeFilter = filter.key"
              >
                {{ filter.label }}
              </button>
            </div>
          </div>
          <div class="chart-wrapper-large">
            <BarChart
              v-if="barChartData && barChartData.labels"
              :data="barChartData"
              :options="barChartOptions"
            />
          </div>
        </div>
        <div class="card chart-card fade-in" style="animation-delay: 700ms">
          <h3>Tren Kekayaan Bersih</h3>
          <div class="chart-wrapper">
            <LineChart
              v-if="
                lineChartData &&
                lineChartData.labels &&
                lineChartData.labels.length > 0
              "
              :data="lineChartData"
              :options="lineChartOptions"
            />
            <p v-else class="no-data">
              Data tidak cukup untuk menampilkan tren.
            </p>
          </div>
        </div>
        <div class="card chart-card fade-in" style="animation-delay: 800ms">
          <h3>Pemasukan per Kategori</h3>
          <div class="chart-wrapper">
            <DoughnutChart
              v-if="
                incomeChartData &&
                incomeChartData.labels &&
                incomeChartData.labels.length > 0
              "
              :data="incomeChartData"
              :options="chartOptions"
            />
            <p v-else class="no-data">Belum ada data pemasukan bulan ini.</p>
          </div>
        </div>
        <div class="card chart-card fade-in" style="animation-delay: 900ms">
          <h3>Pengeluaran per Kategori</h3>
          <div class="chart-wrapper">
            <DoughnutChart
              v-if="
                expenseChartData &&
                expenseChartData.labels &&
                expenseChartData.labels.length > 0
              "
              :data="expenseChartData"
              :options="chartOptions"
            />
            <p v-else class="no-data">Belum ada data pengeluaran bulan ini.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes skeleton-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
.fade-in {
  animation: fadeIn 0.5s ease-out forwards;
  opacity: 0;
}
.header-section {
  margin-bottom: 24px;
}
.page-title {
  font-size: 32px;
  font-weight: 700;
  color: var(--text-primary);
}
.greeting-text {
  color: var(--text-secondary);
}
.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.summary-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  padding: 16px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  min-height: 120px;
}
.summary-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
}
.icon-wrapper {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}
.icon-wrapper i {
  width: 18px;
  height: 18px;
}
.text-content {
  width: 100%;
  overflow: hidden;
}
.text-content h3 {
  color: var(--text-secondary);
  font-weight: 500;
  font-size: 12px;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.text-content .amount {
  font-size: 18px;
  font-weight: 600;
  white-space: nowrap;
}
@media (min-width: 768px) {
  .dashboard-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 24px;
  }
  .summary-card {
    flex-direction: row;
    align-items: center;
    gap: 20px;
    padding: 24px;
    min-height: 0;
  }
  .icon-wrapper {
    width: 52px;
    height: 52px;
  }
  .icon-wrapper i {
    width: 24px;
    height: 24px;
  }
  .text-content h3 {
    font-size: 14px;
  }
  .text-content .amount {
    font-size: 24px;
  }
}
.bg-gradient-blue {
  background-image: linear-gradient(
    45deg,
    #4299e1 0%,
    var(--primary-color) 100%
  );
}
.bg-gradient-green {
  background-image: linear-gradient(
    45deg,
    #68d391 0%,
    var(--accent-green) 100%
  );
}
.bg-gradient-red {
  background-image: linear-gradient(45deg, #fc8181 0%, var(--accent-red) 100%);
}
.bg-gradient-yellow {
  background-image: linear-gradient(45deg, #f6e05e 0%, #f6ad55 100%);
}
.bg-gradient-purple {
  background-image: linear-gradient(45deg, #a78bfa 0%, #7c3aed 100%);
}
.text-content .amount.green {
  color: var(--accent-green);
}
.text-content .amount.red {
  color: var(--accent-red);
}
.section-container {
  margin-top: 24px;
}
.section-title {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 16px;
  color: var(--text-primary);
}
.goals-slider-container {
  overflow-x: auto;
  scroll-behavior: smooth;
  scroll-snap-type: x mandatory;
  padding-bottom: 16px;
}
.goals-slider-container::-webkit-scrollbar {
  display: none;
}
.goals-slider-container {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.goals-slider {
  display: flex;
  gap: 24px;
}
.goal-card {
  flex: 0 0 280px;
  scroll-snap-align: start;
  display: flex;
  flex-direction: column;
  height: 100%;
}
.goal-card h4 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
}
.goal-amount {
  font-size: 18px;
  font-weight: 500;
  margin-bottom: auto;
  padding-bottom: 12px;
}
.goal-amount span {
  font-size: 14px;
  color: var(--text-secondary);
}
.progress-bar-container {
  width: 100%;
  background-color: #e9ecef;
  border-radius: 99px;
  height: 10px;
  overflow: hidden;
}
.progress-bar {
  height: 100%;
  background-color: var(--primary-color);
  border-radius: 99px;
  transition: width 0.5s ease-in-out;
}
.percentage-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 6px;
  text-align: right;
}
.no-data-small {
  font-size: 14px;
  color: var(--text-secondary);
  margin-top: 16px;
}
.chart-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  margin-top: 24px;
}
.main-chart {
  grid-column: 1 / -1;
}
@media (min-width: 1024px) {
  .chart-grid {
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: auto;
    grid-template-areas:
      "main main main"
      "line income expense";
  }
  .main-chart {
    grid-area: main;
  }
  .chart-card:nth-child(2) {
    grid-area: line;
  }
  .chart-card:nth-child(3) {
    grid-area: income;
  }
  .chart-card:nth-child(4) {
    grid-area: expense;
  }
}
.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 16px;
}
.chart-header h3 {
  font-size: 18px;
  margin: 0;
  flex-grow: 1;
}
.filter-pills {
  display: flex;
  gap: 8px;
  background-color: var(--background-color-light);
  padding: 4px;
  border-radius: 99px;
  flex-shrink: 0;
}
.filter-pills button {
  background: none;
  border: none;
  padding: 6px 12px;
  border-radius: 99px;
  cursor: pointer;
  font-weight: 500;
  font-size: 13px;
  color: var(--text-secondary);
  transition: all 0.2s ease;
}
.filter-pills button.active {
  background-color: var(--surface-color);
  color: var(--primary-color);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
.chart-wrapper-large {
  position: relative;
  height: 400px;
}
.chart-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.chart-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
}
.chart-card h3 {
  font-size: 18px;
  margin-bottom: 16px;
}
.chart-wrapper {
  position: relative;
  height: 350px;
}
.no-data {
  text-align: center;
  color: var(--text-secondary);
  padding: 20px 0;
}
.insight-card {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
  background-color: #ebf4ff;
  border-color: #bee3f8;
  opacity: 0;
}
body.dark-theme .insight-card {
  background-color: #2c3a57;
  border-color: #384561;
}
.insight-card p {
  font-weight: 500;
  color: var(--text-primary);
}
.insight-card .icon-wrapper.bg-blue {
  background-color: var(--primary-color);
}
.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
  border-radius: var(--border-radius);
}
.skeleton.summary-card {
  height: 122px;
}
@media (min-width: 768px) {
  .skeleton.summary-card {
    height: 98px;
  }
}
.skeleton.goal-card {
  height: 160px;
}
.skeleton.chart-card {
  height: 428px;
}
@media (max-width: 768px) {
  .page-title {
    font-size: 24px;
  }
  .chart-header {
    flex-direction: column;
    align-items: stretch;
  }
  .filter-pills {
    justify-content: center;
  }
  .chart-wrapper-large {
    height: 300px;
  }
}
</style>
