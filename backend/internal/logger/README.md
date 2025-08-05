# Logger Package

## Overview

The `logger` package provides structured logging capabilities for the Lumen backend application. It implements a high-performance, structured logging system with support for different log levels, output formats, and destinations.

## Purpose

- **Structured Logging**: JSON-formatted logs for better parsing and analysis
- **Performance Monitoring**: Request timing, database query logging, and performance metrics
- **Error Tracking**: Comprehensive error logging with context and stack traces
- **Audit Logging**: Security events, user actions, and system changes
- **Development Support**: Human-readable console output for development
- **Production Monitoring**: Integration with log aggregation systems

## Dependencies

### External Dependencies
```go
// Core logging
"log/slog"                    // Go's structured logging (Go 1.21+)
"context"                     // Context handling
"fmt"                         // String formatting
"io"                          // I/O operations
"os"                          // Operating system interface
"time"                        // Time handling
"runtime"                     // Runtime information

// Enhanced logging features
"github.com/rs/zerolog"       // High-performance structured logging
"github.com/sirupsen/logrus" // Alternative structured logging
"go.uber.org/zap"            // Ultra-fast structured logging

// Log rotation and management
"gopkg.in/natefinch/lumberjack.v2" // Log rotation
"github.com/pkg/errors"             // Enhanced error handling
```

### Internal Dependencies
```go
"github.com/Srivathsav-max/lumen/backend/internal/config" // Configuration management
"github.com/Srivathsav-max/lumen/backend/internal/errors" // Error types
```

## Logger Structure

### Core Logger Interface
```go
type Logger interface {
    // Basic logging methods
    Debug(msg string, args ...interface{})
    Info(msg string, args ...interface{})
    Warn(msg string, args ...interface{})
    Error(msg string, args ...interface{})
    Fatal(msg string, args ...interface{})
    
    // Structured logging with context
    DebugContext(ctx context.Context, msg string, args ...interface{})
    InfoContext(ctx context.Context, msg string, args ...interface{})
    WarnContext(ctx context.Context, msg string, args ...interface{})
    ErrorContext(ctx context.Context, msg string, args ...interface{})
    
    // Logger configuration
    WithFields(fields map[string]interface{}) Logger
    WithField(key string, value interface{}) Logger
    WithError(err error) Logger
    WithContext(ctx context.Context) Logger
    
    // Specialized logging
    LogRequest(ctx context.Context, method, path string, statusCode int, duration time.Duration)
    LogQuery(ctx context.Context, query string, args []interface{}, duration time.Duration)
    LogSecurity(ctx context.Context, event string, details map[string]interface{})
    LogAudit(ctx context.Context, action string, userID string, details map[string]interface{})
}

type LogLevel int

const (
    LevelDebug LogLevel = iota
    LevelInfo
    LevelWarn
    LevelError
    LevelFatal
)

type LogFormat string

const (
    FormatJSON    LogFormat = "json"
    FormatConsole LogFormat = "console"
    FormatText    LogFormat = "text"
)
```

