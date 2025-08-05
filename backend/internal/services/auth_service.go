package services

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/Srivathsav-max/lumen/backend/internal/config"
	"github.com/Srivathsav-max/lumen/backend/internal/errors"
	"github.com/Srivathsav-max/lumen/backend/internal/repository"
	"github.com/Srivathsav-max/lumen/backend/utils"
	"github.com/golang-jwt/jwt/v4"
)

const (
	TokenTypeAccess  = "access"
	TokenTypeRefresh = "refresh"
)

type AuthServiceImpl struct {
	config    *config.Config
	userRepo  repository.UserRepository
	tokenRepo repository.TokenRepository
	roleRepo  repository.RoleRepository
	logger    *slog.Logger
}

func NewAuthService(
	config *config.Config,
	userRepo repository.UserRepository,
	tokenRepo repository.TokenRepository,
	roleRepo repository.RoleRepository,
	logger *slog.Logger,
) AuthService {
	return &AuthServiceImpl{
		config:    config,
		userRepo:  userRepo,
		tokenRepo: tokenRepo,
		roleRepo:  roleRepo,
		logger:    logger,
	}
}

func (s *AuthServiceImpl) GenerateTokenPair(ctx context.Context, userID int64) (*TokenPair, error) {
	s.logger.Info("Generating token pair", "user_id", userID)

	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		s.logger.Error("Failed to get user for token generation", "user_id", userID, "error", err)
		return nil, NewUserNotFoundError(fmt.Sprintf("ID: %d", userID))
	}

	roles, err := s.roleRepo.GetUserRoles(ctx, userID)
	if err != nil {
		s.logger.Error("Failed to get user roles", "user_id", userID, "error", err)
		return nil, errors.NewInternalError("Failed to get user roles").WithCause(err)
	}

	roleNames := make([]string, len(roles))
	for i, role := range roles {
		roleNames[i] = role.Name
	}

	accessToken, _, err := s.generateAccessToken(userID, user.Email, roleNames)
	if err != nil {
		s.logger.Error("Failed to generate access token", "user_id", userID, "error", err)
		return nil, errors.NewInternalError("Failed to generate access token").WithCause(err)
	}

	refreshToken, refreshExpiresAt, err := s.generateRefreshToken()
	if err != nil {
		s.logger.Error("Failed to generate refresh token", "user_id", userID, "error", err)
		return nil, errors.NewInternalError("Failed to generate refresh token").WithCause(err)
	}

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
		ExpiresIn:    int64(s.config.JWT.AccessTokenDuration * 60),
		TokenType:    "Bearer",
		IssuedAt:     time.Now().UTC(),
	}

	s.logger.Info("Token pair generated successfully", "user_id", userID)
	return tokenPair, nil
}

func (s *AuthServiceImpl) ValidateAccessToken(ctx context.Context, tokenString string) (*TokenClaims, error) {
	s.logger.Debug("Validating access token")

	if err := s.validateTokenFormat(tokenString); err != nil {
		return nil, err
	}

	token, err := jwt.ParseWithClaims(tokenString, &CustomClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(s.config.JWT.Secret), nil
	})

	if err != nil {
		s.logger.Debug("Token validation failed", "error", err)
		return nil, NewInvalidTokenError(err.Error())
	}

	claims, ok := token.Claims.(*CustomClaims)
	if !ok || !token.Valid {
		s.logger.Debug("Invalid token claims")
		return nil, NewInvalidTokenError("invalid token claims")
	}

	if time.Now().UTC().After(claims.ExpiresAt.Time) {
		s.logger.Debug("Token expired", "expires_at", claims.ExpiresAt.Time)
		return nil, NewTokenExpiredError()
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

func (s *AuthServiceImpl) RefreshTokens(ctx context.Context, refreshToken string) (*TokenPair, error) {
	s.logger.Info("Refreshing tokens")

	tokenEntity, err := s.tokenRepo.GetByToken(ctx, refreshToken)
	if err != nil {
		s.logger.Debug("Refresh token not found", "error", err)
		return nil, NewInvalidRefreshTokenError()
	}

	if time.Now().UTC().After(tokenEntity.ExpiresAt) {
		s.logger.Debug("Refresh token expired", "expires_at", tokenEntity.ExpiresAt)
		s.tokenRepo.RevokeToken(ctx, refreshToken)
		return nil, NewTokenExpiredError()
	}

	if err := s.tokenRepo.RevokeToken(ctx, refreshToken); err != nil {
		s.logger.Error("Failed to revoke old refresh token", "error", err)
		return nil, errors.NewInternalError("Failed to revoke old token").WithCause(err)
	}

	newTokenPair, err := s.GenerateTokenPair(ctx, tokenEntity.UserID)
	if err != nil {
		s.logger.Error("Failed to generate new token pair", "user_id", tokenEntity.UserID, "error", err)
		return nil, err
	}

	s.logger.Info("Tokens refreshed successfully", "user_id", tokenEntity.UserID)
	return newTokenPair, nil
}

func (s *AuthServiceImpl) RevokeToken(ctx context.Context, token string) error {
	s.logger.Info("Revoking refresh token")

	err := s.tokenRepo.RevokeToken(ctx, token)
	if err != nil {
		s.logger.Error("Failed to revoke refresh token", "error", err)
		return errors.NewInternalError("Failed to revoke token").WithCause(err)
	}

	s.logger.Info("Refresh token revoked successfully")
	return nil
}

func (s *AuthServiceImpl) ChangePassword(ctx context.Context, userID int64, req *ChangePasswordRequest) error {
	s.logger.Info("Changing password", "user_id", userID)

	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		s.logger.Error("Failed to get user", "user_id", userID, "error", err)
		return NewUserNotFoundError(fmt.Sprintf("ID: %d", userID))
	}

	if !utils.CheckPassword(req.CurrentPassword, user.PasswordHash) {
		s.logger.Debug("Current password verification failed", "user_id", userID)
		return NewPasswordMismatchError()
	}

	hashedPassword, err := utils.HashPassword(req.NewPassword)
	if err != nil {
		s.logger.Error("Failed to hash new password", "user_id", userID, "error", err)
		return errors.NewInternalError("Failed to hash password").WithCause(err)
	}

	user.PasswordHash = hashedPassword
	if err := s.userRepo.Update(ctx, user); err != nil {
		s.logger.Error("Failed to update password", "user_id", userID, "error", err)
		return errors.NewInternalError("Failed to update password").WithCause(err)
	}

	if err := s.tokenRepo.RevokeAllUserTokens(ctx, userID, TokenTypeRefresh); err != nil {
		s.logger.Error("Failed to revoke user tokens", "user_id", userID, "error", err)
	}

	s.logger.Info("Password changed successfully", "user_id", userID)
	return nil
}

