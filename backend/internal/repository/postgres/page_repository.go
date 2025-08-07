package postgres

import (
	"context"
	"database/sql"
	"encoding/json"
	"log/slog"
	"time"

	"github.com/google/uuid"

	"github.com/Srivathsav-max/lumen/backend/internal/database"
	"github.com/Srivathsav-max/lumen/backend/internal/repository"
)

type PageRepository struct {
	*repository.BaseRepository
}

func NewPageRepository(db database.Manager, logger *slog.Logger) repository.PageRepository {
	return &PageRepository{
		BaseRepository: repository.NewBaseRepository(db, logger, "pages"),
	}
}

func (r *PageRepository) Create(ctx context.Context, page *repository.Page) error {
	if page.ID == "" {
		page.ID = uuid.New().String()
	}

	query := `
		INSERT INTO pages (id, title, workspace_id, owner_id, parent_id, icon, cover_url, 
						  is_archived, is_template, properties, created_at, updated_at, last_edited_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`

	now := time.Now().UTC()
	page.CreatedAt = now
	page.UpdatedAt = now

	if len(page.Properties) == 0 {
		page.Properties = json.RawMessage("{}")
	}

	_, err := r.ExecuteCommand(ctx, query,
		page.ID,
		page.Title,
		page.WorkspaceID,
		page.OwnerID,
		page.ParentID,
		page.Icon,
		page.CoverURL,
		page.IsArchived,
		page.IsTemplate,
		page.Properties,
		page.CreatedAt,
		page.UpdatedAt,
		page.LastEditedBy,
	)

	if err != nil {
		return r.HandleSQLError(err, "create page")
	}

	r.GetLogger().Info("Page created successfully",
		"page_id", page.ID,
		"title", page.Title,
		"workspace_id", page.WorkspaceID,
		"owner_id", page.OwnerID)

	return nil
}

func (r *PageRepository) GetByID(ctx context.Context, id string) (*repository.Page, error) {
	query := `
		SELECT id, title, workspace_id, owner_id, parent_id, icon, cover_url,
			   is_archived, is_template, properties, created_at, updated_at, last_edited_by
		FROM pages 
		WHERE id = $1`

	page := &repository.Page{}
	row := r.ExecuteQueryRow(ctx, query, id)

	err := row.Scan(
		&page.ID,
		&page.Title,
		&page.WorkspaceID,
		&page.OwnerID,
		&page.ParentID,
		&page.Icon,
		&page.CoverURL,
		&page.IsArchived,
		&page.IsTemplate,
		&page.Properties,
		&page.CreatedAt,
		&page.UpdatedAt,
		&page.LastEditedBy,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, r.HandleSQLError(err, "get page by id")
	}

	return page, nil
}

func (r *PageRepository) GetByWorkspaceID(ctx context.Context, workspaceID int64, includeArchived bool) ([]*repository.Page, error) {
	query := `
		SELECT id, title, workspace_id, owner_id, parent_id, icon, cover_url,
			   is_archived, is_template, properties, created_at, updated_at, last_edited_by
		FROM pages 
		WHERE workspace_id = $1`

	if !includeArchived {
		query += ` AND is_archived = FALSE`
	}

	query += ` ORDER BY updated_at DESC`

	rows, err := r.ExecuteQuery(ctx, query, workspaceID)
	if err != nil {
		return nil, r.HandleSQLError(err, "get pages by workspace id")
	}
	defer rows.Close()

	var pages []*repository.Page
	for rows.Next() {
		page := &repository.Page{}
		err := rows.Scan(
			&page.ID,
			&page.Title,
			&page.WorkspaceID,
			&page.OwnerID,
			&page.ParentID,
			&page.Icon,
			&page.CoverURL,
			&page.IsArchived,
			&page.IsTemplate,
			&page.Properties,
			&page.CreatedAt,
			&page.UpdatedAt,
			&page.LastEditedBy,
		)
		if err != nil {
			return nil, r.HandleSQLError(err, "scan page")
		}
		pages = append(pages, page)
	}

	return pages, nil
}

