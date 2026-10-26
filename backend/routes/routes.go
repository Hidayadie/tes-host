package routes

import (
	"log"
	"os"
	"path/filepath"

	"backend/controllers"
	"backend/middleware"

	"github.com/gin-gonic/gin"
)

// Helper to find the frontend directory regardless of working directory
func findFrontendDir() string {
	candidates := []string{
		"../frontend",
		"./frontend",
		"../../frontend",
	}

	for _, c := range candidates {
		target := filepath.Join(c, "index.html")
		if fi, err := os.Stat(target); err == nil && !fi.IsDir() {
			if abs, err := filepath.Abs(c); err == nil {
				return abs
			}
			return c
		}
	}

	// Walk upwards up to 4 levels to find frontend/index.html
	if cwd, err := os.Getwd(); err == nil {
		dir := cwd
		for i := 0; i < 4; i++ {
			target := filepath.Join(dir, "frontend", "index.html")
			if fi, err := os.Stat(target); err == nil && !fi.IsDir() {
				return filepath.Join(dir, "frontend")
			}
			parent := filepath.Dir(dir)
			if parent == dir {
				break
			}
			dir = parent
		}
	}

	return ""
}

func SetupRouter() *gin.Engine {
	r := gin.Default()

	// Apply CORS middleware globally
	r.Use(middleware.CORSMiddleware())

	// API Endpoints
	api := r.Group("/api")
	{
		// Public Auth routes
		auth := api.Group("/auth")
		{
			auth.POST("/register", controllers.Register)
			auth.POST("/login", controllers.Login)
			auth.POST("/logout", controllers.Logout)
		}

		// Protected routes (requires valid JWT token)
		protected := api.Group("/")
		protected.Use(middleware.AuthMiddleware())
		{
			protected.GET("/auth/me", controllers.GetMe)
			protected.GET("/transactions", controllers.GetTransactions)
			protected.GET("/transactions/:id", controllers.GetTransactionByID)
			protected.POST("/transactions", controllers.CreateTransaction)
			protected.PUT("/transactions/:id", controllers.UpdateTransaction)
			protected.DELETE("/transactions/:id", controllers.DeleteTransaction)
			protected.GET("/summary", controllers.GetSummary)
			protected.GET("/categories", controllers.GetCategories)
		}
	}

	// Serve Frontend static files if found
	frontendDir := findFrontendDir()
	if frontendDir != "" {
		log.Printf("Menyajikan file statis frontend dari: %s", frontendDir)

		// Serve static assets (css, js)
		r.Static("/css", filepath.Join(frontendDir, "css"))
		r.Static("/js", filepath.Join(frontendDir, "js"))
		r.Static("/frontend", frontendDir)

		// Serve HTML pages (support both with and without .html extension)
		servePage := func(routePath string, fileName string) {
			r.StaticFile(routePath, filepath.Join(frontendDir, fileName))
		}

		servePage("/", "index.html")
		servePage("/index.html", "index.html")
		servePage("/login", "login.html")
		servePage("/login.html", "login.html")
		servePage("/register", "register.html")
		servePage("/register.html", "register.html")
		servePage("/dashboard", "dashboard.html")
		servePage("/dashboard.html", "dashboard.html")
		servePage("/transactions", "transactions.html")
		servePage("/transactions.html", "transactions.html")
	} else {
		log.Println("Peringatan: Direktori frontend tidak ditemukan.")
	}

	return r
}
