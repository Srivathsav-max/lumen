package middleware

import (
	"bytes"
	"io"
	"log/slog"
	"time"

	"github.com/gin-gonic/gin"
)

type LoggingConfig struct {
	LogRequestBody  bool
	LogResponseBody bool
	MaxBodySize     int64
	SkipPaths       []string
	SkipMethods     []string
}

type responseWriter struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

func (w *responseWriter) Write(b []byte) (int, error) {
	w.body.Write(b)
	return w.ResponseWriter.Write(b)
}

func RequestResponseLoggingMiddleware(config LoggingConfig, logger *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		if shouldSkipLogging(c, config) {
			c.Next()
			return
		}

		start := time.Now()
		requestID := getRequestIDFromContext(c)

		logRequest(c, config, logger, requestID)

		var responseBody *bytes.Buffer
		if config.LogResponseBody {
			responseBody = &bytes.Buffer{}
			c.Writer = &responseWriter{
				ResponseWriter: c.Writer,
				body:           responseBody,
			}
		}

		c.Next()

		duration := time.Since(start)

		logResponse(c, config, logger, requestID, duration, responseBody)
	}
}

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

	if userID, exists := c.Get("userID"); exists {
		logArgs = append(logArgs, "user_id", userID)
	}

	if userEmail, exists := c.Get("userEmail"); exists {
		logArgs = append(logArgs, "user_email", userEmail)
	}

	headers := make(map[string]string)
	for name, values := range c.Request.Header {
		if !isSensitiveHeader(name) && len(values) > 0 {
			headers[name] = values[0]
		}
	}
	if len(headers) > 0 {
		logArgs = append(logArgs, "headers", headers)
	}

	if config.LogRequestBody && c.Request.ContentLength > 0 && c.Request.ContentLength <= config.MaxBodySize {
		if body := readRequestBody(c); body != "" {
			logArgs = append(logArgs, "request_body", body)
		}
	}

	logger.Info("HTTP request received", logArgs...)
}

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

	if userID, exists := c.Get("userID"); exists {
		logArgs = append(logArgs, "user_id", userID)
	}

	headers := make(map[string]string)
	for name, values := range c.Writer.Header() {
		if !isSensitiveHeader(name) && len(values) > 0 {
			headers[name] = values[0]
		}
	}
	if len(headers) > 0 {
		logArgs = append(logArgs, "response_headers", headers)
	}

	if config.LogResponseBody && responseBody != nil && responseBody.Len() > 0 && int64(responseBody.Len()) <= config.MaxBodySize {
		logArgs = append(logArgs, "response_body", responseBody.String())
	}

	if len(c.Errors) > 0 {
		errorMessages := make([]string, len(c.Errors))
		for i, err := range c.Errors {
			errorMessages[i] = err.Error()
		}
		logArgs = append(logArgs, "errors", errorMessages)
	}

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

func readRequestBody(c *gin.Context) string {
	if c.Request.Body == nil {
		return ""
	}

	bodyBytes, err := io.ReadAll(c.Request.Body)
	if err != nil {
		return ""
	}

	c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))

	bodyStr := string(bodyBytes)
	return sanitizeRequestBody(bodyStr, c.Request.Header.Get("Content-Type"))
}

func sanitizeRequestBody(body, contentType string) string {
	if len(body) > 1000 {
		return body[:1000] + "... [truncated]"
	}
	return body
}

func shouldSkipLogging(c *gin.Context, config LoggingConfig) bool {
	for _, path := range config.SkipPaths {
		if c.Request.URL.Path == path {
			return true
		}
	}

	for _, method := range config.SkipMethods {
		if c.Request.Method == method {
			return true
		}
	}

	return false
}

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

func DefaultLoggingConfig() LoggingConfig {
	return LoggingConfig{
		LogRequestBody:  false,
		LogResponseBody: false,
		MaxBodySize:     1024,
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

func VerboseLoggingConfig() LoggingConfig {
	return LoggingConfig{
		LogRequestBody:  true,
		LogResponseBody: true,
		MaxBodySize:     4096,
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

func ProductionLoggingConfig() LoggingConfig {
	return LoggingConfig{
		LogRequestBody:  false,
		LogResponseBody: false,
		MaxBodySize:     0,
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
