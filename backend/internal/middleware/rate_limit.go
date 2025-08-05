package middleware

import (
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/Srivathsav-max/lumen/backend/internal/services"
	"github.com/gin-gonic/gin"
)

type RateLimiter struct {
	clients map[string]*ClientLimiter
	mutex   sync.RWMutex
	logger  *slog.Logger
}

type ClientLimiter struct {
	tokens     int
	lastRefill time.Time
	mutex      sync.Mutex
}

type RateLimitConfig struct {
	RequestsPerMinute int
	BurstSize         int
	CleanupInterval   time.Duration
}

func NewRateLimiter(config RateLimitConfig, logger *slog.Logger) *RateLimiter {
	rl := &RateLimiter{
		clients: make(map[string]*ClientLimiter),
		logger:  logger,
	}

	go rl.cleanup(config.CleanupInterval)

	return rl
}

func RateLimitMiddleware(config RateLimitConfig, logger *slog.Logger) gin.HandlerFunc {
	limiter := NewRateLimiter(config, logger)

	return func(c *gin.Context) {
		clientID := getClientID(c)

		if !limiter.Allow(clientID, config) {
			logger.Warn("Rate limit exceeded",
				"client_id", clientID,
				"path", c.Request.URL.Path,
				"method", c.Request.Method,
				"user_agent", c.Request.UserAgent(),
				"request_id", getRequestIDFromContext(c),
			)

			err := services.NewRateLimitExceededError(fmt.Sprintf("%d requests per minute", config.RequestsPerMinute))
			c.Error(err)
			c.Abort()
			return
		}

		c.Next()
	}
}

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

func (cl *ClientLimiter) allow(config RateLimitConfig) bool {
	cl.mutex.Lock()
	defer cl.mutex.Unlock()

	now := time.Now()
	elapsed := now.Sub(cl.lastRefill)

	tokensToAdd := int(elapsed.Minutes() * float64(config.RequestsPerMinute))
	if tokensToAdd > 0 {
		cl.tokens += tokensToAdd
		if cl.tokens > config.BurstSize {
			cl.tokens = config.BurstSize
		}
		cl.lastRefill = now
	}

	if cl.tokens > 0 {
		cl.tokens--
		return true
	}

	return false
}

func (rl *RateLimiter) cleanup(interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for range ticker.C {
		rl.mutex.Lock()
		now := time.Now()

		for clientID, client := range rl.clients {
			client.mutex.Lock()
			if now.Sub(client.lastRefill) > interval {
				delete(rl.clients, clientID)
			}
			client.mutex.Unlock()
		}

		rl.mutex.Unlock()
	}
}

func getClientID(c *gin.Context) string {
	if userID, exists := c.Get("userID"); exists {
		if id, ok := userID.(int64); ok {
			return fmt.Sprintf("user_%d", id)
		}
	}

	return fmt.Sprintf("ip_%s", c.ClientIP())
}

func getRequestIDFromContext(c *gin.Context) string {
	if requestID, exists := c.Get("request_id"); exists {
		if id, ok := requestID.(string); ok {
			return id
		}
	}
	return ""
}

func DefaultRateLimitConfig() RateLimitConfig {
	return RateLimitConfig{
		RequestsPerMinute: 60,
		BurstSize:         10,
		CleanupInterval:   5 * time.Minute,
	}
}

func StrictRateLimitConfig() RateLimitConfig {
	return RateLimitConfig{
		RequestsPerMinute: 10,
		BurstSize:         3,
		CleanupInterval:   5 * time.Minute,
	}
}
