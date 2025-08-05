package handlers

import (
	"context"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/Srivathsav-max/lumen/backend/internal/errors"
	"github.com/Srivathsav-max/lumen/backend/internal/services"
)

// AuthHandlers handles authentication-related HTTP requests
type AuthHandlers struct {
	authService services.AuthService
	userService services.UserService
}

// NewAuthHandlers creates a new AuthHandlers instance
func NewAuthHandlers(authService services.AuthService, userService services.UserService) *AuthHandlers {
	return &AuthHandlers{
		authService: authService,
		userService: userService,
	}
}

// Register handles user registration
func (h *AuthHandlers) Register(c *gin.Context) {
	var req services.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.Error(errors.NewValidationError("Invalid request format", err.Error()))
		return
	}

	ctx := context.Background()

	// Register user through UserService
	userResponse, err := h.userService.Register(ctx, &req)
	if err != nil {
		c.Error(err)
		return
	}

	// Generate token pair through AuthService
	tokenPair, err := h.authService.GenerateTokenPair(ctx, userResponse.ID)
	if err != nil {
		c.Error(err)
		return
	}

	// Prepare auth response
	authResponse := &services.AuthResponse{
		User:         userResponse,
		AccessToken:  tokenPair.AccessToken,
		RefreshToken: tokenPair.RefreshToken,
		ExpiresIn:    tokenPair.ExpiresIn,
		TokenType:    tokenPair.TokenType,
	}

	// Set HTTP-only cookies for security
	h.setAuthCookies(c, tokenPair)

	c.JSON(http.StatusCreated, gin.H{
		"message": "User registered successfully",
		"data":    authResponse,
	})
}

// Login handles user authentication
func (h *AuthHandlers) Login(c *gin.Context) {
	var req services.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.Error(errors.NewValidationError("Invalid request format", err.Error()))
		return
	}

	ctx := context.Background()

	// Authenticate user through UserService
	authResponse, err := h.userService.Login(ctx, &req)
	if err != nil {
		c.Error(err)
		return
	}

	// Generate token pair through AuthService
	tokenPair, err := h.authService.GenerateTokenPair(ctx, authResponse.User.ID)
	if err != nil {
		c.Error(err)
		return
	}

	// Complete auth response
	authResponse.AccessToken = tokenPair.AccessToken
	authResponse.RefreshToken = tokenPair.RefreshToken
	authResponse.ExpiresIn = tokenPair.ExpiresIn
	authResponse.TokenType = tokenPair.TokenType

	// Set HTTP-only cookies for security
	h.setAuthCookies(c, tokenPair)

	c.JSON(http.StatusOK, gin.H{
		"message": "Login successful",
		"data":    authResponse,
	})
}

// ValidateToken handles token validation
func (h *AuthHandlers) ValidateToken(c *gin.Context) {
	// Get token from cookie or Authorization header
	token := h.extractToken(c)
	if token == "" {
		c.Error(errors.NewAuthenticationError("Authentication token is required"))
		return
	}

	ctx := context.Background()

	// Validate token through AuthService
	claims, err := h.authService.ValidateAccessToken(ctx, token)
	if err != nil {
		h.clearAuthCookies(c)
		c.Error(err)
		return
	}

	// Get user information
	user, err := h.userService.GetByID(ctx, claims.UserID)
	if err != nil {
		h.clearAuthCookies(c)
		c.Error(err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"valid": true,
		"data": gin.H{
			"user":   user,
			"claims": claims,
		},
	})
}

