package api

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)


// ValidateAuth handles token validation and returns user information
func (h *Handler) ValidateAuth(c *gin.Context) {
	// First try to get temporary token from HTTP-only cookie
	tempTokenString, err := c.Cookie(AuthTokenCookie)
	
	// If cookie not found, fall back to Authorization header
	if err != nil {
		// Get the Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"valid": false,
				"error": "Authentication token is required",
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
		tempTokenString = parts[1]
	}

	// Validate the temporary token using our token service
	userID, err := h.TokenService.ValidateTemporaryToken(tempTokenString)
	if err != nil {
		// Clear any invalid cookies
		ClearAuthCookies(c)
		
		c.JSON(http.StatusUnauthorized, gin.H{
			"valid": false,
			"error": "Invalid or expired token",
		})
		return
	}

	// Get user information
	user, err := h.UserService.GetByID(int64(userID))
	if err != nil || user == nil {
		// Clear any invalid cookies
		ClearAuthCookies(c)
		
		c.JSON(http.StatusUnauthorized, gin.H{
			"valid": false,
			"error": "User not found",
		})
		return
	}
	
	// Get user roles
	userRoles, err := h.RoleService.GetUserRoles(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"valid": false,
			"error": "Failed to retrieve user roles",
		})
		return
	}
	
	// Extract role names for response
	roleNames := make([]string, len(userRoles))
	for i, role := range userRoles {
		roleNames[i] = role.Name
	}
	
	// Check if user is admin
	isAdmin, err := h.RoleService.IsAdmin(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"valid": false,
			"error": "Failed to check admin status",
		})
		return
	}
	
	// Prepare user data for cookie
	userData := gin.H{
		"id":         user.ID,
		"username":   user.Username,
		"email":      user.Email,
		"first_name": user.FirstName,
		"last_name":  user.LastName,
		"roles":      roleNames,
		"is_admin":   isAdmin,
	}
	
	// Determine user role for role cookie
	userRole := "user"
	if isAdmin {
		userRole = "admin"
	}
	
	// Set cookies with the token and user data
	SetAuthCookies(c, tempTokenString, userData, userRole)

	// Return successful validation with user data
	c.JSON(http.StatusOK, gin.H{
		"valid": true,
		"user": userData,
	})
}