### Logger Implementation
```go
type logger struct {
    slogger *slog.Logger
    config  *LoggerConfig
    fields  map[string]interface{}
}

type LoggerConfig struct {
    Level      LogLevel  `yaml:"level" env:"LOG_LEVEL" default:"info"`
    Format     LogFormat `yaml:"format" env:"LOG_FORMAT" default:"json"`
    Output     string    `yaml:"output" env:"LOG_OUTPUT" default:"stdout"`
    
    // File output configuration
    File struct {
        Path       string `yaml:"path" env:"LOG_FILE_PATH" default:"logs/app.log"`
        MaxSize    int    `yaml:"max_size" env:"LOG_FILE_MAX_SIZE" default:"100"`    // MB
        MaxBackups int    `yaml:"max_backups" env:"LOG_FILE_MAX_BACKUPS" default:"3"`
        MaxAge     int    `yaml:"max_age" env:"LOG_FILE_MAX_AGE" default:"28"`       // days
        Compress   bool   `yaml:"compress" env:"LOG_FILE_COMPRESS" default:"true"`
    } `yaml:"file"`
    
    // Development settings
    Development bool `yaml:"development" env:"LOG_DEVELOPMENT" default:"false"`
    
    // Performance settings
    BufferSize int  `yaml:"buffer_size" env:"LOG_BUFFER_SIZE" default:"1000"`
    AsyncWrite bool `yaml:"async_write" env:"LOG_ASYNC_WRITE" default:"true"`
    
    // Context extraction
    IncludeRequestID bool `yaml:"include_request_id" env:"LOG_INCLUDE_REQUEST_ID" default:"true"`
    IncludeUserID    bool `yaml:"include_user_id" env:"LOG_INCLUDE_USER_ID" default:"true"`
    IncludeCaller    bool `yaml:"include_caller" env:"LOG_INCLUDE_CALLER" default:"false"`
    
    // Sampling (for high-volume logs)
    Sampling struct {
        Enabled    bool `yaml:"enabled" env:"LOG_SAMPLING_ENABLED" default:"false"`
        Initial    int  `yaml:"initial" env:"LOG_SAMPLING_INITIAL" default:"100"`
        Thereafter int  `yaml:"thereafter" env:"LOG_SAMPLING_THEREAFTER" default:"100"`
    } `yaml:"sampling"`
}

// NewLogger creates a new logger instance
func NewLogger(config *LoggerConfig) (Logger, error) {
    if config == nil {
        config = &LoggerConfig{}
        setDefaults(config)
    }
    
    // Create output writer
    writer, err := createWriter(config)
    if err != nil {
        return nil, fmt.Errorf("failed to create log writer: %w", err)
    }
    
    // Create handler based on format
    var handler slog.Handler
    switch config.Format {
    case FormatJSON:
        handler = slog.NewJSONHandler(writer, &slog.HandlerOptions{
            Level:     convertLogLevel(config.Level),
            AddSource: config.IncludeCaller,
        })
    case FormatConsole, FormatText:
        handler = slog.NewTextHandler(writer, &slog.HandlerOptions{
            Level:     convertLogLevel(config.Level),
            AddSource: config.IncludeCaller,
        })
    default:
        return nil, fmt.Errorf("unsupported log format: %s", config.Format)
    }
    
    // Wrap with custom handler for additional features
    if config.Development {
        handler = NewDevelopmentHandler(handler)
    }
    
    if config.Sampling.Enabled {
        handler = NewSamplingHandler(handler, config.Sampling.Initial, config.Sampling.Thereafter)
    }
    
    slogger := slog.New(handler)
    
    return &logger{
        slogger: slogger,
        config:  config,
        fields:  make(map[string]interface{}),
    }, nil
}

// createWriter creates the appropriate writer based on configuration
func createWriter(config *LoggerConfig) (io.Writer, error) {
    switch config.Output {
    case "stdout":
        return os.Stdout, nil
    case "stderr":
        return os.Stderr, nil
    case "file":
        return &lumberjack.Logger{
            Filename:   config.File.Path,
            MaxSize:    config.File.MaxSize,
            MaxBackups: config.File.MaxBackups,
            MaxAge:     config.File.MaxAge,
            Compress:   config.File.Compress,
        }, nil
    default:
        // Treat as file path
        return &lumberjack.Logger{
            Filename:   config.Output,
            MaxSize:    config.File.MaxSize,
            MaxBackups: config.File.MaxBackups,
            MaxAge:     config.File.MaxAge,
            Compress:   config.File.Compress,
        }, nil
    }
}
```

## Core Logging Methods

### 1. Basic Logging

