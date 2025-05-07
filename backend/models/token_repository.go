package models

import (
	"database/sql"
	"time"
)

// TokenRepository handles database operations for user tokens
type TokenRepository struct {
	DB *sql.DB
}

// NewTokenRepository creates a new token repository
func NewTokenRepository(db *sql.DB) *TokenRepository {
	return &TokenRepository{
		DB: db,
	}
}

// CreateToken creates a new permanent token for a user
func (r *TokenRepository) CreateToken(userID int, token string, deviceInfo *string) (*UserToken, error) {
	query := `
		INSERT INTO user_tokens (user_id, permanent_token, device_info)
		VALUES ($1, $2, $3)
		RETURNING id, user_id, permanent_token, created_at, last_used_at, device_info, is_active
	`

	var userToken UserToken
	row := r.DB.QueryRow(query, userID, token, deviceInfo)
	err := row.Scan(
		&userToken.ID,
		&userToken.UserID,
		&userToken.PermanentToken,
		&userToken.CreatedAt,
		&userToken.LastUsedAt,
		&userToken.DeviceInfo,
		&userToken.IsActive,
	)
	if err != nil {
		return nil, err
	}

	return &userToken, nil
}

// GetTokenByValue retrieves a token by its value
func (r *TokenRepository) GetTokenByValue(token string) (*UserToken, error) {
	query := `
		SELECT id, user_id, permanent_token, created_at, last_used_at, device_info, is_active
		FROM user_tokens
		WHERE permanent_token = $1
	`

	var userToken UserToken
	row := r.DB.QueryRow(query, token)
	err := row.Scan(
		&userToken.ID,
		&userToken.UserID,
		&userToken.PermanentToken,
		&userToken.CreatedAt,
		&userToken.LastUsedAt,
		&userToken.DeviceInfo,
		&userToken.IsActive,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	return &userToken, nil
}

// GetActiveTokensByUserID retrieves all active tokens for a user
func (r *TokenRepository) GetActiveTokensByUserID(userID int) ([]UserToken, error) {
	query := `
		SELECT id, user_id, permanent_token, created_at, last_used_at, device_info, is_active
		FROM user_tokens
		WHERE user_id = $1 AND is_active = true
	`

	rows, err := r.DB.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tokens []UserToken
	for rows.Next() {
		var token UserToken
		err := rows.Scan(
			&token.ID,
			&token.UserID,
			&token.PermanentToken,
			&token.CreatedAt,
			&token.LastUsedAt,
			&token.DeviceInfo,
			&token.IsActive,
		)
		if err != nil {
			return nil, err
		}
		tokens = append(tokens, token)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return tokens, nil
}

// UpdateLastUsed updates the last_used_at timestamp for a token
func (r *TokenRepository) UpdateLastUsed(tokenID int) error {
	query := `
		UPDATE user_tokens
		SET last_used_at = $1
		WHERE id = $2
	`

	_, err := r.DB.Exec(query, time.Now(), tokenID)
	return err
}

// DeactivateToken deactivates a token
func (r *TokenRepository) DeactivateToken(tokenID int) error {
	query := `
		UPDATE user_tokens
		SET is_active = false
		WHERE id = $1
	`

	_, err := r.DB.Exec(query, tokenID)
	return err
}

// DeactivateAllUserTokens deactivates all tokens for a user
func (r *TokenRepository) DeactivateAllUserTokens(userID int) error {
	query := `
		UPDATE user_tokens
		SET is_active = false
		WHERE user_id = $1
	`

	_, err := r.DB.Exec(query, userID)
	return err
}

// CleanupOldTokens removes tokens that haven't been used in a long time
func (r *TokenRepository) CleanupOldTokens(olderThan time.Time) (int64, error) {
	query := `
		DELETE FROM user_tokens
		WHERE (last_used_at < $1 OR (last_used_at IS NULL AND created_at < $1))
	`

	result, err := r.DB.Exec(query, olderThan)
	if err != nil {
		return 0, err
	}

	return result.RowsAffected()
}
