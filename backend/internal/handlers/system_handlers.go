package handlers

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/Srivathsav-max/lumen/backend/internal/errors"
	"github.com/Srivathsav-max/lumen/backend/internal/services"
)

// SystemHandlers handles system-related HTTP requests
type SystemHandlers struct {
	systemSettingsService services.SystemSettingsService
}

// NewSystemHandlers creates a new SystemHandlers instance
func NewSystemHandlers(systemSettingsService services.SystemSettingsService) *SystemHandlers {
	return &SystemHandlers{
		systemSettingsService: systemSettingsService,
	}
}

// GetAllSettings handles retrieving all system settings (admin only)
func (h *SystemHandlers) GetAllSettings(c *gin.Context) {
	// Check if current user is admin
	if !h.isAdmin(c) {
		c.Error(errors.NewAuthorizationError("Admin access required"))
		return
	}

	ctx := context.Background()

	// Get all settings through SystemSettingsService
	settings, err := h.systemSettingsService.GetAllSettings(ctx)
	if err != nil {
		c.Error(err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "System settings retrieved successfully",
		"data":    settings,
	})
}

// GetSetting handles retrieving a specific system setting
func (h *SystemHandlers) GetSetting(c *gin.Context) {
	key := c.Param("key")
	if key == "" {
		c.Error(errors.NewValidationError("Setting key is required", ""))
		return
	}

	ctx := context.Background()

	// Get setting through SystemSettingsService
	setting, err := h.systemSettingsService.GetSetting(ctx, key)
	if err != nil {
		c.Error(err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Setting retrieved successfully",
		"data":    setting,
	})
}

// UpdateSetting handles updating a system setting (admin only)
func (h *SystemHandlers) UpdateSetting(c *gin.Context) {
	// Check if current user is admin
	if !h.isAdmin(c) {
		c.Error(errors.NewAuthorizationError("Admin access required"))
		return
	}

	key := c.Param("key")
	if key == "" {
		c.Error(errors.NewValidationError("Setting key is required", ""))
		return
	}

	var req struct {
		Value interface{} `json:"value" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.Error(errors.NewValidationError("Invalid request format", err.Error()))
		return
	}

	ctx := context.Background()

	// Prepare set setting request
	setReq := &services.SetSettingRequest{
		Key:   key,
		Value: req.Value,
	}

	// Update setting through SystemSettingsService
	if err := h.systemSettingsService.SetSetting(ctx, setReq); err != nil {
		c.Error(err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Setting updated successfully",
	})
}

// GetMaintenanceStatus handles retrieving maintenance mode status
func (h *SystemHandlers) GetMaintenanceStatus(c *gin.Context) {
	ctx := context.Background()

	// Check maintenance mode status through SystemSettingsService
	isEnabled, err := h.systemSettingsService.IsMaintenanceModeEnabled(ctx)
	if err != nil {
		c.Error(err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Maintenance status retrieved successfully",
		"data": gin.H{
			"maintenance_mode": isEnabled,
		},
	})
}

// EnableMaintenanceMode handles enabling maintenance mode (admin only)
func (h *SystemHandlers) EnableMaintenanceMode(c *gin.Context) {
	// Check if current user is admin
	if !h.isAdmin(c) {
		c.Error(errors.NewAuthorizationError("Admin access required"))
		return
	}

	var req struct {
		Message string `json:"message"`
	}

	// Message is optional
	c.ShouldBindJSON(&req)

	ctx := context.Background()

	// Enable maintenance mode through SystemSettingsService
	if err := h.systemSettingsService.EnableMaintenanceMode(ctx, req.Message); err != nil {
		c.Error(err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Maintenance mode enabled successfully",
	})
}

// DisableMaintenanceMode handles disabling maintenance mode (admin only)
func (h *SystemHandlers) DisableMaintenanceMode(c *gin.Context) {
	// Check if current user is admin
	if !h.isAdmin(c) {
		c.Error(errors.NewAuthorizationError("Admin access required"))
		return
	}

	ctx := context.Background()

	// Disable maintenance mode through SystemSettingsService
	if err := h.systemSettingsService.DisableMaintenanceMode(ctx); err != nil {
		c.Error(err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Maintenance mode disabled successfully",
	})
}

// GetRegistrationStatus handles retrieving registration status
func (h *SystemHandlers) GetRegistrationStatus(c *gin.Context) {
	ctx := context.Background()

	// Get registration status setting
	setting, err := h.systemSettingsService.GetSetting(ctx, "registration_enabled")
	if err != nil {
		c.Error(err)
		return
	}

	// Default to true if setting doesn't exist
	registrationEnabled := true
	if setting != nil {
		if enabled, ok := setting.Value.(bool); ok {
			registrationEnabled = enabled
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Registration status retrieved successfully",
		"data": gin.H{
			"registration_enabled": registrationEnabled,
		},
	})
}

// ToggleRegistrationStatus handles toggling registration status (admin only)
func (h *SystemHandlers) ToggleRegistrationStatus(c *gin.Context) {
	// Check if current user is admin
	if !h.isAdmin(c) {
		c.Error(errors.NewAuthorizationError("Admin access required"))
		return
	}

	var req struct {
		Enabled bool `json:"enabled"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.Error(errors.NewValidationError("Invalid request format", err.Error()))
		return
	}

	ctx := context.Background()

	// Update registration status setting
	setReq := &services.SetSettingRequest{
		Key:   "registration_enabled",
		Value: req.Enabled,
	}

	if err := h.systemSettingsService.SetSetting(ctx, setReq); err != nil {
		c.Error(err)
		return
	}

	status := "disabled"
	if req.Enabled {
		status = "enabled"
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Registration " + status + " successfully",
		"data": gin.H{
			"registration_enabled": req.Enabled,
		},
	})
}

// HealthCheck handles health check requests
func (h *SystemHandlers) HealthCheck(c *gin.Context) {
	// Basic health check - could be expanded to check database, external services, etc.
	c.JSON(http.StatusOK, gin.H{
		"status":  "ok",
		"message": "Service is healthy",
	})
}

// Helper methods

// isAdmin checks if the current user has admin role
func (h *SystemHandlers) isAdmin(c *gin.Context) bool {
	if roles, exists := c.Get("userRoles"); exists {
		if roleSlice, ok := roles.([]string); ok {
			for _, role := range roleSlice {
				if role == "admin" {
					return true
				}
			}
		}
	}
	return false
}