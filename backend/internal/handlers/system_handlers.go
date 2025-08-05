package handlers

import (
	"context"
	"net/http"

	"github.com/Srivathsav-max/lumen/backend/internal/errors"
	"github.com/Srivathsav-max/lumen/backend/internal/services"
	"github.com/gin-gonic/gin"
)

type SystemHandlers struct {
	systemSettingsService services.SystemSettingsService
}

func NewSystemHandlers(systemSettingsService services.SystemSettingsService) *SystemHandlers {
	return &SystemHandlers{
		systemSettingsService: systemSettingsService,
	}
}

func (h *SystemHandlers) GetAllSettings(c *gin.Context) {
	if !h.isAdmin(c) {
		c.Error(errors.NewAuthorizationError("Admin access required"))
		return
	}

	ctx := context.Background()

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

func (h *SystemHandlers) GetSetting(c *gin.Context) {
	key := c.Param("key")
	if key == "" {
		c.Error(errors.NewValidationError("Setting key is required", ""))
		return
	}

	ctx := context.Background()

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

func (h *SystemHandlers) UpdateSetting(c *gin.Context) {
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

	setReq := &services.SetSettingRequest{
		Key:   key,
		Value: req.Value,
	}

	if err := h.systemSettingsService.SetSetting(ctx, setReq); err != nil {
		c.Error(err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Setting updated successfully",
	})
}

func (h *SystemHandlers) GetMaintenanceStatus(c *gin.Context) {
	ctx := context.Background()

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

func (h *SystemHandlers) EnableMaintenanceMode(c *gin.Context) {
	if !h.isAdmin(c) {
		c.Error(errors.NewAuthorizationError("Admin access required"))
		return
	}

	var req struct {
		Message string `json:"message"`
	}

	c.ShouldBindJSON(&req)

	ctx := context.Background()

	if err := h.systemSettingsService.EnableMaintenanceMode(ctx, req.Message); err != nil {
		c.Error(err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Maintenance mode enabled successfully",
	})
}

func (h *SystemHandlers) DisableMaintenanceMode(c *gin.Context) {
	if !h.isAdmin(c) {
		c.Error(errors.NewAuthorizationError("Admin access required"))
		return
	}

	ctx := context.Background()

	if err := h.systemSettingsService.DisableMaintenanceMode(ctx); err != nil {
		c.Error(err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Maintenance mode disabled successfully",
	})
}

func (h *SystemHandlers) GetRegistrationStatus(c *gin.Context) {
	ctx := context.Background()

	setting, err := h.systemSettingsService.GetSetting(ctx, "registration_enabled")
	if err != nil {
		c.Error(err)
		return
	}

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

func (h *SystemHandlers) ToggleRegistrationStatus(c *gin.Context) {
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

func (h *SystemHandlers) HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "ok",
		"message": "Service is healthy",
	})
}

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
