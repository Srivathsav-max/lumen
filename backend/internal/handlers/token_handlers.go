package handlers

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/Srivathsav-max/lumen/backend/internal/container"
)

// TokenHandlers handles token-related HTTP requests
type TokenHandlers struct {
	container *container.Container
}

// NewTokenHandlers creates a new TokenHandlers instance
func NewTokenHandlers(container *container.Container) *TokenHandlers {
	return &TokenHandlers{
		container: container,
	}
}

// RefreshTokenRequest represents a request to refresh tokens
type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

// RefreshToken handles refreshing access tokens using a refresh token
func (h *TokenHandlers) RefreshToken(c *gin.Context) {
	ctx := context.Background()
	logger := h.container.GetLogger()
	authService := h.container.GetAuthService()

	// Get refresh token from cookie or request body
	refreshToken, err := c.Cookie("refresh_token")
	if err != nil {
		// If not in cookie, try to get from request body
		var req RefreshTokenRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			logger.Error("Invalid refresh token request", "error", err)
			c.JSON(http.StatusBadRequest, gin.H{"error": "Refresh token is required"})
			return
		}
		refreshToken = req.RefreshToken
	}

	// Refresh the tokens
	tokenPair, err := authService.RefreshTokens(ctx, refreshToken)
	if err != nil {
		logger.Error("Failed to refresh tokens", "error", err)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired refresh token"})
		return
	}

	// Set the new tokens in HTTP-only cookies
	c.SetCookie(
		"access_token",
		tokenPair.AccessToken,
		int(tokenPair.ExpiresIn),
		"/",
		"",
		true, // Secure in production
		true, // HTTP-only
	)

	c.SetCookie(
		"refresh_token",
		tokenPair.RefreshToken,
		60*60*24*30, // 30 days
		"/",
		"",
		true, // Secure in production
		true, // HTTP-only
	)

	logger.Info("Tokens refreshed successfully")

	// Return the new token pair
	c.JSON(http.StatusOK, gin.H{
		"message": "Tokens refreshed successfully",
		"access_token": tokenPair.AccessToken,
		"refresh_token": tokenPair.RefreshToken,
		"expires_in": tokenPair.ExpiresIn,
		"token_type": tokenPair.TokenType,
	})
}

// RevokeTokenRequest represents a request to revoke a token
type RevokeTokenRequest struct {
	Token string `json:"token" binding:"required"`
}

// RevokeToken handles revoking a token
func (h *TokenHandlers) RevokeToken(c *gin.Context) {
	ctx := context.Background()
	logger := h.container.GetLogger()
	authService := h.container.GetAuthService()

	// Get token from cookie or request body
	token, err := c.Cookie("access_token")
	if err != nil {
		// If not in cookie, try to get from request body
		var req RevokeTokenRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			logger.Error("Invalid revoke token request", "error", err)
			c.JSON(http.StatusBadRequest, gin.H{"error": "Token is required"})
			return
		}
		token = req.Token
	}

	// Revoke the token
	err = authService.RevokeToken(ctx, token)
	if err != nil {
		logger.Error("Failed to revoke token", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to revoke token"})
		return
	}

	// Clear auth cookies
	h.clearAuthCookies(c)

	logger.Info("Token revoked successfully")

	c.JSON(http.StatusOK, gin.H{
		"message": "Token revoked successfully",
	})
}

// Logout handles user logout by revoking tokens and clearing cookies
func (h *TokenHandlers) Logout(c *gin.Context) {
	ctx := context.Background()
	logger := h.container.GetLogger()
	authService := h.container.GetAuthService()

	// Get access token from cookie
	accessToken, err := c.Cookie("access_token")
	if err == nil && accessToken != "" {
		// If we have an access token, revoke it
		if revokeErr := authService.RevokeToken(ctx, accessToken); revokeErr != nil {
			logger.Error("Failed to revoke access token during logout", "error", revokeErr)
		}
	}

	// Get refresh token from cookie
	refreshToken, err := c.Cookie("refresh_token")
	if err == nil && refreshToken != "" {
		// If we have a refresh token, revoke it
		if revokeErr := authService.RevokeToken(ctx, refreshToken); revokeErr != nil {
			logger.Error("Failed to revoke refresh token during logout", "error", revokeErr)
		}
	}

	// Clear all auth cookies
	h.clearAuthCookies(c)

	logger.Info("User logged out successfully")

	c.JSON(http.StatusOK, gin.H{
		"message": "Logged out successfully",
	})
}

// clearAuthCookies clears all authentication-related cookies
func (h *TokenHandlers) clearAuthCookies(c *gin.Context) {
	// Clear access token cookie
	c.SetCookie(
		"access_token",
		"",
		-1,
		"/",
		"",
		true,
		true,
	)

	// Clear refresh token cookie
	c.SetCookie(
		"refresh_token",
		"",
		-1,
		"/",
		"",
		true,
		true,
	)

	// Clear any other auth-related cookies if they exist
	c.SetCookie(
		"user_id",
		"",
		-1,
		"/",
		"",
		true,
		true,
	)
}