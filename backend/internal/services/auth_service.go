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
	"github.com/Srivathsav-max/lumen/backend/internal/constants"
	"github.com/Srivathsav-max/lumen/backend/internal/errors"
	"github.com/Srivathsav-max/lumen/backend/internal/repository"
	"github.com/Srivathsav-max/lumen/backend/internal/security"
	"github.com/Srivathsav-max/lumen/backend/utils"
	"github.com/golang-jwt/jwt/v4"
)

const (
	TokenTypeAccess  = "access"
	TokenTypeRefresh = "refresh"
)

type AuthServiceImpl struct {
	config               *config.Config
	userRepo             repository.UserRepository
	tokenRepo            repository.TokenRepository
	roleRepo             repository.RoleRepository
	verificationTokenSvc VerificationTokenService
	emailService         EmailService
	logger               *slog.Logger
}

func NewAuthService(
	config *config.Config,
	userRepo repository.UserRepository,
	tokenRepo repository.TokenRepository,
	roleRepo repository.RoleRepository,
	verificationTokenSvc VerificationTokenService,
	emailService EmailService,
	logger *slog.Logger,
) AuthService {
	return &AuthServiceImpl{
		config:               config,
		userRepo:             userRepo,
		tokenRepo:            tokenRepo,
		roleRepo:             roleRepo,
		verificationTokenSvc: verificationTokenSvc,
		emailService:         emailService,
		logger:               logger,
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
		ExpiresIn:    int64(s.config.JWT.AccessTokenDuration * 60),           // Convert minutes to seconds
		TokenType:    constants.BearerPrefix[:len(constants.BearerPrefix)-1], // Remove trailing space
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

	token, err := jwt.ParseWithClaims(tokenString, &security.SecureJWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(s.config.JWT.Secret), nil
	})

	if err != nil {
		s.logger.Debug("Token validation failed", "error", err)
		return nil, NewInvalidTokenError(err.Error())
	}

	claims, ok := token.Claims.(*security.SecureJWTClaims)
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

	go func() {
		ctx := context.Background()
		if err := s.emailService.SendPasswordChangeNotification(ctx, userID, user.Email); err != nil {
			s.logger.Error("Failed to send password change notification",
				"user_id", userID, "email", user.Email, "error", err)
		} else {
			s.logger.Info("Password change notification sent", "user_id", userID, "email", user.Email)
		}
	}()

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

	resetToken, err := s.verificationTokenSvc.GenerateToken(ctx, user.ID, TokenTypePasswordReset, 1)
	if err != nil {
		s.logger.Error("Failed to generate reset token", "error", err, "user_id", user.ID)
		return errors.NewInternalError("Failed to generate reset token").WithCause(err)
	}

	// Send password reset email
	err = s.emailService.SendPasswordResetEmail(ctx, user.ID, email, resetToken)
	if err != nil {
		s.logger.Error("Failed to send password reset email", "error", err, "user_id", user.ID, "email", email)
		// Don't fail the request if email fails - user might retry
		// But log it for monitoring
		return nil
	}

	s.logger.Info("Password reset email sent successfully", "user_id", user.ID, "email", email)
	return nil
}

// ResetPassword resets a user's password using a reset token
func (s *AuthServiceImpl) ResetPassword(ctx context.Context, req *ResetPasswordRequest) error {
	s.logger.Info("Resetting password")

	// Validate input
	if req.Token == "" {
		return errors.NewValidationError("Reset token is required", "")
	}

	if req.NewPassword == "" {
		return errors.NewValidationError("New password is required", "")
	}

	// Validate password strength
	if len(req.NewPassword) < constants.MinPasswordLength {
		return errors.NewValidationError("Password too short",
			fmt.Sprintf("Password must be at least %d characters", constants.MinPasswordLength))
	}

	// Validate the reset token
	tokenData, err := s.verificationTokenSvc.ValidateToken(ctx, req.Token, TokenTypePasswordReset)
	if err != nil {
		s.logger.Debug("Invalid password reset token", "error", err)
		return errors.NewValidationError("Invalid or expired reset token", "")
	}

	// Get user
	user, err := s.userRepo.GetByID(ctx, tokenData.UserID)
	if err != nil {
		s.logger.Error("Failed to get user for password reset", "user_id", tokenData.UserID, "error", err)
		return NewUserNotFoundError(fmt.Sprintf("ID: %d", tokenData.UserID))
	}

	// Hash new password
	hashedPassword, err := utils.HashPassword(req.NewPassword)
	if err != nil {
		s.logger.Error("Failed to hash new password", "user_id", tokenData.UserID, "error", err)
		return errors.NewInternalError("Failed to hash password").WithCause(err)
	}

	// Update user password
	user.PasswordHash = hashedPassword
	if err := s.userRepo.Update(ctx, user); err != nil {
		s.logger.Error("Failed to update password", "user_id", tokenData.UserID, "error", err)
		return errors.NewInternalError("Failed to update password").WithCause(err)
	}

	// Mark token as used
	if err := s.verificationTokenSvc.MarkTokenAsUsed(ctx, tokenData.ID); err != nil {
		s.logger.Error("Failed to mark reset token as used", "token_id", tokenData.ID, "error", err)
		// Don't fail the request since password was already updated
	}

	// Revoke all existing refresh tokens for security
	if err := s.tokenRepo.RevokeAllUserTokens(ctx, tokenData.UserID, TokenTypeRefresh); err != nil {
		s.logger.Error("Failed to revoke user tokens after password reset", "user_id", tokenData.UserID, "error", err)
		// Don't fail the request since password was already updated
	}

	// Send password change notification email (async to not block the request)
	go func() {
		ctx := context.Background() // Use a new context for background operation
		if err := s.emailService.SendPasswordChangeNotification(ctx, tokenData.UserID, user.Email); err != nil {
			s.logger.Error("Failed to send password reset notification",
				"user_id", tokenData.UserID, "email", user.Email, "error", err)
		} else {
			s.logger.Info("Password reset notification sent", "user_id", tokenData.UserID, "email", user.Email)
		}
	}()

	s.logger.Info("Password reset completed successfully", "user_id", tokenData.UserID)
	return nil
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

	sessionID := fmt.Sprintf("session_%d_%d", userID, time.Now().Unix())

	claims := &security.SecureJWTClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        tokenID,
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(issuedAt),
			NotBefore: jwt.NewNumericDate(issuedAt),
			Subject:   fmt.Sprintf("%d", userID),
			Issuer:    "lumen-backend",
			Audience:  []string{"lumen-frontend"},
		},
		UserID:      userID,
		Email:       email,
		Roles:       roles,
		TokenID:     tokenID,
		TokenType:   TokenTypeAccess,
		SessionID:   sessionID,
		DeviceID:    "",
		LoginTime:   time.Now().Unix(),
		Permissions: []string{},
		Scopes:      []string{},
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

// CustomClaims is removed - we now use security.SecureJWTClaims for consistency
