# Middleware Package

## Overview

The `middleware` package provides HTTP middleware components for the Lumen backend application. It implements cross-cutting concerns such as authentication, authorization, CORS, rate limiting, logging, error handling, and security headers.

## Purpose

- **Request Processing**: HTTP request preprocessing and validation
- **Authentication & Authorization**: JWT token validation and user context management
- **Security**: CORS, security headers, rate limiting, and request sanitization
- **Logging & Monitoring**: Request logging, performance tracking, and metrics collection
- **Error Handling**: Centralized error processing and response formatting
- **Request Enhancement**: Request ID generation, context enrichment, and tracing

## Dependencies

### External Dependencies
```go
// Core HTTP and context
"context"               // Context handling
"net/http"             // HTTP server functionality
"time"                  // Time handling
"strings"               // String manipulation
"fmt"                   // String formatting
"strconv"               // String conversion

// HTTP utilities
"github.com/gorilla/mux"           // HTTP router
"github.com/rs/cors"               // CORS handling
"github.com/gorilla/handlers"      // HTTP middleware utilities

// Rate limiting
"golang.org/x/time/rate"           // Token bucket rate limiter
"github.com/go-redis/redis/v8"     // Redis for distributed rate limiting

// Security and validation
"github.com/google/uuid"           // UUID generation
"github.com/golang-jwt/jwt/v5"     // JWT handling
"github.com/microcosm-cc/bluemonday" // HTML sanitization

// Utilities
"github.com/pkg/errors"            // Enhanced error handling
"sync"                             // Synchronization primitives
```

### Internal Dependencies
```go
"github.com/Srivathsav-max/lumen/backend/internal/security"   // Security services
"github.com/Srivathsav-max/lumen/backend/internal/logger"     // Logging services
"github.com/Srivathsav-max/lumen/backend/internal/errors"     // Error handling
"github.com/Srivathsav-max/lumen/backend/internal/config"     // Configuration
"github.com/Srivathsav-max/lumen/backend/internal/services"   // Business services
```

## Middleware Structure

### Base Middleware Interface
```go
type Middleware interface {
    Handler(next http.Handler) http.Handler
}

type MiddlewareFunc func(http.Handler) http.Handler

// Chain combines multiple middleware functions
func Chain(middlewares ...MiddlewareFunc) MiddlewareFunc {
    return func(next http.Handler) http.Handler {
        for i := len(middlewares) - 1; i >= 0; i-- {
            next = middlewares[i](next)
        }
        return next
    }
}

// Apply applies middleware to a handler
func Apply(handler http.Handler, middlewares ...MiddlewareFunc) http.Handler {
    return Chain(middlewares...)(handler)
}
```

### Middleware Manager
```go
type MiddlewareManager struct {
    logger        logger.Logger
    config        *config.Config
    jwtService    *security.JWTService
    rateLimiter   *RateLimiter
    corsHandler   *cors.Cors
    securityMW    *security.SecurityMiddleware
}

func NewMiddlewareManager(
    logger logger.Logger,
    config *config.Config,
    jwtService *security.JWTService,
    securityMW *security.SecurityMiddleware,
) *MiddlewareManager {
    return &MiddlewareManager{
        logger:      logger,
        config:      config,
        jwtService:  jwtService,
        securityMW:  securityMW,
        rateLimiter: NewRateLimiter(config.RateLimit),
        corsHandler: setupCORS(config.CORS),
    }
}

// GetStandardMiddleware returns commonly used middleware chain
func (m *MiddlewareManager) GetStandardMiddleware() []MiddlewareFunc {
    return []MiddlewareFunc{
        m.RequestID,
        m.Logging,
        m.Recovery,
        m.CORS,
        m.SecurityHeaders,
        m.RateLimit,
    }
}

// GetAuthenticatedMiddleware returns middleware chain for protected routes
func (m *MiddlewareManager) GetAuthenticatedMiddleware() []MiddlewareFunc {
    standard := m.GetStandardMiddleware()
    return append(standard, m.RequireAuth)
}

// GetAdminMiddleware returns middleware chain for admin routes
func (m *MiddlewareManager) GetAdminMiddleware() []MiddlewareFunc {
    authenticated := m.GetAuthenticatedMiddleware()
    return append(authenticated, m.RequireRole("admin"))
}
```

## Core Middleware Components

### 1. Request ID Middleware

