package middleware

import (
	"bytes"
	"io"
	"log/slog"
	"time"

	"github.com/gin-gonic/gin"
)

// LoggingConfig holds configuration for request/response logging
type LoggingConfig struct {
	LogRequestBody  bool
	LogResponseBody bool
	MaxBodySize     int64
	SkipPaths       []string
	SkipMethods     []string
}

// responseWriter wraps gin.ResponseWriter to capture response body
type responseWriter struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

func (w *responseWriter) Write(b []byte) (int, error) {
	w.body.Write(b)
	return w.ResponseWriter.Write(b)
}

// RequestResponseLoggingMiddleware logs HTTP requests and responses with structured logging
func RequestResponseLoggingMiddleware(config LoggingConfig, logger *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip logging for certain paths or methods
		if shouldSkipLogging(c, config) {
			c.Next()
			return
		}

		start := time.Now()
		requestID := getRequestIDFromContext(c)

		// Log request
		logRequest(c, config, logger, requestID)

		// Wrap response writer to capture response body if needed
		var responseBody *bytes.Buffer
		if config.LogResponseBody {
			responseBody = &bytes.Buffer{}
			c.Writer = &responseWriter{
				ResponseWriter: c.Writer,
				body:          responseBody,
			}
		}

		// Process request
		c.Next()

		// Calculate duration
		duration := time.Since(start)

		// Log response
		logResponse(c, config, logger, requestID, duration, responseBody)
	}
}

// logRequest logs the incoming HTTP request
func logRequest(c *gin.Context, config LoggingConfig, logger *slog.Logger, requestID string) {
	logArgs := []any{
		"type", "request",
		"request_id", requestID,
		"method", c.Request.Method,
		"path", c.Request.URL.Path,
		"query", c.Request.URL.RawQuery,
		"user_agent", c.Request.UserAgent(),
		"ip", c.ClientIP(),
		"content_length", c.Request.ContentLength,
		"content_type", c.Request.Header.Get("Content-Type"),
	}

	// Add user information if available
	if userID, exists := c.Get("userID"); exists {
		logArgs = append(logArgs, "user_id", userID)
	}

	if userEmail, exists := c.Get("userEmail"); exists {
		logArgs = append(logArgs, "user_email", userEmail)
	}

	// Add request headers (excluding sensitive ones)
	headers := make(map[string]string)
	for name, values := range c.Request.Header {
		if !isSensitiveHeader(name) && len(values) > 0 {
			headers[name] = values[0]
		}
	}
	if len(headers) > 0 {
		logArgs = append(logArgs, "headers", headers)
	}

	// Log request body if configured and not too large
	if config.LogRequestBody && c.Request.ContentLength > 0 && c.Request.ContentLength <= config.MaxBodySize {
		if body := readRequestBody(c); body != "" {
			logArgs = append(logArgs, "request_body", body)
		}
	}

	logger.Info("HTTP request received", logArgs...)
}

// logResponse logs the HTTP response
func logResponse(c *gin.Context, config LoggingConfig, logger *slog.Logger, requestID string, duration time.Duration, responseBody *bytes.Buffer) {
	logArgs := []any{
		"type", "response",
		"request_id", requestID,
		"method", c.Request.Method,
		"path", c.Request.URL.Path,
		"status", c.Writer.Status(),
		"size", c.Writer.Size(),
		"duration_ms", duration.Milliseconds(),
		"duration", duration.String(),
	}

	// Add user information if available
	if userID, exists := c.Get("userID"); exists {
		logArgs = append(logArgs, "user_id", userID)
	}

	// Add response headers (excluding sensitive ones)
	headers := make(map[string]string)
	for name, values := range c.Writer.Header() {
		if !isSensitiveHeader(name) && len(values) > 0 {
			headers[name] = values[0]
		}
	}
	if len(headers) > 0 {
		logArgs = append(logArgs, "response_headers", headers)
	}

	// Log response body if configured and captured
	if config.LogResponseBody && responseBody != nil && responseBody.Len() > 0 && int64(responseBody.Len()) <= config.MaxBodySize {
		logArgs = append(logArgs, "response_body", responseBody.String())
	}

	// Add error information if present
	if len(c.Errors) > 0 {
		errorMessages := make([]string, len(c.Errors))
		for i, err := range c.Errors {
			errorMessages[i] = err.Error()
		}
		logArgs = append(logArgs, "errors", errorMessages)
	}

	// Choose log level based on status code
	status := c.Writer.Status()
	switch {
	case status >= 500:
		logger.Error("HTTP response sent", logArgs...)
	case status >= 400:
		logger.Warn("HTTP response sent", logArgs...)
	default:
		logger.Info("HTTP response sent", logArgs...)
	}
}

