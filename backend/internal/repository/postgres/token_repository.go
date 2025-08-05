package postgres

import (
	"context"
	"database/sql"
	"log/slog"
	"time"

	"github.com/Srivathsav-max/lumen/backend/internal/database"
	"github.com/Srivathsav-max/lumen/backend/internal/repository"
)

// TokenRepository implements the TokenRepository interface for PostgreSQL
type TokenRepository struct {
	*repository.BaseRepository
}

// NewTokenRepository creates a new PostgreSQL token repository
func NewTokenRepository(db database.Manager, logger *slog.Logger) repository.TokenRepository {
	return &TokenRepository{
		BaseRepository: repository.NewBaseRepository(db, logger, "tokens"),
	}
}

// Create creates a new token
func (r *TokenRepository) Create(ctx context.Context, token *repository.Token) error {
	query := `
		INSERT INTO tokens (user_id, refresh_token, device_info, expires_at, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id`

	token.CreatedAt = time.Now().UTC()

	token.UpdatedAt = token.CreatedAt

	row := r.ExecuteQueryRow(ctx, query,
		token.UserID,
		token.Token,
		token.DeviceInfo,
		token.ExpiresAt,
		token.CreatedAt,
		token.UpdatedAt,
	)

	if err := row.Scan(&token.ID); err != nil {
		return r.HandleSQLError(err, "create token")
	}

	r.GetLogger().Info("Token created successfully",
		"token_id", token.ID,
		"user_id", token.UserID,
	)

	return nil
}

// GetByToken retrieves a token by token string
func (r *TokenRepository) GetByToken(ctx context.Context, tokenString string) (*repository.Token, error) {
	query := `
		SELECT id, user_id, refresh_token, device_info, expires_at, created_at, updated_at
		FROM tokens
		WHERE refresh_token = $1`

	token := &repository.Token{}
	row := r.ExecuteQueryRow(ctx, query, tokenString)

	err := row.Scan(
		&token.ID,
		&token.UserID,
		&token.Token,
		&token.DeviceInfo,
		&token.ExpiresAt,
		&token.CreatedAt,
		&token.UpdatedAt,
	)

	if err != nil {
		return nil, r.HandleSQLError(err, "get token by token string")
	}

	return token, nil
}

