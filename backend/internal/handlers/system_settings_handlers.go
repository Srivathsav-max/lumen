package handlers

import (
	"context"
	"net/http"
	"strconv"

	"github.com/Srivathsav-max/lumen/backend/internal/container"
	"github.com/Srivathsav-max/lumen/backend/internal/services"
	"github.com/gin-gonic/gin"
)

type SystemSettingsHandlers struct {
	container *container.Container
}

func NewSystemSettingsHandlers(container *container.Container) *SystemSettingsHandlers {
	return &SystemSettingsHandlers{
		container: container,
	}
}

func (h *SystemSettingsHandlers) GetRegistrationStatus(c *gin.Context) {
	ctx := context.Background()
	logger := h.container.GetLogger()
	systemSettingsService := h.container.GetSystemSettingsService()

	setting, err := systemSettingsService.GetSetting(ctx, "registration_enabled")
	if err != nil {
		logger.Error("Failed to get registration status", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get registration status"})
		return
	}

	enabled := false
	if setting != nil && setting.Value != nil {
		if boolVal, ok := setting.Value.(bool); ok {
			enabled = boolVal
		} else if strVal, ok := setting.Value.(string); ok {
			enabled = strVal == "true"
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"registration_enabled": enabled,
	})
}

type ToggleRegistrationStatusRequest struct {
	Value string `json:"value" binding:"required"`
}

func (h *SystemSettingsHandlers) ToggleRegistrationStatus(c *gin.Context) {
	ctx := context.Background()
	logger := h.container.GetLogger()
	systemSettingsService := h.container.GetSystemSettingsService()

	if !h.isAdminOrDeveloper(c) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Unauthorized: Admin or developer role required"})
		return
	}

	var req ToggleRegistrationStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		logger.Error("Invalid toggle registration request", "error", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	enabled := req.Value == "true"

	settingReq := &services.SetSettingRequest{
		Key:   "registration_enabled",
		Value: enabled,
	}

	err := systemSettingsService.SetSetting(ctx, settingReq)
	if err != nil {
		logger.Error("Failed to update registration status", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update registration status"})
		return
	}

	logger.Info("Registration status updated", "enabled", enabled)

	c.JSON(http.StatusOK, gin.H{
		"message":              "Registration status updated successfully",
		"registration_enabled": enabled,
	})
}

func (h *SystemSettingsHandlers) GetAllSystemSettings(c *gin.Context) {
	ctx := context.Background()
	logger := h.container.GetLogger()
	systemSettingsService := h.container.GetSystemSettingsService()

	if !h.isAdminOrDeveloper(c) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Unauthorized: Admin or developer role required"})
		return
	}

	settings, err := systemSettingsService.GetAllSettings(ctx)
	if err != nil {
		logger.Error("Failed to get system settings", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get system settings"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"settings": settings,
	})
}

type UpdateSystemSettingRequest struct {
	Value interface{} `json:"value" binding:"required"`
}

func (h *SystemSettingsHandlers) UpdateSystemSetting(c *gin.Context) {
	ctx := context.Background()
	logger := h.container.GetLogger()
	systemSettingsService := h.container.GetSystemSettingsService()

	if !h.isAdminOrDeveloper(c) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Unauthorized: Admin or developer role required"})
		return
	}

	key := c.Param("key")
	if key == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Key is required"})
		return
	}

	var req UpdateSystemSettingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		logger.Error("Invalid update system setting request", "error", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	settingReq := &services.SetSettingRequest{
		Key:   key,
		Value: req.Value,
	}

	err := systemSettingsService.SetSetting(ctx, settingReq)
	if err != nil {
		logger.Error("Failed to update system setting", "error", err, "key", key)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update system setting"})
		return
	}

	logger.Info("System setting updated", "key", key, "value", req.Value)

	c.JSON(http.StatusOK, gin.H{
		"message": "System setting updated successfully",
		"key":     key,
		"value":   req.Value,
	})
}

func (h *SystemSettingsHandlers) isAdminOrDeveloper(c *gin.Context) bool {
	userIDInterface, exists := c.Get("userID")
	if !exists {
		return false
	}

	var userID int64
	switch v := userIDInterface.(type) {
	case int64:
		userID = v
	case int:
		userID = int64(v)
	case string:
		parsedID, err := strconv.ParseInt(v, 10, 64)
		if err != nil {
			return false
		}
		userID = parsedID
	default:
		return false
	}

	roles, exists := c.Get("userRoles")
	if exists {
		roleNames, ok := roles.([]string)
		if ok {
			for _, role := range roleNames {
				if role == "admin" || role == "developer" {
					return true
				}
			}
		}
	}

	roleService := h.container.GetRoleService()
	if roleService != nil {
		ctx := context.Background()
		isAdmin, err := roleService.HasRole(ctx, userID, "admin")
		if err == nil && isAdmin {
			return true
		}

		isDeveloper, err := roleService.HasRole(ctx, userID, "developer")
		if err == nil && isDeveloper {
			return true
		}
	}

	return false
}
