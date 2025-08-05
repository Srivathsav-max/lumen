package postgres

import (
	"context"
	"database/sql"
	"log/slog"
	"time"

	"github.com/Srivathsav-max/lumen/backend/internal/database"
	"github.com/Srivathsav-max/lumen/backend/internal/repository"
)

// SystemSettingsRepository implements the SystemSettingsRepository interface for PostgreSQL
type SystemSettingsRepository struct {
	*repository.BaseRepository
}

// NewSystemSettingsRepository creates a new PostgreSQL system settings repository
func NewSystemSettingsRepository(db database.Manager, logger *slog.Logger) repository.SystemSettingsRepository {
	return &SystemSettingsRepository{
		BaseRepository: repository.NewBaseRepository(db, logger, "system_settings"),
	}
}

// Create creates a new system setting
func (r *SystemSettingsRepository) Create(ctx context.Context, setting *repository.SystemSetting) error {
	query := `
		INSERT INTO system_settings (key, value, description, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id`

	now := time.Now().UTC()
	setting.CreatedAt = now
	setting.UpdatedAt = now

	row := r.ExecuteQueryRow(ctx, query,
		setting.Key,
		setting.Value,
		setting.Description,
		setting.CreatedAt,
		setting.UpdatedAt,
	)

	if err := row.Scan(&setting.ID); err != nil {
		return r.HandleSQLError(err, "create system setting")
	}

	r.GetLogger().Info("System setting created successfully",
		"setting_id", setting.ID,
		"key", setting.Key,
	)

	return nil
}

// GetByKey retrieves a system setting by key
func (r *SystemSettingsRepository) GetByKey(ctx context.Context, key string) (*repository.SystemSetting, error) {
	query := `
		SELECT id, key, value, description, created_at, updated_at
		FROM system_settings
		WHERE key = $1`

	setting := &repository.SystemSetting{}
	row := r.ExecuteQueryRow(ctx, query, key)

	err := row.Scan(
		&setting.ID,
		&setting.Key,
		&setting.Value,
		&setting.Description,
		&setting.CreatedAt,
		&setting.UpdatedAt,
	)

	if err != nil {
		return nil, r.HandleSQLError(err, "get system setting by key")
	}

	return setting, nil
}

// Update updates a system setting
func (r *SystemSettingsRepository) Update(ctx context.Context, setting *repository.SystemSetting) error {
	query := `
		UPDATE system_settings
		SET key = $1, value = $2, description = $3, updated_at = $4
		WHERE id = $5`

	setting.UpdatedAt = time.Now().UTC()

	result, err := r.ExecuteExec(ctx, query,
		setting.Key,
		setting.Value,
		setting.Description,
		setting.UpdatedAt,
		setting.ID,
	)

	if err != nil {
		return r.HandleSQLError(err, "update system setting")
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return r.HandleSQLError(err, "get rows affected")
	}

	if rowsAffected == 0 {
		return r.HandleSQLError(sql.ErrNoRows, "update system setting")
	}

	r.GetLogger().Info("System setting updated successfully",
		"setting_id", setting.ID,
		"key", setting.Key,
	)

	return nil
}

// Delete deletes a system setting by key
func (r *SystemSettingsRepository) Delete(ctx context.Context, key string) error {
	query := `DELETE FROM system_settings WHERE key = $1`

	result, err := r.ExecuteExec(ctx, query, key)
	if err != nil {
		return r.HandleSQLError(err, "delete system setting")
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return r.HandleSQLError(err, "get rows affected")
	}

	if rowsAffected == 0 {
		return r.HandleSQLError(sql.ErrNoRows, "delete system setting")
	}

	r.GetLogger().Info("System setting deleted successfully", "key", key)
	return nil
}

// List retrieves all system settings
func (r *SystemSettingsRepository) List(ctx context.Context) ([]*repository.SystemSetting, error) {
	query := `
		SELECT id, key, value, description, created_at, updated_at
		FROM system_settings
		ORDER BY key`

	rows, err := r.ExecuteQuery(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var settings []*repository.SystemSetting
	for rows.Next() {
		setting := &repository.SystemSetting{}
		err := rows.Scan(
			&setting.ID,
			&setting.Key,
			&setting.Value,
			&setting.Description,
			&setting.CreatedAt,
			&setting.UpdatedAt,
		)
		if err != nil {
			return nil, r.HandleSQLError(err, "scan system setting")
		}
		settings = append(settings, setting)
	}

	if err := rows.Err(); err != nil {
		return nil, r.HandleSQLError(err, "iterate system settings")
	}

	return settings, nil
}

// GetAll retrieves all system settings (alias for List)
func (r *SystemSettingsRepository) GetAll(ctx context.Context) ([]*repository.SystemSetting, error) {
	return r.List(ctx)
}

// GetValue retrieves a system setting value by key
func (r *SystemSettingsRepository) GetValue(ctx context.Context, key string) (string, error) {
	query := `SELECT value FROM system_settings WHERE key = $1`

	var value string
	row := r.ExecuteQueryRow(ctx, query, key)

	if err := row.Scan(&value); err != nil {
		return "", r.HandleSQLError(err, "get system setting value")
	}

	return value, nil
}

// SetValue sets a system setting value by key (creates or updates)
func (r *SystemSettingsRepository) SetValue(ctx context.Context, key, value string) error {
	query := `
		INSERT INTO system_settings (key, value, created_at, updated_at)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (key) DO UPDATE SET
			value = EXCLUDED.value,
			updated_at = EXCLUDED.updated_at`

	now := time.Now().UTC()

	_, err := r.ExecuteExec(ctx, query, key, value, now, now)
	if err != nil {
		return r.HandleSQLError(err, "set system setting value")
	}

	r.GetLogger().Info("System setting value set successfully",
		"key", key,
		"value", value,
	)

	return nil
}