```go
// Debug logs debug-level messages
func (l *logger) Debug(msg string, args ...interface{}) {
    l.slogger.Debug(msg, l.formatArgs(args...)...)
}

// Info logs info-level messages
func (l *logger) Info(msg string, args ...interface{}) {
    l.slogger.Info(msg, l.formatArgs(args...)...)
}

// Warn logs warning-level messages
func (l *logger) Warn(msg string, args ...interface{}) {
    l.slogger.Warn(msg, l.formatArgs(args...)...)
}

// Error logs error-level messages
func (l *logger) Error(msg string, args ...interface{}) {
    l.slogger.Error(msg, l.formatArgs(args...)...)
}

// Fatal logs fatal-level messages and exits
func (l *logger) Fatal(msg string, args ...interface{}) {
    l.slogger.Error(msg, l.formatArgs(args...)...)
    os.Exit(1)
}

// formatArgs converts variadic arguments to slog.Attr
func (l *logger) formatArgs(args ...interface{}) []slog.Attr {
    attrs := make([]slog.Attr, 0, len(args)/2+len(l.fields))
    
    // Add persistent fields
    for key, value := range l.fields {
        attrs = append(attrs, slog.Any(key, value))
    }
    
    // Add provided arguments
    for i := 0; i < len(args)-1; i += 2 {
        if key, ok := args[i].(string); ok {
            attrs = append(attrs, slog.Any(key, args[i+1]))
        }
    }
    
    return attrs
}
```

### 2. Context-Aware Logging

```go
// DebugContext logs debug messages with context
func (l *logger) DebugContext(ctx context.Context, msg string, args ...interface{}) {
    attrs := l.extractContextFields(ctx)
    attrs = append(attrs, l.formatArgs(args...)...)
    l.slogger.LogAttrs(ctx, slog.LevelDebug, msg, attrs...)
}

// InfoContext logs info messages with context
func (l *logger) InfoContext(ctx context.Context, msg string, args ...interface{}) {
    attrs := l.extractContextFields(ctx)
    attrs = append(attrs, l.formatArgs(args...)...)
    l.slogger.LogAttrs(ctx, slog.LevelInfo, msg, attrs...)
}

// WarnContext logs warning messages with context
func (l *logger) WarnContext(ctx context.Context, msg string, args ...interface{}) {
    attrs := l.extractContextFields(ctx)
    attrs = append(attrs, l.formatArgs(args...)...)
    l.slogger.LogAttrs(ctx, slog.LevelWarn, msg, attrs...)
}

// ErrorContext logs error messages with context
func (l *logger) ErrorContext(ctx context.Context, msg string, args ...interface{}) {
    attrs := l.extractContextFields(ctx)
    attrs = append(attrs, l.formatArgs(args...)...)
    l.slogger.LogAttrs(ctx, slog.LevelError, msg, attrs...)
}

// extractContextFields extracts relevant fields from context
func (l *logger) extractContextFields(ctx context.Context) []slog.Attr {
    var attrs []slog.Attr
    
    if l.config.IncludeRequestID {
        if requestID := ctx.Value("request_id"); requestID != nil {
            attrs = append(attrs, slog.String("request_id", fmt.Sprintf("%v", requestID)))
        }
    }
    
    if l.config.IncludeUserID {
        if userID := ctx.Value("user_id"); userID != nil {
            attrs = append(attrs, slog.String("user_id", fmt.Sprintf("%v", userID)))
        }
    }
    
    // Add trace ID if available
    if traceID := ctx.Value("trace_id"); traceID != nil {
        attrs = append(attrs, slog.String("trace_id", fmt.Sprintf("%v", traceID)))
    }
    
    return attrs
}
```

### 3. Logger Chaining

```go
// WithFields creates a new logger with additional fields
func (l *logger) WithFields(fields map[string]interface{}) Logger {
    newFields := make(map[string]interface{})
    
    // Copy existing fields
    for k, v := range l.fields {
        newFields[k] = v
    }
    
    // Add new fields
    for k, v := range fields {
        newFields[k] = v
    }
    
    return &logger{
        slogger: l.slogger,
        config:  l.config,
        fields:  newFields,
    }
}

// WithField creates a new logger with an additional field
func (l *logger) WithField(key string, value interface{}) Logger {
    return l.WithFields(map[string]interface{}{key: value})
}

// WithError creates a new logger with error information
func (l *logger) WithError(err error) Logger {
    fields := map[string]interface{}{
        "error": err.Error(),
    }
    
    // Add error type if it's an application error
    if appErr, ok := err.(errors.AppError); ok {
        fields["error_code"] = appErr.Code()
        fields["error_type"] = appErr.Type()
        fields["error_severity"] = appErr.Severity()
    }
    
    // Add stack trace in development
    if l.config.Development {
        if stackErr, ok := err.(interface{ StackTrace() errors.StackTrace }); ok {
            fields["stack_trace"] = fmt.Sprintf("%+v", stackErr.StackTrace())
        }
    }
    
    return l.WithFields(fields)
}

// WithContext creates a new logger with context
func (l *logger) WithContext(ctx context.Context) Logger {
    fields := make(map[string]interface{})
    
    // Extract context fields
    attrs := l.extractContextFields(ctx)
    for _, attr := range attrs {
        fields[attr.Key] = attr.Value.Any()
    }
    
    return l.WithFields(fields)
}
```

