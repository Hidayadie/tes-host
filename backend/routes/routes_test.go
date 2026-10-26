package routes

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestStaticRoutes(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := SetupRouter()

	testPaths := []struct {
		path         string
		expectedCode int
	}{
		{"/", http.StatusOK},
		{"/index.html", http.StatusMovedPermanently},
		{"/login", http.StatusOK},
		{"/login.html", http.StatusOK},
		{"/register", http.StatusOK},
		{"/register.html", http.StatusOK},
		{"/dashboard", http.StatusOK},
		{"/dashboard.html", http.StatusOK},
		{"/transactions", http.StatusOK},
		{"/transactions.html", http.StatusOK},
		{"/css/style.css", http.StatusOK},
		{"/js/api.js", http.StatusOK},
		{"/js/dashboard.js", http.StatusOK},
		{"/js/transactions.js", http.StatusOK},
	}

	for _, tc := range testPaths {
		req, err := http.NewRequest(http.MethodGet, tc.path, nil)
		if err != nil {
			t.Fatalf("Failed to create request for %s: %v", tc.path, err)
		}
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != tc.expectedCode {
			t.Errorf("Path %s: expected status %d, got %d", tc.path, tc.expectedCode, w.Code)
		}
	}
}
