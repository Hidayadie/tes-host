# ₵ Cuan't — Aplikasi Pengelola Keuangan Pribadi

**Cuan't** adalah aplikasi web modern, ringan, dan responsif untuk mencatat serta mengelola arus kas keuangan pribadi (pemasukan & pengeluaran). Aplikasi ini dirancang agar pelajar, mahasiswa, dan individu dapat dengan mudah memantau kebiasaan finansial mereka, mengevaluasi saldo bersih, serta menganalisis alokasi pengeluaran per kategori.

---

## 🚀 Fitur Utama

1. **Sistem Autentikasi Aman**:
   * Pendaftaran akun baru (*Register*), masuk (*Login*), dan keluar (*Logout*).
   * Password dienkripsi menggunakan hashing **bcrypt**.
   * Autentikasi berbasis **JSON Web Token (JWT)** yang disimpan pada `localStorage` browser.
   * Setiap catatan transaksi terikat dengan `user_id` pemilik; pengguna lain tidak dapat mengakses atau memanipulasi data milik orang lain (*strict data isolation*).

2. **Manajemen Transaksi Finansial (CRUD)**:
   * **Tambah Transaksi**: Mencatat transaksi baru dengan tipe Pemasukan (*Income*) atau Pengeluaran (*Expense*), judul, nominal, kategori, tanggal, dan catatan tambahan.
   * **Lihat & Cari Transaksi**: Menampilkan daftar transaksi dengan tabel interaktif.
   * **Edit Transaksi**: Memperbarui rincian transaksi melalui pop-up modal.
   * **Hapus Transaksi**: Menghapus catatan transaksi dengan konfirmasi pengamanan.

3. **Ringkasan Finansial & Analitik (*Dashboard*)**:
   * Menghitung **Saldo Bersih (*Net Balance*)**, **Total Pemasukan**, dan **Total Pengeluaran** secara otomatis.
   * Indikator warna dinamis (Hijau untuk arus positif/pemasukan, Merah untuk pengeluaran/defisit).
   * **Visualisasi Alokasi Pengeluaran**: Progress bar persentase pengeluaran per kategori untuk memudahkan evaluasi anggaran bulanan.
   * Daftar transaksi terkini (*Recent Transactions*).

4. **Pencarian & Multi-Filter Fleksibel**:
   * Pencarian langsung (*real-time search*) berdasarkan judul, keterangan, atau kategori.
   * Filter berdasarkan jenis transaksi (Semua / Pemasukan / Pengeluaran).
   * Filter berdasarkan kategori dinamis.
   * Filter berdasarkan rentang tanggal (Dari Tanggal – Sampai Tanggal).
   * Pengurutan (*Sorting*): Tanggal Terkini, Tanggal Terlama, Nominal Tertinggi, Nominal Terendah.
   * Tombol *Reset Filter* sekali klik.

5. **Desain Antarmuka Responsif**:
   * Tampilan modern dan ramah pengguna di desktop, tablet, maupun layar smartphone.
   * Pop-up modal dilengkapi *fixed header & footer* dan *internal scrolling* sehingga tombol **X**, **Batal**, dan **Simpan** selalu terlihat di semua ukuran layar atau jendela non-fullscreen.
   * Navigasi cepat dengan keyboard (tekan `Esc` atau klik di luar modal untuk menutup).

---

## 🛠️ Stack Teknologi

