package postgres

import (
	"context"
	"database/sql"
	"log/slog"
	"time"

	"github.com/Srivathsav-max/lumen/backend/internal/database"
	"github.com/Srivathsav-max/lumen/backend/internal/repository"
)

// VerificationTokenRepository implements the VerificationTokenRepository interface for PostgreSQL
type VerificationTokenRepository struct {
	*repository.BaseRepository
}

// NewVerificationTokenRepository creates a new PostgreSQL verification token repository
func NewVerificationTokenRepository(db database.Manager, logger *slog.Logger) repository.VerificationTokenRepository {
	return &VerificationTokenRepository{
		BaseRepository: repository.NewBaseRepository(db, logger, "verification_tokens"),
	}
}

// Create creates a new verification token
func (r *VerificationTokenRepository) Create(ctx context.Context, token interface{}) error {
	vt, ok := token.(*repository.VerificationToken)
	if !ok {
		return r.HandleSQLError(sql.ErrNoRows, "invalid token type")
	}
	query := `
		INSERT INTO verification_tokens (user_id, token, token_type, expires_at, created_at, is_used)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id`

	vt.CreatedAt = time.Now().UTC()
	vt.IsUsed = false

	row := r.ExecuteQueryRow(ctx, query,
		vt.UserID,
		vt.Token,
		vt.TokenType,
		vt.ExpiresAt,
		vt.CreatedAt,
		vt.IsUsed,
	)

	if err := row.Scan(&vt.ID); err != nil {
		return r.HandleSQLError(err, "create verification token")
	}

	r.GetLogger().Info("Verification token created successfully",
		"token_id", vt.ID,
		"user_id", vt.UserID,
		"token_type", vt.TokenType,
	)

	return nil
}

// GetByToken retrieves a verification token by token string and type
func (r *VerificationTokenRepository) GetByToken(ctx context.Context, tokenString string, tokenType string) (interface{}, error) {
	query := `
		SELECT id, user_id, token, token_type, expires_at, created_at, is_used
		FROM verification_tokens
		WHERE token = $1 AND token_type = $2`

	token := &repository.VerificationToken{}
	row := r.ExecuteQueryRow(ctx, query, tokenString, tokenType)

	err := row.Scan(
		&token.ID,
		&token.UserID,
		&token.Token,
		&token.TokenType,
		&token.ExpiresAt,
		&token.CreatedAt,
		&token.IsUsed,
	)

	if err != nil {
		return nil, r.HandleSQLError(err, "get verification token by token string")
	}

	return token, nil
}

// GetByUserID retrieves a verification token by user ID and token type
func (r *VerificationTokenRepository) GetByUserID(ctx context.Context, userID int64, tokenType string) (interface{}, error) {
	query := `
		SELECT id, user_id, token, token_type, expires_at, created_at, is_used
		FROM verification_tokens
		WHERE user_id = $1 AND token_type = $2 AND is_used = false
		ORDER BY created_at DESC
		LIMIT 1`

	token := &repository.VerificationToken{}
	row := r.ExecuteQueryRow(ctx, query, userID, tokenType)

	err := row.Scan(
		&token.ID,
		&token.UserID,
		&token.Token,
		&token.TokenType,
		&token.ExpiresAt,
		&token.CreatedAt,
		&token.IsUsed,
	)

	if err != nil {
		return nil, r.HandleSQLError(err, "get verification token by user ID")
	}

	return token, nil
}

// Update updates a verification token
func (r *VerificationTokenRepository) Update(ctx context.Context, token interface{}) error {
	vt, ok := token.(*repository.VerificationToken)
	if !ok {
		return r.HandleSQLError(sql.ErrNoRows, "invalid token type")
	}

	query := `
		UPDATE verification_tokens
		SET user_id = $1, token = $2, token_type = $3, expires_at = $4, is_used = $5
		WHERE id = $6`

	result, err := r.ExecuteExec(ctx, query,
		vt.UserID,
		vt.Token,
		vt.TokenType,
		vt.ExpiresAt,
		vt.IsUsed,
		vt.ID,
	)

	if err != nil {
		return r.HandleSQLError(err, "update verification token")
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return r.HandleSQLError(err, "get rows affected")
	}

	if rowsAffected == 0 {
		return r.HandleSQLError(sql.ErrNoRows, "update verification token")
	}

	r.GetLogger().Info("Verification token updated successfully",
		"token_id", vt.ID,
		"user_id", vt.UserID,
		"token_type", vt.TokenType,
	)

	return nil
}

// Delete deletes a verification token
func (r *VerificationTokenRepository) Delete(ctx context.Context, id int64) error {
	query := `DELETE FROM verification_tokens WHERE id = $1`

	result, err := r.ExecuteExec(ctx, query, id)
	if err != nil {
		return r.HandleSQLError(err, "delete verification token")
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return r.HandleSQLError(err, "get rows affected")
	}

	if rowsAffected == 0 {
		return r.HandleSQLError(sql.ErrNoRows, "delete verification token")
	}

	r.GetLogger().Info("Verification token deleted successfully", "token_id", id)
	return nil
}

// MarkAsUsed marks a verification token as used by token ID
func (r *VerificationTokenRepository) MarkAsUsed(ctx context.Context, tokenID int64) error {
	query := `UPDATE verification_tokens SET is_used = true WHERE id = $1`

	result, err := r.ExecuteExec(ctx, query, tokenID)
	if err != nil {
		return r.HandleSQLError(err, "mark verification token as used")
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return r.HandleSQLError(err, "get rows affected")
	}

	if rowsAffected == 0 {
		return r.HandleSQLError(sql.ErrNoRows, "mark verification token as used")
	}

	r.GetLogger().Info("Verification token marked as used", "token_id", tokenID)
	return nil
}

// DeleteExpiredTokens removes expired verification tokens
func (r *VerificationTokenRepository) DeleteExpiredTokens(ctx context.Context) error {
	query := `DELETE FROM verification_tokens WHERE expires_at < $1`

	now := time.Now().UTC()
	result, err := r.ExecuteExec(ctx, query, now)
	if err != nil {
		return r.HandleSQLError(err, "cleanup expired verification tokens")
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return r.HandleSQLError(err, "get rows affected")
	}

	r.GetLogger().Info("Expired verification tokens cleaned up",
		"tokens_deleted", rowsAffected,
	)

	return nil
}

// DeleteUserTokensByType deletes all tokens for a user of a specific type
func (r *VerificationTokenRepository) DeleteUserTokensByType(ctx context.Context, userID int64, tokenType string) error {
	query := `DELETE FROM verification_tokens WHERE user_id = $1 AND token_type = $2`

	result, err := r.ExecuteExec(ctx, query, userID, tokenType)
	if err != nil {
		return r.HandleSQLError(err, "delete user tokens by type")
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return r.HandleSQLError(err, "get rows affected")
	}

	r.GetLogger().Info("User verification tokens deleted",
		"user_id", userID,
		"token_type", tokenType,
		"tokens_deleted", rowsAffected,
	)

	return nil
}