```go
// RequestID generates and adds request ID to context
func (m *MiddlewareManager) RequestID(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        requestID := r.Header.Get("X-Request-ID")
        if requestID == "" {
            requestID = uuid.New().String()
        }
        
        // Add to response header
        w.Header().Set("X-Request-ID", requestID)
        
        // Add to context
        ctx := context.WithValue(r.Context(), "request_id", requestID)
        r = r.WithContext(ctx)
        
        next.ServeHTTP(w, r)
    })
}

// GetRequestID extracts request ID from context
func GetRequestID(ctx context.Context) string {
    if requestID, ok := ctx.Value("request_id").(string); ok {
        return requestID
    }
    return ""
}
```

### 2. Logging Middleware

```go
// responseWriter wraps http.ResponseWriter to capture status code
type responseWriter struct {
    http.ResponseWriter
    statusCode int
    size       int
}

func (rw *responseWriter) WriteHeader(code int) {
    rw.statusCode = code
    rw.ResponseWriter.WriteHeader(code)
}

func (rw *responseWriter) Write(b []byte) (int, error) {
    size, err := rw.ResponseWriter.Write(b)
    rw.size += size
    return size, err
}

// Logging logs HTTP requests and responses
func (m *MiddlewareManager) Logging(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        
        // Wrap response writer
        wrapped := &responseWriter{
            ResponseWriter: w,
            statusCode:     200,
        }
        
        // Add client information to context
        ctx := r.Context()
        ctx = context.WithValue(ctx, "client_ip", getClientIP(r))
        ctx = context.WithValue(ctx, "user_agent", r.UserAgent())
        r = r.WithContext(ctx)
        
        // Process request
        next.ServeHTTP(wrapped, r)
        
        // Log request
        duration := time.Since(start)
        m.logger.LogRequest(r.Context(), r.Method, r.URL.Path, wrapped.statusCode, duration)
        
        // Log slow requests
        if duration > 1*time.Second {
            m.logger.WarnContext(r.Context(), "Slow request detected",
                "method", r.Method,
                "path", r.URL.Path,
                "duration_ms", duration.Milliseconds(),
                "status_code", wrapped.statusCode,
            )
        }
    })
}

// getClientIP extracts client IP from request
func getClientIP(r *http.Request) string {
    // Check X-Forwarded-For header
    if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
        ips := strings.Split(xff, ",")
        return strings.TrimSpace(ips[0])
    }
    
    // Check X-Real-IP header
    if xri := r.Header.Get("X-Real-IP"); xri != "" {
        return xri
    }
    
    // Fall back to RemoteAddr
    ip := r.RemoteAddr
    if colon := strings.LastIndex(ip, ":"); colon != -1 {
        ip = ip[:colon]
    }
    return ip
}
```

### 3. Recovery Middleware

```go
// Recovery recovers from panics and logs them
func (m *MiddlewareManager) Recovery(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        defer func() {
            if err := recover(); err != nil {
                // Log panic with stack trace
                m.logger.ErrorContext(r.Context(), "Panic recovered",
                    "error", err,
                    "stack_trace", string(debug.Stack()),
                    "method", r.Method,
                    "path", r.URL.Path,
                )
                
                // Return error response
                errorResponse := errors.ToErrorResponse(
                    errors.NewInternalError("Internal server error"),
                    GetRequestID(r.Context()),
                )
                
                w.Header().Set("Content-Type", "application/json")
                w.WriteHeader(http.StatusInternalServerError)
                json.NewEncoder(w).Encode(errorResponse)
            }
        }()
        
        next.ServeHTTP(w, r)
    })
}
```

### 4. CORS Middleware

```go
// setupCORS configures CORS handler
func setupCORS(config config.CORSConfig) *cors.Cors {
    return cors.New(cors.Options{
        AllowedOrigins: config.AllowedOrigins,
        AllowedMethods: []string{
            http.MethodGet,
            http.MethodPost,
            http.MethodPut,
            http.MethodPatch,
            http.MethodDelete,
            http.MethodOptions,
        },
        AllowedHeaders: []string{
            "Accept",
            "Authorization",
            "Content-Type",
            "X-CSRF-Token",
            "X-Request-ID",
            "X-Requested-With",
        },
        ExposedHeaders: []string{
            "X-Request-ID",
            "X-RateLimit-Limit",
            "X-RateLimit-Remaining",
            "X-RateLimit-Reset",
        },
        AllowCredentials: true,
        MaxAge:           int(config.MaxAge.Seconds()),
    })
}

// CORS handles Cross-Origin Resource Sharing
func (m *MiddlewareManager) CORS(next http.Handler) http.Handler {
    return m.corsHandler.Handler(next)
}
```

