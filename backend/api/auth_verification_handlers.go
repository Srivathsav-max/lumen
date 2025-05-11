package api

import (
	"fmt"
	"net/http"
	"time"

	"github.com/Srivathsav-max/lumen/backend/models"
	"github.com/Srivathsav-max/lumen/backend/utils"
	"github.com/gin-gonic/gin"
)

// RequestVerificationRequest represents a request to verify an email
type RequestVerificationRequest struct {
	Email string `json:"email" binding:"required,email"`
}

// VerifyEmailRequest represents a request to verify an email with a token
type VerifyEmailRequest struct {
	Token string `json:"token" binding:"required"`
}

// RequestPasswordResetRequest represents a request to reset a password
type RequestPasswordResetRequest struct {
	Email string `json:"email" binding:"required,email"`
}

// ResetPasswordRequest represents a request to reset a password with a token
type ResetPasswordRequest struct {
	Token    string `json:"token" binding:"required"`
	Password string `json:"password" binding:"required,min=6"`
}

// RequestEmailVerificationHandler handles requests to send verification emails
func (h *Handler) RequestEmailVerificationHandler(c *gin.Context) {
	var req RequestVerificationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return
	}

	// Get user by email
	user, err := h.UserService.GetByEmail(req.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process request"})
		return
	}

	// If user doesn't exist, return success anyway to prevent email enumeration
	if user == nil {
		c.JSON(http.StatusOK, gin.H{"message": "If your email exists in our system, a verification link has been sent"})
		return
	}

	// Generate verification token
	token, err := h.VerificationTokenService.GenerateToken(user.ID, models.TokenTypeEmailVerification, 24)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate verification token"})
		return
	}

	// Create verification link
	baseURL := c.GetHeader("Origin")
	if baseURL == "" {
		baseURL = "http://localhost:3000" // Fallback
	}
	verificationLink := baseURL + "/auth/verify-email?token=" + token

	// Send verification email
	err = h.EmailService.SendVerificationEmail(user.Email, verificationLink)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send verification email"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "If your email exists in our system, a verification link has been sent"})
}

// VerifyEmailHandler handles email verification with a token
func (h *Handler) VerifyEmailHandler(c *gin.Context) {
	var req VerifyEmailRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return
	}

	// Validate token
	token, err := h.VerificationTokenService.ValidateToken(req.Token, models.TokenTypeEmailVerification)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid or expired verification token"})
		return
	}

	// Get user
	user, err := h.UserService.GetByID(token.UserID)
	if err != nil || user == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to find user"})
		return
	}

	// Mark user as verified
	user.EmailVerified = true
	user.UpdatedAt = time.Now()
	err = h.UserService.UpdateProfile(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user"})
		return
	}

	// Mark token as used
	err = h.VerificationTokenService.MarkTokenAsUsed(token.ID)
	if err != nil {
		// Log error but continue
		// This is not critical as the token validation still checks for used tokens
	}

	c.JSON(http.StatusOK, gin.H{"message": "Email verified successfully"})
}

// RequestPasswordResetHandler handles requests to reset a password
func (h *Handler) RequestPasswordResetHandler(c *gin.Context) {
	var req RequestPasswordResetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return
	}

	// Get user by email
	user, err := h.UserService.GetByEmail(req.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process request"})
		return
	}

	// If user doesn't exist, return success anyway to prevent email enumeration
	if user == nil {
		c.JSON(http.StatusOK, gin.H{"message": "If your email exists in our system, a password reset link has been sent"})
		return
	}

	// Generate password reset token
	token, err := h.VerificationTokenService.GenerateToken(user.ID, models.TokenTypePasswordReset, 24) // 24 hours expiry for better testing
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate reset token"})
		return
	}

	// Create reset link
	baseURL := c.GetHeader("Origin")
	if baseURL == "" {
		baseURL = "http://localhost:3000" // Fallback
	}
	resetLink := baseURL + "/auth/reset-password?token=" + token

	// Send password reset email
	err = h.EmailService.SendPasswordResetEmail(user.Email, resetLink)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send password reset email"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "If your email exists in our system, a password reset link has been sent"})
}

// ResetPasswordHandler handles password reset with a token
func (h *Handler) ResetPasswordHandler(c *gin.Context) {
	var req ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return
	}

	// Validate token
	token, err := h.VerificationTokenService.ValidateToken(req.Token, models.TokenTypePasswordReset)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid or expired reset token"})
		return
	}

	// Get user
	user, err := h.UserService.GetByID(token.UserID)
	if err != nil || user == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to find user"})
		return
	}

	// Hash new password
	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process password"})
		return
	}

	// Update user password
	fmt.Printf("Updating password for user ID: %d, Email: %s\n", user.ID, user.Email)
	user.Password = hashedPassword
	user.UpdatedAt = time.Now()
	err = h.UserService.UpdateProfile(user)
	if err != nil {
		fmt.Printf("Error updating password: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update password"})
		return
	}
	fmt.Printf("Password updated successfully for user ID: %d\n", user.ID)

	// Mark token as used
	err = h.VerificationTokenService.MarkTokenAsUsed(token.ID)
	if err != nil {
		// Log error but continue
		// This is not critical as the token validation still checks for used tokens
	}

	// Revoke all existing tokens for this user
	err = h.TokenService.RevokeAllUserTokens(int(user.ID))
	if err != nil {
		// Log the error but continue
		fmt.Printf("Error revoking tokens: %v\n", err)
	}
	
	// Clear authentication cookies to force re-login
	ClearAuthCookies(c)

	c.JSON(http.StatusOK, gin.H{"message": "Password reset successfully"})
}
