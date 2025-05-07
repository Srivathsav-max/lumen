package models

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/Srivathsav-max/lumen/backend/db"
)

// PostgresRoleRepository implements RoleRepository interface using PostgreSQL
type PostgresRoleRepository struct {
	db *db.DB
}

// NewRoleRepository creates a new PostgresRoleRepository
func NewRoleRepository(db *db.DB) RoleRepository {
	return &PostgresRoleRepository{db: db}
}

// GetByID retrieves a role by its ID
func (r *PostgresRoleRepository) GetByID(id int64) (*Role, error) {
	query := `SELECT id, name, description, created_at, updated_at FROM roles WHERE id = $1`
	
	var role Role
	err := r.db.QueryRow(query, id).Scan(
		&role.ID,
		&role.Name,
		&role.Description,
		&role.CreatedAt,
		&role.UpdatedAt,
	)
	
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("role with ID %d not found", id)
		}
		return nil, fmt.Errorf("error getting role by ID: %w", err)
	}
	
	return &role, nil
}

// GetByName retrieves a role by its name
func (r *PostgresRoleRepository) GetByName(name string) (*Role, error) {
	query := `SELECT id, name, description, created_at, updated_at FROM roles WHERE name = $1`
	
	var role Role
	err := r.db.QueryRow(query, name).Scan(
		&role.ID,
		&role.Name,
		&role.Description,
		&role.CreatedAt,
		&role.UpdatedAt,
	)
	
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("role with name %s not found", name)
		}
		return nil, fmt.Errorf("error getting role by name: %w", err)
	}
	
	return &role, nil
}

// GetAll retrieves all roles
func (r *PostgresRoleRepository) GetAll() ([]*Role, error) {
	query := `SELECT id, name, description, created_at, updated_at FROM roles ORDER BY id`
	
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("error getting all roles: %w", err)
	}
	defer rows.Close()
	
	var roles []*Role
	for rows.Next() {
		var role Role
		err := rows.Scan(
			&role.ID,
			&role.Name,
			&role.Description,
			&role.CreatedAt,
			&role.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("error scanning role: %w", err)
		}
		roles = append(roles, &role)
	}
	
	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating roles: %w", err)
	}
	
	return roles, nil
}

// Create creates a new role
func (r *PostgresRoleRepository) Create(role *Role) error {
	query := `
		INSERT INTO roles (name, description, created_at, updated_at) 
		VALUES ($1, $2, $3, $3) 
		RETURNING id, created_at, updated_at
	`
	
	now := time.Now()
	err := r.db.QueryRow(query, role.Name, role.Description, now).Scan(
		&role.ID,
		&role.CreatedAt,
		&role.UpdatedAt,
	)
	
	if err != nil {
		return fmt.Errorf("error creating role: %w", err)
	}
	
	return nil
}

// Update updates an existing role
func (r *PostgresRoleRepository) Update(role *Role) error {
	query := `
		UPDATE roles 
		SET name = $1, description = $2, updated_at = $3 
		WHERE id = $4
	`
	
	now := time.Now()
	result, err := r.db.Exec(query, role.Name, role.Description, now, role.ID)
	if err != nil {
		return fmt.Errorf("error updating role: %w", err)
	}
	
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("error getting rows affected: %w", err)
	}
	
	if rowsAffected == 0 {
		return fmt.Errorf("role with ID %d not found", role.ID)
	}
	
	role.UpdatedAt = now
	return nil
}

// Delete deletes a role by its ID
func (r *PostgresRoleRepository) Delete(id int64) error {
	query := `DELETE FROM roles WHERE id = $1`
	
	result, err := r.db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("error deleting role: %w", err)
	}
	
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("error getting rows affected: %w", err)
	}
	
	if rowsAffected == 0 {
		return fmt.Errorf("role with ID %d not found", id)
	}
	
	return nil
}

// AssignRoleToUser assigns a role to a user
func (r *PostgresRoleRepository) AssignRoleToUser(userID, roleID int64) error {
	query := `
		INSERT INTO user_roles (user_id, role_id, created_at) 
		VALUES ($1, $2, $3) 
		ON CONFLICT (user_id, role_id) DO NOTHING
	`
	
	now := time.Now()
	_, err := r.db.Exec(query, userID, roleID, now)
	if err != nil {
		return fmt.Errorf("error assigning role to user: %w", err)
	}
	
	return nil
}

// RemoveRoleFromUser removes a role from a user
func (r *PostgresRoleRepository) RemoveRoleFromUser(userID, roleID int64) error {
	query := `DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2`
	
	result, err := r.db.Exec(query, userID, roleID)
	if err != nil {
		return fmt.Errorf("error removing role from user: %w", err)
	}
	
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("error getting rows affected: %w", err)
	}
	
	if rowsAffected == 0 {
		return fmt.Errorf("user-role relationship not found")
	}
	
	return nil
}

// GetUserRoles retrieves all roles assigned to a user
func (r *PostgresRoleRepository) GetUserRoles(userID int64) ([]*Role, error) {
	query := `
		SELECT r.id, r.name, r.description, r.created_at, r.updated_at 
		FROM roles r
		JOIN user_roles ur ON r.id = ur.role_id
		WHERE ur.user_id = $1
		ORDER BY r.id
	`
	
	rows, err := r.db.Query(query, userID)
	if err != nil {
		return nil, fmt.Errorf("error getting user roles: %w", err)
	}
	defer rows.Close()
	
	var roles []*Role
	for rows.Next() {
		var role Role
		err := rows.Scan(
			&role.ID,
			&role.Name,
			&role.Description,
			&role.CreatedAt,
			&role.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("error scanning role: %w", err)
		}
		roles = append(roles, &role)
	}
	
	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating roles: %w", err)
	}
	
	return roles, nil
}

// HasRole checks if a user has a specific role
func (r *PostgresRoleRepository) HasRole(userID int64, roleName string) (bool, error) {
	query := `
		SELECT EXISTS (
			SELECT 1 FROM user_roles ur
			JOIN roles r ON ur.role_id = r.id
			WHERE ur.user_id = $1 AND r.name = $2
		)
	`
	
	var hasRole bool
	err := r.db.QueryRow(query, userID, roleName).Scan(&hasRole)
	if err != nil {
		return false, fmt.Errorf("error checking if user has role: %w", err)
	}
	
	return hasRole, nil
}
