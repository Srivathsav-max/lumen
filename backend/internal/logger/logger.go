package logger

import (
	"context"
	"log/slog"
	"os"
	"strings"
	"time"
)

type LogLevel string

const (
	LevelDebug LogLevel = "debug"
	LevelInfo  LogLevel = "info"
	LevelWarn  LogLevel = "warn"
	LevelError LogLevel = "error"
)

type Config struct {
	Level  LogLevel `validate:"required,oneof=debug info warn error"`
	Format string   `validate:"required,oneof=json text"`
}

func New(config Config) *slog.Logger {
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

	opts := &slog.HandlerOptions{
		Level:     level,
		AddSource: level == slog.LevelDebug,
	}

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

func NewDefault() *slog.Logger {
	return New(Config{
		Level:  LevelInfo,
		Format: "json",
	})
}

type ContextLogger struct {
	*slog.Logger
	ctx context.Context
}

func NewContextLogger(logger *slog.Logger, ctx context.Context) *ContextLogger {
	return &ContextLogger{
		Logger: logger,
		ctx:    ctx,
	}
}

func (l *ContextLogger) WithContext(ctx context.Context) *ContextLogger {
	return &ContextLogger{
		Logger: l.Logger,
		ctx:    ctx,
	}
}

func (l *ContextLogger) WithRequestID(requestID string) *ContextLogger {
	return &ContextLogger{
		Logger: l.Logger.With("request_id", requestID),
		ctx:    l.ctx,
	}
}

func (l *ContextLogger) WithUserID(userID int64) *ContextLogger {
	return &ContextLogger{
		Logger: l.Logger.With("user_id", userID),
		ctx:    l.ctx,
	}
}

func (l *ContextLogger) WithOperation(operation string) *ContextLogger {
	return &ContextLogger{
		Logger: l.Logger.With("operation", operation),
		ctx:    l.ctx,
	}
}

func (l *ContextLogger) LogDuration(operation string, start time.Time, args ...any) {
	duration := time.Since(start)
	allArgs := append([]any{"operation", operation, "duration_ms", duration.Milliseconds()}, args...)
	l.Info("Operation completed", allArgs...)
}

func (l *ContextLogger) LogSlowOperation(operation string, start time.Time, threshold time.Duration, args ...any) {
	duration := time.Since(start)
	if duration > threshold {
		allArgs := append([]any{"operation", operation, "duration_ms", duration.Milliseconds(), "threshold_ms", threshold.Milliseconds()}, args...)
		l.Warn("Slow operation detected", allArgs...)
	}
}

func (l *ContextLogger) LogDatabaseOperation(operation string, query string, start time.Time, rowsAffected int64, err error) {
	duration := time.Since(start)
	args := []any{
		"operation", operation,
		"duration_ms", duration.Milliseconds(),
		"rows_affected", rowsAffected,
	}

	if l.Logger.Enabled(l.ctx, slog.LevelDebug) {
		args = append(args, "query", query)
	}

	if err != nil {
		args = append(args, "error", err.Error())
		l.Error("Database operation failed", args...)
	} else {
		l.Info("Database operation completed", args...)

		if duration > 100*time.Millisecond {
			l.Warn("Slow database query detected", args...)
		}
	}
}

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

	if duration > time.Second {
		l.Warn("Slow API request detected", args...)
	}
}

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