// RefreshToken handles token refresh
func (h *AuthHandlers) RefreshToken(c *gin.Context) {
	// Get refresh token from request body or cookie
	var req struct {
		RefreshToken string `json:"refresh_token"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		// Try to get from cookie if not in body
		if refreshToken, err := c.Cookie("refresh_token"); err == nil {
			req.RefreshToken = refreshToken
		} else {
			c.Error(errors.NewValidationError("Refresh token is required", ""))
			return
		}
	}

	if req.RefreshToken == "" {
		c.Error(errors.NewValidationError("Refresh token is required", ""))
		return
	}

	ctx := context.Background()

	// Refresh tokens through AuthService
	tokenPair, err := h.authService.RefreshTokens(ctx, req.RefreshToken)
	if err != nil {
		h.clearAuthCookies(c)
		c.Error(err)
		return
	}

	// Set new cookies
	h.setAuthCookies(c, tokenPair)

	c.JSON(http.StatusOK, gin.H{
		"message": "Tokens refreshed successfully",
		"data":    tokenPair,
	})
}

// RevokeToken handles token revocation
func (h *AuthHandlers) RevokeToken(c *gin.Context) {
	// Get token from request body or extract from headers/cookies
	var req struct {
		Token string `json:"token"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		// Try to extract from current request
		req.Token = h.extractToken(c)
		if req.Token == "" {
			c.Error(errors.NewValidationError("Token is required", ""))
			return
		}
	}

	ctx := context.Background()

	// Revoke token through AuthService
	if err := h.authService.RevokeToken(ctx, req.Token); err != nil {
		c.Error(err)
		return
	}

	// Clear cookies
	h.clearAuthCookies(c)

	c.JSON(http.StatusOK, gin.H{
		"message": "Token revoked successfully",
	})
}

// Logout handles user logout
func (h *AuthHandlers) Logout(c *gin.Context) {
	// Get current user ID from context (set by auth middleware)
	userID, exists := c.Get("userID")
	if !exists {
		c.Error(errors.NewAuthenticationError("User not authenticated"))
		return
	}

	ctx := context.Background()

	// Invalidate all sessions for the user
	if err := h.authService.InvalidateAllSessions(ctx, userID.(int64)); err != nil {
		c.Error(err)
		return
	}

	// Clear cookies
	h.clearAuthCookies(c)

	c.JSON(http.StatusOK, gin.H{
		"message": "Logged out successfully",
	})
}

// ChangePassword handles password change requests
func (h *AuthHandlers) ChangePassword(c *gin.Context) {
	// Get current user ID from context (set by auth middleware)
	userID, exists := c.Get("userID")
	if !exists {
		c.Error(errors.NewAuthenticationError("User not authenticated"))
		return
	}

	var req services.ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.Error(errors.NewValidationError("Invalid request format", err.Error()))
		return
	}

	ctx := context.Background()

	// Change password through AuthService
	if err := h.authService.ChangePassword(ctx, userID.(int64), &req); err != nil {
		c.Error(err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Password changed successfully",
	})
}

// InitiatePasswordReset handles password reset initiation
func (h *AuthHandlers) InitiatePasswordReset(c *gin.Context) {
	var req struct {
		Email string `json:"email" binding:"required,email"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.Error(errors.NewValidationError("Invalid request format", err.Error()))
		return
	}

	ctx := context.Background()

	// Initiate password reset through AuthService
	if err := h.authService.InitiatePasswordReset(ctx, req.Email); err != nil {
		c.Error(err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Password reset instructions sent to your email",
	})
}

// ResetPassword handles password reset with token
func (h *AuthHandlers) ResetPassword(c *gin.Context) {
	var req services.ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.Error(errors.NewValidationError("Invalid request format", err.Error()))
		return
	}

	ctx := context.Background()

	// Reset password through AuthService
	if err := h.authService.ResetPassword(ctx, &req); err != nil {
		c.Error(err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Password reset successfully",
	})
}

// Helper methods

// extractToken extracts token from cookie or Authorization header
func (h *AuthHandlers) extractToken(c *gin.Context) string {
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

// setAuthCookies sets HTTP-only cookies for authentication
func (h *AuthHandlers) setAuthCookies(c *gin.Context, tokenPair *services.TokenPair) {
	// Set access token cookie (HTTP-only for security)
	c.SetCookie(
		"access_token",
		tokenPair.AccessToken,
		int(tokenPair.ExpiresIn),
		"/",
		"",
		true,  // Secure (HTTPS only in production)
		true,  // HTTP-only
	)

	// Set refresh token cookie (HTTP-only for security)
	c.SetCookie(
		"refresh_token",
		tokenPair.RefreshToken,
		int(tokenPair.ExpiresIn*24), // Refresh tokens typically last longer
		"/",
		"",
		true,  // Secure (HTTPS only in production)
		true,  // HTTP-only
	)
}

// clearAuthCookies clears authentication cookies
func (h *AuthHandlers) clearAuthCookies(c *gin.Context) {
	c.SetCookie("access_token", "", -1, "/", "", true, true)
	c.SetCookie("refresh_token", "", -1, "/", "", true, true)
}