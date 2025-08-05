package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"log/slog"

	"github.com/Srivathsav-max/lumen/backend/internal/repository"
)

type SystemSettingsServiceImpl struct {
	settingsRepo repository.SystemSettingsRepository
	logger       *slog.Logger
	validator    *Validator
}

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

func (s *SystemSettingsServiceImpl) GetSetting(ctx context.Context, key string) (*SettingResponse, error) {
	if key == "" {
		return nil, NewInvalidSettingKeyError()
	}

	s.logger.Debug("Getting system setting", "key", key)

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

	var value interface{}
	if err := json.Unmarshal([]byte(setting.Value), &value); err != nil {
		s.logger.Error("Failed to parse setting value",
			"key", key,
			"value", setting.Value,
			"error", err,
		)
		value = setting.Value
	}

	response := &SettingResponse{
		Key:       setting.Key,
		Value:     value,
		UpdatedAt: setting.UpdatedAt,
	}

	return response, nil
}

func (s *SystemSettingsServiceImpl) SetSetting(ctx context.Context, req *SetSettingRequest) error {
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

	valueBytes, err := json.Marshal(req.Value)
	if err != nil {
		s.logger.Error("Failed to serialize setting value",
			"key", req.Key,
			"value", req.Value,
			"error", err,
		)
		return NewInvalidSettingValueError("", "JSON")
	}

	setting := &repository.SystemSetting{
		Key:   req.Key,
		Value: string(valueBytes),
	}

	existingSetting, err := s.settingsRepo.GetByKey(ctx, req.Key)
	if err != nil && err != sql.ErrNoRows {
		s.logger.Error("Failed to check if setting exists",
			"key", req.Key,
			"error", err,
		)
		return NewServiceUnavailableError("system setting update", err)
	}

	if existingSetting != nil {
		if err := s.settingsRepo.Update(ctx, setting); err != nil {
			s.logger.Error("Failed to update system setting",
				"key", req.Key,
				"error", err,
			)
			return NewServiceUnavailableError("system setting update", err)
		}
	} else {
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
	)

	return nil
}

func (s *SystemSettingsServiceImpl) GetAllSettings(ctx context.Context) ([]*SettingResponse, error) {
	s.logger.Debug("Getting all system settings")

	settings, err := s.settingsRepo.GetAll(ctx)
	if err != nil {
		s.logger.Error("Failed to get all system settings", "error", err)
		return nil, NewServiceUnavailableError("system settings retrieval", err)
	}

	result := make([]*SettingResponse, 0, len(settings))
	for _, setting := range settings {
		var value interface{}
		if err := json.Unmarshal([]byte(setting.Value), &value); err != nil {
			s.logger.Warn("Failed to parse setting value, using raw string",
				"key", setting.Key,
				"value", setting.Value,
				"error", err,
			)
			value = setting.Value
		}

		response := &SettingResponse{
			Key:       setting.Key,
			Value:     value,
			UpdatedAt: setting.UpdatedAt,
		}
		result = append(result, response)
	}

	return result, nil
}

func (s *SystemSettingsServiceImpl) EnableMaintenanceMode(ctx context.Context, message string) error {
	s.logger.Info("Enabling maintenance mode", "message", message)

	req := &SetSettingRequest{
		Key:   "maintenance_mode",
		Value: true,
	}

	if err := s.SetSetting(ctx, req); err != nil {
		return err
	}

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
		}
	}

	s.logger.Info("Maintenance mode enabled successfully")
	return nil
}

func (s *SystemSettingsServiceImpl) DisableMaintenanceMode(ctx context.Context) error {
	s.logger.Info("Disabling maintenance mode")

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

func (s *SystemSettingsServiceImpl) IsMaintenanceModeEnabled(ctx context.Context) (bool, error) {
	setting, err := s.GetSetting(ctx, "maintenance_mode")
	if err != nil {
		if IsSettingNotFoundError(err) {
			return false, nil
		}
		return false, err
	}

	if enabled, ok := setting.Value.(bool); ok {
		return enabled, nil
	}

	if enabledStr, ok := setting.Value.(string); ok {
		return enabledStr == "true", nil
	}

	s.logger.Warn("Maintenance mode setting has invalid value",
		"value", setting.Value,
	)
	return false, nil
}

func IsSettingNotFoundError(err error) bool {
	return IsNotFoundError(err)
}
