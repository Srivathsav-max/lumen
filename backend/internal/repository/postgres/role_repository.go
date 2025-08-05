package postgres

import (
	"context"
	"database/sql"
	"log/slog"
	"time"

	"github.com/Srivathsav-max/lumen/backend/internal/database"
	"github.com/Srivathsav-max/lumen/backend/internal/repository"
)

type RoleRepository struct {
	*repository.BaseRepository
}

func NewRoleRepository(db database.Manager, logger *slog.Logger) repository.RoleRepository {
	return &RoleRepository{
		BaseRepository: repository.NewBaseRepository(db, logger, "roles"),
	}
}

func (r *RoleRepository) Create(ctx context.Context, role *repository.Role) error {
	query := `
		INSERT INTO roles (name, description, created_at, updated_at)
		VALUES ($1, $2, $3, $4)
		RETURNING id`

	now := time.Now().UTC()
	role.CreatedAt = now
	role.UpdatedAt = now

	row := r.ExecuteQueryRow(ctx, query,
		role.Name,
		role.Description,
		role.CreatedAt,
		role.UpdatedAt,
	)

	if err := row.Scan(&role.ID); err != nil {
		return r.HandleSQLError(err, "create role")
	}

	r.GetLogger().Info("Role created successfully",
		"role_id", role.ID,
		"name", role.Name,
	)

	return nil
}

func (r *RoleRepository) GetByID(ctx context.Context, id int64) (*repository.Role, error) {
	query := `
		SELECT id, name, description, created_at, updated_at
		FROM roles
		WHERE id = $1`

	role := &repository.Role{}
	row := r.ExecuteQueryRow(ctx, query, id)

	err := row.Scan(
		&role.ID,
		&role.Name,
		&role.Description,
		&role.CreatedAt,
		&role.UpdatedAt,
	)

	if err != nil {
		return nil, r.HandleSQLError(err, "get role by ID")
	}

	return role, nil
}

func (r *RoleRepository) GetByName(ctx context.Context, name string) (*repository.Role, error) {
	query := `
		SELECT id, name, description, created_at, updated_at
		FROM roles
		WHERE name = $1`

	role := &repository.Role{}
	row := r.ExecuteQueryRow(ctx, query, name)

	err := row.Scan(
		&role.ID,
		&role.Name,
		&role.Description,
		&role.CreatedAt,
		&role.UpdatedAt,
	)

	if err != nil {
		return nil, r.HandleSQLError(err, "get role by name")
	}

	return role, nil
}

func (r *RoleRepository) Update(ctx context.Context, role *repository.Role) error {
	query := `
		UPDATE roles
		SET name = $1, description = $2, updated_at = $3
		WHERE id = $4`

	role.UpdatedAt = time.Now().UTC()

	result, err := r.ExecuteExec(ctx, query,
		role.Name,
		role.Description,
		role.UpdatedAt,
		role.ID,
	)

	if err != nil {
		return r.HandleSQLError(err, "update role")
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return r.HandleSQLError(err, "get rows affected")
	}

	if rowsAffected == 0 {
		return r.HandleSQLError(sql.ErrNoRows, "update role")
	}

	r.GetLogger().Info("Role updated successfully",
		"role_id", role.ID,
		"name", role.Name,
	)

	return nil
}

func (r *RoleRepository) Delete(ctx context.Context, id int64) error {
	query := `DELETE FROM roles WHERE id = $1`

	result, err := r.ExecuteExec(ctx, query, id)
	if err != nil {
		return r.HandleSQLError(err, "delete role")
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return r.HandleSQLError(err, "get rows affected")
	}

	if rowsAffected == 0 {
		return r.HandleSQLError(sql.ErrNoRows, "delete role")
	}

	r.GetLogger().Info("Role deleted successfully", "role_id", id)
	return nil
}

func (r *RoleRepository) List(ctx context.Context) ([]*repository.Role, error) {
	query := `
		SELECT id, name, description, created_at, updated_at
		FROM roles
		ORDER BY name`

	rows, err := r.ExecuteQuery(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var roles []*repository.Role
	for rows.Next() {
		role := &repository.Role{}
		err := rows.Scan(
			&role.ID,
			&role.Name,
			&role.Description,
			&role.CreatedAt,
			&role.UpdatedAt,
		)
		if err != nil {
			return nil, r.HandleSQLError(err, "scan role")
		}
		roles = append(roles, role)
	}

	if err := rows.Err(); err != nil {
		return nil, r.HandleSQLError(err, "iterate roles")
	}

	return roles, nil
}

func (r *RoleRepository) AssignRoleToUser(ctx context.Context, userID, roleID int64) error {
	query := `
		INSERT INTO user_roles (user_id, role_id, created_at)
		VALUES ($1, $2, $3)
		ON CONFLICT (user_id, role_id) DO NOTHING`

	now := time.Now().UTC()

	_, err := r.ExecuteExec(ctx, query, userID, roleID, now)
	if err != nil {
		return r.HandleSQLError(err, "assign role to user")
	}

	r.GetLogger().Info("Role assigned to user successfully",
		"user_id", userID,
		"role_id", roleID,
	)

	return nil
}

func (r *RoleRepository) RemoveRoleFromUser(ctx context.Context, userID, roleID int64) error {
	query := `DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2`

	result, err := r.ExecuteExec(ctx, query, userID, roleID)
	if err != nil {
		return r.HandleSQLError(err, "remove role from user")
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return r.HandleSQLError(err, "get rows affected")
	}

	if rowsAffected == 0 {
		return r.HandleSQLError(sql.ErrNoRows, "remove role from user")
	}

	r.GetLogger().Info("Role removed from user successfully",
		"user_id", userID,
		"role_id", roleID,
	)

	return nil
}

func (r *RoleRepository) GetUserRoles(ctx context.Context, userID int64) ([]*repository.Role, error) {
	query := `
		SELECT r.id, r.name, r.description, r.created_at, r.updated_at
		FROM roles r
		INNER JOIN user_roles ur ON r.id = ur.role_id
		WHERE ur.user_id = $1
		ORDER BY r.name`

	rows, err := r.ExecuteQuery(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var roles []*repository.Role
	for rows.Next() {
		role := &repository.Role{}
		err := rows.Scan(
			&role.ID,
			&role.Name,
			&role.Description,
			&role.CreatedAt,
			&role.UpdatedAt,
		)
		if err != nil {
			return nil, r.HandleSQLError(err, "scan user role")
		}
		roles = append(roles, role)
	}

	if err := rows.Err(); err != nil {
		return nil, r.HandleSQLError(err, "iterate user roles")
	}

	return roles, nil
}

func (r *RoleRepository) HasRole(ctx context.Context, userID int64, roleName string) (bool, error) {
	query := `
		SELECT EXISTS(
			SELECT 1 FROM user_roles ur
			INNER JOIN roles r ON ur.role_id = r.id
			WHERE ur.user_id = $1 AND r.name = $2
		)`

	var hasRole bool
	row := r.ExecuteQueryRow(ctx, query, userID, roleName)

	if err := row.Scan(&hasRole); err != nil {
		return false, r.HandleSQLError(err, "check user has role")
	}

	return hasRole, nil
}
