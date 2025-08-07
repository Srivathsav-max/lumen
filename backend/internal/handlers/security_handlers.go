package handlers

import (
	"fmt"
	"net/http"

	"github.com/Srivathsav-max/lumen/backend/internal/security"
	"github.com/gin-gonic/gin"
)

type SecurityHandlers struct {
	csrfService *security.CSRFService
}

func NewSecurityHandlers(csrfService *security.CSRFService) *SecurityHandlers {
	return &SecurityHandlers{
		csrfService: csrfService,
	}
}

func (h *SecurityHandlers) GetCSRFToken(c *gin.Context) {
	sessionID := c.GetString("session_id")

	var userID int64
	if userIDValue, exists := c.Get("userID"); exists {
		if uid, ok := userIDValue.(int64); ok {
			userID = uid
		}
	}

	if sessionID == "" && userID > 0 {
		sessionID = fmt.Sprintf("session_%d", userID)
	}

	if sessionID == "" {
		sessionID = "anonymous_" + c.ClientIP()
	}

	csrfToken, err := h.csrfService.GenerateToken(sessionID, userID, c.Request)
	if err != nil {
		// Handle case where CSRF is disabled (development mode)
		if err.Error() == "CSRF protection is disabled" {
			c.JSON(http.StatusOK, gin.H{
				"csrf_token":   "development-mode-disabled",
				"expires_at":   nil,
				"session_id":   sessionID,
				"csrf_enabled": false,
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to generate CSRF token",
		})
		return
	}

	h.csrfService.SetCSRFCookie(c.Writer, csrfToken)

	c.JSON(http.StatusOK, gin.H{
		"csrf_token":   csrfToken.Token,
		"expires_at":   csrfToken.ExpiresAt,
		"session_id":   sessionID,
		"csrf_enabled": true,
	})
}

func (h *SecurityHandlers) CSPReport(c *gin.Context) {
	var report map[string]interface{}

	if err := c.ShouldBindJSON(&report); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid CSP report format",
		})
		return
	}

	c.Header("Content-Type", "application/json")

	c.Status(http.StatusOK)
}