## Specialized Logging Methods

### 1. Request Logging

```go
// LogRequest logs HTTP request information
func (l *logger) LogRequest(ctx context.Context, method, path string, statusCode int, duration time.Duration) {
    level := slog.LevelInfo
    if statusCode >= 400 {
        level = slog.LevelWarn
    }
    if statusCode >= 500 {
        level = slog.LevelError
    }
    
    attrs := []slog.Attr{
        slog.String("type", "http_request"),
        slog.String("method", method),
        slog.String("path", path),
        slog.Int("status_code", statusCode),
        slog.Duration("duration", duration),
        slog.Float64("duration_ms", float64(duration.Nanoseconds())/1e6),
    }
    
    // Add context fields
    attrs = append(attrs, l.extractContextFields(ctx)...)
    
    // Add user agent and IP if available
    if userAgent := ctx.Value("user_agent"); userAgent != nil {
        attrs = append(attrs, slog.String("user_agent", fmt.Sprintf("%v", userAgent)))
    }
    
    if clientIP := ctx.Value("client_ip"); clientIP != nil {
        attrs = append(attrs, slog.String("client_ip", fmt.Sprintf("%v", clientIP)))
    }
    
    msg := fmt.Sprintf("%s %s %d", method, path, statusCode)
    l.slogger.LogAttrs(ctx, level, msg, attrs...)
}

// LogQuery logs database query information
func (l *logger) LogQuery(ctx context.Context, query string, args []interface{}, duration time.Duration) {
    level := slog.LevelDebug
    if duration > 100*time.Millisecond {
        level = slog.LevelWarn // Slow query
    }
    
    attrs := []slog.Attr{
        slog.String("type", "database_query"),
        slog.String("query", query),
        slog.Duration("duration", duration),
        slog.Float64("duration_ms", float64(duration.Nanoseconds())/1e6),
    }
    
    // Add query arguments in development mode
    if l.config.Development && len(args) > 0 {
        attrs = append(attrs, slog.Any("args", args))
    }
    
    // Add context fields
    attrs = append(attrs, l.extractContextFields(ctx)...)
    
    msg := "Database query executed"
    if duration > 100*time.Millisecond {
        msg = "Slow database query detected"
    }
    
    l.slogger.LogAttrs(ctx, level, msg, attrs...)
}
```

### 2. Security and Audit Logging

```go
// LogSecurity logs security-related events
func (l *logger) LogSecurity(ctx context.Context, event string, details map[string]interface{}) {
    attrs := []slog.Attr{
        slog.String("type", "security_event"),
        slog.String("event", event),
        slog.Time("timestamp", time.Now()),
    }
    
    // Add context fields
    attrs = append(attrs, l.extractContextFields(ctx)...)
    
    // Add event details
    for key, value := range details {
        attrs = append(attrs, slog.Any(key, value))
    }
    
    // Add client information
    if clientIP := ctx.Value("client_ip"); clientIP != nil {
        attrs = append(attrs, slog.String("client_ip", fmt.Sprintf("%v", clientIP)))
    }
    
    if userAgent := ctx.Value("user_agent"); userAgent != nil {
        attrs = append(attrs, slog.String("user_agent", fmt.Sprintf("%v", userAgent)))
    }
    
    msg := fmt.Sprintf("Security event: %s", event)
    l.slogger.LogAttrs(ctx, slog.LevelWarn, msg, attrs...)
}

// LogAudit logs audit trail events
func (l *logger) LogAudit(ctx context.Context, action string, userID string, details map[string]interface{}) {
    attrs := []slog.Attr{
        slog.String("type", "audit_event"),
        slog.String("action", action),
        slog.String("user_id", userID),
        slog.Time("timestamp", time.Now()),
    }
    
    // Add context fields
    attrs = append(attrs, l.extractContextFields(ctx)...)
    
    // Add action details
    for key, value := range details {
        attrs = append(attrs, slog.Any(key, value))
    }
    
    msg := fmt.Sprintf("Audit: %s by user %s", action, userID)
    l.slogger.LogAttrs(ctx, slog.LevelInfo, msg, attrs...)
}
```

