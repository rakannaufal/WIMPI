// File: src/services/geminiService.js
// Service untuk berkomunikasi dengan Google Gemini API

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
// Menggunakan gemini-2.5-flash yang memiliki quota tersedia
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

// System prompt untuk konteks asisten keuangan
const SYSTEM_CONTEXT = `Kamu adalah Wimpi AI, asisten keuangan pribadi yang KRITIS, TEGAS, dan SANGAT DETAIL. 
Kamu membantu pengguna mengelola keuangan mereka dengan memberikan:
- Analisis KRITIS terhadap pola pengeluaran - jangan segan menegur jika ada pemborosan
- Saran tabungan yang REALISTIS berdasarkan data transaksi aktual
- Pertimbangan PRO dan KONTRA untuk setiap keputusan keuangan
- Peringatan jika pengeluaran tidak bijak

PENTING - BEDAKAN JENIS PERTANYAAN:

=== TIPE A: PERTANYAAN TENTANG PEMBELIAN/PENGELUARAN BARU ===
Contoh: "Apakah saya harus beli X?", "Cocok tidak beli Y?", "Boleh tidak saya beli Z?"
Untuk pertanyaan ini, gunakan FORMAT RINGKASAN KEPUTUSAN:

--- RINGKASAN KEPUTUSAN ---
Prioritas: [1-5] - [Nama Level]
Status: [PENTING / TIDAK PENTING]  
Rekomendasi: [LAKUKAN / TUNDA / BATALKAN]
Dampak: [Penjelasan singkat]
---------------------------

Lalu berikan analisis detail.

SKALA PRIORITAS:
1. PRIORITAS 1 - KEBUTUHAN MENDESAK
2. PRIORITAS 2 - KEBUTUHAN PENTING
3. PRIORITAS 3 - KEBUTUHAN PENDUKUNG
4. PRIORITAS 4 - KEINGINAN
5. PRIORITAS 5 - KEMEWAHAN

=== TIPE B: PERTANYAAN ANALISIS/INSIGHT UMUM ===
Contoh: "Apa pengeluaran terbesar?", "Bagaimana kondisi keuangan saya?", "Berikan tips hemat"
Untuk pertanyaan ini, JANGAN gunakan format RINGKASAN KEPUTUSAN.
Langsung jawab pertanyaannya dengan analisis yang relevan:
- Jawab spesifik sesuai pertanyaan
- Berikan data dan angka yang diminta
- Berikan saran praktis
- JANGAN menilai prioritas atau rekomendasi LAKUKAN/TUNDA/BATALKAN

=== TIPE C: PERTANYAAN PRIORITAS TARGET ===
Contoh: "Prioritas target mana yang harus dicapai dulu?"
Untuk pertanyaan ini, berikan urutan prioritas target dengan alasan.

Gaya komunikasimu:
- Gunakan bahasa Indonesia yang tegas tapi tetap sopan
- JANGAN gunakan emoji sama sekali
- Berikan angka dalam format Rupiah (Rp) dengan jelas
- SESUAIKAN format jawaban dengan JENIS PERTANYAAN
- Jangan ragu menegur jika ada pemborosan
- Berikan saran yang actionable dan konkret`;

// Format angka ke Rupiah
function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount || 0);
}

