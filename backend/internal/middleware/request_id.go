package middleware

import (
	"crypto/rand"
	"encoding/hex"
	"log/slog"

	"github.com/gin-gonic/gin"
)

// RequestIDMiddleware adds a unique request ID to each request
func RequestIDMiddleware(logger *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Try to get request ID from header first
		requestID := c.GetHeader("X-Request-ID")
		
		// If not provided, generate a new one
		if requestID == "" {
			requestID = generateRequestID()
		}

		// Set request ID in context and response header
		c.Set("request_id", requestID)
		c.Header("X-Request-ID", requestID)

		// Create logger with request ID context
		contextLogger := logger.With("request_id", requestID)
		c.Set("logger", contextLogger)

		c.Next()
	}
}

// generateRequestID creates a unique request identifier
func generateRequestID() string {
	bytes := make([]byte, 8)
	if _, err := rand.Read(bytes); err != nil {
		// Fallback to a simple counter-based approach if crypto/rand fails
		return "req_fallback"
	}
	return "req_" + hex.EncodeToString(bytes)
}