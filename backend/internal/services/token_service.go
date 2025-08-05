package services

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v4"
	"github.com/Srivathsav-max/lumen/backend/internal/config"
	"github.com/Srivathsav-max/lumen/backend/internal/errors"
	"github.com/Srivathsav-max/lumen/backend/internal/repository"
)

// TokenService implements token management operations
type TokenService struct {
	tokenRepo repository.TokenRepository
	config    *config.Config
}

// NewTokenService creates a new token service
func NewTokenService(tokenRepo repository.TokenRepository, cfg *config.Config) *TokenService {
	return &TokenService{
		tokenRepo: tokenRepo,
		config:    cfg,
	}
}

// GenerateTokenPair generates access and refresh tokens
func (s *TokenService) GenerateTokenPair(ctx context.Context, userID int64) (*TokenPair, error) {
	// Generate access token
	accessToken, err := s.generateAccessToken(userID)
	if err != nil {
		return nil, errors.NewInternalError("failed to generate access token").WithCause(err)
	}

	// Generate refresh token
	refreshToken, err := s.generateRefreshToken()
	if err != nil {
		return nil, errors.NewInternalError("failed to generate refresh token").WithCause(err)
	}

	// Store refresh token in database
	expiresAt := time.Now().Add(time.Duration(s.config.JWT.RefreshTokenDuration) * time.Hour)
	err = s.tokenRepo.StoreRefreshToken(ctx, userID, refreshToken, expiresAt)
	if err != nil {
		return nil, errors.NewDatabaseError("failed to store refresh token", err)
	}

	return &TokenPair{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    int64(s.config.JWT.AccessTokenDuration * 60), // convert minutes to seconds
		TokenType:    "Bearer",
		IssuedAt:     time.Now(),
	}, nil
}

// ValidateAccessToken validates an access token and returns claims
func (s *TokenService) ValidateAccessToken(ctx context.Context, tokenString string) (*TokenClaims, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(s.config.JWT.Secret), nil
	})

	if err != nil {
		return nil, errors.NewValidationError("invalid token format", "").WithCause(err)
	}

	if !token.Valid {
		return nil, errors.NewValidationError("token is not valid", "")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, errors.NewValidationError("invalid token claims", "")
	}

	// Extract claims
	userID, ok := claims["user_id"].(float64)
	if !ok {
		return nil, errors.NewValidationError("invalid user ID in token", "")
	}

	email, ok := claims["email"].(string)
	if !ok {
		return nil, errors.NewValidationError("invalid email in token", "")
	}

	tokenID, ok := claims["jti"].(string)
	if !ok {
		return nil, errors.NewValidationError("invalid token ID", "")
	}

	// Extract roles
	rolesInterface, ok := claims["roles"].([]interface{})
	if !ok {
		return nil, errors.NewValidationError("invalid roles in token", "")
	}

	roles := make([]string, len(rolesInterface))
	for i, role := range rolesInterface {
		roles[i] = role.(string)
	}

	// Extract expiration
	exp, ok := claims["exp"].(float64)
	if !ok {
		return nil, errors.NewValidationError("invalid expiration in token", "")
	}

	// Extract issued at
	iat, ok := claims["iat"].(float64)
	if !ok {
		return nil, errors.NewValidationError("invalid issued at in token", "")
	}

	return &TokenClaims{
		UserID:    int64(userID),
		Email:     email,
		Roles:     roles,
		TokenID:   tokenID,
		ExpiresAt: time.Unix(int64(exp), 0),
		IssuedAt:  time.Unix(int64(iat), 0),
	}, nil
}

// RefreshTokens generates new tokens using a refresh token
func (s *TokenService) RefreshTokens(ctx context.Context, refreshToken string) (*TokenPair, error) {
	// Validate refresh token
	userID, err := s.tokenRepo.ValidateRefreshToken(ctx, refreshToken)
	if err != nil {
		return nil, errors.NewValidationError("invalid refresh token", "").WithCause(err)
	}

	// Revoke old refresh token
	err = s.tokenRepo.RevokeRefreshToken(ctx, refreshToken)
	if err != nil {
		return nil, errors.NewDatabaseError("failed to revoke old refresh token", err)
	}

	// Generate new token pair
	return s.GenerateTokenPair(ctx, userID)
}

// RevokeToken revokes a refresh token
func (s *TokenService) RevokeToken(ctx context.Context, token string) error {
	err := s.tokenRepo.RevokeRefreshToken(ctx, token)
	if err != nil {
		return errors.NewDatabaseError("failed to revoke token", err)
	}
	return nil
}

// generateAccessToken creates a JWT access token
func (s *TokenService) generateAccessToken(userID int64) (string, error) {
	now := time.Now()
	expiresAt := now.Add(time.Duration(s.config.JWT.AccessTokenDuration) * time.Minute)

	// Generate unique token ID
	tokenID, err := s.generateRandomString(16)
	if err != nil {
		return "", err
	}

	claims := jwt.MapClaims{
		"user_id": userID,
		"jti":     tokenID,
		"iat":     now.Unix(),
		"exp":     expiresAt.Unix(),
		"iss":     "lumen-api",
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.config.JWT.Secret))
}

// generateRefreshToken creates a random refresh token
func (s *TokenService) generateRefreshToken() (string, error) {
	return s.generateRandomString(32)
}

// generateRandomString generates a random base64 string
func (s *TokenService) generateRandomString(length int) (string, error) {
	bytes := make([]byte, length)
	_, err := rand.Read(bytes)
	if err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(bytes), nil
}