### 5. Security Headers Middleware

```go
// SecurityHeaders adds security headers to responses
func (m *MiddlewareManager) SecurityHeaders(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Content Security Policy
        w.Header().Set("Content-Security-Policy", 
            "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:")
        
        // Prevent MIME type sniffing
        w.Header().Set("X-Content-Type-Options", "nosniff")
        
        // Prevent clickjacking
        w.Header().Set("X-Frame-Options", "DENY")
        
        // XSS protection
        w.Header().Set("X-XSS-Protection", "1; mode=block")
        
        // Strict Transport Security (HTTPS only)
        if r.TLS != nil {
            w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        }
        
        // Referrer Policy
        w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
        
        // Permissions Policy
        w.Header().Set("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
        
        next.ServeHTTP(w, r)
    })
}
```

## Authentication Middleware

### 1. JWT Authentication

```go
// AuthMiddleware handles JWT authentication
type AuthMiddleware struct {
    jwtService *security.JWTService
    logger     logger.Logger
}

func NewAuthMiddleware(jwtService *security.JWTService, logger logger.Logger) *AuthMiddleware {
    return &AuthMiddleware{
        jwtService: jwtService,
        logger:     logger,
    }
}

// RequireAuth validates JWT token and adds user context
func (m *MiddlewareManager) RequireAuth(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        token := extractToken(r)
        if token == "" {
            m.writeUnauthorizedError(w, r, "Missing authentication token")
            return
        }
        
        claims, err := m.jwtService.ValidateToken(token)
        if err != nil {
            m.logger.WarnContext(r.Context(), "Invalid JWT token",
                "error", err,
                "token_prefix", token[:min(len(token), 20)],
            )
            m.writeUnauthorizedError(w, r, "Invalid authentication token")
            return
        }
        
        // Check token expiration
        if claims.ExpiresAt != nil && claims.ExpiresAt.Before(time.Now()) {
            m.writeUnauthorizedError(w, r, "Token expired")
            return
        }
        
        // Add user context
        ctx := r.Context()
        ctx = context.WithValue(ctx, "user_id", claims.UserID)
        ctx = context.WithValue(ctx, "user_email", claims.Email)
        ctx = context.WithValue(ctx, "user_roles", claims.Roles)
        ctx = context.WithValue(ctx, "session_id", claims.SessionID)
        
        // Create user context object
        userCtx := &UserContext{
            ID:        claims.UserID,
            Email:     claims.Email,
            Roles:     claims.Roles,
            SessionID: claims.SessionID,
            TokenID:   claims.TokenID,
        }
        ctx = context.WithValue(ctx, "user", userCtx)
        
        r = r.WithContext(ctx)
        
        // Log authentication success
        m.logger.DebugContext(r.Context(), "User authenticated",
            "user_id", claims.UserID,
            "session_id", claims.SessionID,
        )
        
        next.ServeHTTP(w, r)
    })
}

// OptionalAuth validates JWT token if present but doesn't require it
func (m *MiddlewareManager) OptionalAuth(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        token := extractToken(r)
        if token != "" {
            if claims, err := m.jwtService.ValidateToken(token); err == nil {
                // Add user context if token is valid
                ctx := r.Context()
                ctx = context.WithValue(ctx, "user_id", claims.UserID)
                ctx = context.WithValue(ctx, "user_email", claims.Email)
                ctx = context.WithValue(ctx, "user_roles", claims.Roles)
                r = r.WithContext(ctx)
            }
        }
        
        next.ServeHTTP(w, r)
    })
}

// extractToken extracts JWT token from request
func extractToken(r *http.Request) string {
    // Check Authorization header
    authHeader := r.Header.Get("Authorization")
    if authHeader != "" {
        parts := strings.SplitN(authHeader, " ", 2)
        if len(parts) == 2 && parts[0] == "Bearer" {
            return parts[1]
        }
    }
    
    // Check query parameter (for WebSocket connections)
    if token := r.URL.Query().Get("token"); token != "" {
        return token
    }
    
    return ""
}

type UserContext struct {
    ID        string   `json:"id"`
    Email     string   `json:"email"`
    Roles     []string `json:"roles"`
    SessionID string   `json:"session_id"`
    TokenID   string   `json:"token_id"`
}

// GetUserFromContext extracts user context from request context
func GetUserFromContext(ctx context.Context) *UserContext {
    if user, ok := ctx.Value("user").(*UserContext); ok {
        return user
    }
    return nil
}

// GetUserID extracts user ID from request context
func GetUserID(ctx context.Context) string {
    if userID, ok := ctx.Value("user_id").(string); ok {
        return userID
    }
    return ""
}
```

