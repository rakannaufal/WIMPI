<script setup>
import { ref, watch, nextTick, computed, onMounted } from "vue";
import { useFinanceStore } from "@/store/finance";
import { getGoalSuggestion } from "@/services/aiAssistant.js";
import { getSmartSavingsAdvice } from "@/services/geminiService.js";
import feather from "feather-icons";

const financeStore = useFinanceStore();

// State
const showForm = ref(false);
const editingGoalId = ref(null);
const initialFormState = {
  name: "",
  target_amount: null,
  current_amount: 0,
  target_date: null,
};
const formGoal = ref({ ...initialFormState });
const formattedTargetAmount = ref("");
const formattedCurrentAmount = ref("");
const showAddFundsModal = ref(false);
const selectedGoal = ref(null);
const amountToAdd = ref(null);
const formattedAmountToAdd = ref("");
const showAiModal = ref(false);
const aiSuggestionFrequency = ref("weekly");
const isExplanationVisible = ref(false);
const aiMode = ref('basic'); // 'basic' atau 'gemini'
const geminiAdvice = ref('');
const isGeminiLoading = ref(false);
const geminiError = ref(null);

onMounted(() => {
  financeStore.fetchAllData();
});

const aiAnalysisResult = computed(() => {
  if (!showAiModal.value || !selectedGoal.value) return null;
  if (financeStore.loading || financeStore.transactions.length === 0) {
    return {
      status: "LOADING",
      statusInfo: { label: "Menganalisis...", icon: "loader", type: "loading" },
      suggestion: 0,
      message: "Sedang menganalisis riwayat transaksi Anda...",
    };
  }
  return getGoalSuggestion(
    {
      targetAmount: selectedGoal.value.target_amount,
      currentAmount: selectedGoal.value.current_amount,
      targetDate: selectedGoal.value.target_date,
      allTransactions: financeStore.transactions,
      netWorth: financeStore.netWorth,
      monthlyIncome: financeStore.currentMonthCashFlow.income,
      monthlyExpense: financeStore.currentMonthCashFlow.expense,
    },
    aiSuggestionFrequency.value
  );
});

// Fungsi-fungsi untuk interaksi (CRUD Goals, Modals, dll.)
const resetForm = () => {
  editingGoalId.value = null;
  formGoal.value = { ...initialFormState };
  formattedTargetAmount.value = "";
  formattedCurrentAmount.value = "";
  showForm.value = false;
};

const handleAddNew = () => {
  resetForm();
  showForm.value = true;
};

const startEdit = (goal) => {
  formGoal.value = {
    ...goal,
    target_date: goal.target_date ? goal.target_date.split("T")[0] : null,
  };
  formattedTargetAmount.value = new Intl.NumberFormat("id-ID").format(
    goal.target_amount || 0
  );
  formattedCurrentAmount.value = new Intl.NumberFormat("id-ID").format(
    goal.current_amount || 0
  );
  editingGoalId.value = goal.id;
  showForm.value = true;
};

const openAddFundsModal = (goal) => {
  selectedGoal.value = goal;
  amountToAdd.value = null;
  formattedAmountToAdd.value = "";
  showAddFundsModal.value = true;
};

const handleAddFunds = async () => {
  if (!selectedGoal.value || !amountToAdd.value || amountToAdd.value <= 0) {
    alert("Jumlah dana yang ditambahkan harus lebih dari nol.");
    return;
  }
  try {
    await financeStore.addFundsToGoal(selectedGoal.value.id, amountToAdd.value);
    showAddFundsModal.value = false;
  } catch (e) {
    alert(e.message);
  }
};

const handleSubmit = async () => {
  try {
    if (editingGoalId.value) {
      await financeStore.updateGoal(editingGoalId.value, formGoal.value);
    } else {
      await financeStore.addGoal(formGoal.value);
    }
    resetForm();
  } catch (e) {
    alert(e.message);
  }
};

const handleDelete = async (id) => {
  if (
    confirm(
      "Yakin ingin menghapus target ini? Semua transaksi terkait target ini juga akan terhapus."
    )
  ) {
    try {
      await financeStore.deleteGoal(id);
    } catch (e) {
      alert(e.message);
    }
  }
};

