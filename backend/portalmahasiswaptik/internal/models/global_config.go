package models

import (
	"time"
)

// GlobalConfig represents a key-value pair in global_configs table
type GlobalConfig struct {
	Key       string    `gorm:"primaryKey" json:"key"`
	Value     string    `gorm:"not null" json:"value"`
	UpdatedAt time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

// TableName overrides default table name
func (GlobalConfig) TableName() string {
	return "global_configs"
}