// Buat konteks keuangan dari data store
export function buildFinancialContext(financeStore) {
  if (!financeStore) return '';

  const { netWorth, currentMonthCashFlow, expenseByCategory, incomeByCategory, goals, transactions } = financeStore;
  
  const now = new Date();
  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const currentMonth = monthNames[now.getMonth()];
  const currentYear = now.getFullYear();

  let context = `\n\n--- DATA KEUANGAN PENGGUNA (${currentMonth} ${currentYear}) ---\n`;
  
  // Ringkasan utama
  context += `\nRINGKASAN KEUANGAN:\n`;
  context += `- Kekayaan Bersih: ${formatCurrency(netWorth)}\n`;
  context += `- Pemasukan Bulan Ini: ${formatCurrency(currentMonthCashFlow?.income || 0)}\n`;
  context += `- Pengeluaran Bulan Ini: ${formatCurrency(currentMonthCashFlow?.expense || 0)}\n`;
  context += `- Sisa Bulan Ini: ${formatCurrency((currentMonthCashFlow?.income || 0) - (currentMonthCashFlow?.expense || 0))}\n`;

  // Pengeluaran per kategori
  if (expenseByCategory && Object.keys(expenseByCategory).length > 0) {
    context += `\nPENGELUARAN PER KATEGORI:\n`;
    const sortedExpenses = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1]);
    sortedExpenses.forEach(([category, amount]) => {
      const percentage = currentMonthCashFlow?.expense > 0 
        ? ((amount / currentMonthCashFlow.expense) * 100).toFixed(1) 
        : 0;
      context += `- ${category}: ${formatCurrency(amount)} (${percentage}%)\n`;
    });
  }

  // Pemasukan per kategori
  if (incomeByCategory && Object.keys(incomeByCategory).length > 0) {
    context += `\nPEMASUKAN PER KATEGORI:\n`;
    Object.entries(incomeByCategory).forEach(([category, amount]) => {
      context += `- ${category}: ${formatCurrency(amount)}\n`;
    });
  }

  // Target keuangan
  if (goals && goals.length > 0) {
    context += `\nTARGET KEUANGAN AKTIF:\n`;
    goals.forEach(goal => {
      const progress = goal.target_amount > 0 
        ? ((goal.current_amount / goal.target_amount) * 100).toFixed(1) 
        : 0;
      const remaining = goal.target_amount - goal.current_amount;
      context += `- ${goal.name}:\n`;
      context += `  Target: ${formatCurrency(goal.target_amount)}\n`;
      context += `  Terkumpul: ${formatCurrency(goal.current_amount)} (${progress}%)\n`;
      context += `  Sisa: ${formatCurrency(remaining)}\n`;
      if (goal.target_date) {
        const deadline = new Date(goal.target_date);
        const daysLeft = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
        context += `  Deadline: ${deadline.toLocaleDateString('id-ID')} (${daysLeft} hari lagi)\n`;
      }
    });
  }

  // RIWAYAT TRANSAKSI TERAKHIR - untuk analisis detail
  if (transactions && transactions.length > 0) {
    context += `\nRIWAYAT TRANSAKSI TERAKHIR (untuk analisis pola):\n`;
    
    // Ambil 15 transaksi terakhir untuk analisis
    const recentTransactions = [...transactions]
      .sort((a, b) => new Date(b.transaction_at) - new Date(a.transaction_at))
      .slice(0, 50);
    
    recentTransactions.forEach(tx => {
      const date = new Date(tx.transaction_at).toLocaleDateString('id-ID');
      const type = tx.type === 'Pengeluaran' ? 'KELUAR' : 'MASUK';
      context += `- [${date}] ${type}: ${formatCurrency(tx.amount)} - ${tx.category}`;
      if (tx.notes) context += ` (${tx.notes})`;
      context += `\n`;
    });
    
    // Statistik
    context += `\nSTATISTIK:\n`;
    context += `- Total transaksi tercatat: ${transactions.length}\n`;
    
    // Rata-rata pengeluaran harian bulan ini
    const daysPassed = now.getDate();
    const avgDailyExpense = (currentMonthCashFlow?.expense || 0) / daysPassed;
    context += `- Rata-rata pengeluaran harian: ${formatCurrency(avgDailyExpense)}\n`;
    
    // Identifikasi kategori "hiburan/wants"
    const wantsCategories = ['Hiburan', 'Makanan', 'Jajan', 'Belanja', 'Transportasi','Pendidikan','Kesehatan','Tabungan Target'];
    let totalWants = 0;
    Object.entries(expenseByCategory || {}).forEach(([cat, amount]) => {
      if (wantsCategories.some(w => cat.toLowerCase().includes(w.toLowerCase()))) {
        totalWants += amount;
      }
    });
    if (totalWants > 0) {
      context += `- Total pengeluaran hiburan/keinginan: ${formatCurrency(totalWants)}\n`;
    }
  }

  context += `\n--- AKHIR DATA KEUANGAN ---\n`;
  return context;
}

