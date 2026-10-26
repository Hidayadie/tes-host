package utils

import (
	"os"
	"testing"
)

func TestGenerateAndValidateToken(t *testing.T) {
	os.Setenv("SESSION_SECRET", "test-secret-key-12345")

	userID := uint(10)
	email := "test@example.com"

	token, err := GenerateToken(userID, email)
	if err != nil {
		t.Fatalf("GenerateToken failed: %v", err)
	}

	if token == "" {
		t.Fatal("GenerateToken returned empty token")
	}

	claims, err := ValidateToken(token)
	if err != nil {
		t.Fatalf("ValidateToken failed: %v", err)
	}

	if claims.UserID != userID {
		t.Errorf("expected userID %d, got %d", userID, claims.UserID)
	}

	if claims.Email != email {
		t.Errorf("expected email %s, got %s", email, claims.Email)
	}
}

func TestValidateInvalidToken(t *testing.T) {
	_, err := ValidateToken("invalid.token.string")
	if err == nil {
		t.Fatal("expected error for invalid token, got nil")
	}
}
