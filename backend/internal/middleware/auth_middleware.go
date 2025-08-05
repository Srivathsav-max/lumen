package middleware

import (
	"context"
	"fmt"
	"log/slog"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/Srivathsav-max/lumen/backend/internal/errors"
	"github.com/Srivathsav-max/lumen/backend/internal/services"
)

// AuthMiddleware creates a middleware for JWT authentication using the service layer
func AuthMiddleware(authService services.AuthService, roleService services.RoleService, logger *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := getRequestIDFromContext(c)
		
		// Extract token from cookie or Authorization header
		token := extractToken(c)
		if token == "" {
			logger.Debug("Authentication token not provided",
				"request_id", requestID,
				"path", c.Request.URL.Path,
				"method", c.Request.Method,
				"ip", c.ClientIP(),
			)
			handleAuthError(c, errors.NewAuthenticationError("Authentication token is required"))
			return
		}

		ctx := context.Background()

		// Validate token through AuthService
		claims, err := authService.ValidateAccessToken(ctx, token)
		if err != nil {
			logger.Warn("Token validation failed",
				"request_id", requestID,
				"error", err,
				"path", c.Request.URL.Path,
				"method", c.Request.Method,
				"ip", c.ClientIP(),
			)
			clearAuthCookies(c)
			handleAuthError(c, err)
			return
		}

		// Set user information in context
		c.Set("userID", claims.UserID)
		c.Set("userEmail", claims.Email)
		c.Set("tokenClaims", claims)

		// Get and set user roles in context
		if roles, err := roleService.GetUserRoles(ctx, claims.UserID); err == nil {
			roleNames := make([]string, len(roles))
			for i, role := range roles {
				roleNames[i] = role.Name
			}
			c.Set("userRoles", roleNames)
			
			// Set admin flag for convenience
			isAdmin := false
			for _, roleName := range roleNames {
				if roleName == "admin" {
					isAdmin = true
					break
				}
			}
			c.Set("isAdmin", isAdmin)
		} else {
			logger.Warn("Failed to get user roles",
				"request_id", requestID,
				"user_id", claims.UserID,
				"error", err,
			)
			// Continue without roles - some endpoints might not require them
			c.Set("userRoles", []string{})
			c.Set("isAdmin", false)
		}

		logger.Debug("User authenticated successfully",
			"request_id", requestID,
			"user_id", claims.UserID,
			"email", claims.Email,
			"roles", c.GetStringSlice("userRoles"),
			"path", c.Request.URL.Path,
			"method", c.Request.Method,
		)

		c.Next()
	}
}

// AdminRequiredMiddleware ensures the user has admin role
func AdminRequiredMiddleware(logger *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := getRequestIDFromContext(c)
		userID, _ := c.Get("userID")
		
		isAdmin, exists := c.Get("isAdmin")
		if !exists || !isAdmin.(bool) {
			logger.Warn("Admin access denied",
				"request_id", requestID,
				"user_id", userID,
				"path", c.Request.URL.Path,
				"method", c.Request.Method,
				"ip", c.ClientIP(),
			)
			handleAuthError(c, errors.NewAuthorizationError("Admin access required"))
			return
		}
		
		logger.Debug("Admin access granted",
			"request_id", requestID,
			"user_id", userID,
			"path", c.Request.URL.Path,
			"method", c.Request.Method,
		)
		
		c.Next()
	}
}

