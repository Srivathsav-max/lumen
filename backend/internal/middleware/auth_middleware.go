package middleware

import (
	"context"
	"fmt"
	"log/slog"
	"strings"

	"github.com/Srivathsav-max/lumen/backend/internal/constants"
	"github.com/Srivathsav-max/lumen/backend/internal/errors"
	"github.com/Srivathsav-max/lumen/backend/internal/services"
	"github.com/gin-gonic/gin"
)

func AuthMiddleware(authService services.AuthService, logger *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := getRequestIDFromContext(c)

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

		c.Set("userID", claims.UserID)
		c.Set("userEmail", claims.Email)
		c.Set("tokenClaims", claims)

		c.Set("userRoles", claims.Roles)

		isAdmin := false
		for _, roleName := range claims.Roles {
			if roleName == constants.RoleAdmin {
				isAdmin = true
				break
			}
		}
		c.Set("isAdmin", isAdmin)

		logger.Debug("User authenticated successfully",
			"request_id", requestID,
			"user_id", claims.UserID,
			"email", claims.Email,
			"roles", claims.Roles,
			"path", c.Request.URL.Path,
			"method", c.Request.Method,
		)

		c.Next()
	}
}

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

func OptionalAuthMiddleware(authService services.AuthService, logger *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		token := extractToken(c)
		if token == "" {
			c.Next()
			return
		}

		ctx := context.Background()

		claims, err := authService.ValidateAccessToken(ctx, token)
		if err != nil {
			clearAuthCookies(c)
			logger.Debug("Optional auth failed", "error", err)
			c.Next()
			return
		}

		c.Set("userID", claims.UserID)
		c.Set("userEmail", claims.Email)
		c.Set("tokenClaims", claims)

		c.Set("userRoles", claims.Roles)

		isAdmin := false
		for _, roleName := range claims.Roles {
			if roleName == constants.RoleAdmin {
				isAdmin = true
				break
			}
		}
		c.Set("isAdmin", isAdmin)

		c.Next()
	}
}

func extractToken(c *gin.Context) string {
	if token, err := c.Cookie(constants.AccessTokenCookieName); err == nil && token != "" {
		return token
	}

	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		return ""
	}

	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 || parts[0] != "Bearer" {
		return ""
	}

	return parts[1]
}

func clearAuthCookies(c *gin.Context) {
	c.SetCookie("access_token", "", -1, "/", "", true, true)
	c.SetCookie("refresh_token", "", -1, "/", "", true, true)
}

func handleAuthError(c *gin.Context, err error) {
	c.Error(err)
	c.Abort()
}

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
