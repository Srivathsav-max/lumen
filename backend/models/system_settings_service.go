package models

import (
	"strconv"
)

// SystemSettingsService implements the SystemSettingsService interface
type SystemSettingsServiceImpl struct {
	repo SystemSettingsRepository
}

// NewSystemSettingsService creates a new SystemSettingsService
func NewSystemSettingsService(repo SystemSettingsRepository) SystemSettingsService {
	return &SystemSettingsServiceImpl{
		repo: repo,
	}
}

// GetByKey retrieves a system setting by key
func (s *SystemSettingsServiceImpl) GetByKey(key string) (*SystemSetting, error) {
	return s.repo.GetByKey(key)
}

// GetAll retrieves all system settings
func (s *SystemSettingsServiceImpl) GetAll() ([]*SystemSetting, error) {
	return s.repo.GetAll()
}

// Update updates a system setting
func (s *SystemSettingsServiceImpl) Update(key string, value string) error {
	setting, err := s.repo.GetByKey(key)
	if err != nil {
		return err
	}
	
	setting.Value = value
	return s.repo.Update(setting)
}

// IsRegistrationEnabled checks if registration is enabled
func (s *SystemSettingsServiceImpl) IsRegistrationEnabled() (bool, error) {
	setting, err := s.repo.GetByKey("registration_enabled")
	if err != nil {
		return false, err
	}
	
	enabled, err := strconv.ParseBool(setting.Value)
	if err != nil {
		return false, err
	}
	
	return enabled, nil
}

// ToggleRegistration enables or disables registration
func (s *SystemSettingsServiceImpl) ToggleRegistration(enabled bool) error {
	return s.Update("registration_enabled", strconv.FormatBool(enabled))
}
