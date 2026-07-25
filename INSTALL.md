# Panduan Instalasi Server & Dependensi (INSTALL.md)

Dokumen ini menjelaskan langkah demi langkah instalasi lingkungan runtime, perangkat lunak pendukung, serta dependensi aplikasi **Web Invoice & Surat Jalan** pada sistem operasi Windows 10/11 maupun Windows Server 2016/2019/2022.

---

## 📋 Persyaratan Lingkungan (System Requirements)

| Komponen | Persyaratan Minimum | Rekomendasi |
|---|---|---|
| **Sistem Operasi** | Windows 10 / Windows Server 2016 (64-bit) | Windows 11 / Windows Server 2022 (64-bit) |
| **Node.js Runtime** | Node.js `v20.x` LTS (64-bit) | Node.js `v24.x` LTS (64-bit) |
| **Microsoft Office** | Microsoft Excel 2016 (64-bit/32-bit) | Microsoft Excel 2021 / Office 365 (64-bit) |
| **PowerShell** | Windows PowerShell 5.1 | PowerShell 7.x (Core) |
| **RAM Server** | Minimum 4 GB RAM | 8 GB RAM atau lebih |

---

## 🛠️ Langkah-Langkah Instalasi Lengkap

### Langkah 1: Instalasi Node.js LTS
1. Unduh installer resmi Node.js 64-bit dari `https://nodejs.org/`.
2. Jalankan installer `.msi` dan ikuti wizard instalasi standar.
3. Verifikasi instalasi melalui Command Prompt / PowerShell:
   ```cmd
   node -v
   npm -v
   ```
   *Pastikan versi Node.js yang muncul adalah v20.x atau v24.x.*

---

### Langkah 2: Instalasi Microsoft Office Excel
Generator PDF menggunakan engine Microsoft Excel COM Automation (`Excel.Application`).
1. Pastikan Microsoft Excel telah terinstall resmi dan sudah teraktivasi pada komputer/server.
2. Buka aplikasi Microsoft Excel satu kali secara manual untuk melewati dialog awal (User Initials, Account Login, Privacy Settings).
3. Pastikan Microsoft Excel dapat dibuka dan ditutup tanpa memunculkan pop-up lisensi/keamanan yang menghadang.

---

### Langkah 3: Konfigurasi Kebijakan Eksekusi PowerShell (ExecutionPolicy)
Aplikasi memanggil script `src/services/generate_pdf_com.ps1` secara otomatis. PowerShell membutuhkan izin eksekusi script:
1. Buka PowerShell sebagai **Administrator** (`Run as Administrator`).
2. Jalankan perintah berikut untuk mengizinkan eksekusi script lokal:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope LocalMachine -Force
   ```
3. Verifikasi kebijakan eksekusi dengan perintah:
   ```powershell
   Get-ExecutionPolicy
   ```
   *Output harus menunjukkan `RemoteSigned` atau `Unrestricted`.*

---

### Langkah 4: Kloning / Ekstraksi Source Code Aplikasi
Salin folder aplikasi ke direktori server yang diinginkan (misal: `C:\Apps\InvoiceSystem`).

---

### Langkah 5: Instalasi Dependensi Node.js
Buka Command Prompt pada folder proyek dan jalankan:
```cmd
cd C:\Apps\InvoiceSystem
npm install
```
Seluruh package yang dibutuhkan (`express`, `ejs`, `dotenv`, `bcryptjs`, `express-session`) akan terpasang secara otomatis.

---

### Langkah 6: Konfigurasi File Environment `.env`
1. Duplikasi file `.env.example` menjadi `.env`:
   ```cmd
   copy .env.example .env
   ```
2. Sesuaikan variabel dalam `.env` sesuai kebutuhan server:
   ```env
   PORT=3000
   NODE_ENV=production
   DB_PATH=database.sqlite
   SESSION_SECRET=UbahDenganKunciRahasiaAcakProduksi2026
   
   STORAGE_DIR=storage
   TEMP_DIR=temp
   LOGS_DIR=logs
   
   TEMPLATE_INV_PATH=Invoice Pembelian Bahan.xlsx
   TEMPLATE_SJ_PATH=Surat_Jalan_Barang.xlsx
   
   LOGO_INV_PATH=Logo-Invoice.jpg
   LOGO_SJ_PATH=Logo-SuratJalan.png
   ```

---

### Langkah 7: Inisialisasi Database SQLite
Jalankan perintah seeding untuk menginisialisasi skema database dan membuat data awal:
```cmd
npm run seed
```
*Output akan mengonfirmasi pemesanan tabel `users`, `units`, `products`, `customers`, `orders`, `order_items`, `invoice_sequence`, serta pembuatan akun admin bawaan (`admin` / `admin123`).*

---

### Langkah 8: Verifikasi Peluncuran Aplikasi
Uji coba peluncuran aplikasi dengan menjalankan:
```cmd
npm start
```
Buka web browser dan akses `http://localhost:3000`. Login menggunakan kredensial bawaan `admin` / `admin123`.

Jika berhasil masuk ke Dashboard, instalasi dasar telah **Selesai 100%**. Lanjutkan ke [DEPLOY.md](DEPLOY.md) untuk menyetel aplikasi agar berjalan otomatis sebagai **Windows Background Service**.
