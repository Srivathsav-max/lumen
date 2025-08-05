package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"log/slog"

	"github.com/Srivathsav-max/lumen/backend/internal/repository"
)

// SystemSettingsServiceImpl implements the SystemSettingsService interface
type SystemSettingsServiceImpl struct {
	settingsRepo repository.SystemSettingsRepository
	logger       *slog.Logger
	validator    *Validator
}

// NewSystemSettingsService creates a new SystemSettingsService implementation
func NewSystemSettingsService(
	settingsRepo repository.SystemSettingsRepository,
	logger *slog.Logger,
) SystemSettingsService {
	return &SystemSettingsServiceImpl{
		settingsRepo: settingsRepo,
		logger:       logger,
		validator:    NewValidator(),
	}
}

// GetSetting retrieves a specific system setting
func (s *SystemSettingsServiceImpl) GetSetting(ctx context.Context, key string) (*SettingResponse, error) {
	// Validate key
	if key == "" {
		return nil, NewInvalidSettingKeyError()
	}

	s.logger.Debug("Getting system setting", "key", key)

	// Get setting from repository
	setting, err := s.settingsRepo.GetByKey(ctx, key)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, NewSettingNotFoundError(key)
		}
		s.logger.Error("Failed to get system setting",
			"key", key,
			"error", err,
		)
		return nil, NewServiceUnavailableError("system setting retrieval", err)
	}

	// Parse the value (stored as JSON string)
	var value interface{}
	if err := json.Unmarshal([]byte(setting.Value), &value); err != nil {
		s.logger.Error("Failed to parse setting value",
			"key", key,
			"value", setting.Value,
			"error", err,
		)
		// Return raw string if JSON parsing fails
		value = setting.Value
	}

	response := &SettingResponse{
		Key:       setting.Key,
		Value:     value,
		UpdatedAt: setting.UpdatedAt,
	}

	return response, nil
}

// SetSetting sets a system setting
func (s *SystemSettingsServiceImpl) SetSetting(ctx context.Context, req *SetSettingRequest) error {
	// Validate request
	if err := ValidateSetSettingRequest(s.validator, req); err != nil {
		s.logger.Warn("Set setting validation failed",
			"key", req.Key,
			"error", err,
		)
		return err
	}

	s.logger.Info("Setting system setting",
		"key", req.Key,
		"value", req.Value,
	)

	// Serialize value to JSON
	valueBytes, err := json.Marshal(req.Value)
	if err != nil {
		s.logger.Error("Failed to serialize setting value",
			"key", req.Key,
			"value", req.Value,
			"error", err,
		)
		return NewInvalidSettingValueError("", "JSON")
	}

	// Create or update setting
	setting := &repository.SystemSetting{
		Key:   req.Key,
		Value: string(valueBytes),
	}

	// Check if setting exists
	existingSetting, err := s.settingsRepo.GetByKey(ctx, req.Key)
	if err != nil && err != sql.ErrNoRows {
		s.logger.Error("Failed to check if setting exists",
			"key", req.Key,
			"error", err,
		)
		return NewServiceUnavailableError("system setting update", err)
	}

	if existingSetting != nil {
		// Update existing setting
		setting.ID = existingSetting.ID
		if err := s.settingsRepo.Update(ctx, setting); err != nil {
			s.logger.Error("Failed to update system setting",
				"key", req.Key,
				"error", err,
			)
			return NewServiceUnavailableError("system setting update", err)
		}
	} else {
		// Create new setting
		if err := s.settingsRepo.Create(ctx, setting); err != nil {
			s.logger.Error("Failed to create system setting",
				"key", req.Key,
				"error", err,
			)
			return NewServiceUnavailableError("system setting creation", err)
		}
	}

	s.logger.Info("System setting updated successfully",
		"key", req.Key,
		"setting_id", setting.ID,
	)

	return nil
}

// GetAllSettings retrieves all system settings
func (s *SystemSettingsServiceImpl) GetAllSettings(ctx context.Context) (map[string]interface{}, error) {
	s.logger.Debug("Getting all system settings")

	// Get all settings from repository
	settings, err := s.settingsRepo.GetAll(ctx)
	if err != nil {
		s.logger.Error("Failed to get all system settings", "error", err)
		return nil, NewServiceUnavailableError("system settings retrieval", err)
	}

	// Convert to map with parsed values
	result := make(map[string]interface{})
	for _, setting := range settings {
		var value interface{}
		if err := json.Unmarshal([]byte(setting.Value), &value); err != nil {
			s.logger.Warn("Failed to parse setting value, using raw string",
				"key", setting.Key,
				"value", setting.Value,
				"error", err,
			)
			// Use raw string if JSON parsing fails
			value = setting.Value
		}
		result[setting.Key] = value
	}

	return result, nil
}

// EnableMaintenanceMode enables maintenance mode
func (s *SystemSettingsServiceImpl) EnableMaintenanceMode(ctx context.Context, message string) error {
	s.logger.Info("Enabling maintenance mode", "message", message)

	// Set maintenance mode setting
	req := &SetSettingRequest{
		Key:   "maintenance_mode",
		Value: true,
	}

	if err := s.SetSetting(ctx, req); err != nil {
		return err
	}

	// Set maintenance message if provided
	if message != "" {
		messageReq := &SetSettingRequest{
			Key:   "maintenance_message",
			Value: message,
		}
		if err := s.SetSetting(ctx, messageReq); err != nil {
			s.logger.Warn("Failed to set maintenance message",
				"message", message,
				"error", err,
			)
			// Don't fail the entire operation for message setting
		}
	}

	s.logger.Info("Maintenance mode enabled successfully")
	return nil
}

// DisableMaintenanceMode disables maintenance mode
func (s *SystemSettingsServiceImpl) DisableMaintenanceMode(ctx context.Context) error {
	s.logger.Info("Disabling maintenance mode")

	// Set maintenance mode setting to false
	req := &SetSettingRequest{
		Key:   "maintenance_mode",
		Value: false,
	}

	if err := s.SetSetting(ctx, req); err != nil {
		return err
	}

	s.logger.Info("Maintenance mode disabled successfully")
	return nil
}

// IsMaintenanceModeEnabled checks if maintenance mode is enabled
func (s *SystemSettingsServiceImpl) IsMaintenanceModeEnabled(ctx context.Context) (bool, error) {
	setting, err := s.GetSetting(ctx, "maintenance_mode")
	if err != nil {
		// If setting doesn't exist, assume maintenance mode is disabled
		if IsSettingNotFoundError(err) {
			return false, nil
		}
		return false, err
	}

	// Check if value is boolean true
	if enabled, ok := setting.Value.(bool); ok {
		return enabled, nil
	}

	// If value is not boolean, try to parse as string
	if enabledStr, ok := setting.Value.(string); ok {
		return enabledStr == "true", nil
	}

	// Default to false if value cannot be parsed
	s.logger.Warn("Maintenance mode setting has invalid value",
		"value", setting.Value,
	)
	return false, nil
}

// Helper function to check if error is setting not found
func IsSettingNotFoundError(err error) bool {
	return IsNotFoundError(err)
}