func (s *AuthServiceImpl) InitiatePasswordReset(ctx context.Context, email string) error {
	s.logger.Info("Initiating password reset", "email", email)

	user, err := s.userRepo.GetByEmail(ctx, email)
	if err != nil {
		s.logger.Debug("User not found for password reset", "email", email)
		return nil
	}

	resetToken, err := s.generateSecureToken(32)
	if err != nil {
		s.logger.Error("Failed to generate reset token", "error", err)
		return errors.NewInternalError("Failed to generate reset token").WithCause(err)
	}

	s.logger.Info("Password reset token generated", "user_id", user.ID, "token", resetToken)

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

	// Access tokens will expire naturally (short-lived)

	s.logger.Info("All sessions invalidated successfully", "user_id", userID)
	return nil
}

func (s *AuthServiceImpl) RevokeAllUserTokens(ctx context.Context, userID int64) error {
	s.logger.Info("Revoking all tokens for user", "user_id", userID)

	if err := s.tokenRepo.RevokeAllUserTokens(ctx, userID, TokenTypeRefresh); err != nil {
		s.logger.Error("Failed to revoke user refresh tokens", "user_id", userID, "error", err)
		return errors.NewInternalError("Failed to revoke user tokens").WithCause(err)
	}

	s.logger.Info("All user tokens revoked successfully", "user_id", userID)
	return nil
}

func (s *AuthServiceImpl) validateTokenFormat(tokenString string) error {
	if tokenString == "" {
		return NewInvalidTokenError("token is empty")
	}

	parts := len(strings.Split(tokenString, "."))
	if parts != 3 {
		return NewInvalidTokenError("invalid token format")
	}

	return nil
}

func (s *AuthServiceImpl) generateAccessToken(userID int64, email string, roles []string) (string, time.Time, error) {
	expiresAt := time.Now().UTC().Add(time.Duration(s.config.JWT.AccessTokenDuration) * time.Minute)
	issuedAt := time.Now().UTC()

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

func (s *AuthServiceImpl) generateRefreshToken() (string, time.Time, error) {
	token, err := s.generateSecureToken(32)
	if err != nil {
		return "", time.Time{}, err
	}

	expiresAt := time.Now().UTC().Add(time.Duration(s.config.JWT.RefreshTokenDuration) * time.Hour)
	return token, expiresAt, nil
}

func (s *AuthServiceImpl) generateSecureToken(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", fmt.Errorf("failed to generate secure token: %w", err)
	}
	return hex.EncodeToString(bytes), nil
}

type CustomClaims struct {
	UserID  int64    `json:"user_id"`
	Email   string   `json:"email"`
	Roles   []string `json:"roles"`
	TokenID string   `json:"token_id"`
	jwt.RegisteredClaims
}
