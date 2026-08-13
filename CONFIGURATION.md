# Referensi Konfigurasi Lingkungan (CONFIGURATION.md)

Dokumen ini memuat penjelasan detail mengenai seluruh variabel lingkungan (*environment variables*) yang tersedia pada file `.env` aplikasi **Web Invoice & Surat Jalan**.

---

## 📄 Struktur File `.env` Produksi

```env
PORT=3000
NODE_ENV=production
DB_PATH=database.sqlite
SESSION_SECRET=invoice-surat-jalan-secret-key-2026

# Directory & Template Paths Configuration
STORAGE_DIR=storage
TEMP_DIR=temp
LOGS_DIR=logs

TEMPLATE_INV_PATH=Invoice Pembelian Bahan.xlsx
TEMPLATE_SJ_PATH=Surat_Jalan_Barang.xlsx

LOGO_INV_PATH=Logo-Invoice.jpg
LOGO_SJ_PATH=Logo-SuratJalan.png
```

---

## ⚙️ Rincian Variabel Konfigurasi

| Nama Variabel | Tipe | Nilai Default | Deskripsi & Petunjuk Produksi |
|---|---|---|---|
| `PORT` | Integer | `3000` | Port HTTP tempat server Node.js mendengarkan koneksi. |
| `NODE_ENV` | String | `production` | Mode lingkungan (`development` atau `production`). Pada mode `production`, stack trace error disembunyikan dari antarmuka pengguna. |
| `DB_PATH` | String | `database.sqlite` | Path lokasi file database SQLite. Dapat diisi path relatif maupun path absolut (misal: `C:\Data\database.sqlite`). |
| `SESSION_SECRET` | String | *String Acak* | Kunci rahasia untuk menandatangani cookie sesi Express (`express-session`). **Wajib diganti dengan string acak yang kuat di lingkungan produksi**. |
| `STORAGE_DIR` | String | `storage` | Direktori tempat menyimpan file dokumen PDF hasil generate dan backup database. |
| `TEMP_DIR` | String | `temp` | Direktori penyimpanan sementara untuk pengolahan file Excel copy dan JSON input sebelum dikonversi ke PDF. |
| `LOGS_DIR` | String | `logs` | Direktori tempat menyimpan file catatan aktivitas (`app.log`) dan catatan error (`error.log`). |
| `TEMPLATE_INV_PATH` | String | `Invoice Pembelian Bahan.xlsx` | Path file template master Excel Invoice. |
| `TEMPLATE_SJ_PATH` | String | `Surat_Jalan_Barang.xlsx` | Path file template master Excel Surat Jalan. |
| `LOGO_INV_PATH` | String | `Logo-Invoice.jpg` | Path file gambar logo Invoice eksternal. |
| `LOGO_SJ_PATH` | String | `Logo-SuratJalan.png` | Path file gambar logo Surat Jalan eksternal. |

---

## 🔒 Praktik Keamanan Konfigurasi

1. **Rahasiakan File `.env`**:
   Jangan pernah mengunggah (*commit*) file `.env` ke repository publik Git. File `.env` telah dimasukkan ke dalam aturan `.gitignore`.
2. **Ubah `SESSION_SECRET`**:
   Gunakan string acak minimal 32 karakter untuk `SESSION_SECRET` pada server produksi.
3. **Proteksi Keamanan Aktif**:
   * **CSRF Protection**: Aktif secara otomatis pada seluruh endpoint `POST`/`PUT`/`DELETE`.
   * **Rate Limiter Login**: Membatasi percobaan login hingga 10x per 15 menit per IP.
   * **HTTP Security Headers**: Menyertakan header `nosniff`, `SAMEORIGIN`, dan `XSS-Protection`.
   * **Path Traversal Guard**: Mencegah akses unduhan file di luar direktori `storage/`.
4. **Penyimpanan Database Terpisah (Opsional)**:
   Pada server produksi, variabel `DB_PATH` dapat diatur ke folder data terpisah di luar folder aplikasi (misal: `D:\DatabaseProduction\invoice.sqlite`) untuk mempermudah manajemen backup disk terpisah.
