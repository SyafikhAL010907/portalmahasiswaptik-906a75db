package finance

import (
	"gorm.io/gorm"
)

type FinanceHandler struct {
	DB *gorm.DB
}

func NewFinanceHandler(db *gorm.DB) *FinanceHandler {
	return &FinanceHandler{DB: db}
}