// RoleRequiredMiddleware ensures the user has one of the specified roles
func RoleRequiredMiddleware(logger *slog.Logger, requiredRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := getRequestIDFromContext(c)
		userID, _ := c.Get("userID")
		
		userRoles, exists := c.Get("userRoles")
		if !exists {
			logger.Warn("User roles not found in context",
				"request_id", requestID,
				"user_id", userID,
				"path", c.Request.URL.Path,
				"method", c.Request.Method,
			)
			handleAuthError(c, errors.NewAuthorizationError("User roles not found"))
			return
		}

		roleSlice, ok := userRoles.([]string)
		if !ok {
			logger.Error("Invalid user roles type in context",
				"request_id", requestID,
				"user_id", userID,
				"roles_type", fmt.Sprintf("%T", userRoles),
			)
			handleAuthError(c, errors.NewAuthorizationError("Invalid user roles"))
			return
		}

		// Check if user has any of the required roles
		hasRequiredRole := false
		for _, userRole := range roleSlice {
			for _, requiredRole := range requiredRoles {
				if userRole == requiredRole {
					hasRequiredRole = true
					break
				}
			}
			if hasRequiredRole {
				break
			}
		}

		if !hasRequiredRole {
			logger.Warn("Insufficient permissions",
				"request_id", requestID,
				"user_id", userID,
				"user_roles", roleSlice,
				"required_roles", requiredRoles,
				"path", c.Request.URL.Path,
				"method", c.Request.Method,
			)
			handleAuthError(c, errors.NewAuthorizationError("Insufficient permissions"))
			return
		}

		logger.Debug("Role authorization successful",
			"request_id", requestID,
			"user_id", userID,
			"user_roles", roleSlice,
			"required_roles", requiredRoles,
			"path", c.Request.URL.Path,
			"method", c.Request.Method,
		)

		c.Next()
	}
}

// OptionalAuthMiddleware provides authentication but doesn't require it
func OptionalAuthMiddleware(authService services.AuthService, roleService services.RoleService, logger *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Extract token from cookie or Authorization header
		token := extractToken(c)
		if token == "" {
			// No token provided, continue without authentication
			c.Next()
			return
		}

		ctx := context.Background()

		// Validate token through AuthService
		claims, err := authService.ValidateAccessToken(ctx, token)
		if err != nil {
			// Invalid token, clear cookies and continue without authentication
			clearAuthCookies(c)
			logger.Debug("Optional auth failed", "error", err)
			c.Next()
			return
		}

		// Set user information in context
		c.Set("userID", claims.UserID)
		c.Set("userEmail", claims.Email)
		c.Set("tokenClaims", claims)

		// Get and set user roles in context
		if roles, err := roleService.GetUserRoles(ctx, claims.UserID); err == nil {
			roleNames := make([]string, len(roles))
			for i, role := range roles {
				roleNames[i] = role.Name
			}
			c.Set("userRoles", roleNames)
			
			// Set admin flag for convenience
			isAdmin := false
			for _, roleName := range roleNames {
				if roleName == "admin" {
					isAdmin = true
					break
				}
			}
			c.Set("isAdmin", isAdmin)
		}

		c.Next()
	}
}

// Helper functions

// extractToken extracts token from cookie or Authorization header
func extractToken(c *gin.Context) string {
	// First try to get token from HTTP-only cookie
	if token, err := c.Cookie("access_token"); err == nil && token != "" {
		return token
	}

	// Fall back to Authorization header
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		return ""
	}

	// Check if the header has the Bearer prefix
	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 || parts[0] != "Bearer" {
		return ""
	}

	return parts[1]
}

// clearAuthCookies clears authentication cookies
func clearAuthCookies(c *gin.Context) {
	c.SetCookie("access_token", "", -1, "/", "", true, true)
	c.SetCookie("refresh_token", "", -1, "/", "", true, true)
}

// handleAuthError handles authentication/authorization errors consistently
func handleAuthError(c *gin.Context, err error) {
	c.Error(err)
	c.Abort()
}

// GetCurrentUserID extracts the current user ID from context
func GetCurrentUserID(c *gin.Context) (int64, error) {
	userID, exists := c.Get("userID")
	if !exists {
		return 0, errors.NewAuthenticationError("User not authenticated")
	}

	if id, ok := userID.(int64); ok {
		return id, nil
	}

	return 0, errors.NewInternalError("Invalid user ID in context")
}

// IsCurrentUserAdmin checks if the current user is an admin
func IsCurrentUserAdmin(c *gin.Context) bool {
	isAdmin, exists := c.Get("isAdmin")
	if !exists {
		return false
	}

	if admin, ok := isAdmin.(bool); ok {
		return admin
	}

	return false
}

// GetCurrentUserRoles gets the current user's roles
func GetCurrentUserRoles(c *gin.Context) []string {
	roles, exists := c.Get("userRoles")
	if !exists {
		return []string{}
	}

	if roleSlice, ok := roles.([]string); ok {
		return roleSlice
	}

	return []string{}
}