const openAiAssistant = (goal) => {
  financeStore.fetchAllTransactions();
  selectedGoal.value = goal;
  aiSuggestionFrequency.value = "weekly";
  isExplanationVisible.value = false;
  aiMode.value = 'basic';
  geminiAdvice.value = '';
  geminiError.value = null;
  showAiModal.value = true;
};

// Dapatkan saran dari Gemini AI
const getGeminiAdvice = async () => {
  if (!selectedGoal.value) return;
  
  isGeminiLoading.value = true;
  geminiError.value = null;
  
  try {
    const advice = await getSmartSavingsAdvice(selectedGoal.value, financeStore);
    geminiAdvice.value = advice;
  } catch (error) {
    geminiError.value = error.message;
  } finally {
    isGeminiLoading.value = false;
    nextTick(() => feather.replace());
  }
};

const applyAiSuggestion = () => {
  if (aiAnalysisResult.value && aiAnalysisResult.value.suggestion > 0) {
    openAddFundsModal(selectedGoal.value);
    const numericValue = aiAnalysisResult.value.suggestion;
    amountToAdd.value = numericValue;
    formattedAmountToAdd.value = new Intl.NumberFormat("id-ID").format(
      numericValue
    );
    showAiModal.value = false;
  }
};

// Watchers untuk format angka
watch(formattedTargetAmount, (newValue) => {
  const numericValue = parseInt(newValue.replace(/\D/g, ""), 10) || null;
  if (formGoal.value.target_amount !== numericValue) {
    formGoal.value.target_amount = numericValue;
  }
  const formatted = numericValue
    ? new Intl.NumberFormat("id-ID").format(numericValue)
    : "";
  if (formatted !== newValue) {
    nextTick(() => {
      formattedTargetAmount.value = formatted;
    });
  }
});

watch(formattedCurrentAmount, (newValue) => {
  const numericValue = parseInt(newValue.replace(/\D/g, ""), 10) || 0;
  if (formGoal.value.current_amount !== numericValue) {
    formGoal.value.current_amount = numericValue;
  }
  const formatted = numericValue
    ? new Intl.NumberFormat("id-ID").format(numericValue)
    : "";
  if (formatted !== newValue) {
    nextTick(() => {
      formattedCurrentAmount.value = formatted;
    });
  }
});

watch(formattedAmountToAdd, (newValue) => {
  const numericValue = parseInt(newValue.replace(/\D/g, ""), 10) || null;
  if (amountToAdd.value !== numericValue) {
    amountToAdd.value = numericValue;
  }
  const formatted = numericValue
    ? new Intl.NumberFormat("id-ID").format(numericValue)
    : "";
  if (formatted !== newValue) {
    nextTick(() => {
      formattedAmountToAdd.value = formatted;
    });
  }
});

// Fungsi utilitas
const formatCurrency = (value) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value || 0);

const calculateDaysRemaining = (targetDate) => {
  if (!targetDate) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const endDate = new Date(targetDate);
  const diff = endDate - now;
  if (diff < 0) return "Terlewat";
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return `${days} hari lagi`;
};

// Watcher untuk re-render ikon Feather
watch(
  () => [
    financeStore.goals,
    showAiModal.value,
    showForm.value,
    isExplanationVisible.value,
    aiSuggestionFrequency.value,
    aiMode.value,
  ],
  () => {
    nextTick(() => {
      feather.replace();
    });
  },
  { deep: true, immediate: true }
);

