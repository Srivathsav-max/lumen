package models

import (
	"time"
)

// UserToken represents a permanent token for a user
type UserToken struct {
	ID            int       `json:"id" db:"id"`
	UserID        int       `json:"user_id" db:"user_id"`
	PermanentToken string    `json:"permanent_token" db:"permanent_token"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
	LastUsedAt    *time.Time `json:"last_used_at,omitempty" db:"last_used_at"`
	DeviceInfo    *string    `json:"device_info,omitempty" db:"device_info"`
	IsActive      bool      `json:"is_active" db:"is_active"`
}

// TokenPair represents a pair of tokens - permanent and temporary
type TokenPair struct {
	PermanentToken string `json:"permanent_token"`
	TemporaryToken string `json:"temporary_token"`
	ExpiresAt      int64  `json:"expires_at"`
}

// TokenClaims represents the claims in a JWT token
type TokenClaims struct {
	UserID        int    `json:"user_id"`
	PermanentToken string `json:"permanent_token"`
	TokenType     string `json:"token_type"` // "permanent" or "temporary"
}
