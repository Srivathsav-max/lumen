package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// GetMaintenanceStatus handles retrieving the current maintenance status
// This is a public endpoint that doesn't require authentication
func (h *Handler) GetMaintenanceStatus(c *gin.Context) {
	// Get the maintenance_mode setting from the system settings service
	setting, err := h.SystemSettingsService.GetByKey("maintenance_mode")
	if err != nil {
		// If there's an error, default to maintenance mode off
		c.JSON(http.StatusOK, gin.H{
			"maintenance_enabled": false,
		})
		return
	}

	// Convert the setting value to boolean
	maintenanceEnabled := false
	if setting.Value == "true" || setting.Value == "1" {
		maintenanceEnabled = true
	}

	c.JSON(http.StatusOK, gin.H{
		"maintenance_enabled": maintenanceEnabled,
	})
}
