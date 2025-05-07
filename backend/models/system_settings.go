package models

import (
	"time"
)

// SystemSetting represents a system-wide setting
type SystemSetting struct {
	Key         string    `json:"key"`
	Value       string    `json:"value"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// SystemSettingsRepository defines the interface for system settings data operations
type SystemSettingsRepository interface {
	GetByKey(key string) (*SystemSetting, error)
	GetAll() ([]*SystemSetting, error)
	Update(setting *SystemSetting) error
}

// SystemSettingsService defines the interface for system settings business logic
type SystemSettingsService interface {
	GetByKey(key string) (*SystemSetting, error)
	GetAll() ([]*SystemSetting, error)
	Update(key string, value string) error
	IsRegistrationEnabled() (bool, error)
	ToggleRegistration(enabled bool) error
}