func (r *PageRepository) GetByParentID(ctx context.Context, parentID string, includeArchived bool) ([]*repository.Page, error) {
	query := `
		SELECT id, title, workspace_id, owner_id, parent_id, icon, cover_url,
			   is_archived, is_template, properties, created_at, updated_at, last_edited_by
		FROM pages 
		WHERE parent_id = $1`

	if !includeArchived {
		query += ` AND is_archived = FALSE`
	}

	query += ` ORDER BY updated_at DESC`

	rows, err := r.ExecuteQuery(ctx, query, parentID)
	if err != nil {
		return nil, r.HandleSQLError(err, "get pages by parent id")
	}
	defer rows.Close()

	var pages []*repository.Page
	for rows.Next() {
		page := &repository.Page{}
		err := rows.Scan(
			&page.ID,
			&page.Title,
			&page.WorkspaceID,
			&page.OwnerID,
			&page.ParentID,
			&page.Icon,
			&page.CoverURL,
			&page.IsArchived,
			&page.IsTemplate,
			&page.Properties,
			&page.CreatedAt,
			&page.UpdatedAt,
			&page.LastEditedBy,
		)
		if err != nil {
			return nil, r.HandleSQLError(err, "scan page")
		}
		pages = append(pages, page)
	}

	return pages, nil
}

func (r *PageRepository) GetRootPages(ctx context.Context, workspaceID int64, includeArchived bool) ([]*repository.Page, error) {
	query := `
		SELECT id, title, workspace_id, owner_id, parent_id, icon, cover_url,
			   is_archived, is_template, properties, created_at, updated_at, last_edited_by
		FROM pages 
		WHERE workspace_id = $1 AND parent_id IS NULL`

	if !includeArchived {
		query += ` AND is_archived = FALSE`
	}

	query += ` ORDER BY updated_at DESC`

	rows, err := r.ExecuteQuery(ctx, query, workspaceID)
	if err != nil {
		return nil, r.HandleSQLError(err, "get root pages")
	}
	defer rows.Close()

	var pages []*repository.Page
	for rows.Next() {
		page := &repository.Page{}
		err := rows.Scan(
			&page.ID,
			&page.Title,
			&page.WorkspaceID,
			&page.OwnerID,
			&page.ParentID,
			&page.Icon,
			&page.CoverURL,
			&page.IsArchived,
			&page.IsTemplate,
			&page.Properties,
			&page.CreatedAt,
			&page.UpdatedAt,
			&page.LastEditedBy,
		)
		if err != nil {
			return nil, r.HandleSQLError(err, "scan page")
		}
		pages = append(pages, page)
	}

	return pages, nil
}

func (r *PageRepository) Update(ctx context.Context, page *repository.Page) error {
	query := `
		UPDATE pages 
		SET title = $1, icon = $2, cover_url = $3, is_template = $4, 
			properties = $5, updated_at = $6, last_edited_by = $7
		WHERE id = $8`

	page.UpdatedAt = time.Now().UTC()

	_, err := r.ExecuteCommand(ctx, query,
		page.Title,
		page.Icon,
		page.CoverURL,
		page.IsTemplate,
		page.Properties,
		page.UpdatedAt,
		page.LastEditedBy,
		page.ID,
	)

	if err != nil {
		return r.HandleSQLError(err, "update page")
	}

	r.GetLogger().Info("Page updated successfully", "page_id", page.ID)
	return nil
}

