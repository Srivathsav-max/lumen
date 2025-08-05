package database

import (
	"context"
	"fmt"
	"log/slog"
)

// HealthChecker implements health checking for database
type HealthChecker struct {
	manager Manager
	logger  *slog.Logger
}

// NewHealthChecker creates a new database health checker
func NewHealthChecker(manager Manager, logger *slog.Logger) *HealthChecker {
	return &HealthChecker{
		manager: manager,
		logger:  logger,
	}
}

// Check performs a health check on the database
func (h *HealthChecker) Check(ctx context.Context) error {
	return h.manager.Health()
}

// Name returns the name of this health checker
func (h *HealthChecker) Name() string {
	return "database"
}

// DetailedCheck performs a more comprehensive health check
func (h *HealthChecker) DetailedCheck(ctx context.Context) map[string]interface{} {
	result := make(map[string]interface{})
	
	// Basic connectivity check
	if err := h.manager.Health(); err != nil {
		result["status"] = "unhealthy"
		result["error"] = err.Error()
		return result
	}

	result["status"] = "healthy"

	// Get connection statistics if available
	if pgManager, ok := h.manager.(*PostgresManager); ok {
		stats := pgManager.GetStats()
		result["stats"] = map[string]interface{}{
			"open_connections":      stats.OpenConnections,
			"in_use":               stats.InUse,
			"idle":                 stats.Idle,
			"wait_count":           stats.WaitCount,
			"wait_duration_ms":     stats.WaitDuration.Milliseconds(),
			"max_idle_closed":      stats.MaxIdleClosed,
			"max_idle_time_closed": stats.MaxIdleTimeClosed,
			"max_lifetime_closed":  stats.MaxLifetimeClosed,
		}
	}

	return result
}

// CheckWithTimeout performs a health check with a specific timeout
func (h *HealthChecker) CheckWithTimeout(ctx context.Context) error {
	select {
	case <-ctx.Done():
		return fmt.Errorf("health check timed out: %w", ctx.Err())
	default:
		return h.Check(ctx)
	}
}