| Komponen | Teknologi |
|---|---|
| **Backend Framework** | [Go (Golang)](https://golang.org/) dengan [Gin Web Framework](https://gin-gonic.com/) |
| **Database & ORM** | [PostgreSQL](https://www.postgresql.org/) & [GORM](https://gorm.io/) |
| **Frontend** | HTML5, CSS3 murni (Modern Variables, Flexbox, Grid), JavaScript (Vanilla ES6+ Fetch API) |
| **Keamanan & Auth** | JWT (`github.com/golang-jwt/jwt/v5`) & `golang.org/x/crypto/bcrypt` |
| **Konfigurasi** | Environment Variables via `.env` (`github.com/joho/godotenv`) |

---

## 📁 Struktur Direktori

```text
go_vibe/
├── backend/
│   ├── config/             # Konfigurasi database PostgreSQL & GORM
│   │   └── database.go
│   ├── controllers/        # Logika handler autentikasi & transaksi
│   │   ├── auth_controller.go
│   │   └── transaction_controller.go
│   ├── middleware/         # Middleware Gin (Auth JWT & CORS)
│   │   ├── auth_middleware.go
│   │   ├── auth_middleware_test.go
│   │   ├── cors_middleware.go
│   │   └── cors_middleware_test.go
│   ├── models/             # Definisi skema database GORM
│   │   ├── transaction.go
│   │   └── user.go
│   ├── routes/             # Routing endpoint API & penyajian file statis frontend
│   │   ├── routes.go
│   │   └── routes_test.go
│   ├── utils/              # Helper utility (JWT Generator & Validator)
│   │   ├── jwt.go
│   │   └── jwt_test.go
│   ├── .env.example        # Template konfigurasi environment backend
│   ├── .gitignore
│   ├── go.mod
│   ├── go.sum
│   └── main.go             # Titik masuk utama aplikasi (entry point)
├── frontend/
│   ├── css/
│   │   └── style.css       # Desain antarmuka & stylesheet responsif
│   ├── js/
│   │   ├── api.js          # API client fetch wrapper & manajemen token auth
│   │   ├── dashboard.js    # Logika tampilan ringkasan finansial & diagram alokasi
│   │   └── transactions.js # Logika manajemen data, pencarian, dan filter transaksi
│   ├── dashboard.html      # Halaman dashboard keuangan
│   ├── index.html          # Router gerbang (auto-redirect)
│   ├── login.html          # Halaman masuk akun
│   ├── register.html       # Halaman pendaftaran akun baru
│   └── transactions.html   # Halaman daftar & manajemen transaksi lengkap
├── docs/
│   └── prompts/
│       └── 00-project-spec.md  # Dokumen spesifikasi kebutuhan proyek
├── .env.example            # Template konfigurasi environment root
├── .gitignore
└── README.md
```

---

## ⚙️ Prasyarat Sistem

Sebelum menjalankan aplikasi, pastikan sistem Anda telah terpasang:
* **Go** versi 1.20 atau yang lebih baru ([Unduh Go](https://golang.org/dl/)).
* **PostgreSQL** aktif (bisa berupa instalasi lokal, Docker container, atau layanan database cloud seperti Neon/Supabase).
* Browser web modern (Google Chrome, Mozilla Firefox, Microsoft Edge, atau Safari).

---

## 📥 Panduan Instalasi & Menjalankan Aplikasi

### 1. Clone Repositori
```bash
git clone <url-repository-anda>
cd go_vibe
```

### 2. Siapkan File Konfigurasi `.env`
Salin template `.env.example` menjadi `.env` pada folder `backend/`:
```bash
cp backend/.env.example backend/.env
```

Buka file `backend/.env` dan sesuaikan nilainya:
```dotenv
APP_PORT=8080
DATABASE_URL=postgres://postgres:password_anda@localhost:5432/cuant_db?sslmode=disable
SESSION_SECRET=ganti_dengan_kunci_rahasia_jwt_anda_yang_aman
```

> **Catatan Penting:** 
> Pastikan database PostgreSQL (`cuant_db` atau nama database pilihan Anda) sudah dibuat sebelum menjalankan server. Aplikasi akan melakukan migrasi tabel (`users` dan `transactions`) secara otomatis saat pertama kali dijalankan.

### 3. Jalankan Server Backend
Masuk ke direktori `backend` dan jalankan:
```bash
cd backend
go run main.go
```

Atau jalankan langsung dari root proyek:
```bash
go run backend/main.go
```

Ketika server berhasil berjalan, Anda akan melihat log seperti berikut di terminal:
```text
Koneksi database PostgreSQL berhasil dihubungkan dan migrasi skema tabel selesai.
Menyajikan file statis frontend dari: /path/to/go_vibe/frontend
Server Cuan't berjalan di port 8080 (http://localhost:8080)
```

### 4. Buka Aplikasi di Browser
Buka browser web favorit Anda dan kunjungi:
👉 **`http://localhost:8080`**

Aplikasi akan otomatis mengarahkan ke halaman **Login** jika Anda belum masuk, atau ke **Dashboard** jika sesi Anda masih aktif.

---

## 📡 Daftar Endpoint REST API

Semua endpoint API diawali dengan prefiks `/api`:

### Autentikasi (Publik)
| Method | Endpoint | Deskripsi |
|---|---|---|
| `POST` | `/api/auth/register` | Mendaftarkan akun baru (`name`, `email`, `password`) |
| `POST` | `/api/auth/login` | Masuk akun (`email`, `password`) dan menerima JWT token |
| `POST` | `/api/auth/logout` | Mengakhiri sesi login |

### Transaksi & Akun (Memerlukan Header `Authorization: Bearer <token>`)
| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/api/auth/me` | Mengambil profil user yang sedang login |
| `GET` | `/api/transactions` | Mengambil daftar transaksi (mendukung query `search`, `type`, `category`, `start_date`, `end_date`, `sort`) |
| `POST` | `/api/transactions` | Menambahkan transaksi baru |
| `GET` | `/api/transactions/:id` | Mengambil detail 1 transaksi berdasarkan ID |
| `PUT` | `/api/transactions/:id` | Memperbarui catatan transaksi berdasarkan ID |
| `DELETE` | `/api/transactions/:id` | Menghapus transaksi berdasarkan ID |
| `GET` | `/api/summary` | Mengambil ringkasan saldo, pemasukan, pengeluaran, dan alokasi kategori |
| `GET` | `/api/categories` | Mengambil daftar kategori pemasukan dan pengeluaran |

---

## 🧪 Menjalankan Pengujian Otomatis (Unit Tests)

Proyek ini telah dilengkapi dengan unit test otomatis untuk memvalidasi keamanan token JWT, middleware otorisasi, middleware CORS, dan router file statis:

```bash
cd backend
go test -v ./...
```

Hasil pengujian yang diharapkan:
* `backend/utils`: Validasi penerbitan dan pengecekan klaim JWT token (**PASS**).
* `backend/middleware`: Pengecekan token Bearer dan preflight CORS (**PASS**).
* `backend/routes`: Verifikasi integritas rute halaman dan aset statis CSS/JS (**PASS**).

---

## 💡 Panduan Penggunaan Aplikasi

1. **Membuat Akun**: Klik tautan **Daftar sekarang** pada halaman masuk, masukkan nama, email aktif, dan kata sandi minimal 6 karakter.
2. **Mencatat Transaksi Pertama**:
   * Pada Dashboard, klik tombol **+ Catat Transaksi**.
   * Pilih tipe transaksi (**Pengeluaran** atau **Pemasukan**).
   * Isi judul transaksi (misal: *Gaji Bulanan* atau *Makan Siang*), nominal, kategori, dan tanggal.
   * Klik **Simpan Transaksi**.
3. **Menganalisis Anggaran**:
   * Periksa kartu **Saldo Bersih**, **Total Pemasukan**, dan **Total Pengeluaran** pada Dashboard.
   * Amati grafik batang **Alokasi Pengeluaran per Kategori** untuk melihat kategori mana yang paling banyak menghabiskan dana Anda.
4. **Mencari & Menyaring Riwayat**:
   * Buka menu **Semua Transaksi** di navigasi atas.
   * Gunakan kotak pencarian untuk mencari nama transaksi tertentu.
   * Gunakan filter rentang tanggal untuk melihat pengeluaran pada periode tertentu (misal: bulan berjalan).
   * Klik tombol **Edit** untuk merevisi catatan atau tombol tempat sampah untuk menghapus catatan transaksi.
5. **Keluar Akun**: Klik tombol **Keluar** di pojok kanan atas untuk membersihkan token autentikasi dari browser Anda.

---

## 🛡️ Praktik Keamanan & Konfigurasi

* **Tidak Ada Kredensial Hardcoded**: URL database dan rahasia enkripsi JWT wajib dibaca dari environment variable (`DATABASE_URL` dan `SESSION_SECRET`).
* **Proteksi Git**: File `.env` yang memuat kredensial lokal telah otomatis dimasukkan ke `.gitignore` agar tidak pernah terunggah ke repositori publik.
* **Pesan Error Bersih**: Log aplikasi dan respons API tidak menampilkan string koneksi atau kata sandi database jika terjadi kegagalan jaringan.
