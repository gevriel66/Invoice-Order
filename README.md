# Sistem Web Invoice & Surat Jalan (Production Ready)

Sistem aplikasi web lokal / desktop berbasis **Node.js + Express.js + SQLite (WAL Mode) + EJS + Bootstrap 5** yang dirancang untuk mengelola Master Data Produk, Master Customer, Master Satuan, Transaksi Penjualan, serta pembuatan dokumen **Invoice** dan **Surat Jalan** otomatis berformat PDF secara presisi menggunakan **Microsoft Excel COM Automation (Template-Driven)**.

---

## 🌟 Fitur Utama Aplikasi

1. **Autentikasi & Sesi Persisten**:
   * Login Admin dengan keamanan hash password `bcryptjs` (salt rounds 10).
   * Sesi login persisten tersimpan di database SQLite (`SQLiteSessionStore`).
2. **Master Data Management (CRUD)**:
   * **Master Satuan**: Pengelolaan kode & nama satuan (PCS, PAK, SLOP, BOX, KTN, LTR, dll).
   * **Master Produk**: Pengelolaan barang dengan dropdown satuan master & harga.
   * **Master Customer**: Pengelolaan data pelanggan & perusahaan.
3. **Modul Transaksi & Riwayat**:
   * Pembuatan transaksi baru dengan pencarian produk autocomplete, autofill harga/satuan/brand, serta kalkulasi realtime subtotal & total.
   * Penomoran Invoice Otomatis berurutan (`INV/YYYYMM/001`) yang digenerate khusus saat transaksi berubah status menjadi `FINAL`.
   * Auto-generate No. PO (`DDMMYYYY/XXX`) dan No. Referensi (`REF/YYYYMM/XXX`) secara otomatis.
   * Penguncian (*lock*) transaksi `FINAL` agar data riwayat tidak dapat diubah setelah dokumen diterbitkan.
4. **Generator Dokumen PDF (Template-Driven Excel COM)**:
   * **Readonly Template Workflow**: Master template Excel (`Invoice Pembelian Bahan.xlsx` dan `Surat_Jalan_Barang.xlsx`) tersimpan aman dalam status readonly dan tidak pernah dimodifikasi oleh aplikasi.
   * **Isolasi Worksheet Eksplisit**: PDF Invoice diproses khusus dari worksheet `"Form Input"`, sedangkan Surat Jalan diproses dari `"Surat Jalan Barang"`. Worksheet referensi internal (`REFF`) 100% terisolasi dan tidak pernah masuk ke PDF.
   * **Preservasi Layout & Presisi Logo**: Mendukung logo eksternal (`Logo-Invoice.jpg` & `Logo-SuratJalan.png`) dengan menyisipkan logo secara presisi pada posisi template tanpa mengubah layout, font, border, margin, merge cell, maupun formula.
5. **Keamanan & Antarmuka Responsif Mobile**:
   * **Keamanan Terproteksi**: Proteksi token CSRF pada seluruh form `POST`, Rate Limiting percobaan login (maks 10x/15 menit), Path Traversal Guard pada pengunduhan dokumen, dan HTTP Security Headers (`nosniff`, `SAMEORIGIN`, `XSS-Protection`).
   * **Responsif Mobile**: Sidebar Offcanvas Drawer dengan tombol Hamburger Toggle untuk perangkat smartphone & tablet, serta pembungkus tabel & grid responsif.
6. **Infrastruktur Produksi & Logging**:
   * Penanganan error terstruktur dan pencatatan log produksi otomatis pada `logs/app.log` dan `logs/error.log`.

---

## 🏗️ Struktur Arsitektur Project (MVC)

```text
├── .env                    # Variabel konfigurasi lingkungan (Port, Session, Path)
├── .env.example            # Template variabel konfigurasi produksi
├── .gitignore              # Aturan abaikan Git (node_modules, storage, temp, logs, db)
├── Invoice Pembelian Bahan.xlsx # Template Master Excel Invoice
├── Surat_Jalan_Barang.xlsx  # Template Master Excel Surat Jalan
├── Logo-Invoice.jpg        # File Gambar Logo Invoice Eksternal
├── Logo-SuratJalan.png      # File Gambar Logo Surat Jalan Eksternal
├── package.json            # Manifest dependensi & script NPM
├── server.js               # Main Entry Point Server Express
├── database.sqlite         # Database Utama SQLite (WAL Mode)
├── logs/                   # Folder File Logging (app.log & error.log)
├── temp/                   # Folder Sementara Pengolahan Excel Copy
├── storage/                # Storage Penyimpanan Dokumen PDF & Backup
│   ├── documents/
│   │   ├── invoice/        # Direktori Output File PDF Invoice
│   │   └── surat-jalan/    # Direktori Output File PDF Surat Jalan
│   └── backups/            # Direktori Backup Online SQLite
└── src/
    ├── app.js              # Setup Middleware Express, Session & Global Error Handler
    ├── config/
    │   └── database.js     # Native SQLite DatabaseSync Wrapper (WAL Mode)
    ├── controllers/        # Express Controllers (Auth, Product, Customer, Order, Doc)
    ├── db/
    │   ├── schema.sql      # Struktur Skema Database DDL
    │   └── seed.js         # Script Inisialisasi & Seeding Default
    ├── middleware/         # Middleware Auth, CSRF, & Rate Limiting Login
    ├── models/             # Data Access Models (User, Product, Order, Unit, Customer)
    ├── routes/
    │   └── webRoutes.js    # Routing URL Aplikasi Web
    ├── services/
    │   └── generate_pdf_com.ps1 # Engine Generator PDF Excel COM Automation
    ├── utils/
    │   ├── logger.js       # Logger Produksi Sederhana
    │   └── sessionStore.js # Native SQLite Persistent Session Store
    └── views/              # EJS Templates UI Bootstrap 5
```

---

## ⚡ Panduan Menjalankan Aplikasi

### Mode Pengembangan (Development)
```bash
# 1. Install seluruh dependensi
npm install

# 2. Inisialisasi database & seed data default
npm run seed

# 3. Jalankan server
npm start
```

### Mode Produksi (Production)
```bash
# Menjalankan server dalam lingkungan NODE_ENV=production
npm run start:prod
```

Akses aplikasi melalui browser di `http://localhost:3000` dengan kredensial bawaan:
* **Username**: `admin`
* **Password**: `admin123`

---

## 📚 Dokumentasi Lengkap Produksi

* 📖 **[INSTALL.md](INSTALL.md)**: Panduan langkah demi langkah instalasi server & dependensi Windows.
* 🚀 **[DEPLOY.md](DEPLOY.md)**: Panduan deployment produksi pada Windows Server / VPS (PM2, NSSM, IIS).
* ⚙️ **[CONFIGURATION.md](CONFIGURATION.md)**: Referensi lengkap variabel `.env` & izin folder Windows.
* 💾 **[BACKUP.md](BACKUP.md)**: Prosedur backup database SQLite & pemulihan bencana (*disaster recovery*).