### 2. Role-Based Authorization

```go
// RequireRole validates user has required role
func (m *MiddlewareManager) RequireRole(requiredRole string) MiddlewareFunc {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            user := GetUserFromContext(r.Context())
            if user == nil {
                m.writeUnauthorizedError(w, r, "Authentication required")
                return
            }
            
            hasRole := false
            for _, role := range user.Roles {
                if role == requiredRole {
                    hasRole = true
                    break
                }
            }
            
            if !hasRole {
                m.logger.WarnContext(r.Context(), "Access denied - insufficient permissions",
                    "user_id", user.ID,
                    "required_role", requiredRole,
                    "user_roles", user.Roles,
                )
                m.writeForbiddenError(w, r, "Insufficient permissions")
                return
            }
            
            next.ServeHTTP(w, r)
        })
    }
}

// RequireAnyRole validates user has at least one of the required roles
func (m *MiddlewareManager) RequireAnyRole(requiredRoles ...string) MiddlewareFunc {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            user := GetUserFromContext(r.Context())
            if user == nil {
                m.writeUnauthorizedError(w, r, "Authentication required")
                return
            }
            
            hasRole := false
            for _, userRole := range user.Roles {
                for _, requiredRole := range requiredRoles {
                    if userRole == requiredRole {
                        hasRole = true
                        break
                    }
                }
                if hasRole {
                    break
                }
            }
            
            if !hasRole {
                m.logger.WarnContext(r.Context(), "Access denied - insufficient permissions",
                    "user_id", user.ID,
                    "required_roles", requiredRoles,
                    "user_roles", user.Roles,
                )
                m.writeForbiddenError(w, r, "Insufficient permissions")
                return
            }
            
            next.ServeHTTP(w, r)
        })
    }
}

// RequirePermission validates user has specific permission
func (m *MiddlewareManager) RequirePermission(permission string) MiddlewareFunc {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            user := GetUserFromContext(r.Context())
            if user == nil {
                m.writeUnauthorizedError(w, r, "Authentication required")
                return
            }
            
            // Check if user has permission (this would typically involve
            // checking against a permission service or database)
            hasPermission := m.checkUserPermission(r.Context(), user.ID, permission)
            if !hasPermission {
                m.logger.WarnContext(r.Context(), "Access denied - missing permission",
                    "user_id", user.ID,
                    "required_permission", permission,
                )
                m.writeForbiddenError(w, r, "Missing required permission")
                return
            }
            
            next.ServeHTTP(w, r)
        })
    }
}

// checkUserPermission checks if user has specific permission
func (m *MiddlewareManager) checkUserPermission(ctx context.Context, userID, permission string) bool {
    // This would typically involve checking against a permission service
    // For now, return true for admin users
    user := GetUserFromContext(ctx)
    if user != nil {
        for _, role := range user.Roles {
            if role == "admin" {
                return true
            }
        }
    }
    return false
}
```

## Rate Limiting Middleware

### 1. Token Bucket Rate Limiter

