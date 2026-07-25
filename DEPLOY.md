# Panduan Deployment Windows Server / VPS (DEPLOY.md)

Dokumen ini berisi panduan teknis menyetel aplikasi **Web Invoice & Surat Jalan** agar berjalan secara otomatis sebagai layanan latar belakang (*Windows Background Service*) di Windows Server / VPS produksi menggunakan **PM2** atau **NSSM**, serta konfigurasi **IIS Reverse Proxy** & **SSL HTTPS**.

---

## 🏗️ Persyaratan Khusus Deployment Windows Service (DCOM Setup)

Saat Node.js dijalankan sebagai Service (via PM2 / NSSM / Windows Service Account), proses berjalan di bawah akun sistem (*System Account*). Supaya Microsoft Excel COM Automation dapat membuat instance tanpa antarmuka GUI pengguna, folder `Desktop` khusus systemprofile **wajib tersedia**.

### Langkah Penyiapan Direktori Systemprofile:
1. Buka PowerShell sebagai **Administrator**.
2. Jalankan perintah berikut untuk memastikan folder Desktop systemprofile tersedia:
   ```powershell
   New-Item -ItemType Directory -Force -Path "C:\Windows\System32\config\systemprofile\Desktop"
   New-Item -ItemType Directory -Force -Path "C:\Windows\SysWOW64\config\systemprofile\Desktop"
   ```
3. Atur izin akses folder (*Folder Permissions*):
   Berikan izin `Full Control` pada folder aplikasi (`C:\Apps\InvoiceSystem`), folder `storage/`, `temp/`, dan `logs/` untuk akun `SYSTEM` dan `Administrators`.

---

## 🚀 Opsi Deployment 1: Menggunakan PM2 (Rekomendasi)

PM2 adalah Process Manager populer yang mendukung auto-restart saat aplikasi crash atau server reboot.

### 1. Instalasi PM2 & PM2 Windows Service
Jalankan Command Prompt sebagai Administrator:
```cmd
npm install -g pm2
npm install -g pm2-windows-service
```

### 2. Konfigurasi PM2 Service
Jalankan perintah penyetelan layanan Windows:
```cmd
pm2-service-install -n "InvoiceWebService"
```
*(Saat diminta `Perform Configuration?`, jawab `Y`, dan set `PM2_HOME` ke `C:\ProgramData\pm2`)*.

### 3. Menjalankan Aplikasi dengan PM2
Pindah ke folder aplikasi dan daftarkan server:
```cmd
cd C:\Apps\InvoiceSystem
pm2 start server.js --name "invoice-web" --env production
pm2 save
```

### 4. Perintah Pengelolaan PM2:
* **Cek Status**: `pm2 status`
* **Lihat Log**: `pm2 logs invoice-web`
* **Restart**: `pm2 restart invoice-web`
* **Stop**: `pm2 stop invoice-web`

---

## 🚀 Opsi Deployment 2: Menggunakan NSSM (Non-Sucking Service Manager)

Jika tidak menggunakan Node.js PM2, Anda dapat menggunakan utilitas **NSSM** untuk merubah `node.exe` menjadi Windows Service murni.

1. Unduh NSSM dari `https://nssm.cc/download`.
2. Ekstrak `nssm.exe` (64-bit) ke `C:\Windows\System32\`.
3. Jalankan GUI installer NSSM dari Command Prompt Administrator:
   ```cmd
   nssm install InvoiceAppService
   ```
4. Isikan parameter pada GUI NSSM:
   * **Path**: `C:\Program Files\nodejs\node.exe`
   * **Startup directory**: `C:\Apps\InvoiceSystem`
   * **Arguments**: `server.js`
   * **Environment**:
     ```text
     NODE_ENV=production
     PORT=3000
     ```
5. Klik **Install service**.
6. Jalankan service via PowerShell / Command Prompt:
   ```cmd
   net start InvoiceAppService
   ```

---

## 🌐 Konfigurasi Reverse Proxy (IIS / Nginx)

Untuk produksi, disarankan menempatkan IIS (Internet Information Services) atau Nginx di depan Node.js sebagai Reverse Proxy pada port `80` (HTTP) dan port `443` (HTTPS SSL).

### Setup IIS Reverse Proxy + Application Request Routing (ARR):
1. Install fitur **IIS (Web Server)** via Server Manager.
2. Install extension **URL Rewrite** dan **Application Request Routing (ARR)** pada IIS.
3. Buat Website baru di IIS (misal: `invoice.perusahaan.com`) mengarah ke folder kosong atau folder app.
4. Buat file `web.config` di folder situs IIS dengan aturan rewrite berikut:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <system.webServer>
        <rewrite>
            <rules>
                <rule Name="ReverseProxyToNode" stopProcessing="true">
                    <match url="(.*)" />
                    <action type="Rewrite" url="http://127.0.0.1:3000/{R:1}" />
                </rule>
            </rules>
        </rewrite>
    </system.webServer>
</configuration>
```

---

## 🔍 Checklist Verifikasi Deployment Produksi

- [ ] Node.js server berjalan otomatis saat server di-boot.
- [ ] Folder `storage/documents/invoice`, `storage/documents/surat-jalan`, `temp/`, dan `logs/` memiliki izin Tulis (*Write Access*).
- [ ] File log `logs/app.log` mencatat setiap aksi generate PDF.
- [ ] Pembuatan PDF Invoice & Surat Jalan via browser berhasil tanpa pop-up Excel COM error.
- [ ] Endpoint `/login` dan form aplikasi terlindung dari CSRF & Brute Force.