## Custom Handlers

### 1. Development Handler

```go
// DevelopmentHandler enhances logs for development
type DevelopmentHandler struct {
    handler slog.Handler
}

func NewDevelopmentHandler(handler slog.Handler) *DevelopmentHandler {
    return &DevelopmentHandler{handler: handler}
}

func (h *DevelopmentHandler) Enabled(ctx context.Context, level slog.Level) bool {
    return h.handler.Enabled(ctx, level)
}

func (h *DevelopmentHandler) Handle(ctx context.Context, record slog.Record) error {
    // Add caller information
    if pc, file, line, ok := runtime.Caller(4); ok {
        fn := runtime.FuncForPC(pc)
        record.AddAttrs(
            slog.String("caller", fmt.Sprintf("%s:%d", file, line)),
            slog.String("function", fn.Name()),
        )
    }
    
    // Add goroutine ID
    record.AddAttrs(slog.Int64("goroutine_id", getGoroutineID()))
    
    return h.handler.Handle(ctx, record)
}

func (h *DevelopmentHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
    return &DevelopmentHandler{handler: h.handler.WithAttrs(attrs)}
}

func (h *DevelopmentHandler) WithGroup(name string) slog.Handler {
    return &DevelopmentHandler{handler: h.handler.WithGroup(name)}
}
```

### 2. Sampling Handler

```go
// SamplingHandler implements log sampling to reduce volume
type SamplingHandler struct {
    handler    slog.Handler
    initial    int
    thereafter int
    counter    int64
    mutex      sync.Mutex
}

func NewSamplingHandler(handler slog.Handler, initial, thereafter int) *SamplingHandler {
    return &SamplingHandler{
        handler:    handler,
        initial:    initial,
        thereafter: thereafter,
    }
}

func (h *SamplingHandler) Enabled(ctx context.Context, level slog.Level) bool {
    return h.handler.Enabled(ctx, level)
}

func (h *SamplingHandler) Handle(ctx context.Context, record slog.Record) error {
    h.mutex.Lock()
    defer h.mutex.Unlock()
    
    h.counter++
    
    // Always log the first 'initial' messages
    if h.counter <= int64(h.initial) {
        return h.handler.Handle(ctx, record)
    }
    
    // After initial, log every 'thereafter' message
    if (h.counter-int64(h.initial))%int64(h.thereafter) == 0 {
        return h.handler.Handle(ctx, record)
    }
    
    return nil
}

func (h *SamplingHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
    return &SamplingHandler{
        handler:    h.handler.WithAttrs(attrs),
        initial:    h.initial,
        thereafter: h.thereafter,
    }
}

func (h *SamplingHandler) WithGroup(name string) slog.Handler {
    return &SamplingHandler{
        handler:    h.handler.WithGroup(name),
        initial:    h.initial,
        thereafter: h.thereafter,
    }
}
```

## Utility Functions

### 1. Logger Factory

```go
// NewNoop creates a no-op logger for testing
func NewNoop() Logger {
    return &logger{
        slogger: slog.New(slog.NewTextHandler(io.Discard, nil)),
        config:  &LoggerConfig{},
        fields:  make(map[string]interface{}),
    }
}

// NewDefault creates a logger with default configuration
func NewDefault() Logger {
    config := &LoggerConfig{
        Level:       LevelInfo,
        Format:      FormatJSON,
        Output:      "stdout",
        Development: false,
    }
    
    logger, _ := NewLogger(config)
    return logger
}

// NewDevelopment creates a logger optimized for development
func NewDevelopment() Logger {
    config := &LoggerConfig{
        Level:         LevelDebug,
        Format:        FormatConsole,
        Output:        "stdout",
        Development:   true,
        IncludeCaller: true,
    }
    
    logger, _ := NewLogger(config)
    return logger
}

// FromConfig creates a logger from configuration
func FromConfig(cfg *config.Config) (Logger, error) {
    return NewLogger(&cfg.Logger)
}
```