```go
// RateLimiter implements token bucket rate limiting
type RateLimiter struct {
    limiters map[string]*rate.Limiter
    mutex    sync.RWMutex
    config   config.RateLimitConfig
    cleanup  *time.Ticker
}

type RateLimitConfig struct {
    RequestsPerMinute int           `yaml:"requests_per_minute" env:"RATE_LIMIT_RPM" default:"60"`
    BurstSize         int           `yaml:"burst_size" env:"RATE_LIMIT_BURST" default:"10"`
    CleanupInterval   time.Duration `yaml:"cleanup_interval" env:"RATE_LIMIT_CLEANUP" default:"5m"`
    KeyFunc           string        `yaml:"key_func" env:"RATE_LIMIT_KEY_FUNC" default:"ip"`
}

func NewRateLimiter(config config.RateLimitConfig) *RateLimiter {
    rl := &RateLimiter{
        limiters: make(map[string]*rate.Limiter),
        config:   config,
        cleanup:  time.NewTicker(config.CleanupInterval),
    }
    
    // Start cleanup goroutine
    go rl.cleanupRoutine()
    
    return rl
}

// getLimiter gets or creates a rate limiter for the given key
func (rl *RateLimiter) getLimiter(key string) *rate.Limiter {
    rl.mutex.RLock()
    limiter, exists := rl.limiters[key]
    rl.mutex.RUnlock()
    
    if !exists {
        rl.mutex.Lock()
        // Double-check after acquiring write lock
        if limiter, exists = rl.limiters[key]; !exists {
            limiter = rate.NewLimiter(
                rate.Limit(rl.config.RequestsPerMinute)/60, // Convert to per-second
                rl.config.BurstSize,
            )
            rl.limiters[key] = limiter
        }
        rl.mutex.Unlock()
    }
    
    return limiter
}

// cleanupRoutine removes inactive limiters
func (rl *RateLimiter) cleanupRoutine() {
    for range rl.cleanup.C {
        rl.mutex.Lock()
        for key, limiter := range rl.limiters {
            // Remove limiters that haven't been used recently
            if limiter.Tokens() == float64(rl.config.BurstSize) {
                delete(rl.limiters, key)
            }
        }
        rl.mutex.Unlock()
    }
}

// RateLimit applies rate limiting based on configuration
func (m *MiddlewareManager) RateLimit(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        key := m.getRateLimitKey(r)
        limiter := m.rateLimiter.getLimiter(key)
        
        if !limiter.Allow() {
            // Add rate limit headers
            w.Header().Set("X-RateLimit-Limit", strconv.Itoa(m.rateLimiter.config.RequestsPerMinute))
            w.Header().Set("X-RateLimit-Remaining", "0")
            w.Header().Set("X-RateLimit-Reset", strconv.FormatInt(time.Now().Add(time.Minute).Unix(), 10))
            
            m.logger.WarnContext(r.Context(), "Rate limit exceeded",
                "key", key,
                "limit", m.rateLimiter.config.RequestsPerMinute,
            )
            
            m.writeRateLimitError(w, r)
            return
        }
        
        // Add rate limit headers for successful requests
        remaining := int(limiter.Tokens())
        w.Header().Set("X-RateLimit-Limit", strconv.Itoa(m.rateLimiter.config.RequestsPerMinute))
        w.Header().Set("X-RateLimit-Remaining", strconv.Itoa(remaining))
        w.Header().Set("X-RateLimit-Reset", strconv.FormatInt(time.Now().Add(time.Minute).Unix(), 10))
        
        next.ServeHTTP(w, r)
    })
}

// getRateLimitKey generates rate limit key based on configuration
func (m *MiddlewareManager) getRateLimitKey(r *http.Request) string {
    switch m.rateLimiter.config.KeyFunc {
    case "ip":
        return getClientIP(r)
    case "user":
        if userID := GetUserID(r.Context()); userID != "" {
            return "user:" + userID
        }
        return getClientIP(r) // Fall back to IP
    case "endpoint":
        return r.Method + ":" + r.URL.Path
    default:
        return getClientIP(r)
    }
}
```

### 2. Distributed Rate Limiting (Redis)

```go
// RedisRateLimiter implements distributed rate limiting using Redis
type RedisRateLimiter struct {
    client *redis.Client
    config config.RateLimitConfig
    script *redis.Script
}

func NewRedisRateLimiter(client *redis.Client, config config.RateLimitConfig) *RedisRateLimiter {
    // Lua script for atomic rate limiting
    script := redis.NewScript(`
        local key = KEYS[1]
        local limit = tonumber(ARGV[1])
        local window = tonumber(ARGV[2])
        local current = redis.call('GET', key)
        
        if current == false then
            redis.call('SET', key, 1)
            redis.call('EXPIRE', key, window)
            return {1, limit}
        end
        
        current = tonumber(current)
        if current < limit then
            local new_val = redis.call('INCR', key)
            local ttl = redis.call('TTL', key)
            return {new_val, limit}
        else
            local ttl = redis.call('TTL', key)
            return {current, limit}
        end
    `)
    
    return &RedisRateLimiter{
        client: client,
        config: config,
        script: script,
    }
}

// Allow checks if request is allowed under rate limit
func (rl *RedisRateLimiter) Allow(ctx context.Context, key string) (bool, int, error) {
    result, err := rl.script.Run(ctx, rl.client, []string{key}, 
        rl.config.RequestsPerMinute, 60).Result()
    if err != nil {
        return false, 0, err
    }
    
    values := result.([]interface{})
    current := int(values[0].(int64))
    limit := int(values[1].(int64))
    
    return current <= limit, limit - current, nil
}
```

