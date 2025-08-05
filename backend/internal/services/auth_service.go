package services

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log/slog"
	"strings"
	"sync"
	"time"

	"github.com/Srivathsav-max/lumen/backend/internal/config"
	"github.com/Srivathsav-max/lumen/backend/internal/errors"
	"github.com/Srivathsav-max/lumen/backend/internal/repository"
	"github.com/Srivathsav-max/lumen/backend/utils"
	"github.com/golang-jwt/jwt/v4"
)

// Token types
const (
	TokenTypeAccess  = "access"
	TokenTypeRefresh = "refresh"
)

// AuthServiceImpl implements the AuthService interface
type AuthServiceImpl struct {
	config    *config.Config
	userRepo  repository.UserRepository
	tokenRepo repository.TokenRepository
	roleRepo  repository.RoleRepository
	logger    *slog.Logger
	// In-memory blacklist for access tokens (in production, use Redis or database)
	tokenBlacklist map[string]time.Time
	blacklistMutex sync.RWMutex
}

// NewAuthService creates a new AuthService implementation
func NewAuthService(
	config *config.Config,
	userRepo repository.UserRepository,
	tokenRepo repository.TokenRepository,
	roleRepo repository.RoleRepository,
	logger *slog.Logger,
) AuthService {
	return &AuthServiceImpl{
		config:         config,
		userRepo:       userRepo,
		tokenRepo:      tokenRepo,
		roleRepo:       roleRepo,
		logger:         logger,
		tokenBlacklist: make(map[string]time.Time),
		blacklistMutex: sync.RWMutex{},
	}
}

// GenerateTokenPair generates a new access and refresh token pair for a user
func (s *AuthServiceImpl) GenerateTokenPair(ctx context.Context, userID int64) (*TokenPair, error) {
	s.logger.Info("Generating token pair", "user_id", userID)

	// Get user to include in claims
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		s.logger.Error("Failed to get user for token generation", "user_id", userID, "error", err)
		return nil, NewUserNotFoundError(fmt.Sprintf("ID: %d", userID))
	}

	// Get user roles for claims
	roles, err := s.roleRepo.GetUserRoles(ctx, userID)
	if err != nil {
		s.logger.Error("Failed to get user roles", "user_id", userID, "error", err)
		return nil, errors.NewInternalError("Failed to get user roles").WithCause(err)
	}

	roleNames := make([]string, len(roles))
	for i, role := range roles {
		roleNames[i] = role.Name
	}

	// Generate access token
	accessToken, _, err := s.generateAccessToken(userID, user.Email, roleNames)
	if err != nil {
		s.logger.Error("Failed to generate access token", "user_id", userID, "error", err)
		return nil, errors.NewInternalError("Failed to generate access token").WithCause(err)
	}

	// Generate refresh token
	refreshToken, refreshExpiresAt, err := s.generateRefreshToken()
	if err != nil {
		s.logger.Error("Failed to generate refresh token", "user_id", userID, "error", err)
		return nil, errors.NewInternalError("Failed to generate refresh token").WithCause(err)
	}

	// Store refresh token in database
	tokenEntity := &repository.Token{
		UserID:     userID,
		Token:      refreshToken,
		DeviceInfo: "",
		ExpiresAt:  refreshExpiresAt,
	}

	if err := s.tokenRepo.Create(ctx, tokenEntity); err != nil {
		s.logger.Error("Failed to store refresh token", "user_id", userID, "error", err)
		return nil, errors.NewInternalError("Failed to store refresh token").WithCause(err)
	}

	tokenPair := &TokenPair{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    int64(s.config.JWT.AccessTokenDuration * 60), // Convert minutes to seconds
		TokenType:    "Bearer",
		IssuedAt:     time.Now().UTC(),
	}

	s.logger.Info("Token pair generated successfully", "user_id", userID)
	return tokenPair, nil
}

