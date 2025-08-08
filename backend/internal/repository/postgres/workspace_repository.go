package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"time"

	"github.com/Srivathsav-max/lumen/backend/internal/database"
	"github.com/Srivathsav-max/lumen/backend/internal/repository"
)

type WorkspaceRepository struct {
	*repository.BaseRepository
}

func NewWorkspaceRepository(db database.Manager, logger *slog.Logger) repository.WorkspaceRepository {
	return &WorkspaceRepository{
		BaseRepository: repository.NewBaseRepository(db, logger, "workspaces"),
	}
}

func (r *WorkspaceRepository) Create(ctx context.Context, workspace *repository.Workspace) error {
	query := `
		INSERT INTO workspaces (name, description, owner_id, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id`

	now := time.Now().UTC()
	workspace.CreatedAt = now
	workspace.UpdatedAt = now

	row := r.ExecuteQueryRow(ctx, query,
		workspace.Name,
		workspace.Description,
		workspace.OwnerID,
		workspace.CreatedAt,
		workspace.UpdatedAt,
	)

	if err := row.Scan(&workspace.ID); err != nil {
		return r.HandleSQLError(err, "create workspace")
	}

	// Automatically add owner as a member with owner role
	member := &repository.WorkspaceMember{
		WorkspaceID: workspace.ID,
		UserID:      workspace.OwnerID,
		Role:        repository.WorkspaceRoleOwner,
		AddedBy:     workspace.OwnerID,
	}

	if err := r.AddMember(ctx, member); err != nil {
		return fmt.Errorf("failed to add owner as member: %w", err)
	}

	r.GetLogger().Info("Workspace created successfully",
		"workspace_id", workspace.ID,
		"name", workspace.Name,
		"owner_id", workspace.OwnerID)

	return nil
}

func (r *WorkspaceRepository) GetByID(ctx context.Context, id int64) (*repository.Workspace, error) {
	query := `
		SELECT id, name, description, owner_id, created_at, updated_at
		FROM workspaces 
		WHERE id = $1`

	workspace := &repository.Workspace{}
	row := r.ExecuteQueryRow(ctx, query, id)

	err := row.Scan(
		&workspace.ID,
		&workspace.Name,
		&workspace.Description,
		&workspace.OwnerID,
		&workspace.CreatedAt,
		&workspace.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, r.HandleSQLError(err, "get workspace by id")
	}

	return workspace, nil
}

func (r *WorkspaceRepository) GetByOwnerID(ctx context.Context, ownerID int64) ([]*repository.Workspace, error) {
	query := `
		SELECT id, name, description, owner_id, created_at, updated_at
		FROM workspaces 
		WHERE owner_id = $1
		ORDER BY created_at DESC`

	rows, err := r.ExecuteQuery(ctx, query, ownerID)
	if err != nil {
		return nil, r.HandleSQLError(err, "get workspaces by owner id")
	}
	defer rows.Close()

	var workspaces []*repository.Workspace
	for rows.Next() {
		workspace := &repository.Workspace{}
		err := rows.Scan(
			&workspace.ID,
			&workspace.Name,
			&workspace.Description,
			&workspace.OwnerID,
			&workspace.CreatedAt,
			&workspace.UpdatedAt,
		)
		if err != nil {
			return nil, r.HandleSQLError(err, "scan workspace")
		}
		workspaces = append(workspaces, workspace)
	}

	return workspaces, nil
}

func (r *WorkspaceRepository) Update(ctx context.Context, workspace *repository.Workspace) error {
	query := `
		UPDATE workspaces 
		SET name = $1, description = $2, updated_at = $3
		WHERE id = $4`

	workspace.UpdatedAt = time.Now().UTC()

	_, err := r.ExecuteCommand(ctx, query,
		workspace.Name,
		workspace.Description,
		workspace.UpdatedAt,
		workspace.ID,
	)

	if err != nil {
		return r.HandleSQLError(err, "update workspace")
	}

	r.GetLogger().Info("Workspace updated successfully", "workspace_id", workspace.ID)
	return nil
}

func (r *WorkspaceRepository) Delete(ctx context.Context, id int64) error {
	query := `DELETE FROM workspaces WHERE id = $1`

	_, err := r.ExecuteCommand(ctx, query, id)
	if err != nil {
		return r.HandleSQLError(err, "delete workspace")
	}

	r.GetLogger().Info("Workspace deleted successfully", "workspace_id", id)
	return nil
}

func (r *WorkspaceRepository) List(ctx context.Context, limit, offset int) ([]*repository.Workspace, error) {
	query := `
		SELECT id, name, description, owner_id, created_at, updated_at
		FROM workspaces 
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2`

	rows, err := r.ExecuteQuery(ctx, query, limit, offset)
	if err != nil {
		return nil, r.HandleSQLError(err, "list workspaces")
	}
	defer rows.Close()

	var workspaces []*repository.Workspace
	for rows.Next() {
		workspace := &repository.Workspace{}
		err := rows.Scan(
			&workspace.ID,
			&workspace.Name,
			&workspace.Description,
			&workspace.OwnerID,
			&workspace.CreatedAt,
			&workspace.UpdatedAt,
		)
		if err != nil {
			return nil, r.HandleSQLError(err, "scan workspace")
		}
		workspaces = append(workspaces, workspace)
	}

	return workspaces, nil
}