## Error Response Utilities

```go
// writeUnauthorizedError writes 401 Unauthorized response
func (m *MiddlewareManager) writeUnauthorizedError(w http.ResponseWriter, r *http.Request, message string) {
    errorResponse := errors.ToErrorResponse(
        errors.NewUnauthorizedError(message),
        GetRequestID(r.Context()),
    )
    
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusUnauthorized)
    json.NewEncoder(w).Encode(errorResponse)
}

// writeForbiddenError writes 403 Forbidden response
func (m *MiddlewareManager) writeForbiddenError(w http.ResponseWriter, r *http.Request, message string) {
    errorResponse := errors.ToErrorResponse(
        errors.NewForbiddenError(message),
        GetRequestID(r.Context()),
    )
    
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusForbidden)
    json.NewEncoder(w).Encode(errorResponse)
}

// writeRateLimitError writes 429 Too Many Requests response
func (m *MiddlewareManager) writeRateLimitError(w http.ResponseWriter, r *http.Request) {
    errorResponse := errors.ToErrorResponse(
        errors.NewRateLimitError("Rate limit exceeded"),
        GetRequestID(r.Context()),
    )
    
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusTooManyRequests)
    json.NewEncoder(w).Encode(errorResponse)
}
```

## Adding New Middleware

### Step 1: Define Middleware Function

```go
// CustomMiddleware example - request validation
func (m *MiddlewareManager) ValidateContentType(allowedTypes ...string) MiddlewareFunc {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            contentType := r.Header.Get("Content-Type")
            
            // Skip validation for GET requests
            if r.Method == http.MethodGet {
                next.ServeHTTP(w, r)
                return
            }
            
            valid := false
            for _, allowedType := range allowedTypes {
                if strings.HasPrefix(contentType, allowedType) {
                    valid = true
                    break
                }
            }
            
            if !valid {
                m.logger.WarnContext(r.Context(), "Invalid content type",
                    "content_type", contentType,
                    "allowed_types", allowedTypes,
                )
                
                errorResponse := errors.ToErrorResponse(
                    errors.NewInvalidInputError("content_type", "Invalid content type"),
                    GetRequestID(r.Context()),
                )
                
                w.Header().Set("Content-Type", "application/json")
                w.WriteHeader(http.StatusUnsupportedMediaType)
                json.NewEncoder(w).Encode(errorResponse)
                return
            }
            
            next.ServeHTTP(w, r)
        })
    }
}
```

### Step 2: Register Middleware

```go
// In router setup
func (r *Router) setupMiddleware() {
    // Standard middleware for all routes
    r.router.Use(r.middlewareManager.GetStandardMiddleware()...)
    
    // API-specific middleware
    apiRouter := r.router.PathPrefix("/api").Subrouter()
    apiRouter.Use(r.middlewareManager.ValidateContentType("application/json"))
    
    // Protected routes
    protectedRouter := apiRouter.PathPrefix("/v1").Subrouter()
    protectedRouter.Use(r.middlewareManager.RequireAuth)
    
    // Admin routes
    adminRouter := protectedRouter.PathPrefix("/admin").Subrouter()
    adminRouter.Use(r.middlewareManager.RequireRole("admin"))
}
```

### Step 3: Test Middleware

```go
// middleware_test.go
func TestValidateContentType(t *testing.T) {
    manager := &MiddlewareManager{
        logger: logger.NewNoop(),
    }
    
    middleware := manager.ValidateContentType("application/json")
    
    handler := middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
    }))
    
    tests := []struct {
        name        string
        method      string
        contentType string
        expectedCode int
    }{
        {
            name:         "valid content type",
            method:       "POST",
            contentType:  "application/json",
            expectedCode: http.StatusOK,
        },
        {
            name:         "invalid content type",
            method:       "POST",
            contentType:  "text/plain",
            expectedCode: http.StatusUnsupportedMediaType,
        },
        {
            name:         "GET request bypasses validation",
            method:       "GET",
            contentType:  "text/plain",
            expectedCode: http.StatusOK,
        },
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            req := httptest.NewRequest(tt.method, "/test", nil)
            req.Header.Set("Content-Type", tt.contentType)
            
            rr := httptest.NewRecorder()
            handler.ServeHTTP(rr, req)
            
            assert.Equal(t, tt.expectedCode, rr.Code)
        })
    }
}
```

