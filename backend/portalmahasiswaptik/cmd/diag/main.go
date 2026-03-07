package main

import (
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type Profile struct {
	UserID   string `gorm:"column:user_id"`
	NIM      string `gorm:"column:nim"`
	FullName string `gorm:"column:full_name"`
	Role     string `gorm:"column:role"`
}

func main() {
	godotenv.Load()
	dsn := os.Getenv("DATABASE_URL")
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println("--- User Roles Data Audit ---")
	var roles []struct {
		UserID string `gorm:"column:user_id"`
		Role   string `gorm:"column:role"`
	}
	db.Table("user_roles").Find(&roles)

	for _, r := range roles {
		fmt.Printf("User: %s | Role: '%s'\n", r.UserID, r.Role)
	}
	fmt.Println("--------------------------")
}
