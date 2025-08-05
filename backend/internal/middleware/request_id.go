package middleware

import (
	"crypto/rand"
	"encoding/hex"
	"log/slog"

	"github.com/gin-gonic/gin"
)

func RequestIDMiddleware(logger *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := c.GetHeader("X-Request-ID")

		if requestID == "" {
			requestID = generateRequestID()
		}

		c.Set("request_id", requestID)
		c.Header("X-Request-ID", requestID)

		contextLogger := logger.With("request_id", requestID)
		c.Set("logger", contextLogger)

		c.Next()
	}
}

func generateRequestID() string {
	bytes := make([]byte, 8)
	if _, err := rand.Read(bytes); err != nil {
		return "req_fallback"
	}
	return "req_" + hex.EncodeToString(bytes)
}