func (r *WorkspaceRepository) GetUserWorkspaces(ctx context.Context, userID int64) ([]*repository.Workspace, error) {
	query := `
		SELECT DISTINCT w.id, w.name, w.description, w.owner_id, w.created_at, w.updated_at
		FROM workspaces w
		INNER JOIN workspace_members wm ON w.id = wm.workspace_id
		WHERE wm.user_id = $1
		ORDER BY w.updated_at DESC`

	rows, err := r.ExecuteQuery(ctx, query, userID)
	if err != nil {
		return nil, r.HandleSQLError(err, "get user workspaces")
	}
	defer rows.Close()

	var workspaces []*repository.Workspace
	for rows.Next() {
		workspace := &repository.Workspace{}
		err := rows.Scan(
			&workspace.ID,
			&workspace.Name,
			&workspace.Description,
			&workspace.OwnerID,
			&workspace.CreatedAt,
			&workspace.UpdatedAt,
		)
		if err != nil {
			return nil, r.HandleSQLError(err, "scan workspace")
		}
		workspaces = append(workspaces, workspace)
	}

	return workspaces, nil
}

func (r *WorkspaceRepository) AddMember(ctx context.Context, member *repository.WorkspaceMember) error {
	query := `
		INSERT INTO workspace_members (workspace_id, user_id, role, added_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id`

	now := time.Now().UTC()
	member.CreatedAt = now
	member.UpdatedAt = now

	row := r.ExecuteQueryRow(ctx, query,
		member.WorkspaceID,
		member.UserID,
		member.Role,
		member.AddedBy,
		member.CreatedAt,
		member.UpdatedAt,
	)

	if err := row.Scan(&member.ID); err != nil {
		return r.HandleSQLError(err, "add workspace member")
	}

	r.GetLogger().Info("Workspace member added successfully",
		"workspace_id", member.WorkspaceID,
		"user_id", member.UserID,
		"role", member.Role)

	return nil
}

func (r *WorkspaceRepository) RemoveMember(ctx context.Context, workspaceID, userID int64) error {
	query := `DELETE FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`

	_, err := r.ExecuteCommand(ctx, query, workspaceID, userID)
	if err != nil {
		return r.HandleSQLError(err, "remove workspace member")
	}

	r.GetLogger().Info("Workspace member removed successfully",
		"workspace_id", workspaceID,
		"user_id", userID)

	return nil
}

func (r *WorkspaceRepository) GetMembers(ctx context.Context, workspaceID int64) ([]*repository.WorkspaceMember, error) {
	query := `
		SELECT id, workspace_id, user_id, role, added_by, created_at, updated_at
		FROM workspace_members
		WHERE workspace_id = $1
		ORDER BY created_at ASC`

	rows, err := r.ExecuteQuery(ctx, query, workspaceID)
	if err != nil {
		return nil, r.HandleSQLError(err, "get workspace members")
	}
	defer rows.Close()

	var members []*repository.WorkspaceMember
	for rows.Next() {
		member := &repository.WorkspaceMember{}
		err := rows.Scan(
			&member.ID,
			&member.WorkspaceID,
			&member.UserID,
			&member.Role,
			&member.AddedBy,
			&member.CreatedAt,
			&member.UpdatedAt,
		)
		if err != nil {
			return nil, r.HandleSQLError(err, "scan workspace member")
		}
		members = append(members, member)
	}

	return members, nil
}

func (r *WorkspaceRepository) UpdateMemberRole(ctx context.Context, workspaceID, userID int64, role repository.WorkspaceRole) error {
	query := `
		UPDATE workspace_members 
		SET role = $1, updated_at = $2
		WHERE workspace_id = $3 AND user_id = $4`

	now := time.Now().UTC()

	_, err := r.ExecuteCommand(ctx, query, role, now, workspaceID, userID)
	if err != nil {
		return r.HandleSQLError(err, "update member role")
	}

	r.GetLogger().Info("Workspace member role updated successfully",
		"workspace_id", workspaceID,
		"user_id", userID,
		"role", role)

	return nil
}

func (r *WorkspaceRepository) HasAccess(ctx context.Context, workspaceID, userID int64) (bool, error) {
	query := `
		SELECT EXISTS(
			SELECT 1 FROM workspace_members 
			WHERE workspace_id = $1 AND user_id = $2
		)`

	var exists bool
	row := r.ExecuteQueryRow(ctx, query, workspaceID, userID)
	if err := row.Scan(&exists); err != nil {
		return false, r.HandleSQLError(err, "check workspace access")
	}

	return exists, nil
}