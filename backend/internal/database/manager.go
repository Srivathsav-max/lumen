package database

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"time"

	"github.com/Srivathsav-max/lumen/backend/internal/errors"
)

type Manager interface {
	GetDB() *sql.DB
	GetConnection() *sql.DB
	BeginTx(ctx context.Context) (*sql.Tx, error)
	WithTransaction(ctx context.Context, fn func(*sql.Tx) error) error
	Health() error
	Close() error
}

type PostgresManager struct {
	db     *sql.DB
	logger *slog.Logger
}

func NewPostgresManager(db *sql.DB, logger *slog.Logger) *PostgresManager {
	return &PostgresManager{
		db:     db,
		logger: logger,
	}
}

func (m *PostgresManager) GetDB() *sql.DB {
	return m.db
}

func (m *PostgresManager) GetConnection() *sql.DB {
	return m.db
}

func (m *PostgresManager) BeginTx(ctx context.Context) (*sql.Tx, error) {
	tx, err := m.db.BeginTx(ctx, nil)
	if err != nil {
		m.logger.Error("Failed to begin transaction", "error", err)
		return nil, errors.NewDatabaseError("Failed to begin transaction", err)
	}

	m.logger.Debug("Transaction started")
	return tx, nil
}

func (m *PostgresManager) WithTransaction(ctx context.Context, fn func(*sql.Tx) error) error {
	tx, err := m.BeginTx(ctx)
	if err != nil {
		return err
	}

	defer func() {
		if p := recover(); p != nil {
			if rollbackErr := tx.Rollback(); rollbackErr != nil {
				m.logger.Error("Failed to rollback transaction after panic",
					"panic", p,
					"rollback_error", rollbackErr,
				)
			}
			panic(p)
		}
	}()

	if err := fn(tx); err != nil {
		if rollbackErr := tx.Rollback(); rollbackErr != nil {
			m.logger.Error("Failed to rollback transaction",
				"original_error", err,
				"rollback_error", rollbackErr,
			)
			return errors.NewDatabaseError("Transaction failed and rollback failed", rollbackErr)
		}
		m.logger.Debug("Transaction rolled back due to error", "error", err)
		return err
	}

	if err := tx.Commit(); err != nil {
		m.logger.Error("Failed to commit transaction", "error", err)
		return errors.NewDatabaseError("Failed to commit transaction", err)
	}

	m.logger.Debug("Transaction committed successfully")
	return nil
}

func (m *PostgresManager) Health() error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := m.db.PingContext(ctx); err != nil {
		m.logger.Error("Database health check failed", "error", err)
		return errors.NewDatabaseError("Database health check failed", err)
	}

	var result int
	if err := m.db.QueryRowContext(ctx, "SELECT 1").Scan(&result); err != nil {
		m.logger.Error("Database query health check failed", "error", err)
		return errors.NewDatabaseError("Database query health check failed", err)
	}

	if result != 1 {
		err := fmt.Errorf("unexpected result from health check query: %d", result)
		m.logger.Error("Database health check returned unexpected result", "result", result)
		return errors.NewDatabaseError("Database health check failed", err)
	}

	return nil
}

func (m *PostgresManager) Close() error {
	if err := m.db.Close(); err != nil {
		m.logger.Error("Failed to close database connection", "error", err)
		return errors.NewDatabaseError("Failed to close database connection", err)
	}

	m.logger.Info("Database connection closed successfully")
	return nil
}

func (m *PostgresManager) GetStats() sql.DBStats {
	return m.db.Stats()
}

func (m *PostgresManager) LogStats() {
	stats := m.GetStats()
	m.logger.Info("Database connection statistics",
		"open_connections", stats.OpenConnections,
		"in_use", stats.InUse,
		"idle", stats.Idle,
		"wait_count", stats.WaitCount,
		"wait_duration", stats.WaitDuration,
		"max_idle_closed", stats.MaxIdleClosed,
		"max_idle_time_closed", stats.MaxIdleTimeClosed,
		"max_lifetime_closed", stats.MaxLifetimeClosed,
	)
}
