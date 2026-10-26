package middleware

import (
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"backend/utils"

	"github.com/gin-gonic/gin"
)

func TestAuthMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)
	os.Setenv("SESSION_SECRET", "test-secret")

	// Generate valid token
	token, err := utils.GenerateToken(1, "user@example.com")
	if err != nil {
		t.Fatalf("Failed to generate token: %v", err)
	}

	router := gin.New()
	router.Use(AuthMiddleware())
	router.GET("/protected", func(c *gin.Context) {
		userID, _ := c.Get("user_id")
		userEmail, _ := c.Get("user_email")
		c.JSON(http.StatusOK, gin.H{
			"user_id":    userID,
			"user_email": userEmail,
		})
	})

	// Test case 1: Missing auth header -> 401
	reqMissing, _ := http.NewRequest(http.MethodGet, "/protected", nil)
	wMissing := httptest.NewRecorder()
	router.ServeHTTP(wMissing, reqMissing)
	if wMissing.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 for missing header, got %d", wMissing.Code)
	}

	// Test case 2: Invalid header format -> 401
	reqInvalid, _ := http.NewRequest(http.MethodGet, "/protected", nil)
	reqInvalid.Header.Set("Authorization", "InvalidFormat token")
	wInvalid := httptest.NewRecorder()
	router.ServeHTTP(wInvalid, reqInvalid)
	if wInvalid.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 for invalid header, got %d", wInvalid.Code)
	}

	// Test case 3: Valid token -> 200 OK
	reqValid, _ := http.NewRequest(http.MethodGet, "/protected", nil)
	reqValid.Header.Set("Authorization", "Bearer "+token)
	wValid := httptest.NewRecorder()
	router.ServeHTTP(wValid, reqValid)
	if wValid.Code != http.StatusOK {
		t.Errorf("expected 200 for valid token, got %d", wValid.Code)
	}
}
