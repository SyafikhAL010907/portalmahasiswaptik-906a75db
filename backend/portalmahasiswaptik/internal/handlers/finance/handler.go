package finance

import (
	"github.com/go-playground/validator/v10"
	"gorm.io/gorm"
)

type FinanceHandler struct {
	DB       *gorm.DB
	Validate *validator.Validate
}

func NewFinanceHandler(db *gorm.DB, validate *validator.Validate) *FinanceHandler {
	return &FinanceHandler{
		DB:       db,
		Validate: validate,
	}
}
