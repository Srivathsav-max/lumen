package services

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"time"

	"github.com/Srivathsav-max/lumen/backend/internal/errors"
	"github.com/Srivathsav-max/lumen/backend/internal/repository"
)

type TokenType string

const (
	TokenTypeEmailVerification TokenType = "email_verification"
	TokenTypePasswordReset     TokenType = "password_reset"
	TokenTypePasswordChange    TokenType = "password_change"
)

type VerificationTokenService interface {
	GenerateToken(ctx context.Context, userID int64, tokenType TokenType, expiresInHours int) (string, error)
	ValidateToken(ctx context.Context, token string, tokenType TokenType) (*VerificationTokenData, error)
	MarkTokenAsUsed(ctx context.Context, tokenID int64) error
	DeleteExpiredTokens(ctx context.Context) error
	DeleteUserTokensByType(ctx context.Context, userID int64, tokenType TokenType) error
}

type VerificationTokenData struct {
	ID        int64      `json:"id"`
	UserID    int64      `json:"user_id"`
	Token     string     `json:"token"`
	Type      TokenType  `json:"type"`
	ExpiresAt time.Time  `json:"expires_at"`
	CreatedAt time.Time  `json:"created_at"`
	UsedAt    *time.Time `json:"used_at,omitempty"`
}

type VerificationTokenServiceImpl struct {
	repo repository.VerificationTokenRepository
}

func NewVerificationTokenService(repo repository.VerificationTokenRepository) VerificationTokenService {
	return &VerificationTokenServiceImpl{
		repo: repo,
	}
}

func (s *VerificationTokenServiceImpl) GenerateToken(ctx context.Context, userID int64, tokenType TokenType, expiresInHours int) (string, error) {
	err := s.repo.DeleteUserTokensByType(ctx, userID, string(tokenType))
	if err != nil {
		return "", errors.NewDatabaseError("failed to delete existing tokens", err)
	}

	tokenBytes := make([]byte, 32)
	_, err = rand.Read(tokenBytes)
	if err != nil {
		return "", errors.NewInternalError("failed to generate random token").WithCause(err)
	}
	tokenString := base64.URLEncoding.EncodeToString(tokenBytes)

	tokenData := &VerificationTokenData{
		UserID:    userID,
		Token:     tokenString,
		Type:      tokenType,
		ExpiresAt: time.Now().Add(time.Duration(expiresInHours) * time.Hour),
		CreatedAt: time.Now(),
	}

	err = s.repo.Create(ctx, tokenData)
	if err != nil {
		return "", errors.NewDatabaseError("failed to create verification token", err)
	}

	return tokenString, nil
}

func (s *VerificationTokenServiceImpl) ValidateToken(ctx context.Context, token string, tokenType TokenType) (*VerificationTokenData, error) {
	tokenDataInterface, err := s.repo.GetByToken(ctx, token, string(tokenType))
	if err != nil {
		return nil, errors.NewDatabaseError("failed to retrieve token", err)
	}

	if tokenDataInterface == nil {
		return nil, errors.NewNotFoundError("verification token")
	}

	tokenData, ok := tokenDataInterface.(*repository.VerificationToken)
	if !ok {
		return nil, errors.NewInternalError("invalid token data type")
	}

	if time.Now().After(tokenData.ExpiresAt) {
		return nil, errors.NewValidationError("token has expired", "")
	}

	if tokenData.IsUsed {
		return nil, errors.NewValidationError("token has already been used", "")
	}

	result := &VerificationTokenData{
		ID:        tokenData.ID,
		UserID:    tokenData.UserID,
		Token:     tokenData.Token,
		Type:      TokenType(tokenData.TokenType),
		ExpiresAt: tokenData.ExpiresAt,
		CreatedAt: tokenData.CreatedAt,
	}

	return result, nil
}

func (s *VerificationTokenServiceImpl) MarkTokenAsUsed(ctx context.Context, tokenID int64) error {
	err := s.repo.MarkAsUsed(ctx, tokenID)
	if err != nil {
		return errors.NewDatabaseError("failed to mark token as used", err)
	}
	return nil
}

func (s *VerificationTokenServiceImpl) DeleteExpiredTokens(ctx context.Context) error {
	err := s.repo.DeleteExpiredTokens(ctx)
	if err != nil {
		return errors.NewDatabaseError("failed to delete expired tokens", err)
	}
	return nil
}

func (s *VerificationTokenServiceImpl) DeleteUserTokensByType(ctx context.Context, userID int64, tokenType TokenType) error {
	err := s.repo.DeleteUserTokensByType(ctx, userID, string(tokenType))
	if err != nil {
		return errors.NewDatabaseError("failed to delete user tokens", err)
	}
	return nil
}
