package main

import (
	"log"
	"os"

	"backend/config"
	"backend/routes"

	"github.com/joho/godotenv"
)

func main() {
	// Attempt to load .env from current directory or parent directory
	if err := godotenv.Load(); err != nil {
		if errParent := godotenv.Load("../.env"); errParent != nil {
			log.Println("Info: File .env tidak ditemukan, menggunakan environment variable sistem.")
		}
	}

	// Initialize database connection and migrations
	config.ConnectDB()

	// Configure application port
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	r := routes.SetupRouter()

	log.Printf("Server Cuan't berjalan di port %s (http://localhost:%s)", port, port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Gagal menjalankan server: %v", err)
	}
}