// Format Gemini response untuk ditampilkan
const formatGeminiResponse = (content) => {
  if (!content) return '';
  return content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>')
    .replace(/^- (.*)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
    .replace(/^\d+\. (.*)$/gm, '<li>$1</li>');
};
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">Target</h1>
      <button class="button button-primary" @click="handleAddNew">
        <i data-feather="plus" style="margin-right: 8px; width: 18px"></i>
        Tambah Target
      </button>
    </div>

    <div v-if="showForm" class="card form-card fade-in">
      <form @submit.prevent="handleSubmit">
        <h3 class="form-title">
          {{ editingGoalId ? "Edit Target" : "Target Baru" }}
        </h3>
        <div class="form-grid">
          <div class="form-group full-width">
            <label>Nama Target</label>
            <input
              v-model="formGoal.name"
              type="text"
              placeholder="Contoh: Dana Darurat"
              required
              class="form-input"
            />
          </div>
          <div v-if="!editingGoalId" class="form-group">
            <label>Dana Awal (Opsional)</label>
            <input
              v-model="formattedCurrentAmount"
              type="text"
              inputmode="numeric"
              placeholder="0"
              class="form-input text-right"
            />
          </div>
          <div class="form-group">
            <label>Jumlah Target (Rp)</label>
            <input
              v-model="formattedTargetAmount"
              type="text"
              inputmode="numeric"
              placeholder="0"
              required
              class="form-input text-right"
            />
          </div>
          <div class="form-group">
            <label>Tanggal Tercapai</label>
            <input
              v-model="formGoal.target_date"
              type="date"
              class="form-input"
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
            {{ editingGoalId ? "Perbarui" : "Simpan" }}
          </button>
        </div>
      </form>
    </div>

    <div class="goals-grid">
      <div
        v-if="financeStore.loading && financeStore.goals.length === 0"
        class="loading-indicator"
      >
        Memuat Target...
      </div>
      <div
        v-else-if="!financeStore.loading && financeStore.goals.length === 0"
        class="card no-goals"
      >
        Belum ada target yang dibuat. Klik 'Tambah Target' untuk memulai.
      </div>
      <div
        v-for="goal in financeStore.goals"
        :key="goal.id"
        class="card goal-card"
      >
        <div class="goal-header">
          <h3>{{ goal.name }}</h3>
          <div class="action-buttons">
            <button
              class="action-btn edit-btn"
              @click="startEdit(goal)"
              title="Edit"
            >
              <i data-feather="edit-2"></i>
            </button>
            <button
              class="action-btn delete-btn"
              @click="handleDelete(goal.id)"
              title="Hapus"
            >
              <i data-feather="trash"></i>
            </button>
          </div>
        </div>
        <div class="goal-meta">
          <p class="goal-amount">
            {{ formatCurrency(goal.current_amount) }} /
            <span>{{ formatCurrency(goal.target_amount) }}</span>
          </p>
          <div v-if="goal.target_date" class="target-date-row">
            <p class="target-date">
              <i data-feather="calendar" class="icon-xs"></i>
              Target:
              {{
                new Date(goal.target_date).toLocaleDateString("id-ID", {
                  timeZone: "UTC",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              }}
            </p>
            <span class="days-remaining">{{
              calculateDaysRemaining(goal.target_date)
            }}</span>
          </div>
        </div>
        <div class="progress-bar-container">
          <div
            class="progress-bar"
            :style="{
              width:
                goal.target_amount > 0
                  ? (goal.current_amount / goal.target_amount) * 100 + '%'
                  : '0%',
            }"
          ></div>
        </div>
        <p class="percentage-label">
          {{
            goal.target_amount > 0
              ? ((goal.current_amount / goal.target_amount) * 100).toFixed(1)
              : 0
          }}% tercapai
        </p>
        <div class="goal-footer">
          <button
            class="button button-secondary ai-btn"
            @click="openAiAssistant(goal)"
          >
            <i data-feather="cpu" class="icon-sm"></i>
            Saran AI
          </button>
          <button
            class="button button-primary add-funds-btn"
            @click="openAddFundsModal(goal)"
          >
            <i data-feather="plus"></i>
            Tambah Dana
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="showAddFundsModal"
      class="modal-overlay"
      @click.self="showAddFundsModal = false"
    >
      <div class="modal-content card fade-in">
        <h3 class="form-title">Tambah Dana ke Target</h3>
        <p class="modal-subtitle">
          Menambah dana ke: <strong>{{ selectedGoal.name }}</strong>
        </p>
        <form @submit.prevent="handleAddFunds">
          <div class="form-group">
            <label>Jumlah (Rp)</label>
            <input
              v-model="formattedAmountToAdd"
              type="text"
              inputmode="numeric"
              placeholder="0"
              required
              class="form-input text-right"
              autofocus
            />
          </div>
          <div class="form-actions">
            <button
              type="button"
              class="button button-secondary"
              @click="showAddFundsModal = false"
            >
              Batal
            </button>
            <button type="submit" class="button button-primary">
              Tambahkan
            </button>
          </div>
        </form>
      </div>
    </div>

    <div
      v-if="showAiModal"
      class="modal-overlay"
      @click.self="showAiModal = false"
    >
      <div class="modal-content card fade-in">
        <h3 class="form-title">
          <i data-feather="cpu" class="icon-sm"></i> Asisten Finansial
        </h3>
        
        <!-- AI Mode Switcher -->
        <div class="ai-mode-switcher">
          <button 
            @click="aiMode = 'basic'"
            :class="{ active: aiMode === 'basic' }"
          >
            <i data-feather="calculator" class="icon-xs"></i>
            Kalkulasi Cepat
          </button>
          <button 
            @click="aiMode = 'gemini'; getGeminiAdvice()"
            :class="{ active: aiMode === 'gemini' }"
          >
            <i data-feather="zap" class="icon-xs"></i>
            AI Gemini ✨
          </button>
        </div>

        <!-- Basic AI Mode -->
        <template v-if="aiMode === 'basic'">
        <div class="frequency-switcher">
          <button
            @click="aiSuggestionFrequency = 'daily'"
            :class="{ active: aiSuggestionFrequency === 'daily' }"
          >
            Harian
          </button>
          <button
            @click="aiSuggestionFrequency = 'weekly'"
            :class="{ active: aiSuggestionFrequency === 'weekly' }"
          >
            Mingguan
          </button>
          <button
            @click="aiSuggestionFrequency = 'monthly'"
            :class="{ active: aiSuggestionFrequency === 'monthly' }"
          >
            Bulanan
          </button>
        </div>

        <div v-if="aiAnalysisResult" class="ai-suggestion">
          <div
            v-if="aiAnalysisResult.statusInfo"
            :class="[
              'ai-status-banner',
              `ai-status-banner--${aiAnalysisResult.statusInfo.type}`,
            ]"
          >
            <i
              :data-feather="aiAnalysisResult.statusInfo.icon"
              class="icon-sm"
            ></i>
            <span>{{ aiAnalysisResult.statusInfo.label }}</span>
          </div>

          <p class="ai-message" v-html="aiAnalysisResult.message"></p>

          <div v-if="aiAnalysisResult.analysis" class="explanation-container">
            <button
              class="explanation-toggle"
              @click="isExplanationVisible = !isExplanationVisible"
            >
              <span v-if="!isExplanationVisible">Lihat Detail Analisis</span>
              <span v-else>Tutup Detail Analisis</span>
              <i
                :data-feather="
                  isExplanationVisible ? 'chevron-up' : 'chevron-down'
                "
              ></i>
            </button>
            <div v-if="isExplanationVisible" class="explanation-details">
              <ul>
                <li>
                  Kebutuhan menabung (per
                  {{ aiAnalysisResult.analysis.timeUnit }}):
                  <strong>{{
                    formatCurrency(aiAnalysisResult.analysis.requiredSavings)
                  }}</strong>
                </li>
                <li>
                  Kapasitas menabung Anda (per
                  {{ aiAnalysisResult.analysis.timeUnit }}):
                  <strong>{{
                    formatCurrency(
                      aiAnalysisResult.analysis.disposableIncomeForPeriod
                    )
                  }}</strong>
                </li>
                <li>
                  Rata-rata sisa dana bulanan:
                  <strong>{{
                    formatCurrency(
                      aiAnalysisResult.analysis.avgMonthlyDisposableIncome
                    )
                  }}</strong>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div v-else class="loading-indicator"><p>Menganalisis...</p></div>
        </template>

        <!-- Gemini AI Mode -->
        <template v-if="aiMode === 'gemini'">
          <div class="gemini-container">
            <div v-if="isGeminiLoading" class="gemini-loading">
              <div class="gemini-loader">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <p>Mapan AI sedang menganalisis...</p>
            </div>
            
            <div v-else-if="geminiError" class="gemini-error">
              <i data-feather="alert-circle"></i>
              <p>{{ geminiError }}</p>
              <button class="button button-secondary" @click="getGeminiAdvice">
                Coba Lagi
              </button>
            </div>
            
            <div v-else-if="geminiAdvice" class="gemini-response">
              <div class="gemini-header">
                <div class="gemini-avatar">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
                  </svg>
                </div>
                <span>Mapan AI</span>
              </div>
              <div class="gemini-content" v-html="formatGeminiResponse(geminiAdvice)"></div>
            </div>
            
            <div v-else class="gemini-empty">
              <p>Klik tombol di atas untuk mendapatkan saran AI Gemini</p>
            </div>
          </div>
        </template>

        <div class="form-actions">
          <button
            type="button"
            class="button button-secondary"
            @click="showAiModal = false"
          >
            Tutup
          </button>
          <button
            v-if="aiAnalysisResult && aiAnalysisResult.suggestion > 0"
            type="button"
            class="button button-primary"
            @click="applyAiSuggestion"
          >
            Setuju & Tambah Dana
          </button>
        </div>
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
.fade-in {
  animation: fadeIn 0.3s ease-out;
}
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
  margin-bottom: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
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
.text-right {
  text-align: right;
}
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}
.goals-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
}
.goal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.goal-card h3 {
  font-size: 18px;
  font-weight: 600;
  margin-right: 16px;
  word-break: break-word;
}
.action-buttons {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}
.action-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  line-height: 1;
  padding: 4px;
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
.goal-meta {
  margin: 16px 0 8px 0;
}
.goal-amount {
  font-size: 20px;
  font-weight: 600;
}
.goal-amount span {
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: 500;
}
.target-date-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}
.target-date {
  font-size: 13px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  margin: 0;
}
.days-remaining {
  font-size: 12px;
  font-weight: 500;
  background-color: #e2e8f0;
  color: var(--text-third);
  padding: 2px 8px;
  border-radius: 99px;
}
.progress-bar-container {
  width: 100%;
  background-color: #e9ecef;
  border-radius: 99px;
  height: 12px;
  overflow: hidden;
}
.progress-bar {
  height: 100%;
  background-color: var(--accent-green);
  border-radius: 99px;
  transition: width 0.5s ease;
}
.percentage-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 8px;
  text-align: right;
}
.loading-indicator,
.no-goals {
  grid-column: 1 / -1;
  text-align: center;
  color: var(--text-secondary);
  padding: 40px;
}
.goal-footer {
  margin-top: 20px;
  border-top: 1px solid var(--border-color);
  padding-top: 16px;
  display: flex;
  gap: 12px;
}
.add-funds-btn,
.ai-btn {
  flex: 1;
}
.ai-btn {
  background-color: #e2e8f0;
  color: var(--text-third);
}
.ai-btn:hover {
  background-color: #cbd5e0;
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
  width: 90%;
  max-width: 700px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 24px;
}
.modal-subtitle {
  margin-bottom: 24px;
  color: var(--text-secondary);
}
.ai-suggestion strong {
  color: var(--primary-color);
  font-weight: 600;
}
.icon-xs {
  width: 14px;
  height: 14px;
  margin-right: 6px;
}
.icon-sm {
  width: 16px;
  height: 16px;
  margin-right: 8px;
}
.frequency-switcher {
  display: flex;
  justify-content: center;
  background-color: var(--background-color-light);
  border-radius: 8px;
  padding: 4px;
  margin-bottom: 24px;
}
.frequency-switcher button {
  flex: 1;
  background: none;
  border: none;
  padding: 6px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  color: var(--text-secondary);
  transition: all 0.2s ease;
}
.frequency-switcher button.active {
  background-color: var(--surface-color);
  color: var(--primary-color);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
.explanation-container {
  margin-top: 20px;
}
.explanation-toggle {
  width: 100%;
  background-color: var(--background-color-light);
  border: 1px solid var(--border-color);
  padding: 10px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  color: var(--text-secondary);
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background-color 0.2s ease;
}
.explanation-toggle:hover {
  background-color: #e2e8f0;
}
.dark-theme .explanation-toggle:hover {
  background-color: #334155;
}
.explanation-details {
  margin-top: 12px;
  padding: 16px;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  animation: fadeIn 0.3s ease;
}
.dark-theme .explanation-details {
  background-color: #1e293b;
  border-color: #334155;
}
.explanation-details ul {
  padding-left: 20px;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.explanation-details li {
  font-size: 14px;
  color: var(--text-secondary);
}
.explanation-details strong {
  color: var(--text-primary);
}

/* ============== STYLE BARU UNTUK MODAL AI ============== */
.ai-status-banner {
  width: 100%;
  padding: 12px 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 600;
  margin-bottom: 16px;
  border: 1px solid transparent;
}
.ai-status-banner .icon-sm {
  margin-right: 0;
}
.ai-status-banner--realistic {
  background-color: #f0fdf4;
  color: #166534;
  border-color: #bbf7d0;
}
.dark-theme .ai-status-banner--realistic {
  background-color: #142b21;
  color: #6ee7b7;
  border-color: #2b5f45;
}
.ai-status-banner--adjustment {
  background-color: #fefce8;
  color: #854d0e;
  border-color: #fef08a;
}
.dark-theme .ai-status-banner--adjustment {
  background-color: #2e2912;
  color: #fde047;
  border-color: #635319;
}
.ai-status-banner--negative {
  background-color: #fef2f2;
  color: #991b1b;
  border-color: #fecaca;
}
.dark-theme .ai-status-banner--negative {
  background-color: #2f1616;
  color: #fca5a5;
  border-color: #632424;
}
.ai-status-banner--loading .icon-sm {
  animation: spin 1.5s linear infinite;
}
.ai-message {
  line-height: 1.7;
  color: var(--text-primary);
  margin-top: 0;
}
:deep(.explanation-box) {
  background-color: var(--background-color-light);
  border: 1px solid var(--border-color);
  padding: 12px;
  margin: 8px 0;
  border-radius: 6px;
  font-size: 14px;
  line-height: 1.6;
}
:deep(.explanation-box strong) {
  color: var(--primary-color);
}
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* AI Mode Switcher */
.ai-mode-switcher {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  padding: 4px;
  background: var(--background-color-light);
  border-radius: 10px;
}

.ai-mode-switcher button {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  background: transparent;
  font-weight: 500;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.3s ease;
}

.ai-mode-switcher button:hover {
  color: var(--text-primary);
}

.ai-mode-switcher button.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.ai-mode-switcher button .icon-xs {
  width: 14px;
  height: 14px;
  margin-right: 0;
}

/* Gemini Container */
.gemini-container {
  min-height: 200px;
  max-height: 65vh;
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
}

.gemini-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  gap: 16px;
}

.gemini-loader {
  display: flex;
  gap: 6px;
}

.gemini-loader span {
  width: 10px;
  height: 10px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  animation: geminiPulse 1.4s ease-in-out infinite;
}

.gemini-loader span:nth-child(2) {
  animation-delay: 0.2s;
}

.gemini-loader span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes geminiPulse {
  0%, 60%, 100% { transform: scale(0.8); opacity: 0.5; }
  30% { transform: scale(1.2); opacity: 1; }
}

.gemini-loading p {
  color: var(--text-secondary);
  font-size: 14px;
  margin: 0;
}

.gemini-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px;
  background: #fef2f2;
  border-radius: 12px;
  text-align: center;
}

.dark-theme .gemini-error {
  background: #2f1616;
}

.gemini-error i {
  width: 32px;
  height: 32px;
  color: #ef4444;
}

.gemini-error p {
  color: #991b1b;
  margin: 0;
  font-size: 14px;
}

.dark-theme .gemini-error p {
  color: #fca5a5;
}

.gemini-response {
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  overflow: hidden;
  animation: slideUp 0.3s ease;
  display: flex;
  flex-direction: column;
  max-height: 60vh;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.gemini-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: 600;
  font-size: 14px;
}

.gemini-avatar {
  width: 28px;
  height: 28px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gemini-avatar svg {
  width: 18px;
  height: 18px;
}

.gemini-content {
  padding: 20px;
  line-height: 1.8;
  font-size: 14px;
  color: var(--text-primary);
  flex: 1;
  overflow-y: auto;
  min-height: 200px;
}

.gemini-content :deep(strong) {
  color: #667eea;
  font-weight: 600;
}

.gemini-content :deep(ul) {
  margin: 8px 0;
  padding-left: 20px;
}

.gemini-content :deep(li) {
  margin: 6px 0;
}

.gemini-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
}

.gemini-empty p {
  color: var(--text-secondary);
  font-size: 14px;
  margin: 0;
}
</style>
