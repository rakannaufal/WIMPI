// File: src/services/aiAssistant.js

// --- Fungsi Pembantu ---
function roundToSensibleAmount(amount) {
  if (amount <= 0) return 0;
  if (amount < 10000) return Math.ceil(amount / 1000) * 1000;
  if (amount < 50000) return Math.ceil(amount / 5000) * 5000;
  if (amount < 250000) return Math.ceil(amount / 10000) * 10000;
  return Math.ceil(amount / 25000) * 25000;
}

function formatBoldCurrency(amount) {
  const formatted = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(Math.abs(amount));
  return `<strong>${formatted}</strong>`;
}

// --- FUNGSI UTAMA DENGAN LOGIKA BARU ---
export function getGoalSuggestion(financialData, frequency = "weekly") {
  const {
    targetAmount,
    currentAmount,
    targetDate,
    allTransactions,
    netWorth,
    monthlyIncome,
    monthlyExpense,
  } = financialData;

  const amountNeeded = targetAmount - currentAmount;
  if (amountNeeded <= 0) {
    return {
      status: "COMPLETED",
      statusInfo: {
        label: "Target Tercapai!",
        icon: "check-circle",
        type: "realistic",
      },
      suggestion: 0,
      message:
        "Selamat, target ini sudah tercapai! Saatnya merayakan atau membuat target baru yang lebih besar!",
      analysis: null,
    };
  }

  if (!targetDate) {
    return {
      status: "NO_DATE",
      statusInfo: {
        label: "Butuh Info Tanggal",
        icon: "help-circle",
        type: "adjustment",
      },
      suggestion: 0,
      message:
        "Tolong tentukan tanggal targetnya dulu ya, agar saya bisa bantu hitung.",
      analysis: null,
    };
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const endDate = new Date(targetDate + "T00:00:00");
  const daysRemaining = (endDate - now) / (1000 * 60 * 60 * 24);

  if (daysRemaining <= 0) {
    return {
      status: "OVERDUE",
      statusInfo: {
        label: "Target Terlewat",
        icon: "alert-triangle",
        type: "negative",
      },
      suggestion: 0,
      message:
        "Tanggal target sudah lewat. Yuk, atur ulang tanggalnya agar lebih realistis.",
      analysis: null,
    };
  }

  // === LANGKAH 1: Analisis Historis ===
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(now.getMonth() - 6);
  const recentTransactions = allTransactions.filter(
    (tx) => new Date(tx.transaction_at) >= sixMonthsAgo
  );

  let totalIncome = 0;
  let totalExpense = 0;
  recentTransactions.forEach((tx) => {
    if (tx.type === "Pemasukan") totalIncome += tx.amount;
    else totalExpense += tx.amount;
  });

  const validMonths = 6;
  const avgMonthlyIncome = totalIncome / validMonths;
  const avgMonthlyDisposableIncome = (totalIncome - totalExpense) / validMonths;
  const currentMonthDisposableIncome = monthlyIncome - monthlyExpense;

  // === LANGKAH 2: Pemeriksaan Kewajaran ===
  if (targetAmount > netWorth * 5 && targetAmount > avgMonthlyIncome * 12) {
    return {
      status: "DISPROPORTIONATE",
      statusInfo: {
        label: "Target Tidak Proporsional",
        icon: "alert-octagon",
        type: "negative",
      },
      suggestion: 0,
      message: `Target sebesar ${formatBoldCurrency(
        targetAmount
      )} ini sangat jauh di atas total kekayaan bersih dan pemasukan tahunan Anda. Ini adalah target jangka panjang yang butuh strategi investasi. Coba pecah menjadi target-target kecil yang lebih realistis.`,
      analysis: { avgMonthlyDisposableIncome, currentMonthDisposableIncome },
    };
  }

  // === LANGKAH 3: Hitung Kebutuhan & Kapasitas per Periode ===
  let timeDivider, timeUnit, disposableIncomeForPeriod;
  const primaryCapacity =
    avgMonthlyDisposableIncome > 0 ? avgMonthlyDisposableIncome : 0;

  switch (frequency) {
    case "daily":
      timeDivider = daysRemaining;
      timeUnit = "harian";
      disposableIncomeForPeriod = primaryCapacity / 30.44;
      break;
    case "monthly":
      timeDivider = daysRemaining / 30.44;
      timeUnit = "bulanan";
      disposableIncomeForPeriod = primaryCapacity;
      break;
    default:
      timeDivider = daysRemaining / 7;
      timeUnit = "mingguan";
      disposableIncomeForPeriod = primaryCapacity / 4.33;
      break;
  }
  const requiredSavings =
    timeDivider > 0 ? roundToSensibleAmount(amountNeeded / timeDivider) : 0;

  const analysisData = {
    avgMonthlyDisposableIncome,
    currentMonthDisposableIncome,
    disposableIncomeForPeriod,
    requiredSavings,
    timeUnit,
  };

  // === LANGKAH 4: Logika Saran Hybrid ===
  if (avgMonthlyDisposableIncome <= 0) {
    return {
      status: "NEGATIVE_CASHFLOW",
      statusInfo: {
        label: "Arus Kas Negatif",
        icon: "x-circle",
        type: "negative",
      },
      suggestion: 0,
      message:
        "Berdasarkan histori, sisa dana rata-rata Anda negatif. Sulit untuk berkomitmen pada target baru. Fokus perbaiki arus kas dulu, ya!",
      analysis: analysisData,
    };
  }

  const capacityRatio =
    disposableIncomeForPeriod > 0
      ? requiredSavings / disposableIncomeForPeriod
      : Infinity;

  if (capacityRatio <= 1.0) {
    let message = `Dengan menabung ${formatBoldCurrency(
      requiredSavings
    )} secara <strong>${timeUnit}</strong>, Anda akan mencapai target sesuai jadwal.`;
    if (currentMonthDisposableIncome < avgMonthlyDisposableIncome * 0.8) {
      message += `<br><br><strong>Catatan:</strong> Hati-hati, sisa dana Anda bulan ini lebih rendah dari biasanya. Pastikan Anda tetap disiplin!`;
    }
    return {
      status: "REALISTIC",
      statusInfo: {
        label: "Sangat Realistis",
        icon: "check-circle",
        type: "realistic",
      },
      suggestion: requiredSavings,
      message: message,
      analysis: analysisData,
    };
  } else {
    // =================================================================
    // === PERUBAHAN UTAMA ADA DI SINI ===
    // =================================================================

    // 1. Tetapkan saran berdasarkan kapasitas, bukan kebutuhan.
    const realisticSuggestion = roundToSensibleAmount(
      disposableIncomeForPeriod
    );

    const requiredMonths = Math.ceil(amountNeeded / avgMonthlyDisposableIncome);
    const realisticDate = new Date();
    realisticDate.setMonth(
      realisticDate.getMonth() + requiredMonths,
      realisticDate.getDate() + 7
    );
    const realisticDateFormatted = realisticDate.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    // 2. Ubah pesan untuk memberi dua pilihan: tambah dana sekarang ATAU ubah tanggal.
    const message = `
        Kebutuhan menabung Anda (${formatBoldCurrency(
          requiredSavings
        )}/${timeUnit}) melebihi kapasitas finansial Anda (${formatBoldCurrency(
      disposableIncomeForPeriod
    )}/${timeUnit}).
        <br><br>
        <strong>Anda bisa menambah dana sekarang sebesar kapasitas Anda</strong>, yaitu ${formatBoldCurrency(
          realisticSuggestion
        )}, untuk tetap membuat progres.
        <br><br>
        Namun, agar target tercapai, kami tetap merekomendasikan untuk <strong>menyesuaikan tanggal target</strong> ke sekitar <strong>${realisticDateFormatted}</strong>.
      `;

    return {
      status: "NEEDS_ADJUSTMENT",
      statusInfo: {
        label: "Perlu Penyesuaian",
        icon: "alert-triangle",
        type: "adjustment",
      },
      // 3. Kembalikan saran yang realistis agar tombol tetap muncul.
      suggestion: realisticSuggestion,
      message: message,
      analysis: analysisData,
    };
  }
}
