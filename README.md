# Mapan - Asisten Keuangan Pribadi Cerdas

**Mapan** adalah aplikasi web modern yang dirancang untuk menjadi lebih dari sekadar pencatat keuangan. Dengan antarmuka yang bersih, fitur cerdas, dan visualisasi data yang kaya, Mapan membantu Anda memahami, merencanakan, dan mencapai tujuan finansial Anda dengan percaya diri.

---

## ✨ Fitur Unggulan

- **Dashboard Interaktif**: Dapatkan ringkasan visual _real-time_ dari kondisi keuangan Anda, termasuk kekayaan bersih, arus kas bulanan, sisa anggaran, dan slider progres target yang dinamis.
- **Manajemen Transaksi Cerdas**: Catat setiap pemasukan dan pengeluaran dengan detail waktu (jam & menit) dan kategori kustom "Lainnya" yang fleksibel.
- **Anggaran Bulanan & Tahunan**: Buat anggaran untuk setiap kategori pengeluaran dalam periode bulanan atau tahunan. Pantau penggunaannya dengan progress bar berwarna yang memberikan notifikasi visual (hijau, kuning, merah).
- **Target Finansial dengan Asisten AI**:
  - Tetapkan tujuan keuangan Anda dengan tanggal target.
  - Gunakan **Asisten Finansial AI** untuk mendapatkan rekomendasi tabungan (harian, mingguan, bulanan) yang realistis berdasarkan kapasitas menabung Anda.
  - Alokasikan dana atau koreksi jumlah tabungan dengan mudah.
- **Laporan Komprehensif & Responsif**:
  - Hasilkan laporan keuangan dengan pemilih periode yang dinamis (bulanan/tahunan).
  - Lihat perbandingan antara rencana (anggaran) dan realita (pengeluaran).
  - Dapat dicetak atau disimpan sebagai **PDF** dengan layout yang sudah dioptimalkan.
- **Desain Sepenuhnya Responsif**: Nikmati pengalaman pengguna yang konsisten dan nyaman di semua perangkat, dari desktop hingga HP, dengan sidebar adaptif dan layout yang fleksibel.

---

## 🛠️ Teknologi yang Digunakan

- **Frontend**: [Vue.js 3](https://vuejs.org/) (Composition API)
- **Backend & Database**: [Supabase](https://supabase.io/) (PostgreSQL, Auth, Realtime)
- **Routing**: [Vue Router](https://router.vuejs.org/)
- **Manajemen State**: [Pinia](https://pinia.vuejs.org/)
- **Styling**: CSS Murni dengan Scoped Styles & CSS Variables (Tanpa Framework)
- **Visualisasi Data**: [Chart.js](https://www.chartjs.org/)
- **Ikon**: [Feather Icons](https://feathericons.com/)
- **Build Tool**: [Vite](https://vitejs.dev/)

---

## 🚀 Instalasi & Menjalankan Proyek

Ikuti langkah-langkah berikut untuk menjalankan proyek ini di komputer lokal Anda.

### Prasyarat

- [Node.js](https://nodejs.org/en/) (v18 atau lebih tinggi)
- [Git](https://git-scm.com/)
- Akun [Supabase](https://supabase.io/)

### 1\. Clone Repositori

```bash
git clone https://github.com/rakannaufal/MAPAN.git
cd MAPAN
```

### 2\. Instal Dependensi

```bash
npm install
```

### 3\. Konfigurasi Environment Variables

Anda memerlukan **URL Proyek** dan **Kunci Anon (Public Key)** dari Supabase.

1.  Buat akun atau login di [Supabase](https://supabase.io/).
2.  Buat proyek baru.
3.  Di dashboard proyek Anda, buka **Settings \> API**.
4.  Salin **Project URL** dan kunci `anon` dari bagian **Project API Keys**.

Selanjutnya, buat file bernama `.env` di direktori utama proyek Anda dan isi dengan kredensial yang telah Anda salin.

**File: `.env`**

```
VITE_SUPABASE_URL="URL_PROYEK_SUPABASE_ANDA"
VITE_SUPABASE_KEY="KUNCI_ANON_SUPABASE_ANDA"
```

### 4\. Setup Database di Supabase

Jalankan skrip SQL lengkap berikut di **SQL Editor** Supabase untuk membuat semua tabel, relasi, dan kebijakan keamanan yang dibutuhkan oleh aplikasi:

```sql
-- Skrip Inisialisasi Database Mapan

-- Tabel 1: transactions
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  transaction_at TIMESTAMPTZ NOT NULL,
  category TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Pemasukan', 'Pengeluaran')),
  notes TEXT
);

-- Tabel 2: goals
CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  name TEXT NOT NULL,
  target_amount NUMERIC NOT NULL CHECK (target_amount > 0),
  current_amount NUMERIC DEFAULT 0 NOT NULL CHECK (current_amount >= 0),
  target_date DATE
);

-- Tabel 3: budgets
CREATE TABLE public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  period TEXT NOT NULL, -- Format 'YYYY-MM' untuk bulanan atau 'YYYY' untuk tahunan
  type TEXT NOT NULL DEFAULT 'monthly'
);
ALTER TABLE public.budgets ADD CONSTRAINT unique_budget_per_period UNIQUE (user_id, category, period);

-- Aktifkan Row Level Security (RLS)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- Buat Policies Keamanan
CREATE POLICY "Pengguna dapat mengelola datanya sendiri"
ON public.transactions FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Pengguna dapat mengelola datanya sendiri"
ON public.goals FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Pengguna dapat mengelola datanya sendiri"
ON public.budgets FOR ALL USING (auth.uid() = user_id);
```

### 5\. Jalankan Aplikasi

```bash
npm run dev
```

Aplikasi sekarang akan berjalan di `http://localhost:5173` (atau port lain yang tersedia).

---

## 📂 Struktur Proyek

```
/src
|-- /assets           # Aset statis seperti gambar dan CSS global
|-- /components       # Komponen Vue yang dapat digunakan kembali (Sidebar, dll.)
|-- /router           # Konfigurasi routing aplikasi
|-- /services         # Logika bisnis terisolasi (aiAssistant.js)
|-- /store            # Manajemen state dengan Pinia (finance.js)
|-- /views            # Komponen halaman (Dashboard, Transaksi, dll.)
|-- App.vue           # Komponen root aplikasi
|-- main.js           # Titik masuk utama aplikasi
`-- supabaseClient.js # Konfigurasi klien Supabase
```

---

## 🤝 Kontribusi

Kontribusi sangat kami harapkan\! Jika Anda ingin membantu, silakan fork repositori ini dan buat _pull request_. Untuk perubahan besar, mohon buka _issue_ terlebih dahulu untuk mendiskusikan apa yang ingin Anda ubah.
