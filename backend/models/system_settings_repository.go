package models

import (
	"database/sql"
	"errors"
	"time"
)

// ErrNotFound is returned when a resource is not found
var ErrNotFound = errors.New("resource not found")

// PostgresSystemSettingsRepository implements SystemSettingsRepository
type PostgresSystemSettingsRepository struct {
	DB *sql.DB
}

// NewPostgresSystemSettingsRepository creates a new PostgresSystemSettingsRepository
func NewPostgresSystemSettingsRepository(db *sql.DB) *PostgresSystemSettingsRepository {
	return &PostgresSystemSettingsRepository{
		DB: db,
	}
}

// GetByKey retrieves a system setting by key
func (r *PostgresSystemSettingsRepository) GetByKey(key string) (*SystemSetting, error) {
	query := `SELECT key, value, description, created_at, updated_at FROM system_settings WHERE key = $1`
	
	var setting SystemSetting
	err := r.DB.QueryRow(query, key).Scan(
		&setting.Key,
		&setting.Value,
		&setting.Description,
		&setting.CreatedAt,
		&setting.UpdatedAt,
	)
	
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrNotFound
		}
		return nil, err
	}
	
	return &setting, nil
}

// GetAll retrieves all system settings
func (r *PostgresSystemSettingsRepository) GetAll() ([]*SystemSetting, error) {
	query := `SELECT key, value, description, created_at, updated_at FROM system_settings`
	
	rows, err := r.DB.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var settings []*SystemSetting
	for rows.Next() {
		var setting SystemSetting
		err := rows.Scan(
			&setting.Key,
			&setting.Value,
			&setting.Description,
			&setting.CreatedAt,
			&setting.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		settings = append(settings, &setting)
	}
	
	if err = rows.Err(); err != nil {
		return nil, err
	}
	
	return settings, nil
}

// Update updates a system setting
func (r *PostgresSystemSettingsRepository) Update(setting *SystemSetting) error {
	query := `
		UPDATE system_settings 
		SET value = $2, updated_at = $3
		WHERE key = $1
	`
	
	now := time.Now().UTC()
	setting.UpdatedAt = now
	
	_, err := r.DB.Exec(query, setting.Key, setting.Value, now)
	return err
}
