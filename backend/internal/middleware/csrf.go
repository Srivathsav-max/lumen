package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// CSRFMiddleware creates a middleware for CSRF protection
func CSRFMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get the request path
		path := c.Request.URL.Path

		// Exempt authentication endpoints from CSRF protection
		// These are entry points that don't have a CSRF token yet
		// Define exempt paths
		exemptPaths := []string{
			"/api/v1/login",
			"/api/v1/register",
			"/api/v1/waitlist",
			"/api/v1/auth/forgot-password",
			"/api/v1/auth/reset-password",
			"/api/v1/auth/request-verification",
			"/api/v1/auth/verify-email",
		}

		// Check if current path is exempt
		for _, exemptPath := range exemptPaths {
			if path == exemptPath {
				c.Next()
				return
			}
		}

		// Skip CSRF check for GET, HEAD, OPTIONS, TRACE requests as they should be safe
		if c.Request.Method == "GET" ||
			c.Request.Method == "HEAD" ||
			c.Request.Method == "OPTIONS" ||
			c.Request.Method == "TRACE" {
			c.Next()
			return
		}

		// For all other methods (POST, PUT, DELETE, PATCH), validate CSRF token
		if !validateCSRFToken(c) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Invalid or missing CSRF token"})
			c.Abort()
			return
		}

		c.Next()
	}
}

// validateCSRFToken validates the CSRF token from the request
func validateCSRFToken(c *gin.Context) bool {
	// Get CSRF token from header
	csrfToken := c.GetHeader("X-CSRF-Token")
	if csrfToken == "" {
		// Fallback to form data
		csrfToken = c.PostForm("csrf_token")
	}

	if csrfToken == "" {
		return false
	}

	// Get expected CSRF token from cookie
	expectedToken, err := c.Cookie("csrf_token")
	if err != nil {
		return false
	}

	// Compare tokens
	return csrfToken == expectedToken
}