package controllers

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"backend/config"
	"backend/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type CreateTransactionRequest struct {
	Title       string  `json:"title" binding:"required"`
	Description string  `json:"description"`
	Amount      float64 `json:"amount" binding:"required,gt=0"`
	Type        string  `json:"type" binding:"required,oneof=income expense"`
	Category    string  `json:"category" binding:"required"`
	Date        string  `json:"date"`
}

type UpdateTransactionRequest struct {
	Title       string  `json:"title" binding:"required"`
	Description string  `json:"description"`
	Amount      float64 `json:"amount" binding:"required,gt=0"`
	Type        string  `json:"type" binding:"required,oneof=income expense"`
	Category    string  `json:"category" binding:"required"`
	Date        string  `json:"date"`
}

type CategorySummary struct {
	Category   string  `json:"category"`
	Type       string  `json:"type"`
	Total      float64 `json:"total"`
	Count      int64   `json:"count"`
	Percentage float64 `json:"percentage"`
}

// Helper function to extract user_id from Gin context
func getUserID(c *gin.Context) (uint, error) {
	val, exists := c.Get("user_id")
	if !exists {
		return 0, errors.New("user ID not found in context")
	}

	userID, ok := val.(uint)
	if !ok {
		return 0, errors.New("invalid user ID type")
	}

	return userID, nil
}

// Helper to parse date string into time.Time
func parseTransactionDate(dateStr string) (time.Time, error) {
	if strings.TrimSpace(dateStr) == "" {
		return time.Now(), nil
	}

	// Try formats: "2006-01-02", "2006-01-02T15:04:05Z07:00", RFC3339
	formats := []string{
		"2006-01-02",
		time.RFC3339,
		"2006-01-02 15:04:05",
		"2006-01-02T15:04",
	}

	for _, format := range formats {
		if t, err := time.Parse(format, dateStr); err == nil {
			return t, nil
		}
	}

	return time.Time{}, errors.New("format tanggal tidak valid, gunakan YYYY-MM-DD")
}

// GetTransactions lists transactions belonging to the current user with search, filter, and sorting
func GetTransactions(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Pengguna tidak terautentikasi"})
		return
	}

	query := config.DB.Where("user_id = ?", userID)

	// Search filter (title, description, category)
	search := strings.TrimSpace(c.Query("search"))
	if search != "" {
		searchPattern := "%" + strings.ToLower(search) + "%"
		query = query.Where("(LOWER(title) LIKE ? OR LOWER(description) LIKE ? OR LOWER(category) LIKE ?)", searchPattern, searchPattern, searchPattern)
	}

	// Type filter (income / expense)
	transType := strings.TrimSpace(c.Query("type"))
	if transType != "" {
		query = query.Where("type = ?", transType)
	}

	// Category filter
	category := strings.TrimSpace(c.Query("category"))
	if category != "" {
		query = query.Where("LOWER(category) = ?", strings.ToLower(category))
	}

	// Date range filters
	startDateStr := strings.TrimSpace(c.Query("start_date"))
	if startDateStr != "" {
		if startDate, err := time.Parse("2006-01-02", startDateStr); err == nil {
			query = query.Where("date >= ?", startDate)
		}
	}

	endDateStr := strings.TrimSpace(c.Query("end_date"))
	if endDateStr != "" {
		if endDate, err := time.Parse("2006-01-02", endDateStr); err == nil {
			// Include entire end day up to 23:59:59
			endOfDay := endDate.Add(24*time.Hour - time.Nanosecond)
			query = query.Where("date <= ?", endOfDay)
		}
	}

	// Sorting
	sortBy := c.DefaultQuery("sort", "date_desc")
	switch sortBy {
	case "date_asc":
		query = query.Order("date ASC, id ASC")
	case "amount_asc":
		query = query.Order("amount ASC, id ASC")
	case "amount_desc":
		query = query.Order("amount DESC, id DESC")
	default:
		query = query.Order("date DESC, id DESC")
	}

	var transactions []models.Transaction
	if err := query.Find(&transactions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil daftar transaksi"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  transactions,
		"total": len(transactions),
	})
}

// GetTransactionByID retrieves a single transaction by ID, verifying user ownership
func GetTransactionByID(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Pengguna tidak terautentikasi"})
		return
	}

	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID transaksi tidak valid"})
		return
	}

	var transaction models.Transaction
	if err := config.DB.Where("id = ? AND user_id = ?", id, userID).First(&transaction).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Transaksi tidak ditemukan atau Anda tidak memiliki akses"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data transaksi"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": transaction})
}

// CreateTransaction creates a new transaction for the current user
func CreateTransaction(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Pengguna tidak terautentikasi"})
		return
	}

	var input CreateTransactionRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Validasi gagal: periksa kembali isian judul, nominal, tipe, dan kategori"})
		return
	}

	parsedDate, err := parseTransactionDate(input.Date)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	transaction := models.Transaction{
		UserID:      userID,
		Title:       strings.TrimSpace(input.Title),
		Description: strings.TrimSpace(input.Description),
		Amount:      input.Amount,
		Type:        models.TransactionType(input.Type),
		Category:    strings.TrimSpace(input.Category),
		Date:        parsedDate,
	}

	if err := config.DB.Create(&transaction).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan transaksi ke database"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Transaksi berhasil ditambahkan",
		"data":    transaction,
	})
}

