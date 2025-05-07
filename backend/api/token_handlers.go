package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// RefreshToken handles refreshing a temporary token using a permanent token
func (h *Handler) RefreshToken(c *gin.Context) {
	// Get permanent token from cookie or request body
	permanentToken, err := c.Cookie("permanent_token")
	if err != nil {
		// If not in cookie, try to get from request body
		var input struct {
			PermanentToken string `json:"permanent_token" binding:"required"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Permanent token is required"})
			return
		}

		permanentToken = input.PermanentToken
	}

	// Refresh the temporary token
	tempToken, expiresAt, err := h.TokenService.RefreshTemporaryToken(permanentToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired permanent token"})
		return
	}

	// Set the new temporary token in HTTP-only cookie
	c.SetCookie(
		AuthTokenCookie,
		tempToken,
		int(h.TokenService.TemporaryTokenExpiry.Seconds()),
		"/",
		"",
		h.Config.JWT.Secret != "", // Use secure cookies in production
		true, // HTTP-only
	)

	// Return the new temporary token and expiration time
	c.JSON(http.StatusOK, gin.H{
		"message": "Token refreshed successfully",
		"token": tempToken,
		"expires_at": expiresAt,
	})
}

// RevokeToken handles revoking a permanent token
func (h *Handler) RevokeToken(c *gin.Context) {
	// Get permanent token from cookie or request body
	permanentToken, err := c.Cookie("permanent_token")
	if err != nil {
		// If not in cookie, try to get from request body
		var input struct {
			PermanentToken string `json:"permanent_token" binding:"required"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Permanent token is required"})
			return
		}

		permanentToken = input.PermanentToken
	}

	// Revoke the token
	err = h.TokenService.RevokeToken(permanentToken)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to revoke token"})
		return
	}

	// Clear cookies
	ClearAuthCookies(c)

	c.JSON(http.StatusOK, gin.H{
		"message": "Token revoked successfully",
	})
}

// EnhancedLogoutHandler handles user logout by revoking the token and clearing cookies
func (h *Handler) EnhancedLogoutHandler(c *gin.Context) {
	// Get permanent token from cookie
	permanentToken, err := c.Cookie("permanent_token")
	if err == nil && permanentToken != "" {
		// If we have a permanent token, revoke it
		_ = h.TokenService.RevokeToken(permanentToken)
	}

	// Clear all auth cookies
	ClearAuthCookies(c)

	c.JSON(http.StatusOK, gin.H{
		"message": "Logged out successfully",
	})
}
