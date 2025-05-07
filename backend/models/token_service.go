package models

import (
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v4"
)

// TokenService handles token generation and validation
type TokenService struct {
	TokenRepository *TokenRepository
	JWTSecret       string
	// Expiration times
	PermanentTokenExpiry time.Duration // e.g., 30 days
	TemporaryTokenExpiry time.Duration // e.g., 15 minutes
}

// NewTokenService creates a new token service
func NewTokenService(tokenRepo *TokenRepository, jwtSecret string) *TokenService {
	return &TokenService{
		TokenRepository:      tokenRepo,
		JWTSecret:            jwtSecret,
		PermanentTokenExpiry: 30 * 24 * time.Hour, // 30 days
		TemporaryTokenExpiry: 15 * time.Minute,    // 15 minutes
	}
}

// GenerateTokenPair generates a permanent and temporary token pair
func (s *TokenService) GenerateTokenPair(userID int, deviceInfo *string) (*TokenPair, error) {
	// Generate random permanent token
	permanentToken, err := s.generateRandomToken(32)
	if err != nil {
		return nil, fmt.Errorf("failed to generate permanent token: %w", err)
	}

	// Store permanent token in database
	_, err = s.TokenRepository.CreateToken(userID, permanentToken, deviceInfo)
	if err != nil {
		return nil, fmt.Errorf("failed to store permanent token: %w", err)
	}

	// Generate temporary JWT token
	tempToken, expiresAt, err := s.generateTemporaryToken(userID, permanentToken)
	if err != nil {
		return nil, fmt.Errorf("failed to generate temporary token: %w", err)
	}

	return &TokenPair{
		PermanentToken: permanentToken,
		TemporaryToken: tempToken,
		ExpiresAt:      expiresAt,
	}, nil
}

// ValidateTemporaryToken validates a temporary token and returns the user ID if valid
func (s *TokenService) ValidateTemporaryToken(tokenString string) (int, error) {
	// Parse the JWT token
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		// Validate the signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(s.JWTSecret), nil
	})

	if err != nil {
		return 0, fmt.Errorf("failed to parse token: %w", err)
	}

	// Check if the token is valid
	if !token.Valid {
		return 0, errors.New("invalid token")
	}

	// Extract claims
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return 0, errors.New("invalid token claims")
	}

	// Check token type
	tokenType, ok := claims["token_type"].(string)
	if !ok || tokenType != "temporary" {
		return 0, errors.New("invalid token type")
	}

	// Extract user ID and permanent token
	userID, ok := claims["user_id"].(float64)
	if !ok {
		return 0, errors.New("invalid user ID in token")
	}

	permanentToken, ok := claims["permanent_token"].(string)
	if !ok {
		return 0, errors.New("invalid permanent token reference")
	}

	// Verify permanent token exists and is active
	dbToken, err := s.TokenRepository.GetTokenByValue(permanentToken)
	if err != nil {
		return 0, fmt.Errorf("failed to verify permanent token: %w", err)
	}

	if dbToken == nil || !dbToken.IsActive {
		return 0, errors.New("permanent token not found or inactive")
	}

	// Check that the user ID matches
	if int(userID) != dbToken.UserID {
		return 0, errors.New("user ID mismatch")
	}

	// Update last used timestamp
	err = s.TokenRepository.UpdateLastUsed(dbToken.ID)
	if err != nil {
		// Log this error but don't fail the validation
		fmt.Printf("Failed to update last used timestamp: %v\n", err)
	}

	return int(userID), nil
}

// RefreshTemporaryToken generates a new temporary token if the permanent token is valid
func (s *TokenService) RefreshTemporaryToken(permanentToken string) (string, int64, error) {
	// Verify permanent token exists and is active
	dbToken, err := s.TokenRepository.GetTokenByValue(permanentToken)
	if err != nil {
		return "", 0, fmt.Errorf("failed to verify permanent token: %w", err)
	}

	if dbToken == nil || !dbToken.IsActive {
		return "", 0, errors.New("permanent token not found or inactive")
	}

	// Generate new temporary token
	tempToken, expiresAt, err := s.generateTemporaryToken(dbToken.UserID, permanentToken)
	if err != nil {
		return "", 0, fmt.Errorf("failed to generate temporary token: %w", err)
	}

	// Update last used timestamp
	err = s.TokenRepository.UpdateLastUsed(dbToken.ID)
	if err != nil {
		// Log this error but don't fail the refresh
		fmt.Printf("Failed to update last used timestamp: %v\n", err)
	}

	return tempToken, expiresAt, nil
}

// RevokeToken revokes a specific token
func (s *TokenService) RevokeToken(permanentToken string) error {
	dbToken, err := s.TokenRepository.GetTokenByValue(permanentToken)
	if err != nil {
		return fmt.Errorf("failed to find token: %w", err)
	}

	if dbToken == nil {
		return errors.New("token not found")
	}

	return s.TokenRepository.DeactivateToken(dbToken.ID)
}

// RevokeAllUserTokens revokes all tokens for a user
func (s *TokenService) RevokeAllUserTokens(userID int) error {
	return s.TokenRepository.DeactivateAllUserTokens(userID)
}

// CleanupExpiredTokens removes tokens that haven't been used in a long time
func (s *TokenService) CleanupExpiredTokens() (int64, error) {
	cutoffTime := time.Now().Add(-s.PermanentTokenExpiry)
	return s.TokenRepository.CleanupOldTokens(cutoffTime)
}

// generateRandomToken generates a random token of the specified length
func (s *TokenService) generateRandomToken(length int) (string, error) {
	b := make([]byte, length)
	_, err := rand.Read(b)
	if err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(b), nil
}

// generateTemporaryToken generates a temporary JWT token
func (s *TokenService) generateTemporaryToken(userID int, permanentToken string) (string, int64, error) {
	expirationTime := time.Now().Add(s.TemporaryTokenExpiry)
	expiresAt := expirationTime.Unix()

	claims := jwt.MapClaims{
		"user_id":         userID,
		"permanent_token": permanentToken,
		"token_type":      "temporary",
		"exp":             expiresAt,
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(s.JWTSecret))
	if err != nil {
		return "", 0, err
	}

	return tokenString, expiresAt, nil
}