// UpdateTransaction updates an existing transaction, verifying user ownership
func UpdateTransaction(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Pengguna tidak terautentikasi"})
		return
	}

	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID transaksi tidak valid"})
		return
	}

	var transaction models.Transaction
	if err := config.DB.Where("id = ? AND user_id = ?", id, userID).First(&transaction).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Transaksi tidak ditemukan atau Anda tidak memiliki hak akses"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memeriksa transaksi"})
		return
	}

	var input UpdateTransactionRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Validasi gagal: periksa kembali isian perubahan transaksi"})
		return
	}

	parsedDate, err := parseTransactionDate(input.Date)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	transaction.Title = strings.TrimSpace(input.Title)
	transaction.Description = strings.TrimSpace(input.Description)
	transaction.Amount = input.Amount
	transaction.Type = models.TransactionType(input.Type)
	transaction.Category = strings.TrimSpace(input.Category)
	transaction.Date = parsedDate

	if err := config.DB.Save(&transaction).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memperbarui transaksi"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Transaksi berhasil diperbarui",
		"data":    transaction,
	})
}

// DeleteTransaction removes an existing transaction, verifying user ownership
func DeleteTransaction(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Pengguna tidak terautentikasi"})
		return
	}

	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID transaksi tidak valid"})
		return
	}

	var transaction models.Transaction
	if err := config.DB.Where("id = ? AND user_id = ?", id, userID).First(&transaction).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Transaksi tidak ditemukan atau Anda tidak memiliki hak akses"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memeriksa transaksi"})
		return
	}

	if err := config.DB.Delete(&transaction).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus transaksi"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Transaksi berhasil dihapus",
	})
}

// GetSummary calculates total income, total expense, net balance, and category breakdown
func GetSummary(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Pengguna tidak terautentikasi"})
		return
	}

	baseQuery := config.DB.Model(&models.Transaction{}).Where("user_id = ?", userID)

	// Optional date range
	startDateStr := strings.TrimSpace(c.Query("start_date"))
	if startDateStr != "" {
		if startDate, err := time.Parse("2006-01-02", startDateStr); err == nil {
			baseQuery = baseQuery.Where("date >= ?", startDate)
		}
	}
	endDateStr := strings.TrimSpace(c.Query("end_date"))
	if endDateStr != "" {
		if endDate, err := time.Parse("2006-01-02", endDateStr); err == nil {
			endOfDay := endDate.Add(24*time.Hour - time.Nanosecond)
			baseQuery = baseQuery.Where("date <= ?", endOfDay)
		}
	}

	// Total Income
	var totalIncome float64
	var incomeResult struct {
		Total float64
	}
	baseQuery.Session(&gorm.Session{}).
		Select("COALESCE(SUM(amount), 0) as total").
		Where("type = ?", models.TypeIncome).
		Scan(&incomeResult)
	totalIncome = incomeResult.Total

	// Total Expense
	var totalExpense float64
	var expenseResult struct {
		Total float64
	}
	baseQuery.Session(&gorm.Session{}).
		Select("COALESCE(SUM(amount), 0) as total").
		Where("type = ?", models.TypeExpense).
		Scan(&expenseResult)
	totalExpense = expenseResult.Total

	netBalance := totalIncome - totalExpense

	// Category breakdown (grouped by category and type)
	type CatRow struct {
		Category string  `gorm:"column:category"`
		Type     string  `gorm:"column:type"`
		Total    float64 `gorm:"column:total"`
		Count    int64   `gorm:"column:count"`
	}

	var catRows []CatRow
	baseQuery.Session(&gorm.Session{}).
		Select("category, type, COALESCE(SUM(amount), 0) as total, COUNT(id) as count").
		Group("category, type").
		Order("total DESC").
		Scan(&catRows)

	summaries := make([]CategorySummary, 0, len(catRows))
	for _, row := range catRows {
		percentage := 0.0
		if row.Type == string(models.TypeExpense) && totalExpense > 0 {
			percentage = (row.Total / totalExpense) * 100
		} else if row.Type == string(models.TypeIncome) && totalIncome > 0 {
			percentage = (row.Total / totalIncome) * 100
		}

		summaries = append(summaries, CategorySummary{
			Category:   row.Category,
			Type:       row.Type,
			Total:      row.Total,
			Count:      row.Count,
			Percentage: percentage,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"total_income":  totalIncome,
		"total_expense": totalExpense,
		"net_balance":   netBalance,
		"categories":    summaries,
	})
}

// GetCategories returns a curated list of transaction categories including any custom ones created by user
func GetCategories(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Pengguna tidak terautentikasi"})
		return
	}

	defaultIncomeCategories := []string{
		"Gaji",
		"Uang Saku",
		"Bonus / Hadiah",
		"Investasi",
		"Penjualan",
		"Pemasukan Lainnya",
	}

	defaultExpenseCategories := []string{
		"Makanan & Minuman",
		"Transportasi",
		"Kebutuhan Pokok",
		"Pendidikan / Kuliah",
		"Tagihan & Langganan",
		"Hiburan & Rekreasi",
		"Kesehatan",
		"Belanja",
		"Pengeluaran Lainnya",
	}

	// Fetch custom categories used by this user
	var userCategories []string
	config.DB.Model(&models.Transaction{}).
		Where("user_id = ?", userID).
		Distinct("category").
		Pluck("category", &userCategories)

	c.JSON(http.StatusOK, gin.H{
		"income":  defaultIncomeCategories,
		"expense": defaultExpenseCategories,
		"custom":  userCategories,
	})
}