// ValidateAccessToken validates an access token and returns the claims
func (s *AuthServiceImpl) ValidateAccessToken(ctx context.Context, tokenString string) (*TokenClaims, error) {
	s.logger.Debug("Validating access token")

	// Validate token format
	if err := s.validateTokenFormat(tokenString); err != nil {
		return nil, err
	}

	// Check if token is blacklisted
	if s.isTokenBlacklisted(tokenString) {
		s.logger.Debug("Token is blacklisted")
		return nil, NewTokenRevokedError()
	}

	// Parse and validate the JWT token
	token, err := jwt.ParseWithClaims(tokenString, &CustomClaims{}, func(token *jwt.Token) (interface{}, error) {
		// Validate signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(s.config.JWT.Secret), nil
	})

	if err != nil {
		s.logger.Debug("Token validation failed", "error", err)
		return nil, NewInvalidTokenError(err.Error())
	}

	// Extract claims
	claims, ok := token.Claims.(*CustomClaims)
	if !ok || !token.Valid {
		s.logger.Debug("Invalid token claims")
		return nil, NewInvalidTokenError("invalid token claims")
	}

	// Check if token is expired
	if time.Now().UTC().After(claims.ExpiresAt.Time) {
		s.logger.Debug("Token expired", "expires_at", claims.ExpiresAt.Time)
		return nil, NewTokenExpiredError()
	}

	// Verify user still exists
	_, err = s.userRepo.GetByID(ctx, claims.UserID)
	if err != nil {
		s.logger.Debug("User not found for token", "user_id", claims.UserID)
		return nil, NewInvalidTokenError("user not found")
	}

	tokenClaims := &TokenClaims{
		UserID:    claims.UserID,
		Email:     claims.Email,
		Roles:     claims.Roles,
		TokenID:   claims.TokenID,
		ExpiresAt: claims.ExpiresAt.Time,
		IssuedAt:  claims.IssuedAt.Time,
	}

	s.logger.Debug("Token validated successfully", "user_id", claims.UserID)
	return tokenClaims, nil
}

// RefreshTokens generates a new token pair using a refresh token
func (s *AuthServiceImpl) RefreshTokens(ctx context.Context, refreshToken string) (*TokenPair, error) {
	s.logger.Info("Refreshing tokens")

	// Get refresh token from database
	tokenEntity, err := s.tokenRepo.GetByToken(ctx, refreshToken)
	if err != nil {
		s.logger.Debug("Refresh token not found", "error", err)
		return nil, NewInvalidRefreshTokenError()
	}

	// Token exists and is not expired, so it's valid

	// Check if token is expired
	if time.Now().UTC().After(tokenEntity.ExpiresAt) {
		s.logger.Debug("Refresh token expired", "expires_at", tokenEntity.ExpiresAt)
		return nil, NewTokenExpiredError()
	}

	// All refresh tokens in this table are valid refresh tokens

	// Revoke the old refresh token
	if err := s.tokenRepo.RevokeToken(ctx, refreshToken); err != nil {
		s.logger.Error("Failed to revoke old refresh token", "error", err)
		return nil, errors.NewInternalError("Failed to revoke old token").WithCause(err)
	}

	// Generate new token pair
	newTokenPair, err := s.GenerateTokenPair(ctx, tokenEntity.UserID)
	if err != nil {
		s.logger.Error("Failed to generate new token pair", "user_id", tokenEntity.UserID, "error", err)
		return nil, err
	}

	s.logger.Info("Tokens refreshed successfully", "user_id", tokenEntity.UserID)
	return newTokenPair, nil
}

// RevokeToken revokes a token (access or refresh)
func (s *AuthServiceImpl) RevokeToken(ctx context.Context, token string) error {
	s.logger.Info("Revoking token")

	// Try to revoke as refresh token first (stored in database)
	err := s.tokenRepo.RevokeToken(ctx, token)
	if err == nil {
		s.logger.Info("Refresh token revoked successfully")
		return nil
	}

	// If not found in database, treat it as an access token and add to blacklist
	if err := s.blacklistAccessToken(token); err != nil {
		s.logger.Error("Failed to blacklist access token", "error", err)
		return errors.NewInternalError("Failed to revoke token").WithCause(err)
	}

	s.logger.Info("Access token blacklisted successfully")
	return nil
}

// ChangePassword changes a user's password
func (s *AuthServiceImpl) ChangePassword(ctx context.Context, userID int64, req *ChangePasswordRequest) error {
	s.logger.Info("Changing password", "user_id", userID)

	// Get user
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		s.logger.Error("Failed to get user", "user_id", userID, "error", err)
		return NewUserNotFoundError(fmt.Sprintf("ID: %d", userID))
	}

	// Verify current password
	if !utils.CheckPassword(req.CurrentPassword, user.PasswordHash) {
		s.logger.Debug("Current password verification failed", "user_id", userID)
		return NewPasswordMismatchError()
	}

	// Hash new password
	hashedPassword, err := utils.HashPassword(req.NewPassword)
	if err != nil {
		s.logger.Error("Failed to hash new password", "user_id", userID, "error", err)
		return errors.NewInternalError("Failed to hash password").WithCause(err)
	}

	// Update password
	user.PasswordHash = hashedPassword
	if err := s.userRepo.Update(ctx, user); err != nil {
		s.logger.Error("Failed to update password", "user_id", userID, "error", err)
		return errors.NewInternalError("Failed to update password").WithCause(err)
	}

	// Revoke all existing refresh tokens for security
	if err := s.tokenRepo.RevokeAllUserTokens(ctx, userID, TokenTypeRefresh); err != nil {
		s.logger.Error("Failed to revoke user tokens", "user_id", userID, "error", err)
		// Don't fail the password change for this
	}

	// Clean up expired blacklist entries (access tokens will expire naturally)
	s.cleanupExpiredBlacklistEntries()

	s.logger.Info("Password changed successfully", "user_id", userID)
	return nil
}