// Kirim pesan ke Gemini API
export async function sendMessageToGemini(userMessage, financialContext = '') {
  if (!GEMINI_API_KEY) {
    throw new Error('API Key Gemini tidak ditemukan. Pastikan VITE_GEMINI_API_KEY sudah diatur di file .env');
  }

  const fullPrompt = `${SYSTEM_CONTEXT}${financialContext}\n\nPesan dari pengguna: ${userMessage}`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: fullPrompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = errorData.error?.message || '';
      
      // Handle quota exceeded error
      if (errorMessage.includes('quota') || errorMessage.includes('Quota')) {
        throw new Error('Kuota API harian telah habis. Silakan coba lagi besok atau gunakan mode Kalkulasi Cepat. 🙏');
      }
      
      // Handle rate limit error
      if (errorMessage.includes('rate') || response.status === 429) {
        throw new Error('Terlalu banyak permintaan. Mohon tunggu beberapa saat dan coba lagi. ⏳');
      }
      
      throw new Error(errorMessage || 'Gagal menghubungi Gemini API');
    }

    const data = await response.json();
    
    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      return data.candidates[0].content.parts[0].text;
    }
    
    throw new Error('Respons tidak valid dari Gemini API');
  } catch (error) {
    console.error('Gemini API Error:', error);
    
    // Re-throw user-friendly errors as-is
    if (error.message.includes('Kuota') || error.message.includes('Terlalu banyak')) {
      throw error;
    }
    
    // Handle network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Tidak dapat terhubung ke server. Periksa koneksi internet Anda.');
    }
    
    throw error;
  }
}

// Analisis pengeluaran dengan AI
export async function analyzeExpenses(financeStore) {
  const context = buildFinancialContext(financeStore);
  const prompt = `Berdasarkan data pengeluaran saya, tolong analisis:
1. Kategori mana yang paling banyak menguras uang?
2. Apakah ada pengeluaran yang bisa dikurangi?
3. Berikan 3 tips praktis untuk menghemat bulan depan.`;
  
  return sendMessageToGemini(prompt, context);
}

// Saran tabungan cerdas untuk target
export async function getSmartSavingsAdvice(goal, financeStore) {
  const context = buildFinancialContext(financeStore);
  
  // Hitung sisa yang dibutuhkan dan waktu tersisa
  const remaining = goal.target_amount - goal.current_amount;
  let weeksRemaining = null;
  let weeklyRequired = null;
  
  if (goal.target_date) {
    const now = new Date();
    const targetDate = new Date(goal.target_date);
    const daysRemaining = Math.ceil((targetDate - now) / (1000 * 60 * 60 * 24));
    weeksRemaining = Math.ceil(daysRemaining / 7);
    weeklyRequired = weeksRemaining > 0 ? Math.ceil(remaining / weeksRemaining) : remaining;
  }
  
  const goalInfo = `
TARGET KEUANGAN YANG INGIN DICAPAI:
- Nama Target: ${goal.name}
- Jumlah Target: ${formatCurrency(goal.target_amount)}
- Sudah Terkumpul: ${formatCurrency(goal.current_amount)}
- SISA YANG DIBUTUHKAN: ${formatCurrency(remaining)}
- Deadline: ${goal.target_date ? new Date(goal.target_date).toLocaleDateString('id-ID') : 'Belum ditentukan'}
${weeksRemaining ? `- Waktu tersisa: ${weeksRemaining} minggu` : ''}
${weeklyRequired ? `- Kebutuhan tabungan per minggu (kalkulasi sederhana): ${formatCurrency(weeklyRequired)}` : ''}
`;
  
  const prompt = `${goalInfo}

Berdasarkan data keuangan saya (pemasukan, pengeluaran, dan pola transaksi), tolong berikan analisis:

1. REKOMENDASI TABUNGAN MINGGUAN:
   - Berapa jumlah PASTI yang harus saya tabung SETIAP MINGGU untuk mencapai target ini tepat waktu?
   - Sebutkan angka spesifik dalam Rupiah

2. ANALISIS KELAYAKAN:
   - Apakah target ini realistis berdasarkan sisa uang saya setiap bulan?
   - Jika tidak realistis, berapa target yang lebih masuk akal?

3. STRATEGI MENCAPAI TARGET:
   - Kategori pengeluaran mana yang bisa saya kurangi untuk mencapai target?
   - Tips praktis untuk konsisten menabung setiap minggu

Berikan jawaban yang ringkas dan langsung ke poin utama.`;
  
  return sendMessageToGemini(prompt, context);
}