func (r *PageRepository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM pages WHERE id = $1`

	_, err := r.ExecuteCommand(ctx, query, id)
	if err != nil {
		return r.HandleSQLError(err, "delete page")
	}

	r.GetLogger().Info("Page deleted successfully", "page_id", id)
	return nil
}

func (r *PageRepository) Archive(ctx context.Context, id string, archivedBy int64) error {
	query := `
		UPDATE pages 
		SET is_archived = TRUE, updated_at = $1, last_edited_by = $2
		WHERE id = $3`

	now := time.Now().UTC()

	_, err := r.ExecuteCommand(ctx, query, now, archivedBy, id)
	if err != nil {
		return r.HandleSQLError(err, "archive page")
	}

	r.GetLogger().Info("Page archived successfully", "page_id", id, "archived_by", archivedBy)
	return nil
}

func (r *PageRepository) Restore(ctx context.Context, id string, restoredBy int64) error {
	query := `
		UPDATE pages 
		SET is_archived = FALSE, updated_at = $1, last_edited_by = $2
		WHERE id = $3`

	now := time.Now().UTC()

	_, err := r.ExecuteCommand(ctx, query, now, restoredBy, id)
	if err != nil {
		return r.HandleSQLError(err, "restore page")
	}

	r.GetLogger().Info("Page restored successfully", "page_id", id, "restored_by", restoredBy)
	return nil
}

func (r *PageRepository) Search(ctx context.Context, workspaceID int64, query string, limit, offset int) ([]*repository.Page, error) {
	sqlQuery := `
		SELECT id, title, workspace_id, owner_id, parent_id, icon, cover_url,
			   is_archived, is_template, properties, created_at, updated_at, last_edited_by
		FROM pages 
		WHERE workspace_id = $1 AND to_tsvector('english', title) @@ plainto_tsquery('english', $2)
		ORDER BY ts_rank(to_tsvector('english', title), plainto_tsquery('english', $2)) DESC
		LIMIT $3 OFFSET $4`

	rows, err := r.ExecuteQuery(ctx, sqlQuery, workspaceID, query, limit, offset)
	if err != nil {
		return nil, r.HandleSQLError(err, "search pages")
	}
	defer rows.Close()

	var pages []*repository.Page
	for rows.Next() {
		page := &repository.Page{}
		err := rows.Scan(
			&page.ID,
			&page.Title,
			&page.WorkspaceID,
			&page.OwnerID,
			&page.ParentID,
			&page.Icon,
			&page.CoverURL,
			&page.IsArchived,
			&page.IsTemplate,
			&page.Properties,
			&page.CreatedAt,
			&page.UpdatedAt,
			&page.LastEditedBy,
		)
		if err != nil {
			return nil, r.HandleSQLError(err, "scan page")
		}
		pages = append(pages, page)
	}

	return pages, nil
}

func (r *PageRepository) GetRecentPages(ctx context.Context, userID int64, limit int) ([]*repository.Page, error) {
	query := `
		SELECT DISTINCT p.id, p.title, p.workspace_id, p.owner_id, p.parent_id, p.icon, p.cover_url,
			   p.is_archived, p.is_template, p.properties, p.created_at, p.updated_at, p.last_edited_by
		FROM pages p
		INNER JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
		WHERE wm.user_id = $1 AND p.is_archived = FALSE
		ORDER BY p.updated_at DESC
		LIMIT $2`

	rows, err := r.ExecuteQuery(ctx, query, userID, limit)
	if err != nil {
		return nil, r.HandleSQLError(err, "get recent pages")
	}
	defer rows.Close()

	var pages []*repository.Page
	for rows.Next() {
		page := &repository.Page{}
		err := rows.Scan(
			&page.ID,
			&page.Title,
			&page.WorkspaceID,
			&page.OwnerID,
			&page.ParentID,
			&page.Icon,
			&page.CoverURL,
			&page.IsArchived,
			&page.IsTemplate,
			&page.Properties,
			&page.CreatedAt,
			&page.UpdatedAt,
			&page.LastEditedBy,
		)
		if err != nil {
			return nil, r.HandleSQLError(err, "scan page")
		}
		pages = append(pages, page)
	}

	return pages, nil
}

func (r *PageRepository) CreateVersion(ctx context.Context, version *repository.PageVersion) error {
	if version.ID == "" {
		version.ID = uuid.New().String()
	}

	query := `
		INSERT INTO page_versions (id, page_id, version_number, title, content, change_summary, created_by, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`

	version.CreatedAt = time.Now().UTC()

	_, err := r.ExecuteCommand(ctx, query,
		version.ID,
		version.PageID,
		version.VersionNumber,
		version.Title,
		version.Content,
		version.ChangeSummary,
		version.CreatedBy,
		version.CreatedAt,
	)

	if err != nil {
		return r.HandleSQLError(err, "create page version")
	}

	r.GetLogger().Info("Page version created successfully",
		"version_id", version.ID,
		"page_id", version.PageID,
		"version_number", version.VersionNumber)

	return nil
}

func (r *PageRepository) GetVersions(ctx context.Context, pageID string, limit, offset int) ([]*repository.PageVersion, error) {
	query := `
		SELECT id, page_id, version_number, title, content, change_summary, created_by, created_at
		FROM page_versions
		WHERE page_id = $1
		ORDER BY version_number DESC
		LIMIT $2 OFFSET $3`

	rows, err := r.ExecuteQuery(ctx, query, pageID, limit, offset)
	if err != nil {
		return nil, r.HandleSQLError(err, "get page versions")
	}
	defer rows.Close()

	var versions []*repository.PageVersion
	for rows.Next() {
		version := &repository.PageVersion{}
		err := rows.Scan(
			&version.ID,
			&version.PageID,
			&version.VersionNumber,
			&version.Title,
			&version.Content,
			&version.ChangeSummary,
			&version.CreatedBy,
			&version.CreatedAt,
		)
		if err != nil {
			return nil, r.HandleSQLError(err, "scan page version")
		}
		versions = append(versions, version)
	}

	return versions, nil
}

func (r *PageRepository) GetVersion(ctx context.Context, pageID string, versionNumber int) (*repository.PageVersion, error) {
	query := `
		SELECT id, page_id, version_number, title, content, change_summary, created_by, created_at
		FROM page_versions
		WHERE page_id = $1 AND version_number = $2`

	version := &repository.PageVersion{}
	row := r.ExecuteQueryRow(ctx, query, pageID, versionNumber)

	err := row.Scan(
		&version.ID,
		&version.PageID,
		&version.VersionNumber,
		&version.Title,
		&version.Content,
		&version.ChangeSummary,
		&version.CreatedBy,
		&version.CreatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, r.HandleSQLError(err, "get page version")
	}

	return version, nil
}

func (r *PageRepository) GetUserPermission(ctx context.Context, pageID string, userID int64) (*repository.PagePermission, error) {
	query := `
		SELECT id, page_id, user_id, permission, granted_by, created_at, updated_at
		FROM page_permissions
		WHERE page_id = $1 AND user_id = $2`

	permission := &repository.PagePermission{}
	row := r.ExecuteQueryRow(ctx, query, pageID, userID)

	err := row.Scan(
		&permission.ID,
		&permission.PageID,
		&permission.UserID,
		&permission.Permission,
		&permission.GrantedBy,
		&permission.CreatedAt,
		&permission.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, r.HandleSQLError(err, "get user permission")
	}

	return permission, nil
}

func (r *PageRepository) GrantPermission(ctx context.Context, permission *repository.PagePermission) error {
	query := `
		INSERT INTO page_permissions (page_id, user_id, permission, granted_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (page_id, user_id) 
		DO UPDATE SET permission = $3, granted_by = $4, updated_at = $6
		RETURNING id`

	now := time.Now().UTC()
	permission.CreatedAt = now
	permission.UpdatedAt = now

	row := r.ExecuteQueryRow(ctx, query,
		permission.PageID,
		permission.UserID,
		permission.Permission,
		permission.GrantedBy,
		permission.CreatedAt,
		permission.UpdatedAt,
	)

	if err := row.Scan(&permission.ID); err != nil {
		return r.HandleSQLError(err, "grant page permission")
	}

	r.GetLogger().Info("Page permission granted successfully",
		"page_id", permission.PageID,
		"user_id", permission.UserID,
		"permission", permission.Permission)

	return nil
}

func (r *PageRepository) RevokePermission(ctx context.Context, pageID string, userID int64) error {
	query := `DELETE FROM page_permissions WHERE page_id = $1 AND user_id = $2`

	_, err := r.ExecuteCommand(ctx, query, pageID, userID)
	if err != nil {
		return r.HandleSQLError(err, "revoke page permission")
	}

	r.GetLogger().Info("Page permission revoked successfully",
		"page_id", pageID,
		"user_id", userID)

	return nil
}

func (r *PageRepository) ListPermissions(ctx context.Context, pageID string) ([]*repository.PagePermission, error) {
	query := `
		SELECT id, page_id, user_id, permission, granted_by, created_at, updated_at
		FROM page_permissions
		WHERE page_id = $1
		ORDER BY created_at ASC`

	rows, err := r.ExecuteQuery(ctx, query, pageID)
	if err != nil {
		return nil, r.HandleSQLError(err, "list page permissions")
	}
	defer rows.Close()

	var permissions []*repository.PagePermission
	for rows.Next() {
		permission := &repository.PagePermission{}
		err := rows.Scan(
			&permission.ID,
			&permission.PageID,
			&permission.UserID,
			&permission.Permission,
			&permission.GrantedBy,
			&permission.CreatedAt,
			&permission.UpdatedAt,
		)
		if err != nil {
			return nil, r.HandleSQLError(err, "scan page permission")
		}
		permissions = append(permissions, permission)
	}

	return permissions, nil
}

func (r *PageRepository) HasPermission(ctx context.Context, pageID string, userID int64, requiredLevel repository.PermissionLevel) (bool, error) {
	// First check if user is the page owner
	pageQuery := `SELECT owner_id FROM pages WHERE id = $1`
	var ownerID int64
	if err := r.ExecuteQueryRow(ctx, pageQuery, pageID).Scan(&ownerID); err != nil {
		if err == sql.ErrNoRows {
			return false, nil
		}
		return false, r.HandleSQLError(err, "get page owner")
	}

	if ownerID == userID {
		return true, nil // Page owner has all permissions
	}

	// Check explicit page permissions
	permissionQuery := `
		SELECT permission 
		FROM page_permissions 
		WHERE page_id = $1 AND user_id = $2`

	var permission repository.PermissionLevel
	err := r.ExecuteQueryRow(ctx, permissionQuery, pageID, userID).Scan(&permission)
	if err != nil {
		if err == sql.ErrNoRows {
			// Check workspace membership for default access
			workspaceQuery := `
				SELECT EXISTS(
					SELECT 1 FROM pages p
					INNER JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
					WHERE p.id = $1 AND wm.user_id = $2
				)`

			var hasWorkspaceAccess bool
			if err := r.ExecuteQueryRow(ctx, workspaceQuery, pageID, userID).Scan(&hasWorkspaceAccess); err != nil {
				return false, r.HandleSQLError(err, "check workspace access")
			}

			if hasWorkspaceAccess && requiredLevel == repository.PermissionView {
				return true, nil // Default view access for workspace members
			}

			return false, nil
		}
		return false, r.HandleSQLError(err, "get page permission")
	}

	return r.hasRequiredPermissionLevel(permission, requiredLevel), nil
}

func (r *PageRepository) hasRequiredPermissionLevel(userLevel, requiredLevel repository.PermissionLevel) bool {
	permissionHierarchy := map[repository.PermissionLevel]int{
		repository.PermissionView:    1,
		repository.PermissionComment: 2,
		repository.PermissionEdit:    3,
		repository.PermissionAdmin:   4,
	}

	return permissionHierarchy[userLevel] >= permissionHierarchy[requiredLevel]
}