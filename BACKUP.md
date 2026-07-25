# Prosedur Backup & Pemulihan Bencana (BACKUP.md)

Dokumen ini memuat panduan langkah demi langkah untuk melakukan backup database SQLite secara berkala (*Online Backup*) serta prosedur pemulihan bencana (*Disaster Recovery*) pada aplikasi **Web Invoice & Surat Jalan**.

---

## 💾 Strategi Backup Database SQLite (WAL Mode)

Aplikasi ini menggunakan SQLite dengan **Write-Ahead Logging (WAL Mode)** (`PRAGMA journal_mode = WAL;`). Hal ini memungkinkan proses backup dilakukan secara aman **tanpa mematikan aplikasi/server** (*Online Backup*).

Secara bawaan, database SQLite terdiri dari 3 file saat server aktif:
* `database.sqlite` (File Database utama)
* `database.sqlite-wal` (Write-Ahead Log)
* `database.sqlite-shm` (Shared Memory)

---

## 🛠️ Opsi 1: Prosedur Backup Manual (Online Backup)

### Langkah Backup via Script PowerShell:
Jalankan script berikut dari Command Prompt / PowerShell Administrator untuk mengambil snapshot backup yang konsisten:

```powershell
# 1. Tentukan tanggal & waktu backup
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = "C:\Playground\Latihan\storage\backups"
$backupFile = Join-Path $backupDir "database_backup_$timestamp.sqlite"

# 2. Paksa SQLite melakukan Flush WAL Checkpoint ke file utama
sqlite3 database.sqlite "PRAGMA wal_checkpoint(FULL);"

# 3. Salin file database ke folder backup
Copy-Item -Path "database.sqlite" -Destination $backupFile -Force

Write-Host "Backup database berhasil dibuat: $backupFile"
```

---

## ⏰ Opsi 2: Backup Otomatis via Windows Task Scheduler

Anda dapat menyetel Windows Task Scheduler untuk mengeksekusi backup otomatis setiap hari pada jam 23:00 WIB.

### Langkah Penyetelan Windows Task Scheduler:
1. Buka **Task Scheduler** di Windows Server.
2. Klik **Create Basic Task...** dan beri nama `InvoiceSystem_Daily_Backup`.
3. Set Trigger ke **Daily** pada jam `23:00:00`.
4. Set Action ke **Start a program**:
   * **Program/script**: `powershell.exe`
   * **Add arguments**: `-ExecutionPolicy Bypass -Command "sqlite3 C:\Playground\Latihan\database.sqlite 'PRAGMA wal_checkpoint(FULL);'; Copy-Item C:\Playground\Latihan\database.sqlite 'C:\Playground\Latihan\storage\backups\database_backup_$(Get-Date -Format yyyyMMdd).sqlite' -Force"`
5. Klik **Finish**.

---

## ♻️ Prosedur Pemulihan Bencana (Disaster Recovery / Restore)

Jika terjadi kerusakan database atau kegagalan hardware, ikuti langkah berikut untuk memulihkan data dari backup:

### Langkah Pemulihan:
1. Hentikan layanan server Node.js / PM2:
   ```cmd
   pm2 stop invoice-web
   ```
2. Pindahkan atau rename file database yang rusak (jika ada):
   ```cmd
   ren database.sqlite database_corrupted.sqlite
   del database.sqlite-wal
   del database.sqlite-shm
   ```
3. Pilih file backup terbaru dari folder `storage/backups/` (misal: `database_backup_20260726_230000.sqlite`).
4. Salin file backup tersebut menjadi `database.sqlite` di root aplikasi:
   ```cmd
   copy storage\backups\database_backup_20260726_230000.sqlite database.sqlite
   ```
5. Nyalakan kembali layanan server Node.js / PM2:
   ```cmd
   pm2 start invoice-web
   ```
6. Buka browser dan verifikasi bahwa seluruh riwayat transaksi, master produk, dan customer telah pulih sepenuhnya.

---

## 📦 Prosedur Backup Template & Logo Master

Selain database, pastikan Anda juga menyimpan cadangan dari file master berikut:
* `Invoice Pembelian Bahan.xlsx`
* `Surat_Jalan_Barang.xlsx`
* `Logo-Invoice.jpg`
* `Logo-SuratJalan.png`

Simpan file-file master di atas pada penyimpanan cloud (Google Drive / OneDrive / NAS) milik perusahaan.