### 2. Helper Functions

```go
// convertLogLevel converts internal log level to slog level
func convertLogLevel(level LogLevel) slog.Level {
    switch level {
    case LevelDebug:
        return slog.LevelDebug
    case LevelInfo:
        return slog.LevelInfo
    case LevelWarn:
        return slog.LevelWarn
    case LevelError:
        return slog.LevelError
    case LevelFatal:
        return slog.LevelError
    default:
        return slog.LevelInfo
    }
}

// getGoroutineID returns the current goroutine ID
func getGoroutineID() int64 {
    var buf [64]byte
    n := runtime.Stack(buf[:], false)
    idField := strings.Fields(strings.TrimPrefix(string(buf[:n]), "goroutine "))[0]
    id, _ := strconv.ParseInt(idField, 10, 64)
    return id
}

// setDefaults sets default values for logger configuration
func setDefaults(config *LoggerConfig) {
    if config.Level == 0 {
        config.Level = LevelInfo
    }
    if config.Format == "" {
        config.Format = FormatJSON
    }
    if config.Output == "" {
        config.Output = "stdout"
    }
    if config.File.MaxSize == 0 {
        config.File.MaxSize = 100
    }
    if config.File.MaxBackups == 0 {
        config.File.MaxBackups = 3
    }
    if config.File.MaxAge == 0 {
        config.File.MaxAge = 28
    }
    if config.BufferSize == 0 {
        config.BufferSize = 1000
    }
}
```

## Adding New Logging Features

### Step 1: Define New Log Type

```go
// Add to logger interface
type Logger interface {
    // ... existing methods ...
    
    // New specialized logging method
    LogPerformance(ctx context.Context, operation string, metrics map[string]interface{})
}

// Implement the method
func (l *logger) LogPerformance(ctx context.Context, operation string, metrics map[string]interface{}) {
    attrs := []slog.Attr{
        slog.String("type", "performance_metric"),
        slog.String("operation", operation),
        slog.Time("timestamp", time.Now()),
    }
    
    // Add context fields
    attrs = append(attrs, l.extractContextFields(ctx)...)
    
    // Add metrics
    for key, value := range metrics {
        attrs = append(attrs, slog.Any(key, value))
    }
    
    msg := fmt.Sprintf("Performance metric: %s", operation)
    l.slogger.LogAttrs(ctx, slog.LevelInfo, msg, attrs...)
}
```

### Step 2: Create Custom Handler

```go
// MetricsHandler sends performance logs to metrics system
type MetricsHandler struct {
    handler       slog.Handler
    metricsClient MetricsClient
}

func NewMetricsHandler(handler slog.Handler, client MetricsClient) *MetricsHandler {
    return &MetricsHandler{
        handler:       handler,
        metricsClient: client,
    }
}

func (h *MetricsHandler) Handle(ctx context.Context, record slog.Record) error {
    // Check if this is a performance metric
    var logType string
    record.Attrs(func(attr slog.Attr) bool {
        if attr.Key == "type" && attr.Value.String() == "performance_metric" {
            logType = attr.Value.String()
            return false
        }
        return true
    })
    
    if logType == "performance_metric" {
        // Extract metrics and send to metrics system
        h.sendToMetrics(record)
    }
    
    return h.handler.Handle(ctx, record)
}

func (h *MetricsHandler) sendToMetrics(record slog.Record) {
    // Implementation to send metrics to external system
    // (Prometheus, DataDog, etc.)
}
```

### Step 3: Register Handler

```go
// In logger initialization
func NewLogger(config *LoggerConfig) (Logger, error) {
    // ... existing code ...
    
    // Add metrics handler if configured
    if config.MetricsEnabled {
        metricsClient := NewMetricsClient(config.MetricsConfig)
        handler = NewMetricsHandler(handler, metricsClient)
    }
    
    // ... rest of initialization ...
}
```

