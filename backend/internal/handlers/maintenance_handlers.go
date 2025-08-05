package handlers

import (
	"context"
	"net/http"

	"github.com/Srivathsav-max/lumen/backend/internal/container"
	"github.com/gin-gonic/gin"
)

type MaintenanceHandlers struct {
	container *container.Container
}

func NewMaintenanceHandlers(container *container.Container) *MaintenanceHandlers {
	return &MaintenanceHandlers{
		container: container,
	}
}

func (h *MaintenanceHandlers) GetMaintenanceStatus(c *gin.Context) {
	ctx := context.Background()
	logger := h.container.GetLogger()
	systemSettingsService := h.container.GetSystemSettingsService()

	isMaintenanceMode, err := systemSettingsService.IsMaintenanceModeEnabled(ctx)
	if err != nil {
		logger.Error("Failed to get maintenance status", "error", err)
		isMaintenanceMode = false
	}

	logger.Debug("Retrieved maintenance status", "maintenance_mode", isMaintenanceMode)

	c.JSON(http.StatusOK, gin.H{
		"maintenance_mode": isMaintenanceMode,
	})
}

func (h *MaintenanceHandlers) EnableMaintenanceMode(c *gin.Context) {
	ctx := context.Background()
	logger := h.container.GetLogger()
	systemSettingsService := h.container.GetSystemSettingsService()

	var req struct {
		Message string `json:"message"`
	}

	_ = c.ShouldBindJSON(&req)

	if req.Message == "" {
		req.Message = "The system is currently under maintenance. Please try again later."
	}

	err := systemSettingsService.EnableMaintenanceMode(ctx, req.Message)
	if err != nil {
		logger.Error("Failed to enable maintenance mode", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to enable maintenance mode"})
		return
	}

	logger.Info("Maintenance mode enabled", "message", req.Message)

	c.JSON(http.StatusOK, gin.H{
		"message":             "Maintenance mode enabled successfully",
		"maintenance_message": req.Message,
	})
}

func (h *MaintenanceHandlers) DisableMaintenanceMode(c *gin.Context) {
	ctx := context.Background()
	logger := h.container.GetLogger()
	systemSettingsService := h.container.GetSystemSettingsService()

	err := systemSettingsService.DisableMaintenanceMode(ctx)
	if err != nil {
		logger.Error("Failed to disable maintenance mode", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to disable maintenance mode"})
		return
	}

	logger.Info("Maintenance mode disabled")

	c.JSON(http.StatusOK, gin.H{
		"message": "Maintenance mode disabled successfully",
	})
}