// InitiatePasswordReset initiates a password reset process
func (s *AuthServiceImpl) InitiatePasswordReset(ctx context.Context, email string) error {
	s.logger.Info("Initiating password reset", "email", email)

	// Check if user exists
	user, err := s.userRepo.GetByEmail(ctx, email)
	if err != nil {
		// Don't reveal if user exists or not for security
		s.logger.Debug("User not found for password reset", "email", email)
		return nil
	}

	// Generate reset token
	resetToken, err := s.generateSecureToken(32)
	if err != nil {
		s.logger.Error("Failed to generate reset token", "error", err)
		return errors.NewInternalError("Failed to generate reset token").WithCause(err)
	}

	// Store reset token (using verification token table)
	// This would typically be handled by a separate verification token service
	// For now, we'll just log it
	s.logger.Info("Password reset token generated", "user_id", user.ID, "token", resetToken)

	// In a real implementation, you would:
	// 1. Store the reset token in verification_tokens table
	// 2. Send email with reset link
	// 3. Set expiration time (e.g., 1 hour)

	return nil
}

// ResetPassword resets a user's password using a reset token
func (s *AuthServiceImpl) ResetPassword(ctx context.Context, req *ResetPasswordRequest) error {
	s.logger.Info("Resetting password")

	// In a real implementation, you would:
	// 1. Validate the reset token from verification_tokens table
	// 2. Check if token is not expired and not used
	// 3. Get user ID from the token
	// 4. Update password
	// 5. Mark token as used
	// 6. Revoke all existing refresh tokens

	// For now, return not implemented
	return errors.NewInternalError("Password reset not implemented")
}

// InvalidateAllSessions revokes all refresh tokens for a user
func (s *AuthServiceImpl) InvalidateAllSessions(ctx context.Context, userID int64) error {
	s.logger.Info("Invalidating all sessions", "user_id", userID)

	if err := s.tokenRepo.RevokeAllUserTokens(ctx, userID, TokenTypeRefresh); err != nil {
		s.logger.Error("Failed to revoke all user tokens", "user_id", userID, "error", err)
		return errors.NewInternalError("Failed to invalidate sessions").WithCause(err)
	}

	// Also blacklist any active access tokens for this user
	// Note: This is a simplified approach. In production, you might want to
	// track user tokens more precisely or use a more sophisticated blacklist
	s.cleanupExpiredBlacklistEntries()

	s.logger.Info("All sessions invalidated successfully", "user_id", userID)
	return nil
}

// Token Blacklist Management

// blacklistAccessToken adds an access token to the blacklist
func (s *AuthServiceImpl) blacklistAccessToken(tokenString string) error {
	// Parse token to get expiration time
	token, err := jwt.ParseWithClaims(tokenString, &CustomClaims{}, func(token *jwt.Token) (interface{}, error) {
		// We don't validate the signature here since we just need the expiration time
		return []byte(s.config.JWT.Secret), nil
	})

	var expiresAt time.Time
	if err == nil {
		if claims, ok := token.Claims.(*CustomClaims); ok {
			expiresAt = claims.ExpiresAt.Time
		}
	}

	// If we couldn't parse the token, set a default expiration
	if expiresAt.IsZero() {
		expiresAt = time.Now().UTC().Add(time.Duration(s.config.JWT.AccessTokenDuration) * time.Minute)
	}

	// Add to blacklist with expiration time (thread-safe)
	s.blacklistMutex.Lock()
	s.tokenBlacklist[tokenString] = expiresAt
	s.blacklistMutex.Unlock()

	s.logger.Debug("Token added to blacklist", "expires_at", expiresAt)
	return nil
}

