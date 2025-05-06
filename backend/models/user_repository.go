package models

import (
	"database/sql"
	"errors"
	"time"

	"github.com/Srivathsav-max/lumen/backend/db"
)

// PostgresUserRepository implements UserRepository using PostgreSQL
type PostgresUserRepository struct {
	db *db.DB
}

// NewPostgresUserRepository creates a new PostgreSQL user repository
func NewPostgresUserRepository(db *db.DB) *PostgresUserRepository {
	return &PostgresUserRepository{db: db}
}

// GetByID retrieves a user by their ID
func (r *PostgresUserRepository) GetByID(id int64) (*User, error) {
	query := `
		SELECT id, username, email, password, first_name, last_name, created_at, updated_at
		FROM users
		WHERE id = $1
	`
	
	var user User
	err := r.db.QueryRow(query, id).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.Password,
		&user.FirstName,
		&user.LastName,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil // User not found
		}
		return nil, err
	}
	
	return &user, nil
}

// GetByEmail retrieves a user by their email
func (r *PostgresUserRepository) GetByEmail(email string) (*User, error) {
	query := `
		SELECT id, username, email, password, first_name, last_name, created_at, updated_at
		FROM users
		WHERE email = $1
	`
	
	var user User
	err := r.db.QueryRow(query, email).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.Password,
		&user.FirstName,
		&user.LastName,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil // User not found
		}
		return nil, err
	}
	
	return &user, nil
}

// GetByUsername retrieves a user by their username
func (r *PostgresUserRepository) GetByUsername(username string) (*User, error) {
	query := `
		SELECT id, username, email, password, first_name, last_name, created_at, updated_at
		FROM users
		WHERE username = $1
	`
	
	var user User
	err := r.db.QueryRow(query, username).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.Password,
		&user.FirstName,
		&user.LastName,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil // User not found
		}
		return nil, err
	}
	
	return &user, nil
}

// Create inserts a new user into the database
func (r *PostgresUserRepository) Create(user *User) error {
	query := `
		INSERT INTO users (username, email, password, first_name, last_name, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id
	`
	
	now := time.Now()
	user.CreatedAt = now
	user.UpdatedAt = now
	
	err := r.db.QueryRow(
		query,
		user.Username,
		user.Email,
		user.Password,
		user.FirstName,
		user.LastName,
		user.CreatedAt,
		user.UpdatedAt,
	).Scan(&user.ID)
	
	return err
}

// Update updates an existing user in the database
func (r *PostgresUserRepository) Update(user *User) error {
	query := `
		UPDATE users
		SET username = $1, email = $2, first_name = $3, last_name = $4, updated_at = $5
		WHERE id = $6
	`
	
	user.UpdatedAt = time.Now()
	
	_, err := r.db.Exec(
		query,
		user.Username,
		user.Email,
		user.FirstName,
		user.LastName,
		user.UpdatedAt,
		user.ID,
	)
	
	return err
}

// Delete removes a user from the database
func (r *PostgresUserRepository) Delete(id int64) error {
	query := `DELETE FROM users WHERE id = $1`
	_, err := r.db.Exec(query, id)
	return err
}
