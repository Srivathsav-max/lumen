package models

import (
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"errors"
	"fmt"
	"time"
)

// TokenType defines the purpose of a verification token
type TokenType string

const (
	// TokenTypeEmailVerification for verifying email addresses
	TokenTypeEmailVerification TokenType = "email_verification"
	// TokenTypePasswordReset for resetting passwords
	TokenTypePasswordReset TokenType = "password_reset"
	// TokenTypePasswordChange for changing passwords with OTP verification
	TokenTypePasswordChange TokenType = "password_change"
)

// VerificationToken represents a token used for email verification or password reset
type VerificationToken struct {
	ID        int64     `json:"id"`
	UserID    int64     `json:"user_id"`
	Token     string    `json:"token"`
	Type      TokenType `json:"type"`
	ExpiresAt time.Time `json:"expires_at"`
	CreatedAt time.Time `json:"created_at"`
	UsedAt    *time.Time `json:"used_at,omitempty"`
}

// VerificationTokenRepository defines the interface for token operations
type VerificationTokenRepository interface {
	Create(token *VerificationToken) error
	GetByToken(token string, tokenType TokenType) (*VerificationToken, error)
	MarkAsUsed(tokenID int64) error
	DeleteExpiredTokens() error
	DeleteUserTokensByType(userID int64, tokenType TokenType) error
}

// PostgresVerificationTokenRepository implements VerificationTokenRepository
type PostgresVerificationTokenRepository struct {
	db *sql.DB
}

// NewVerificationTokenRepository creates a new verification token repository
func NewVerificationTokenRepository(db *sql.DB) VerificationTokenRepository {
	return &PostgresVerificationTokenRepository{
		db: db,
	}
}

// Create adds a new verification token to the database
func (r *PostgresVerificationTokenRepository) Create(token *VerificationToken) error {
	query := `
		INSERT INTO verification_tokens (user_id, token, type, expires_at, created_at)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id
	`

	err := r.db.QueryRow(
		query,
		token.UserID,
		token.Token,
		token.Type,
		token.ExpiresAt,
		time.Now(),
	).Scan(&token.ID)

	if err != nil {
		return fmt.Errorf("error creating verification token: %w", err)
	}

	return nil
}

// GetByToken retrieves a token by its value and type
func (r *PostgresVerificationTokenRepository) GetByToken(token string, tokenType TokenType) (*VerificationToken, error) {
	query := `
		SELECT id, user_id, token, type, expires_at, created_at, used_at
		FROM verification_tokens
		WHERE token = $1 AND type = $2
	`

	var vt VerificationToken
	err := r.db.QueryRow(query, token, tokenType).Scan(
		&vt.ID,
		&vt.UserID,
		&vt.Token,
		&vt.Type,
		&vt.ExpiresAt,
		&vt.CreatedAt,
		&vt.UsedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("error getting verification token: %w", err)
	}

	return &vt, nil
}

// MarkAsUsed marks a token as used
func (r *PostgresVerificationTokenRepository) MarkAsUsed(tokenID int64) error {
	query := `
		UPDATE verification_tokens
		SET used_at = $1
		WHERE id = $2
	`

	now := time.Now()
	_, err := r.db.Exec(query, now, tokenID)
	if err != nil {
		return fmt.Errorf("error marking token as used: %w", err)
	}

	return nil
}

// DeleteExpiredTokens removes all expired tokens
func (r *PostgresVerificationTokenRepository) DeleteExpiredTokens() error {
	query := `
		DELETE FROM verification_tokens
		WHERE expires_at < $1
	`

	_, err := r.db.Exec(query, time.Now())
	if err != nil {
		return fmt.Errorf("error deleting expired tokens: %w", err)
	}

	return nil
}

// DeleteUserTokensByType deletes all tokens of a specific type for a user
func (r *PostgresVerificationTokenRepository) DeleteUserTokensByType(userID int64, tokenType TokenType) error {
	query := `
		DELETE FROM verification_tokens
		WHERE user_id = $1 AND type = $2
	`

	_, err := r.db.Exec(query, userID, tokenType)
	if err != nil {
		return fmt.Errorf("error deleting user tokens: %w", err)
	}

	return nil
}

// VerificationTokenService defines the interface for token operations
type VerificationTokenService interface {
	GenerateToken(userID int64, tokenType TokenType, expiresInHours int) (string, error)
	ValidateToken(token string, tokenType TokenType) (*VerificationToken, error)
	MarkTokenAsUsed(tokenID int64) error
	DeleteExpiredTokens() error
	DeleteUserTokensByType(userID int64, tokenType TokenType) error
}

// VerificationTokenServiceImpl implements VerificationTokenService
type VerificationTokenServiceImpl struct {
	repo VerificationTokenRepository
}

// NewVerificationTokenService creates a new verification token service
func NewVerificationTokenService(repo VerificationTokenRepository) VerificationTokenService {
	return &VerificationTokenServiceImpl{
		repo: repo,
	}
}

// GenerateToken creates a new verification token
func (s *VerificationTokenServiceImpl) GenerateToken(userID int64, tokenType TokenType, expiresInHours int) (string, error) {
	// Delete any existing tokens of this type for the user
	err := s.repo.DeleteUserTokensByType(userID, tokenType)
	if err != nil {
		return "", fmt.Errorf("error deleting existing tokens: %w", err)
	}

	// Generate a secure random token
	tokenBytes := make([]byte, 32)
	_, err = rand.Read(tokenBytes)
	if err != nil {
		return "", fmt.Errorf("error generating random token: %w", err)
	}
	tokenString := base64.URLEncoding.EncodeToString(tokenBytes)

	// Create token record
	token := &VerificationToken{
		UserID:    userID,
		Token:     tokenString,
		Type:      tokenType,
		ExpiresAt: time.Now().Add(time.Duration(expiresInHours) * time.Hour),
		CreatedAt: time.Now(),
	}

	// Save to database
	err = s.repo.Create(token)
	if err != nil {
		return "", fmt.Errorf("error saving token: %w", err)
	}

	return tokenString, nil
}

// ValidateToken checks if a token is valid and not expired
func (s *VerificationTokenServiceImpl) ValidateToken(token string, tokenType TokenType) (*VerificationToken, error) {
	// Get token from database
	vt, err := s.repo.GetByToken(token, tokenType)
	if err != nil {
		return nil, fmt.Errorf("error retrieving token: %w", err)
	}

	// Check if token exists
	if vt == nil {
		return nil, errors.New("token not found")
	}

	// Check if token is expired
	if time.Now().After(vt.ExpiresAt) {
		return nil, errors.New("token has expired")
	}

	// Check if token has already been used
	if vt.UsedAt != nil {
		return nil, errors.New("token has already been used")
	}

	return vt, nil
}

// MarkTokenAsUsed marks a token as used
func (s *VerificationTokenServiceImpl) MarkTokenAsUsed(tokenID int64) error {
	return s.repo.MarkAsUsed(tokenID)
}

// DeleteExpiredTokens removes all expired tokens
func (s *VerificationTokenServiceImpl) DeleteExpiredTokens() error {
	return s.repo.DeleteExpiredTokens()
}

// DeleteUserTokensByType deletes all tokens of a specific type for a user
func (s *VerificationTokenServiceImpl) DeleteUserTokensByType(userID int64, tokenType TokenType) error {
	return s.repo.DeleteUserTokensByType(userID, tokenType)
}