## Development Workflow

### 1. Middleware Development Pattern

```bash
# 1. Define middleware requirements
vim docs/middleware_spec.md

# 2. Implement middleware function
vim internal/middleware/custom_middleware.go

# 3. Write tests
vim internal/middleware/custom_middleware_test.go

# 4. Register in middleware manager
vim internal/middleware/middleware.go

# 5. Update router configuration
vim internal/router/router.go

# 6. Test integration
go test ./internal/middleware/...
```

### 2. Testing Middleware

```go
// Integration test example
func TestMiddlewareChain(t *testing.T) {
    // Setup test server with middleware
    manager := setupTestMiddlewareManager(t)
    
    router := mux.NewRouter()
    router.Use(manager.GetStandardMiddleware()...)
    
    router.HandleFunc("/test", func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
        json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
    })
    
    server := httptest.NewServer(router)
    defer server.Close()
    
    // Test request
    resp, err := http.Get(server.URL + "/test")
    require.NoError(t, err)
    defer resp.Body.Close()
    
    // Verify middleware headers
    assert.NotEmpty(t, resp.Header.Get("X-Request-ID"))
    assert.Equal(t, "nosniff", resp.Header.Get("X-Content-Type-Options"))
    assert.Equal(t, "DENY", resp.Header.Get("X-Frame-Options"))
}
```

## Best Practices

### 1. Middleware Ordering

```go
// ✅ Good: Proper middleware ordering
func (m *MiddlewareManager) GetStandardMiddleware() []MiddlewareFunc {
    return []MiddlewareFunc{
        m.RequestID,        // 1. Generate request ID first
        m.Logging,          // 2. Log requests (needs request ID)
        m.Recovery,         // 3. Recover from panics
        m.CORS,             // 4. Handle CORS early
        m.SecurityHeaders,  // 5. Add security headers
        m.RateLimit,        // 6. Apply rate limiting
        // Authentication comes later in specific routes
    }
}

// ❌ Bad: Incorrect ordering
func BadMiddlewareOrder() []MiddlewareFunc {
    return []MiddlewareFunc{
        RequireAuth,        // Auth before recovery - panics won't be caught
        Recovery,
        Logging,            // Logging after auth - won't log failed auth attempts
        RequestID,          // Request ID last - other middleware can't use it
    }
}
```

### 2. Context Usage

```go
// ✅ Good: Proper context usage
func (m *MiddlewareManager) ExampleMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Extract from context
        userID := GetUserID(r.Context())
        requestID := GetRequestID(r.Context())
        
        // Add to context
        ctx := context.WithValue(r.Context(), "middleware_processed", true)
        r = r.WithContext(ctx)
        
        // Use context in logging
        m.logger.InfoContext(r.Context(), "Processing request",
            "user_id", userID,
            "request_id", requestID,
        )
        
        next.ServeHTTP(w, r)
    })
}

// ❌ Bad: Not using context properly
func BadContextUsage(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Direct access without context
        userID := r.Header.Get("User-ID") // Should use context
        
        // Not passing updated context
        next.ServeHTTP(w, r) // Should pass r.WithContext(newCtx)
    })
}
```

### 3. Error Handling

```go
// ✅ Good: Comprehensive error handling
func (m *MiddlewareManager) SecureMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Validate request
        if err := m.validateRequest(r); err != nil {
            m.logger.WarnContext(r.Context(), "Request validation failed",
                "error", err,
                "path", r.URL.Path,
            )
            
            // Return appropriate error response
            errorResponse := errors.ToErrorResponse(err, GetRequestID(r.Context()))
            w.Header().Set("Content-Type", "application/json")
            w.WriteHeader(errors.GetHTTPStatus(err))
            json.NewEncoder(w).Encode(errorResponse)
            return
        }
        
        next.ServeHTTP(w, r)
    })
}

// ❌ Bad: Poor error handling
func BadErrorHandling(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        if someCondition {
            http.Error(w, "Error", 500) // Generic error, no logging
            return
        }
        
        next.ServeHTTP(w, r)
    })
}
```

The middleware package provides a comprehensive foundation for HTTP request processing, ensuring security, performance, and maintainability across the entire application.