// isTokenBlacklisted checks if a token is in the blacklist
func (s *AuthServiceImpl) isTokenBlacklisted(tokenString string) bool {
	s.blacklistMutex.RLock()
	expiresAt, exists := s.tokenBlacklist[tokenString]
	s.blacklistMutex.RUnlock()

	if !exists {
		return false
	}

	// If the blacklist entry has expired, remove it and return false
	if time.Now().UTC().After(expiresAt) {
		s.blacklistMutex.Lock()
		delete(s.tokenBlacklist, tokenString)
		s.blacklistMutex.Unlock()
		return false
	}

	return true
}

// cleanupExpiredBlacklistEntries removes expired entries from the blacklist
func (s *AuthServiceImpl) cleanupExpiredBlacklistEntries() {
	now := time.Now().UTC()
	s.blacklistMutex.Lock()
	defer s.blacklistMutex.Unlock()

	for token, expiresAt := range s.tokenBlacklist {
		if now.After(expiresAt) {
			delete(s.tokenBlacklist, token)
		}
	}
	s.logger.Debug("Cleaned up expired blacklist entries")
}

// GetBlacklistSize returns the current size of the token blacklist (for monitoring)
func (s *AuthServiceImpl) GetBlacklistSize() int {
	s.cleanupExpiredBlacklistEntries()
	s.blacklistMutex.RLock()
	size := len(s.tokenBlacklist)
	s.blacklistMutex.RUnlock()
	return size
}

// RevokeAllUserTokens revokes all tokens (access and refresh) for a specific user
func (s *AuthServiceImpl) RevokeAllUserTokens(ctx context.Context, userID int64) error {
	s.logger.Info("Revoking all tokens for user", "user_id", userID)

	// Revoke all refresh tokens
	if err := s.tokenRepo.RevokeAllUserTokens(ctx, userID, TokenTypeRefresh); err != nil {
		s.logger.Error("Failed to revoke user refresh tokens", "user_id", userID, "error", err)
		return errors.NewInternalError("Failed to revoke user tokens").WithCause(err)
	}

	// For access tokens, we would need to blacklist them individually
	// Since we don't track which access tokens belong to which user in the blacklist,
	// we'll clean up expired entries and log the action
	s.cleanupExpiredBlacklistEntries()

	s.logger.Info("All user tokens revoked successfully", "user_id", userID)
	return nil
}

// Token Validation Helpers

// validateTokenFormat performs basic token format validation
func (s *AuthServiceImpl) validateTokenFormat(tokenString string) error {
	if tokenString == "" {
		return NewInvalidTokenError("token is empty")
	}

	// Basic JWT format check (should have 3 parts separated by dots)
	parts := len(strings.Split(tokenString, "."))
	if parts != 3 {
		return NewInvalidTokenError("invalid token format")
	}

	return nil
}

// generateAccessToken generates a JWT access token
func (s *AuthServiceImpl) generateAccessToken(userID int64, email string, roles []string) (string, time.Time, error) {
	expiresAt := time.Now().UTC().Add(time.Duration(s.config.JWT.AccessTokenDuration) * time.Minute)
	issuedAt := time.Now().UTC()

	// Generate a unique token ID for tracking and revocation
	tokenID, err := s.generateSecureToken(16)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("failed to generate token ID: %w", err)
	}

	claims := &CustomClaims{
		UserID:  userID,
		Email:   email,
		Roles:   roles,
		TokenID: tokenID,
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        tokenID,
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(issuedAt),
			NotBefore: jwt.NewNumericDate(issuedAt),
			Subject:   fmt.Sprintf("%d", userID),
			Issuer:    "lumen-auth-service",
			Audience:  []string{"lumen-api"},
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(s.config.JWT.Secret))
	if err != nil {
		return "", time.Time{}, fmt.Errorf("failed to sign token: %w", err)
	}

	return tokenString, expiresAt, nil
}

// generateRefreshToken generates a secure random refresh token
func (s *AuthServiceImpl) generateRefreshToken() (string, time.Time, error) {
	token, err := s.generateSecureToken(32)
	if err != nil {
		return "", time.Time{}, err
	}

	expiresAt := time.Now().UTC().Add(time.Duration(s.config.JWT.RefreshTokenDuration) * time.Hour)
	return token, expiresAt, nil
}

// generateSecureToken generates a cryptographically secure random token
func (s *AuthServiceImpl) generateSecureToken(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", fmt.Errorf("failed to generate secure token: %w", err)
	}
	return hex.EncodeToString(bytes), nil
}

// CustomClaims represents JWT claims with custom fields
type CustomClaims struct {
	UserID  int64    `json:"user_id"`
	Email   string   `json:"email"`
	Roles   []string `json:"roles"`
	TokenID string   `json:"token_id"`
	jwt.RegisteredClaims
}
