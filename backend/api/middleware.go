package api

import (
	"net/http"
	"strings"

	"github.com/Srivathsav-max/lumen/backend/config"
	"github.com/Srivathsav-max/lumen/backend/utils"
	"github.com/gin-gonic/gin"
)

// AuthMiddleware creates a middleware for JWT authentication
func AuthMiddleware(handler *Handler, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		// First try to get token from HTTP-only cookie
		tokenString, err := c.Cookie(AuthTokenCookie)

		// If cookie not found, fall back to Authorization header
		if err != nil {
			// Get the Authorization header
			authHeader := c.GetHeader("Authorization")
			if authHeader == "" {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication token is required"})
				c.Abort()
				return
			}

			// Check if the header has the Bearer prefix
			parts := strings.Split(authHeader, " ")
			if len(parts) != 2 || parts[0] != "Bearer" {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header format must be Bearer {token}"})
				c.Abort()
				return
			}

			// Extract the token
			tokenString = parts[1]
		}

		// Validate the token
		claims, err := utils.ValidateToken(tokenString, cfg.JWT.Secret)
		if err != nil {
			// Clear any invalid cookies
			ClearAuthCookies(c)

			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			c.Abort()
			return
		}

		// Set the user ID in the context for use in handlers
		c.Set("userID", claims.UserID)

		// Set the handler in the context
		c.Set("handler", handler)

		// Get user roles and set them in context
		roles, err := handler.RoleService.GetUserRoles(claims.UserID)
		if err == nil {
			roleNames := make([]string, len(roles))
			for i, role := range roles {
				roleNames[i] = role.Name
			}
			c.Set("userRoles", roleNames)
		}

		c.Next()
	}
}

// CORSMiddleware handles CORS for the API
func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get the origin from the request
		origin := c.Request.Header.Get("Origin")

		// List of allowed origins
		allowedOrigins := []string{
			"http://localhost:3000",
			"https://moxium.tech",
			"https://www.moxium.tech",
			"https://api.moxium.tech",
		}

		// Check if the request origin is allowed
		allowed := false
		for _, allowedOrigin := range allowedOrigins {
			if origin == allowedOrigin {
				allowed = true
				break
			}
		}

		// If the origin is allowed or in development mode, set the CORS headers
		if allowed || origin == "" || origin == "null" {
			// If it's a valid origin, set it specifically (required for credentials)
			if origin != "" && origin != "null" {
				c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
			} else {
				// For development or testing without origin
				c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
			}

			c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
			c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
			c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")
		}

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

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
		if !ValidateCSRFToken(c) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Invalid or missing CSRF token"})
			c.Abort()
			return
		}

		c.Next()
	}
}

// LogoutHandler handles user logout
func (h *Handler) LogoutHandler(c *gin.Context) {
	// Get permanent token from cookie
	permanentToken, err := c.Cookie("permanent_token")
	if err == nil && permanentToken != "" {
		// If we have a permanent token, revoke it
		_ = h.TokenService.RevokeToken(permanentToken)
	}

	// Clear all authentication cookies
	ClearAuthCookies(c)

	c.JSON(http.StatusOK, gin.H{
		"message": "Logged out successfully",
	})
}
