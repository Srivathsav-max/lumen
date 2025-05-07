package api

import (
	"net/http"
	"strings"

	"github.com/Srivathsav-max/lumen/backend/utils"
	"github.com/gin-gonic/gin"
)



// ValidateAuth handles token validation and returns user information
func (h *Handler) ValidateAuth(c *gin.Context) {
	// Get the Authorization header
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"valid": false,
			"error": "Authorization header is required",
		})
		return
	}

	// Check if the header has the Bearer prefix
	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 || parts[0] != "Bearer" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"valid": false,
			"error": "Authorization header format must be Bearer {token}",
		})
		return
	}

	// Extract the token
	tokenString := parts[1]

	// Validate the token
	claims, err := utils.ValidateToken(tokenString, h.Config.JWT.Secret)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"valid": false,
			"error": "Invalid or expired token",
		})
		return
	}

	// Get user information
	user, err := h.UserService.GetByID(claims.UserID)
	if err != nil || user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"valid": false,
			"error": "User not found",
		})
		return
	}

	// Return successful validation with user data
	c.JSON(http.StatusOK, gin.H{
		"valid": true,
		"user": gin.H{
			"id":         user.ID,
			"username":   user.Username,
			"email":      user.Email,
			"first_name": user.FirstName,
			"last_name":  user.LastName,
		},
	})
}
