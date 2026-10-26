package models

import (
	"time"
)

type TransactionType string

const (
	TypeIncome  TransactionType = "income"
	TypeExpense TransactionType = "expense"
)

type Transaction struct {
	ID          uint            `gorm:"primaryKey" json:"id"`
	UserID      uint            `gorm:"not null;index" json:"user_id"`
	User        User            `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"-"`
	Title       string          `gorm:"not null" json:"title"`
	Description string          `json:"description"`
	Amount      float64         `gorm:"not null" json:"amount"`
	Type        TransactionType `gorm:"not null" json:"type"`
	Category    string          `gorm:"not null" json:"category"`
	Date        time.Time       `gorm:"not null" json:"date"`
	CreatedAt   time.Time       `json:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at"`
}