// readRequestBody reads and restores the request body
func readRequestBody(c *gin.Context) string {
	if c.Request.Body == nil {
		return ""
	}

	// Read the body
	bodyBytes, err := io.ReadAll(c.Request.Body)
	if err != nil {
		return ""
	}

	// Restore the body for further processing
	c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))

	// Return body as string, but sanitize sensitive data
	bodyStr := string(bodyBytes)
	return sanitizeRequestBody(bodyStr, c.Request.Header.Get("Content-Type"))
}

// sanitizeRequestBody removes sensitive information from request body logs
func sanitizeRequestBody(body, contentType string) string {
	// For JSON content, we could parse and redact sensitive fields
	// For now, we'll do basic sanitization
	if len(body) > 1000 {
		return body[:1000] + "... [truncated]"
	}
	
	// TODO: Add more sophisticated sanitization for passwords, tokens, etc.
	// This could involve JSON parsing and field-specific redaction
	
	return body
}

// shouldSkipLogging determines if logging should be skipped for this request
func shouldSkipLogging(c *gin.Context, config LoggingConfig) bool {
	// Skip certain paths
	for _, path := range config.SkipPaths {
		if c.Request.URL.Path == path {
			return true
		}
	}

	// Skip certain methods
	for _, method := range config.SkipMethods {
		if c.Request.Method == method {
			return true
		}
	}

	return false
}

// isSensitiveHeader checks if a header contains sensitive information
func isSensitiveHeader(name string) bool {
	sensitiveHeaders := []string{
		"Authorization",
		"Cookie",
		"Set-Cookie",
		"X-Api-Key",
		"X-Auth-Token",
		"Proxy-Authorization",
	}

	for _, sensitive := range sensitiveHeaders {
		if name == sensitive {
			return true
		}
	}

	return false
}

// DefaultLoggingConfig returns a default logging configuration
func DefaultLoggingConfig() LoggingConfig {
	return LoggingConfig{
		LogRequestBody:  false, // Disabled by default for security
		LogResponseBody: false, // Disabled by default for performance
		MaxBodySize:     1024,  // 1KB max body size for logging
		SkipPaths: []string{
			"/health",
			"/metrics",
			"/favicon.ico",
		},
		SkipMethods: []string{
			"OPTIONS",
		},
	}
}

// VerboseLoggingConfig returns a verbose logging configuration for development
func VerboseLoggingConfig() LoggingConfig {
	return LoggingConfig{
		LogRequestBody:  true,
		LogResponseBody: true,
		MaxBodySize:     4096, // 4KB max body size
		SkipPaths: []string{
			"/health",
			"/metrics",
			"/favicon.ico",
		},
		SkipMethods: []string{
			"OPTIONS",
		},
	}
}

// ProductionLoggingConfig returns a production-safe logging configuration
func ProductionLoggingConfig() LoggingConfig {
	return LoggingConfig{
		LogRequestBody:  false, // Never log request bodies in production
		LogResponseBody: false, // Never log response bodies in production
		MaxBodySize:     0,     // No body logging
		SkipPaths: []string{
			"/health",
			"/metrics",
			"/favicon.ico",
			"/robots.txt",
		},
		SkipMethods: []string{
			"OPTIONS",
			"HEAD",
		},
	}
}