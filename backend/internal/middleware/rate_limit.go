package middleware

import (
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/Srivathsav-max/lumen/backend/internal/services"
)

// RateLimiter represents a rate limiter for API endpoints
type RateLimiter struct {
	clients map[string]*ClientLimiter
	mutex   sync.RWMutex
	logger  *slog.Logger
}

// ClientLimiter tracks rate limiting for a specific client
type ClientLimiter struct {
	tokens     int
	lastRefill time.Time
	mutex      sync.Mutex
}

// RateLimitConfig holds configuration for rate limiting
type RateLimitConfig struct {
	RequestsPerMinute int
	BurstSize         int
	CleanupInterval   time.Duration
}

// NewRateLimiter creates a new rate limiter instance
func NewRateLimiter(config RateLimitConfig, logger *slog.Logger) *RateLimiter {
	rl := &RateLimiter{
		clients: make(map[string]*ClientLimiter),
		logger:  logger,
	}

	// Start cleanup goroutine to remove inactive clients
	go rl.cleanup(config.CleanupInterval)

	return rl
}

// RateLimitMiddleware creates a rate limiting middleware
func RateLimitMiddleware(config RateLimitConfig, logger *slog.Logger) gin.HandlerFunc {
	limiter := NewRateLimiter(config, logger)

	return func(c *gin.Context) {
		// Get client identifier (IP address or user ID if authenticated)
		clientID := getClientID(c)

		// Check if request is allowed
		if !limiter.Allow(clientID, config) {
			logger.Warn("Rate limit exceeded",
				"client_id", clientID,
				"path", c.Request.URL.Path,
				"method", c.Request.Method,
				"user_agent", c.Request.UserAgent(),
				"request_id", getRequestIDFromContext(c),
			)

			// Return rate limit error
			err := services.NewRateLimitExceededError(fmt.Sprintf("%d requests per minute", config.RequestsPerMinute))
			c.Error(err)
			c.Abort()
			return
		}

		c.Next()
	}
}

// Allow checks if a request from the given client should be allowed
func (rl *RateLimiter) Allow(clientID string, config RateLimitConfig) bool {
	rl.mutex.Lock()
	defer rl.mutex.Unlock()

	client, exists := rl.clients[clientID]
	if !exists {
		client = &ClientLimiter{
			tokens:     config.BurstSize,
			lastRefill: time.Now(),
		}
		rl.clients[clientID] = client
	}

	return client.allow(config)
}

// allow checks if the client can make a request (token bucket algorithm)
func (cl *ClientLimiter) allow(config RateLimitConfig) bool {
	cl.mutex.Lock()
	defer cl.mutex.Unlock()

	now := time.Now()
	elapsed := now.Sub(cl.lastRefill)

	// Refill tokens based on elapsed time
	tokensToAdd := int(elapsed.Minutes() * float64(config.RequestsPerMinute))
	if tokensToAdd > 0 {
		cl.tokens += tokensToAdd
		if cl.tokens > config.BurstSize {
			cl.tokens = config.BurstSize
		}
		cl.lastRefill = now
	}

	// Check if we have tokens available
	if cl.tokens > 0 {
		cl.tokens--
		return true
	}

	return false
}

// cleanup removes inactive clients periodically
func (rl *RateLimiter) cleanup(interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for range ticker.C {
		rl.mutex.Lock()
		now := time.Now()
		
		for clientID, client := range rl.clients {
			client.mutex.Lock()
			// Remove clients that haven't been active for more than the cleanup interval
			if now.Sub(client.lastRefill) > interval {
				delete(rl.clients, clientID)
			}
			client.mutex.Unlock()
		}
		
		rl.mutex.Unlock()
	}
}

// getClientID returns a unique identifier for the client
func getClientID(c *gin.Context) string {
	// If user is authenticated, use user ID for more accurate rate limiting
	if userID, exists := c.Get("userID"); exists {
		if id, ok := userID.(int64); ok {
			return fmt.Sprintf("user_%d", id)
		}
	}

	// Fall back to IP address
	return fmt.Sprintf("ip_%s", c.ClientIP())
}

// getRequestIDFromContext extracts request ID from context
func getRequestIDFromContext(c *gin.Context) string {
	if requestID, exists := c.Get("request_id"); exists {
		if id, ok := requestID.(string); ok {
			return id
		}
	}
	return ""
}

// DefaultRateLimitConfig returns a default rate limiting configuration
func DefaultRateLimitConfig() RateLimitConfig {
	return RateLimitConfig{
		RequestsPerMinute: 60,    // 60 requests per minute
		BurstSize:         10,    // Allow burst of 10 requests
		CleanupInterval:   5 * time.Minute, // Clean up inactive clients every 5 minutes
	}
}

// StrictRateLimitConfig returns a stricter rate limiting configuration for sensitive endpoints
func StrictRateLimitConfig() RateLimitConfig {
	return RateLimitConfig{
		RequestsPerMinute: 10,    // 10 requests per minute
		BurstSize:         3,     // Allow burst of 3 requests
		CleanupInterval:   5 * time.Minute,
	}
}