// Dapatkan insight keuangan otomatis
export async function getFinancialInsight(financeStore) {
  const context = buildFinancialContext(financeStore);
  const prompt = `Berikan saya insight singkat (maksimal 3 poin) tentang kondisi keuangan saya bulan ini. Fokus pada hal yang paling penting dan actionable.`;
  
  return sendMessageToGemini(prompt, context);
}

// Analisis prioritas pembelian/target
export async function getPriorityAdvice(financeStore) {
  const context = buildFinancialContext(financeStore);
  
  // Build goals info
  let goalsInfo = '';
  if (financeStore.goals && financeStore.goals.length > 0) {
    goalsInfo = '\n\nDETAIL TARGET/PEMBELIAN YANG DIRENCANAKAN:\n';
    financeStore.goals.forEach((goal, index) => {
      const remaining = goal.target_amount - goal.current_amount;
      const progress = goal.target_amount > 0 
        ? ((goal.current_amount / goal.target_amount) * 100).toFixed(1) 
        : 0;
      goalsInfo += `${index + 1}. ${goal.name}\n`;
      goalsInfo += `   - Target: ${formatCurrency(goal.target_amount)}\n`;
      goalsInfo += `   - Terkumpul: ${formatCurrency(goal.current_amount)} (${progress}%)\n`;
      goalsInfo += `   - Sisa: ${formatCurrency(remaining)}\n`;
      if (goal.target_date) {
        const deadline = new Date(goal.target_date);
        const now = new Date();
        const daysLeft = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
        goalsInfo += `   - Deadline: ${deadline.toLocaleDateString('id-ID')} (${daysLeft} hari lagi)\n`;
      }
      goalsInfo += '\n';
    });
  }
  
  const prompt = `${goalsInfo}

Berdasarkan data keuangan dan target/pembelian yang saya rencanakan di atas, tolong bantu saya menentukan PRIORITAS:

1. URUTAN PRIORITAS:
   - Urutkan target/pembelian dari yang PALING PENTING hingga yang bisa ditunda
   - Jelaskan alasan untuk setiap prioritas
   - Pertimbangkan: urgensi, kebutuhan vs keinginan, deadline, dan kondisi keuangan saya

2. ANALISIS KEMAMPUAN:
   - Target mana yang paling realistis untuk dicapai dengan kondisi keuangan saya saat ini?
   - Target mana yang mungkin perlu ditunda atau direvisi?

3. STRATEGI PENCAPAIAN:
   - Apakah saya harus fokus satu target dulu atau paralel?
   - Berapa alokasi dana ideal untuk masing-masing target per minggu/bulan?

4. REKOMENDASI:
   - Apa yang harus saya lakukan SEKARANG?
   - Target mana yang harus saya selesaikan PERTAMA?

Berikan jawaban yang detail, terstruktur, dan mudah dipahami.`;
  
  return sendMessageToGemini(prompt, context);
}

// Quick actions untuk chatbot
export const quickActions = [
  {
    id: 'priority',
    icon: '🎯',
    label: 'Prioritas Target',
    prompt: 'Bantu saya menentukan prioritas dari target/pembelian yang saya rencanakan. Urutkan dari yang paling penting dan jelaskan alasannya.'
  },
  {
    id: 'analyze',
    icon: '📊',
    label: 'Analisis Keuangan',
    prompt: 'Bagaimana kondisi keuangan saya bulan ini? Berikan analisis singkat.'
  },
  {
    id: 'expense',
    icon: '💸',
    label: 'Pola Pengeluaran',
    prompt: 'Apa pengeluaran terbesar saya bulan ini dan bagaimana cara menguranginya?'
  },
  {
    id: 'tips',
    icon: '💡',
    label: 'Tips Hemat',
    prompt: 'Berikan saya 3 tips praktis untuk menghemat uang bulan ini.'
  },
  {
    id: 'savings',
    icon: '💰',
    label: 'Saran Tabungan',
    prompt: 'Berapa yang idealnya saya tabung setiap bulan berdasarkan kondisi keuangan saya?'
  },
  {
    id: 'predict',
    icon: '📈',
    label: 'Prediksi Saldo',
    prompt: 'Berdasarkan pola pengeluaran saya, kira-kira berapa saldo saya di akhir bulan ini?'
  }
];