## Development Workflow

### 1. Logger Setup

```bash
# 1. Configure logging in config file
vim config/config.yaml

# 2. Initialize logger in main.go
vim cmd/server/main.go

# 3. Use logger in services
vim internal/services/user_service.go

# 4. Test logging output
go run cmd/server/main.go
```

### 2. Testing Logging

```go
// logger_test.go
func TestLogger_WithFields(t *testing.T) {
    var buf bytes.Buffer
    config := &LoggerConfig{
        Level:  LevelInfo,
        Format: FormatJSON,
        Output: "stdout",
    }
    
    // Create logger with custom writer
    logger := &logger{
        slogger: slog.New(slog.NewJSONHandler(&buf, &slog.HandlerOptions{
            Level: slog.LevelInfo,
        })),
        config: config,
        fields: make(map[string]interface{}),
    }
    
    // Test logging with fields
    logger.WithFields(map[string]interface{}{
        "user_id": "123",
        "action":  "login",
    }).Info("User logged in")
    
    // Verify output
    var logEntry map[string]interface{}
    err := json.Unmarshal(buf.Bytes(), &logEntry)
    require.NoError(t, err)
    
    assert.Equal(t, "User logged in", logEntry["msg"])
    assert.Equal(t, "123", logEntry["user_id"])
    assert.Equal(t, "login", logEntry["action"])
}

func TestLogger_Performance(t *testing.T) {
    logger := NewNoop()
    
    // Benchmark logging performance
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        logger.Info("Test message", "iteration", i)
    }
}
```

### 3. Log Analysis

```bash
# View logs in development
tail -f logs/app.log

# Parse JSON logs
cat logs/app.log | jq '.'

# Filter by log level
cat logs/app.log | jq 'select(.level == "ERROR")'

# Filter by request ID
cat logs/app.log | jq 'select(.request_id == "req-123")'

# Performance analysis
cat logs/app.log | jq 'select(.type == "http_request") | {path: .path, duration_ms: .duration_ms}'
```

## Best Practices

### 1. Structured Logging

```go
// ✅ Good: Structured logging with consistent fields
logger.InfoContext(ctx, "User created successfully",
    "user_id", user.ID,
    "email", user.Email,
    "created_at", user.CreatedAt,
)

// ✅ Good: Using logger chaining
logger.WithFields(map[string]interface{}{
    "user_id": user.ID,
    "action":  "profile_update",
}).Info("User profile updated")

// ❌ Bad: Unstructured logging
logger.Info(fmt.Sprintf("User %s created with email %s", user.ID, user.Email))
```

### 2. Error Logging

```go
// ✅ Good: Comprehensive error logging
logger.WithError(err).ErrorContext(ctx, "Failed to create user",
    "email", req.Email,
    "validation_errors", validationErrors,
)

// ✅ Good: Different log levels for different error types
if errors.IsValidationError(err) {
    logger.WarnContext(ctx, "Validation failed", "error", err)
} else {
    logger.ErrorContext(ctx, "Unexpected error", "error", err)
}

// ❌ Bad: Generic error logging
logger.Error("Error: " + err.Error())
```

### 3. Performance Logging

```go
// ✅ Good: Performance monitoring
start := time.Now()
result, err := service.ProcessData(ctx, data)
duration := time.Since(start)

logger.LogPerformance(ctx, "data_processing", map[string]interface{}{
    "duration_ms": duration.Milliseconds(),
    "data_size":   len(data),
    "success":     err == nil,
})

// ✅ Good: Request logging middleware
func LoggingMiddleware(logger Logger) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            start := time.Now()
            
            // Wrap response writer to capture status code
            wrapped := &responseWriter{ResponseWriter: w, statusCode: 200}
            
            next.ServeHTTP(wrapped, r)
            
            logger.LogRequest(r.Context(), r.Method, r.URL.Path, wrapped.statusCode, time.Since(start))
        })
    }
}
```

The logger package provides a robust foundation for application monitoring, debugging, and observability, ensuring comprehensive logging capabilities across the entire application.