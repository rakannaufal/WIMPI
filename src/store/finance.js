import { defineStore } from "pinia";
import { ref, computed } from "vue";
import supabase from "@/supabaseClient";

export const useFinanceStore = defineStore("finance", () => {
  // =================================================================
  // === STATE (Penyimpanan Data Utama) ===
  // =================================================================
  const user = ref(null);
  const transactions = ref([]);
  const goals = ref([]);
  const budgets = ref([]);
  const loading = ref(false);
  const error = ref(null);
  const allTransactionsLoaded = ref(false);

  // =================================================================
  // === GETTERS (Data Turunan yang Dihitung Otomatis) ===
  // =================================================================

  const netWorth = computed(() => {
    if (!transactions.value) return 0;
    return transactions.value.reduce(
      (acc, tx) =>
        tx.type === "Pemasukan" ? acc + tx.amount : acc - tx.amount,
      0
    );
  });

  const currentMonthCashFlow = computed(() => {
    if (!transactions.value) return { income: 0, expense: 0 };
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    let income = 0;
    let expense = 0;
    transactions.value
      .filter((tx) => new Date(tx.transaction_at) >= startOfMonth)
      .forEach((tx) => {
        if (tx.type === "Pemasukan") income += tx.amount;
        else expense += tx.amount;
      });
    return { income, expense };
  });

  // === PERBAIKAN DI SINI ===
  // Getter ini sekarang hanya menghitung transaksi pada bulan berjalan.
  const expenseByCategory = computed(() => {
    if (!transactions.value) return {};
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const expenseMap = new Map();
    transactions.value
      .filter(
        (tx) =>
          tx.type === "Pengeluaran" &&
          new Date(tx.transaction_at) >= startOfMonth
      )
      .forEach((tx) => {
        let key = tx.category;
        if (tx.category === "Tabungan Target" && tx.notes) {
          const targetName = tx.notes.replace("Menambah dana ke target: ", "");
          key = `Tabungan: ${targetName}`;
        }
        expenseMap.set(key, (expenseMap.get(key) || 0) + tx.amount);
      });
    return Object.fromEntries(expenseMap);
  });

  // === PERBAIKAN DI SINI ===
  // Getter ini sekarang hanya menghitung transaksi pada bulan berjalan.
  const incomeByCategory = computed(() => {
    if (!transactions.value) return {};
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const incomeMap = new Map();
    transactions.value
      .filter(
        (tx) =>
          tx.type === "Pemasukan" && new Date(tx.transaction_at) >= startOfMonth
      )
      .forEach((tx) => {
        const key = tx.category;
        incomeMap.set(key, (incomeMap.get(key) || 0) + tx.amount);
      });
    return Object.fromEntries(incomeMap);
  });

  const netWorthTrend = computed(() => {
    if (!transactions.value || transactions.value.length < 2)
      return { labels: [], datasets: [{ data: [] }] };
    const sortedTxs = [...transactions.value].sort(
      (a, b) => new Date(a.transaction_at) - new Date(b.transaction_at)
    );
    let runningBalance = 0;
    const dataPoints = sortedTxs.map((tx) => {
      runningBalance += tx.type === "Pemasukan" ? tx.amount : -tx.amount;
      return {
        date: new Date(tx.transaction_at).toLocaleDateString("id-ID", {
          month: "short",
          day: "2-digit",
        }),
        balance: runningBalance,
      };
    });
    return {
      labels: dataPoints.map((p) => p.date),
      datasets: [
        {
          label: "Kekayaan Bersih",
          data: dataPoints.map((p) => p.balance),
          borderColor: "var(--primary-color)",
          backgroundColor: "rgba(26, 35, 126, 0.1)",
          fill: true,
          tension: 0.3,
        },
      ],
    };
  });

  const processedBudgets = computed(() => {
    if (!budgets.value || !transactions.value)
      return { budgetItems: [], unbudgetedSpending: [] };
    const period =
      budgets.value.length > 0
        ? budgets.value[0].period
        : new Date().toISOString().slice(0, 7);
    const start = new Date(period);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    const actualSpending = transactions.value
      .filter((tx) => {
        const txDate = new Date(tx.transaction_at);
        return tx.type === "Pengeluaran" && txDate >= start && txDate <= end;
      })
      .reduce((acc, tx) => {
        acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
        return acc;
      }, {});
    const budgetItems = budgets.value
      .filter((b) => b.period === period)
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
    const budgetedCategories = new Set(budgets.value.map((b) => b.category));
    const unbudgetedSpending = Object.entries(actualSpending)
      .filter(([category]) => !budgetedCategories.has(category))
      .map(([category, spent]) => ({ category, spent }));
    return { budgetItems, unbudgetedSpending };
  });

  const budgetSummary = computed(() => {
    if (!processedBudgets.value || !processedBudgets.value.budgetItems) {
      return { totalBudget: 0, totalSpent: 0, totalRemaining: 0 };
    }
    const items = processedBudgets.value.budgetItems;
    const totalBudget = items.reduce((sum, item) => sum + item.amount, 0);
    const totalSpent = items.reduce((sum, item) => sum + item.spent, 0);
    return {
      totalBudget,
      totalSpent,
      totalRemaining: totalBudget - totalSpent,
    };
  });

  // =================================================================
  // === ACTIONS (Fungsi untuk berinteraksi dengan Database) ===
  // =================================================================

  function handleAuthStateChange() {
    supabase.auth.onAuthStateChange((_event, session) => {
      user.value = session ? session.user : null;
      if (user.value) {
        fetchAllData();
      } else {
        transactions.value = [];
        goals.value = [];
        budgets.value = [];
        allTransactionsLoaded.value = false;
      }
    });
  }

  async function fetchAllData() {
    if (!user.value) return;
    loading.value = true;
    error.value = null;
    allTransactionsLoaded.value = false;
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const dateLimit = sixMonthsAgo.toISOString();
    const now = new Date();
    const currentPeriod = `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}`;
    try {
      const [txs, gls, bgs] = await Promise.all([
        supabase
          .from("transactions")
          .select("*")
          .gte("transaction_at", dateLimit)
          .order("transaction_at", { ascending: false }),
        supabase
          .from("goals")
          .select("*")
          .order("created_at", { ascending: true }),
        supabase.from("budgets").select("*").eq("period", currentPeriod),
      ]);
      if (txs.error) throw txs.error;
      if (gls.error) throw gls.error;
      if (bgs.error) throw bgs.error;
      transactions.value = txs.data || [];
      goals.value = gls.data || [];
      budgets.value = bgs.data || [];
    } catch (e) {
      error.value = e.message;
    } finally {
      loading.value = false;
    }
  }

  async function fetchAllTransactions() {
    if (allTransactionsLoaded.value) return;
    loading.value = true;
    try {
      const { data, error: txError } = await supabase
        .from("transactions")
        .select("*")
        .order("transaction_at", { ascending: false });
      if (txError) throw txError;
      transactions.value = data || [];
      allTransactionsLoaded.value = true;
    } catch (e) {
      error.value = e.message;
    } finally {
      loading.value = false;
    }
  }

  const getCashFlowTrendByPeriod = (period) => {
    if (!transactions.value) return { labels: [], datasets: [] };
    const now = new Date();
    let startDate = new Date();
    let timeUnit;
    switch (period) {
      case "7d":
        startDate.setDate(now.getDate() - 6);
        timeUnit = "day";
        break;
      case "1m":
        startDate.setMonth(now.getMonth() - 1);
        timeUnit = "day";
        break;
      case "1y":
        startDate.setFullYear(now.getFullYear() - 1);
        timeUnit = "month";
        break;
      case "5y":
        startDate.setFullYear(now.getFullYear() - 5);
        timeUnit = "year";
        break;
      case "6m":
      default:
        startDate.setMonth(now.getMonth() - 6);
        timeUnit = "month";
        break;
    }
    const filteredTxs = transactions.value.filter(
      (tx) =>
        new Date(tx.transaction_at) >= startDate &&
        new Date(tx.transaction_at) <= now
    );
    const trend = {};
    const tempDate = new Date(startDate);
    while (tempDate <= now) {
      let key;
      if (timeUnit === "day") {
        key = tempDate.toLocaleDateString("id-ID", {
          month: "short",
          day: "numeric",
        });
        tempDate.setDate(tempDate.getDate() + 1);
      } else if (timeUnit === "month") {
        key = tempDate.toLocaleDateString("id-ID", {
          month: "short",
          year: "2-digit",
        });
        tempDate.setMonth(tempDate.getMonth() + 1);
      } else {
        key = String(tempDate.getFullYear());
        tempDate.setFullYear(tempDate.getFullYear() + 1);
      }
      if (!trend[key]) trend[key] = { income: 0, expense: 0 };
    }
    filteredTxs.forEach((tx) => {
      const txDate = new Date(tx.transaction_at);
      let key;
      if (timeUnit === "day")
        key = txDate.toLocaleDateString("id-ID", {
          month: "short",
          day: "numeric",
        });
      else if (timeUnit === "month")
        key = txDate.toLocaleDateString("id-ID", {
          month: "short",
          year: "2-digit",
        });
      else key = String(txDate.getFullYear());
      if (trend[key]) {
        if (tx.type === "Pemasukan") trend[key].income += tx.amount;
        else trend[key].expense += tx.amount;
      }
    });
    const labels = Object.keys(trend);
    return {
      labels,
      datasets: [
        {
          label: "Pemasukan",
          data: labels.map((m) => trend[m]?.income || 0),
          backgroundColor: "rgba(72, 187, 120, 0.8)",
        },
        {
          label: "Pengeluaran",
          data: labels.map((m) => trend[m]?.expense || 0),
          backgroundColor: "rgba(245, 101, 101, 0.8)",
        },
      ],
    };
  };

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function addTransaction(transaction) {
    const { data, error } = await supabase
      .from("transactions")
      .insert({ ...transaction, user_id: user.value.id })
      .select()
      .single();
    if (error) throw error;
    transactions.value.unshift(data);
  }

  async function updateTransaction(id, updatedData) {
    const { id: txId, created_at, user_id, ...dataToUpdate } = updatedData;
    const { data, error } = await supabase
      .from("transactions")
      .update(dataToUpdate)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    const index = transactions.value.findIndex((tx) => tx.id === id);
    if (index !== -1) transactions.value[index] = data;
  }

  async function deleteTransaction(id) {
    const txToDelete = transactions.value.find((tx) => tx.id === id);
    if (!txToDelete) {
      console.error("Transaksi tidak ditemukan.");
      return;
    }
    if (txToDelete.category === "Tabungan Target" && txToDelete.notes) {
      const targetName = txToDelete.notes.replace(
        "Menambah dana ke target: ",
        ""
      );
      const targetGoal = goals.value.find((g) => g.name === targetName);
      if (targetGoal) {
        const newCurrentAmount = targetGoal.current_amount - txToDelete.amount;
        await updateGoal(targetGoal.id, {
          ...targetGoal,
          current_amount: newCurrentAmount < 0 ? 0 : newCurrentAmount,
        });
      }
    }
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) throw error;
    transactions.value = transactions.value.filter((t) => t.id !== id);
  }

  async function addGoal(goal) {
    const { data, error } = await supabase
      .from("goals")
      .insert({ ...goal, user_id: user.value.id })
      .select()
      .single();
    if (error) throw error;
    goals.value.push(data);
  }

  async function updateGoal(id, updatedData) {
    const oldGoal = goals.value.find((g) => g.id === id);
    if (!oldGoal)
      throw new Error("Target lama tidak ditemukan untuk diupdate.");
    const difference = updatedData.current_amount - oldGoal.current_amount;
    const { id: goalId, created_at, user_id, ...dataToUpdate } = updatedData;
    const { data, error } = await supabase
      .from("goals")
      .update(dataToUpdate)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    if (difference !== 0) {
      const correctionTx = {
        amount: Math.abs(difference),
        category: "Koreksi Target",
        type: difference > 0 ? "Pengeluaran" : "Pemasukan",
        transaction_at: new Date().toISOString(),
        notes: `Koreksi dana pada target: ${data.name}`,
      };
      await addTransaction(correctionTx);
    }
    const index = goals.value.findIndex((g) => g.id === id);
    if (index !== -1) goals.value[index] = data;
  }

  async function deleteGoal(id) {
    const goalToDelete = goals.value.find((g) => g.id === id);
    if (!goalToDelete) throw new Error("Target tidak ditemukan.");
    const notePattern = `Menambah dana ke target: ${goalToDelete.name}`;
    const { error: goalError } = await supabase
      .from("goals")
      .delete()
      .eq("id", id);
    if (goalError) throw goalError;
    const { error: txError } = await supabase
      .from("transactions")
      .delete()
      .eq("notes", notePattern);
    if (txError) console.error("Gagal menghapus transaksi terkait:", txError);
    goals.value = goals.value.filter((g) => g.id !== id);
    transactions.value = transactions.value.filter(
      (tx) => tx.notes !== notePattern
    );
  }

  async function addFundsToGoal(goalId, amountToAdd) {
    if (!amountToAdd || amountToAdd <= 0)
      throw new Error("Jumlah harus lebih besar dari nol.");
    const { data: currentGoal, error: fetchError } = await supabase
      .from("goals")
      .select("current_amount, name")
      .eq("id", goalId)
      .single();
    if (fetchError) throw fetchError;
    const newCurrentAmount = currentGoal.current_amount + amountToAdd;
    const { data: updatedGoal, error: updateError } = await supabase
      .from("goals")
      .update({ current_amount: newCurrentAmount })
      .eq("id", goalId)
      .select()
      .single();
    if (updateError) throw updateError;
    await addTransaction({
      amount: amountToAdd,
      category: "Tabungan Target",
      type: "Pengeluaran",
      transaction_at: new Date().toISOString(),
      notes: `Menambah dana ke target: ${updatedGoal.name}`,
    });
    const index = goals.value.findIndex((g) => g.id === goalId);
    if (index !== -1) goals.value[index] = updatedGoal;
  }

  async function fetchBudgetsForPeriod(period) {
    const { data, error: fetchError } = await supabase
      .from("budgets")
      .select("*")
      .eq("period", period);
    if (fetchError) throw fetchError;
    budgets.value = data || [];
  }

  async function addOrUpdateBudget(budgetData) {
    const { data: result, error } = await supabase
      .from("budgets")
      .upsert({ ...budgetData, user_id: user.value.id })
      .select()
      .single();
    if (error) throw error;
    const index = budgets.value.findIndex(
      (b) => b.period === result.period && b.category === result.category
    );
    if (index !== -1) budgets.value[index] = result;
    else budgets.value.push(result);
  }

  async function deleteBudget(id) {
    const { error } = await supabase.from("budgets").delete().eq("id", id);
    if (error) throw error;
    budgets.value = budgets.value.filter((b) => b.id !== id);
  }

  async function copyBudgetsFromLastMonth(currentPeriod, lastPeriod) {
    const { data: lastMonthBudgets, error: fetchError } = await supabase
      .from("budgets")
      .select("category, amount, type")
      .eq("period", lastPeriod);
    if (fetchError) throw fetchError;
    if (lastMonthBudgets.length === 0) {
      alert(
        "Tidak ada anggaran yang ditemukan di bulan sebelumnya untuk disalin."
      );
      return;
    }
    const newBudgets = lastMonthBudgets.map((b) => ({
      ...b,
      period: currentPeriod,
      user_id: user.value.id,
    }));
    const { data: inserted, error: insertError } = await supabase
      .from("budgets")
      .insert(newBudgets)
      .select();
    if (insertError) throw insertError;
    budgets.value = inserted;
  }

  async function updateUserProfile(newData) {
    const updateData = {};
    if (newData.phone)
      updateData.data = { ...user.value.user_metadata, phone: newData.phone };
    if (newData.password) updateData.password = newData.password;
    if (Object.keys(updateData).length === 0) return;
    const { error } = await supabase.auth.updateUser(updateData);
    if (error) throw error;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    user.value = session ? session.user : null;
  }

  return {
    user,
    transactions,
    goals,
    budgets,
    loading,
    error,
    netWorth,
    currentMonthCashFlow,
    expenseByCategory,
    incomeByCategory,
    netWorthTrend,
    processedBudgets,
    budgetSummary,
    handleAuthStateChange,
    fetchAllData,
    fetchAllTransactions,
    signOut,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addGoal,
    updateGoal,
    deleteGoal,
    addFundsToGoal,
    fetchBudgetsForPeriod,
    addOrUpdateBudget,
    deleteBudget,
    copyBudgetsFromLastMonth,
    updateUserProfile,
    getCashFlowTrendByPeriod,
  };
});
