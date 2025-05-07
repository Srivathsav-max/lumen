package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// GetRegistrationStatus returns the current registration status
func (h *Handler) GetRegistrationStatus(c *gin.Context) {
	enabled, err := h.SystemSettingsService.IsRegistrationEnabled()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get registration status"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"registration_enabled": enabled,
	})
}

// ToggleRegistrationStatus toggles the registration status
func (h *Handler) ToggleRegistrationStatus(c *gin.Context) {
	// Only admin or developer can toggle registration
	if !isAdminOrDeveloper(c) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Unauthorized: Admin or developer role required"})
		return
	}

	var input struct {
		Value string `json:"value" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Convert string value to boolean
	enabled := input.Value == "true"

	if err := h.SystemSettingsService.ToggleRegistration(enabled); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update registration status"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Registration status updated successfully",
		"registration_enabled": enabled,
	})
}

// GetAllSystemSettings returns all system settings
func (h *Handler) GetAllSystemSettings(c *gin.Context) {
	// Only admin or developer can view all system settings
	if !isAdminOrDeveloper(c) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Unauthorized: Admin or developer role required"})
		return
	}

	settings, err := h.SystemSettingsService.GetAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get system settings"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"settings": settings,
	})
}

// UpdateSystemSetting updates a system setting
func (h *Handler) UpdateSystemSetting(c *gin.Context) {
	// Only admin or developer can update system settings
	if !isAdminOrDeveloper(c) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Unauthorized: Admin or developer role required"})
		return
	}

	key := c.Param("key")
	if key == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Key is required"})
		return
	}

	var input struct {
		Value string `json:"value" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.SystemSettingsService.Update(key, input.Value); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update system setting"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "System setting updated successfully",
		"key": key,
		"value": input.Value,
	})
}

// Helper function to check if the user is an admin or developer
func isAdminOrDeveloper(c *gin.Context) bool {
	// Get user ID from context (set by AuthMiddleware)
	userID, exists := c.Get("userID")
	if !exists {
		return false
	}

	// Get user roles from context
	roles, exists := c.Get("userRoles")
	if exists {
		roleNames := roles.([]string)
		for _, role := range roleNames {
			if role == "admin" || role == "developer" {
				return true
			}
		}
	}

	// If roles not in context, check using RoleService
	handler, ok := c.MustGet("handler").(*Handler)
	if !ok {
		return false
	}

	isAdmin, err := handler.RoleService.IsAdmin(userID.(int64))
	if err != nil {
		return false
	}

	return isAdmin
}

// Helper function to get user roles
func getUserRoles(c *gin.Context) ([]string, error) {
	// Get user ID from context (set by AuthMiddleware)
	userID, exists := c.Get("userID")
	if !exists {
		return nil, nil
	}

	// No need to convert userID as it's already the correct type
	// Just ensure it exists and is valid
	if userID == nil {
		return nil, nil
	}

	// Get user roles from context if available
	roles, exists := c.Get("userRoles")
	if exists {
		return roles.([]string), nil
	}

	return nil, nil
}
