package config

import (
	"log"
	"os"

	"backend/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func ConnectDB() {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("Konfigurasi wajib tidak ditemukan: Environment variable DATABASE_URL belum diset. Silakan buat file .env sesuai .env.example")
	}

	// Connect to PostgreSQL without echoing the connection string to logs
	db, err := gorm.Open(postgres.Open(dbURL), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		log.Fatal("Gagal terhubung ke database PostgreSQL. Pastikan service PostgreSQL berjalan dan kredensial di DATABASE_URL valid.")
	}

	// Run auto migrations for models
	err = db.AutoMigrate(&models.User{}, &models.Transaction{})
	if err != nil {
		log.Fatal("Gagal menjalankan migrasi skema database.")
	}

	DB = db
	log.Println("Koneksi database PostgreSQL berhasil dihubungkan dan migrasi skema tabel selesai.")
}
