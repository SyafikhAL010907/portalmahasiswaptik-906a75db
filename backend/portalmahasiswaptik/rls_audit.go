package main

import (
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	godotenv.Load()
	dsn := os.Getenv("DATABASE_URL")
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println("--- RLS Policy Audit ---")
	var policies []struct {
		PolicyName string `gorm:"column:policyname"`
		TableName  string `gorm:"column:tablename"`
		Cmd        string `gorm:"column:cmd"`
		Qual       string `gorm:"column:qual"`
	}
	db.Raw("SELECT policyname, tablename, cmd, qual FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles'").Scan(&policies)

	for _, p := range policies {
		fmt.Printf("Table: %s | Policy: %s | Cmd: %s | Qual: %s\n", p.TableName, p.PolicyName, p.Cmd, p.Qual)
	}
	
	fmt.Println("\n--- Table RLS Status ---")
	var rlsStatus []struct {
		TableName string `gorm:"column:relname"`
		RowSecurity bool `gorm:"column:relrowsecurity"`
	}
	db.Raw("SELECT relname, relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind = 'r'").Scan(&rlsStatus)
	for _, s := range rlsStatus {
		fmt.Printf("Table: %s | RLS Enabled: %v\n", s.TableName, s.RowSecurity)
	}
}
