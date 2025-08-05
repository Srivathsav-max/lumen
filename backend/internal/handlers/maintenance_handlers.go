package handlers

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/Srivathsav-max/lumen/backend/internal/container"
)

// MaintenanceHandlers handles maintenance-related HTTP requests
type MaintenanceHandlers struct {
	container *container.Container
}

// NewMaintenanceHandlers creates a new MaintenanceHandlers instance
func NewMaintenanceHandlers(container *container.Container) *MaintenanceHandlers {
	return &MaintenanceHandlers{
		container: container,
	}
}

// GetMaintenanceStatus returns the current maintenance mode status
func (h *MaintenanceHandlers) GetMaintenanceStatus(c *gin.Context) {
	ctx := context.Background()
	logger := h.container.GetLogger()
	systemSettingsService := h.container.GetSystemSettingsService()

	// Get maintenance mode status
	isMaintenanceMode, err := systemSettingsService.IsMaintenanceModeEnabled(ctx)
	if err != nil {
		logger.Error("Failed to get maintenance status", "error", err)
		// Default to false if there's an error
		isMaintenanceMode = false
	}

	logger.Debug("Retrieved maintenance status", "maintenance_mode", isMaintenanceMode)

	c.JSON(http.StatusOK, gin.H{
		"maintenance_mode": isMaintenanceMode,
	})
}

// EnableMaintenanceMode enables maintenance mode with an optional message
func (h *MaintenanceHandlers) EnableMaintenanceMode(c *gin.Context) {
	ctx := context.Background()
	logger := h.container.GetLogger()
	systemSettingsService := h.container.GetSystemSettingsService()

	// Parse request body for optional message
	var req struct {
		Message string `json:"message"`
	}
	
	// Bind JSON, but don't require it
	_ = c.ShouldBindJSON(&req)

	// Default message if none provided
	if req.Message == "" {
		req.Message = "The system is currently under maintenance. Please try again later."
	}

	// Enable maintenance mode
	err := systemSettingsService.EnableMaintenanceMode(ctx, req.Message)
	if err != nil {
		logger.Error("Failed to enable maintenance mode", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to enable maintenance mode"})
		return
	}

	logger.Info("Maintenance mode enabled", "message", req.Message)

	c.JSON(http.StatusOK, gin.H{
		"message": "Maintenance mode enabled successfully",
		"maintenance_message": req.Message,
	})
}

// DisableMaintenanceMode disables maintenance mode
func (h *MaintenanceHandlers) DisableMaintenanceMode(c *gin.Context) {
	ctx := context.Background()
	logger := h.container.GetLogger()
	systemSettingsService := h.container.GetSystemSettingsService()

	// Disable maintenance mode
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