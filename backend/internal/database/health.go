package database

import (
	"context"
	"fmt"
	"log/slog"
)

type HealthChecker struct {
	manager Manager
	logger  *slog.Logger
}

func NewHealthChecker(manager Manager, logger *slog.Logger) *HealthChecker {
	return &HealthChecker{
		manager: manager,
		logger:  logger,
	}
}

func (h *HealthChecker) Check(ctx context.Context) error {
	return h.manager.Health()
}

func (h *HealthChecker) Name() string {
	return "database"
}

func (h *HealthChecker) DetailedCheck(ctx context.Context) map[string]interface{} {
	result := make(map[string]interface{})

	if err := h.manager.Health(); err != nil {
		result["status"] = "unhealthy"
		result["error"] = err.Error()
		return result
	}

	result["status"] = "healthy"

	if pgManager, ok := h.manager.(*PostgresManager); ok {
		stats := pgManager.GetStats()
		result["stats"] = map[string]interface{}{
			"open_connections":     stats.OpenConnections,
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

func (h *HealthChecker) CheckWithTimeout(ctx context.Context) error {
	select {
	case <-ctx.Done():
		return fmt.Errorf("health check timed out: %w", ctx.Err())
	default:
		return h.Check(ctx)
	}
}
