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

// GetOrCreateTokenPair gets an existing token or creates a new one if needed
// First tries to use an active token, then tries to reactivate an inactive token,
// and only generates a new permanent token if no suitable token exists within the expiry period
func (s *TokenService) GetOrCreateTokenPair(userID int, deviceInfo *string) (*TokenPair, error) {
	// Define the cutoff time for token validity (30 days ago)
	thirtyDaysAgo := time.Now().Add(-s.PermanentTokenExpiry)

	// Step 1: Check for existing active tokens for this user
	existingActiveTokens, err := s.TokenRepository.GetActiveTokensByUserID(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to check existing active tokens: %w", err)
	}

	// Look for an active token that's less than 30 days old
	var validToken *UserToken
	for i, token := range existingActiveTokens {
		// If the token is less than 30 days old, use it
		if token.CreatedAt.After(thirtyDaysAgo) {
			validToken = &existingActiveTokens[i]
			break
		}
	}

	// If we found a valid active token, use it
	if validToken != nil {
		// Update last used timestamp
		err = s.TokenRepository.UpdateLastUsed(validToken.ID)
		if err != nil {
			return nil, fmt.Errorf("failed to update token last used: %w", err)
		}

		// Generate temporary JWT token using the existing permanent token
		tempToken, expiresAt, err := s.generateTemporaryToken(userID, validToken.PermanentToken)
		if err != nil {
			return nil, fmt.Errorf("failed to generate temporary token: %w", err)
		}

		return &TokenPair{
			PermanentToken: validToken.PermanentToken,
			TemporaryToken: tempToken,
			ExpiresAt:      expiresAt,
		}, nil
	}

	// Step 2: No active token found, check for recent inactive tokens
	recentTokens, err := s.TokenRepository.GetRecentTokensByUserID(userID, s.PermanentTokenExpiry)
	if err != nil {
		return nil, fmt.Errorf("failed to check recent tokens: %w", err)
	}

	// Look for an inactive token that's less than 30 days old
	var recentInactiveToken *UserToken
	for i, token := range recentTokens {
		// If the token is inactive and less than 30 days old, use it
		if !token.IsActive && token.CreatedAt.After(thirtyDaysAgo) {
			recentInactiveToken = &recentTokens[i]
			break
		}
	}

	// If we found a recent inactive token, reactivate it and use it
	if recentInactiveToken != nil {
		// Reactivate the token
		err = s.TokenRepository.ReactivateToken(recentInactiveToken.ID)
		if err != nil {
			return nil, fmt.Errorf("failed to reactivate token: %w", err)
		}

		// Generate temporary JWT token using the reactivated permanent token
		tempToken, expiresAt, err := s.generateTemporaryToken(userID, recentInactiveToken.PermanentToken)
		if err != nil {
			return nil, fmt.Errorf("failed to generate temporary token: %w", err)
		}

		return &TokenPair{
			PermanentToken: recentInactiveToken.PermanentToken,
			TemporaryToken: tempToken,
			ExpiresAt:      expiresAt,
		}, nil
	}

	// Step 3: No suitable token found, generate a new one
	return s.GenerateTokenPair(userID, deviceInfo)
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
