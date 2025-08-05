package postgres

import (
	"context"
	"database/sql"
	"log/slog"
	"time"

	"github.com/Srivathsav-max/lumen/backend/internal/database"
	"github.com/Srivathsav-max/lumen/backend/internal/repository"
)

// UserRepository implements the UserRepository interface for PostgreSQL
type UserRepository struct {
	*repository.BaseRepository
}

// NewUserRepository creates a new PostgreSQL user repository
func NewUserRepository(db database.Manager, logger *slog.Logger) repository.UserRepository {
	return &UserRepository{
		BaseRepository: repository.NewBaseRepository(db, logger, "users"),
	}
}

// Create creates a new user
func (r *UserRepository) Create(ctx context.Context, user *repository.User) error {
	query := `
		INSERT INTO users (username, email, password_hash, email_verified, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id`

	now := time.Now().UTC()
	user.CreatedAt = now
	user.UpdatedAt = now

	row := r.ExecuteQueryRow(ctx, query,
		user.Username,
		user.Email,
		user.PasswordHash,
		user.EmailVerified,
		user.CreatedAt,
		user.UpdatedAt,
	)

	if err := row.Scan(&user.ID); err != nil {
		return r.HandleSQLError(err, "create user")
	}

	r.GetLogger().Info("User created successfully",
		"user_id", user.ID,
		"username", user.Username,
		"email", user.Email,
	)

	return nil
}

// GetByID retrieves a user by ID
func (r *UserRepository) GetByID(ctx context.Context, id int64) (*repository.User, error) {
	query := `
		SELECT id, username, email, password_hash, email_verified, created_at, updated_at
		FROM users
		WHERE id = $1`

	user := &repository.User{}
	row := r.ExecuteQueryRow(ctx, query, id)

	err := row.Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.PasswordHash,
		&user.EmailVerified,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err != nil {
		return nil, r.HandleSQLError(err, "get user by ID")
	}

	return user, nil
}

// GetByEmail retrieves a user by email
func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*repository.User, error) {
	query := `
		SELECT id, username, email, password_hash, email_verified, created_at, updated_at
		FROM users
		WHERE email = $1`

	user := &repository.User{}
	row := r.ExecuteQueryRow(ctx, query, email)

	err := row.Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.PasswordHash,
		&user.EmailVerified,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err != nil {
		return nil, r.HandleSQLError(err, "get user by email")
	}

	return user, nil
}

// GetByUsername retrieves a user by username
func (r *UserRepository) GetByUsername(ctx context.Context, username string) (*repository.User, error) {
	query := `
		SELECT id, username, email, password_hash, email_verified, created_at, updated_at
		FROM users
		WHERE username = $1`

	user := &repository.User{}
	row := r.ExecuteQueryRow(ctx, query, username)

	err := row.Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.PasswordHash,
		&user.EmailVerified,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err != nil {
		return nil, r.HandleSQLError(err, "get user by username")
	}

	return user, nil
}

// Update updates a user
func (r *UserRepository) Update(ctx context.Context, user *repository.User) error {
	query := `
		UPDATE users
		SET username = $1, email = $2, password_hash = $3, email_verified = $4, updated_at = $5
		WHERE id = $6`

	user.UpdatedAt = time.Now().UTC()

	result, err := r.ExecuteExec(ctx, query,
		user.Username,
		user.Email,
		user.PasswordHash,
		user.EmailVerified,
		user.UpdatedAt,
		user.ID,
	)

	if err != nil {
		return r.HandleSQLError(err, "update user")
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return r.HandleSQLError(err, "get rows affected")
	}

	if rowsAffected == 0 {
		return r.HandleSQLError(sql.ErrNoRows, "update user")
	}

	r.GetLogger().Info("User updated successfully",
		"user_id", user.ID,
		"username", user.Username,
		"email", user.Email,
	)

	return nil
}

// Delete deletes a user
func (r *UserRepository) Delete(ctx context.Context, id int64) error {
	query := `DELETE FROM users WHERE id = $1`

	result, err := r.ExecuteExec(ctx, query, id)
	if err != nil {
		return r.HandleSQLError(err, "delete user")
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return r.HandleSQLError(err, "get rows affected")
	}

	if rowsAffected == 0 {
		return r.HandleSQLError(sql.ErrNoRows, "delete user")
	}

	r.GetLogger().Info("User deleted successfully", "user_id", id)
	return nil
}

// ExistsByEmail checks if a user exists by email
func (r *UserRepository) ExistsByEmail(ctx context.Context, email string) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)`

	var exists bool
	row := r.ExecuteQueryRow(ctx, query, email)

	if err := row.Scan(&exists); err != nil {
		return false, r.HandleSQLError(err, "check user exists by email")
	}

	return exists, nil
}

// ExistsByUsername checks if a user exists by username
func (r *UserRepository) ExistsByUsername(ctx context.Context, username string) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM users WHERE username = $1)`

	var exists bool
	row := r.ExecuteQueryRow(ctx, query, username)

	if err := row.Scan(&exists); err != nil {
		return false, r.HandleSQLError(err, "check user exists by username")
	}

	return exists, nil
}

// List retrieves a list of users with pagination
func (r *UserRepository) List(ctx context.Context, limit, offset int) ([]*repository.User, error) {
	query := `
		SELECT id, username, email, password_hash, email_verified, created_at, updated_at
		FROM users
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2`

	rows, err := r.ExecuteQuery(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []*repository.User
	for rows.Next() {
		user := &repository.User{}
		err := rows.Scan(
			&user.ID,
			&user.Username,
			&user.Email,
			&user.PasswordHash,
			&user.EmailVerified,
			&user.CreatedAt,
			&user.UpdatedAt,
		)
		if err != nil {
			return nil, r.HandleSQLError(err, "scan user")
		}
		users = append(users, user)
	}

	if err := rows.Err(); err != nil {
		return nil, r.HandleSQLError(err, "iterate users")
	}

	return users, nil
}

// Count returns the total number of users
func (r *UserRepository) Count(ctx context.Context) (int64, error) {
	query := `SELECT COUNT(*) FROM users`

	var count int64
	row := r.ExecuteQueryRow(ctx, query)

	if err := row.Scan(&count); err != nil {
		return 0, r.HandleSQLError(err, "count users")
	}

	return count, nil
}