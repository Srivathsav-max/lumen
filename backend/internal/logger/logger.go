package logger

import (
	"context"
	"log/slog"
	"os"
	"strings"
	"time"
)

// LogLevel represents the logging level
type LogLevel string

const (
	LevelDebug LogLevel = "debug"
	LevelInfo  LogLevel = "info"
	LevelWarn  LogLevel = "warn"
	LevelError LogLevel = "error"
)

// Config holds logger configuration
type Config struct {
	Level  LogLevel `validate:"required,oneof=debug info warn error"`
	Format string   `validate:"required,oneof=json text"`
}

// New creates a new structured logger
func New(config Config) *slog.Logger {
	// Parse log level
	var level slog.Level
	switch strings.ToLower(string(config.Level)) {
	case "debug":
		level = slog.LevelDebug
	case "info":
		level = slog.LevelInfo
	case "warn":
		level = slog.LevelWarn
	case "error":
		level = slog.LevelError
	default:
		level = slog.LevelInfo
	}

	// Create handler options
	opts := &slog.HandlerOptions{
		Level: level,
		AddSource: level == slog.LevelDebug, // Add source info for debug level
	}

	// Create handler based on format
	var handler slog.Handler
	switch strings.ToLower(config.Format) {
	case "json":
		handler = slog.NewJSONHandler(os.Stdout, opts)
	case "text":
		handler = slog.NewTextHandler(os.Stdout, opts)
	default:
		handler = slog.NewJSONHandler(os.Stdout, opts)
	}

	return slog.New(handler)
}

// NewDefault creates a logger with default configuration
func NewDefault() *slog.Logger {
	return New(Config{
		Level:  LevelInfo,
		Format: "json",
	})
}

// ContextLogger provides logging with context awareness
type ContextLogger struct {
	*slog.Logger
	ctx context.Context
}

// NewContextLogger creates a logger with context
func NewContextLogger(logger *slog.Logger, ctx context.Context) *ContextLogger {
	return &ContextLogger{
		Logger: logger,
		ctx:    ctx,
	}
}

// WithContext creates a new logger with the given context
func (l *ContextLogger) WithContext(ctx context.Context) *ContextLogger {
	return &ContextLogger{
		Logger: l.Logger,
		ctx:    ctx,
	}
}

// WithRequestID adds request ID to the logger context
func (l *ContextLogger) WithRequestID(requestID string) *ContextLogger {
	return &ContextLogger{
		Logger: l.Logger.With("request_id", requestID),
		ctx:    l.ctx,
	}
}

// WithUserID adds user ID to the logger context
func (l *ContextLogger) WithUserID(userID int64) *ContextLogger {
	return &ContextLogger{
		Logger: l.Logger.With("user_id", userID),
		ctx:    l.ctx,
	}
}

// WithOperation adds operation name to the logger context
func (l *ContextLogger) WithOperation(operation string) *ContextLogger {
	return &ContextLogger{
		Logger: l.Logger.With("operation", operation),
		ctx:    l.ctx,
	}
}

// Performance logging utilities

// LogDuration logs the duration of an operation
func (l *ContextLogger) LogDuration(operation string, start time.Time, args ...any) {
	duration := time.Since(start)
	allArgs := append([]any{"operation", operation, "duration_ms", duration.Milliseconds()}, args...)
	l.Info("Operation completed", allArgs...)
}

// LogSlowOperation logs operations that exceed a threshold
func (l *ContextLogger) LogSlowOperation(operation string, start time.Time, threshold time.Duration, args ...any) {
	duration := time.Since(start)
	if duration > threshold {
		allArgs := append([]any{"operation", operation, "duration_ms", duration.Milliseconds(), "threshold_ms", threshold.Milliseconds()}, args...)
		l.Warn("Slow operation detected", allArgs...)
	}
}

// LogDatabaseOperation logs database operations with performance metrics
func (l *ContextLogger) LogDatabaseOperation(operation string, query string, start time.Time, rowsAffected int64, err error) {
	duration := time.Since(start)
	args := []any{
		"operation", operation,
		"duration_ms", duration.Milliseconds(),
		"rows_affected", rowsAffected,
	}

	// Add query for debug level
	if l.Logger.Enabled(l.ctx, slog.LevelDebug) {
		args = append(args, "query", query)
	}

	if err != nil {
		args = append(args, "error", err.Error())
		l.Error("Database operation failed", args...)
	} else {
		l.Info("Database operation completed", args...)
		
		// Log slow queries (>100ms)
		if duration > 100*time.Millisecond {
			l.Warn("Slow database query detected", args...)
		}
	}
}

// LogAPIRequest logs HTTP API requests with performance metrics
func (l *ContextLogger) LogAPIRequest(method, path string, statusCode int, start time.Time, userAgent, clientIP string) {
	duration := time.Since(start)
	args := []any{
		"method", method,
		"path", path,
		"status_code", statusCode,
		"duration_ms", duration.Milliseconds(),
		"user_agent", userAgent,
		"client_ip", clientIP,
	}

	if statusCode >= 500 {
		l.Error("API request failed", args...)
	} else if statusCode >= 400 {
		l.Warn("API request error", args...)
	} else {
		l.Info("API request completed", args...)
	}

	// Log slow requests (>1s)
	if duration > time.Second {
		l.Warn("Slow API request detected", args...)
	}
}

// LogServiceOperation logs service layer operations
func (l *ContextLogger) LogServiceOperation(service, operation string, start time.Time, err error, args ...any) {
	duration := time.Since(start)
	allArgs := append([]any{
		"service", service,
		"operation", operation,
		"duration_ms", duration.Milliseconds(),
	}, args...)

	if err != nil {
		allArgs = append(allArgs, "error", err.Error())
		l.Error("Service operation failed", allArgs...)
	} else {
		l.Info("Service operation completed", allArgs...)
	}
}