// GetByUserID retrieves tokens by user ID
func (r *TokenRepository) GetByUserID(ctx context.Context, userID int64, tokenType string) ([]*repository.Token, error) {
	query := `
		SELECT id, user_id, refresh_token, device_info, expires_at, created_at, updated_at
		FROM tokens
		WHERE user_id = $1
		ORDER BY created_at DESC`

	rows, err := r.ExecuteQuery(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tokens []*repository.Token
	for rows.Next() {
		token := &repository.Token{}
		err := rows.Scan(
			&token.ID,
			&token.UserID,
			&token.Token,
			&token.DeviceInfo,
			&token.ExpiresAt,
			&token.CreatedAt,
			&token.UpdatedAt,
		)
		if err != nil {
			return nil, r.HandleSQLError(err, "scan token")
		}
		tokens = append(tokens, token)
	}

	if err := rows.Err(); err != nil {
		return nil, r.HandleSQLError(err, "iterate tokens")
	}

	return tokens, nil
}

// Update updates a token
func (r *TokenRepository) Update(ctx context.Context, token *repository.Token) error {
	query := `
		UPDATE tokens
		SET user_id = $1, refresh_token = $2, device_info = $3, expires_at = $4, updated_at = $5
		WHERE id = $6`

	token.UpdatedAt = time.Now().UTC()

	result, err := r.ExecuteExec(ctx, query,
		token.UserID,
		token.Token,
		token.DeviceInfo,
		token.ExpiresAt,
		token.UpdatedAt,
		token.ID,
	)

	if err != nil {
		return r.HandleSQLError(err, "update token")
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return r.HandleSQLError(err, "get rows affected")
	}

	if rowsAffected == 0 {
		return r.HandleSQLError(sql.ErrNoRows, "update token")
	}

	r.GetLogger().Info("Token updated successfully",
		"token_id", token.ID,
		"user_id", token.UserID,
	)

	return nil
}

// Delete deletes a token
func (r *TokenRepository) Delete(ctx context.Context, id int64) error {
	query := `DELETE FROM tokens WHERE id = $1`

	result, err := r.ExecuteExec(ctx, query, id)
	if err != nil {
		return r.HandleSQLError(err, "delete token")
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return r.HandleSQLError(err, "get rows affected")
	}

	if rowsAffected == 0 {
		return r.HandleSQLError(sql.ErrNoRows, "delete token")
	}

	r.GetLogger().Info("Token deleted successfully", "token_id", id)
	return nil
}

// RevokeToken revokes a token by token string
func (r *TokenRepository) RevokeToken(ctx context.Context, tokenString string) error {
	query := `DELETE FROM tokens WHERE refresh_token = $1`

	result, err := r.ExecuteExec(ctx, query, tokenString)
	if err != nil {
		return r.HandleSQLError(err, "revoke token")
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return r.HandleSQLError(err, "get rows affected")
	}

	if rowsAffected == 0 {
		return r.HandleSQLError(sql.ErrNoRows, "revoke token")
	}

	r.GetLogger().Info("Token revoked successfully", "token", tokenString)
	return nil
}

// RevokeAllUserTokens revokes all tokens for a user
func (r *TokenRepository) RevokeAllUserTokens(ctx context.Context, userID int64, tokenType string) error {
	query := `DELETE FROM tokens WHERE user_id = $1`

	result, err := r.ExecuteExec(ctx, query, userID)
	if err != nil {
		return r.HandleSQLError(err, "revoke all user tokens")
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return r.HandleSQLError(err, "get rows affected")
	}

	r.GetLogger().Info("User tokens revoked successfully",
		"user_id", userID,
		"token_type", tokenType,
		"tokens_revoked", rowsAffected,
	)

	return nil
}

// CleanupExpiredTokens removes expired tokens
func (r *TokenRepository) CleanupExpiredTokens(ctx context.Context) error {
	query := `DELETE FROM tokens WHERE expires_at < $1`

	now := time.Now().UTC()
	result, err := r.ExecuteExec(ctx, query, now)
	if err != nil {
		return r.HandleSQLError(err, "cleanup expired tokens")
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return r.HandleSQLError(err, "get rows affected")
	}

	r.GetLogger().Info("Expired tokens cleaned up",
		"tokens_deleted", rowsAffected,
	)

	return nil
}

// StoreRefreshToken stores a refresh token
func (r *TokenRepository) StoreRefreshToken(ctx context.Context, userID int64, token string, expiresAt time.Time) error {
	refreshToken := &repository.Token{
		UserID:     userID,
		Token:      token,
		DeviceInfo: "",
		ExpiresAt:  expiresAt,
	}
	return r.Create(ctx, refreshToken)
}

// ValidateRefreshToken validates a refresh token and returns the user ID
func (r *TokenRepository) ValidateRefreshToken(ctx context.Context, token string) (int64, error) {
	query := `
		SELECT user_id
		FROM tokens
		WHERE refresh_token = $1 AND expires_at > $2`

	now := time.Now().UTC()
	row := r.ExecuteQueryRow(ctx, query, token, now)

	var userID int64
	err := row.Scan(&userID)
	if err != nil {
		return 0, r.HandleSQLError(err, "validate refresh token")
	}

	return userID, nil
}

// RevokeRefreshToken revokes a specific refresh token
func (r *TokenRepository) RevokeRefreshToken(ctx context.Context, token string) error {
	query := `DELETE FROM tokens WHERE refresh_token = $1`

	result, err := r.ExecuteExec(ctx, query, token)
	if err != nil {
		return r.HandleSQLError(err, "revoke refresh token")
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return r.HandleSQLError(err, "get rows affected")
	}

	if rowsAffected == 0 {
		return r.HandleSQLError(sql.ErrNoRows, "revoke refresh token")
	}

	r.GetLogger().Info("Refresh token revoked successfully", "token", token)
	return nil
}
