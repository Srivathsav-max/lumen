# Lumen Security Layer - Production Developer Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Security Components](#security-components)
4. [Implementation Guide](#implementation-guide)
5. [API Integration](#api-integration)
6. [Configuration](#configuration)
7. [Best Practices](#best-practices)
8. [Monitoring & Logging](#monitoring--logging)
9. [Troubleshooting](#troubleshooting)

## Overview

The Lumen Security Layer provides enterprise-grade security for Go-based web applications using the Gin framework. It implements multiple layers of protection including authentication, authorization, CSRF protection, XSS prevention, rate limiting, and comprehensive security headers.

### Key Features
- **JWT Authentication** with fingerprinting and session management
- **CSRF Protection** using synchronizer token pattern
- **XSS Prevention** with input sanitization and output encoding
- **Rate Limiting** with token bucket algorithm
- **Security Headers** for defense in depth
- **CORS Management** with origin validation
- **Error Handling** with structured logging
- **Request/Response Middleware** chain

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Security Middleware Chain                │
├─────────────────────────────────────────────────────────────┤
│ Request ID → CORS → Security Headers → Rate Limit →        │
│ XSS Protection → CSRF → JWT Auth → Error Handler           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Security Services                        │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────┐ │
│ │ JWT Service │ │CSRF Service │ │ XSS Service │ │Rate Lmt │ │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
├─────────────────────────────────────────────────────────────┤
│ Controllers → Services → Repositories → Database            │
└─────────────────────────────────────────────────────────────┘
```

## Security Components

### 1. JWT Service (`internal/security/jwt_service.go`)

#### Features
- **Secure Token Generation** with cryptographically secure random IDs
- **Device Fingerprinting** for XSS protection
- **Session Management** with device tracking
- **Token Validation** with comprehensive security checks
- **Refresh Token Rotation** for enhanced security

#### Key Functions

```go
// Generate secure token pair with fingerprinting
func (s *JWTService) GenerateTokenPair(
    userID int64, 
    email string, 
    roles []string, 
    r *http.Request
) (*TokenPair, error)

// Validate token with security checks
func (s *JWTService) ValidateToken(
    tokenString string, 
    r *http.Request
) (*SecureJWTClaims, error)

// Refresh token with rotation
func (s *JWTService) RefreshToken(
    refreshToken string, 
    r *http.Request
) (*TokenPair, error)
```

#### Token Structure
```go
type SecureJWTClaims struct {
    jwt.RegisteredClaims
    UserID      int64    `json:"user_id"`
    Email       string   `json:"email"`
    Roles       []string `json:"roles"`
    TokenID     string   `json:"jti"`
    TokenType   string   `json:"token_type"`
    Fingerprint string   `json:"fingerprint"`
    IPAddress   string   `json:"ip_address"`
    SessionID   string   `json:"session_id"`
    DeviceID    string   `json:"device_id"`
    Permissions []string `json:"permissions"`
    Scopes      []string `json:"scopes"`
}
```

### 2. CSRF Service (`internal/security/csrf_service.go`)

#### Features
- **Synchronizer Token Pattern** implementation
- **Origin Validation** for request verification
- **Double Submit Cookie** pattern support
- **Token Signing** to prevent tampering
- **Configurable Validation** methods

#### Key Functions

```go
// Generate CSRF token
func (s *CSRFService) GenerateToken(
    sessionID string, 
    userID int64, 
    r *http.Request
) (*CSRFToken, error)

// Validate CSRF token
func (s *CSRFService) ValidateToken(
    token string, 
    sessionID string, 
    r *http.Request
) *CSRFValidationResult

// Set secure CSRF cookie
func (s *CSRFService) SetCSRFCookie(
    w http.ResponseWriter, 
    token *CSRFToken
)
```

### 3. XSS Service (`internal/security/xss_service.go`)

#### Features
- **Input Sanitization** with configurable rules
- **Output Encoding** for safe rendering
- **Threat Detection** with pattern matching
- **JSON Sanitization** for API endpoints
- **Severity Assessment** for security monitoring

#### Key Functions

```go
// Sanitize user input
func (s *XSSService) SanitizeInput(input string) *SanitizationResult

// Sanitize JSON data recursively
func (s *XSSService) SanitizeJSON(data interface{}) interface{}

// Validate input without sanitization
func (s *XSSService) ValidateInput(input string) bool
```

### 4. Rate Limiting (`internal/middleware/rate_limit.go`)

#### Features
- **Token Bucket Algorithm** for smooth rate limiting
- **Per-User/Per-IP** limiting strategies
- **Configurable Limits** per endpoint
- **Burst Handling** for traffic spikes
- **Memory Cleanup** for long-running applications

#### Key Functions

```go
// Create rate limiting middleware
func RateLimitMiddleware(
    config RateLimitConfig, 
    logger *slog.Logger
) gin.HandlerFunc

// Check if request is allowed
func (rl *RateLimiter) Allow(
    clientID string, 
    config RateLimitConfig
) bool
```

## Implementation Guide

### 1. Basic Setup

```go
package main

import (
    "log/slog"
    "github.com/gin-gonic/gin"
    "github.com/Srivathsav-max/lumen/backend/internal/security"
    "github.com/Srivathsav-max/lumen/backend/internal/middleware"
)

func main() {
    // Initialize logger
    logger := slog.Default()
    
    // Create security configuration
    securityConfig := security.DefaultSecurityConfig()
    
    // Initialize security middleware
    securityMiddleware := security.NewSecurityMiddleware(securityConfig, logger)
    
    // Create Gin router
    router := gin.New()
    
    // Apply security middleware chain
    setupSecurityMiddleware(router, securityMiddleware, logger)
    
    // Start server
    router.Run(":8080")
}

func setupSecurityMiddleware(
    router *gin.Engine, 
    sm *security.SecurityMiddleware, 
    logger *slog.Logger
) {
    // Request ID (must be first)
    router.Use(middleware.RequestIDMiddleware())
    
    // CORS
    router.Use(middleware.CORSMiddleware())
    
    // Security headers
    router.Use(sm.SecurityHeadersMiddleware())
    
    // Rate limiting
    router.Use(middleware.RateLimitMiddleware(
        middleware.DefaultRateLimitConfig(), 
        logger,
    ))
    
    // XSS protection
    router.Use(sm.XSSProtectionMiddleware())
    
    // CSRF protection (for state-changing operations)
    router.Use(sm.CSRFMiddleware())
    
    // Error handling (must be last)
    router.Use(middleware.ErrorHandlingMiddleware(logger))
}
```

### 2. Authentication Setup

```go
// Protected routes with JWT authentication
func setupAuthenticatedRoutes(
    router *gin.Engine, 
    authService services.AuthService,
    logger *slog.Logger
) {
    // API group with authentication
    api := router.Group("/api/v1")
    api.Use(middleware.AuthMiddleware(authService, logger))
    
    // User routes
    api.GET("/profile", getUserProfile)
    api.PUT("/profile", updateUserProfile)
    api.DELETE("/account", deleteAccount)
    
    // Admin routes with role-based access
    admin := api.Group("/admin")
    admin.Use(middleware.RoleMiddleware([]string{"admin"}, logger))
    admin.GET("/users", listUsers)
    admin.POST("/users/:id/ban", banUser)
}

// Optional authentication for public endpoints
func setupPublicRoutes(
    router *gin.Engine, 
    authService services.AuthService,
    logger *slog.Logger
) {
    public := router.Group("/api/v1/public")
    public.Use(middleware.OptionalAuthMiddleware(authService, logger))
    
    public.GET("/posts", listPosts) // Works with or without auth
    public.GET("/posts/:id", getPost)
}
```

### 3. CSRF Token Management

```go
// Generate CSRF token endpoint
func getCSRFToken(c *gin.Context) {
    securityMiddleware := c.MustGet("security_middleware").(*security.SecurityMiddleware)
    csrfService := securityMiddleware.GetCSRFService()
    
    sessionID := getSessionID(c)
    userID := getUserID(c)
    
    token, err := csrfService.GenerateToken(sessionID, userID, c.Request)
    if err != nil {
        c.JSON(500, gin.H{"error": "Failed to generate CSRF token"})
        return
    }
    
    // Set cookie
    csrfService.SetCSRFCookie(c.Writer, token)
    
    c.JSON(200, gin.H{
        "csrf_token": token.Token,
        "expires_at": token.ExpiresAt,
    })
}
```

## API Integration

### 1. Creating a New Secured API Endpoint

```go
package handlers

import (
    "net/http"
    "github.com/gin-gonic/gin"
    "github.com/Srivathsav-max/lumen/backend/internal/services"
    "github.com/Srivathsav-max/lumen/backend/internal/middleware"
)

// CreateUserHandler creates a new user with full security
func CreateUserHandler(userService services.UserService) gin.HandlerFunc {
    return func(c *gin.Context) {
        // Input validation and sanitization is handled by XSS middleware
        
        var req CreateUserRequest
        if err := c.ShouldBindJSON(&req); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
            return
        }
        
        // Get authenticated user context
        userID := c.GetInt64("userID")
        userRoles := c.GetStringSlice("userRoles")
        
        // Business logic
        user, err := userService.CreateUser(c.Request.Context(), &req, userID)
        if err != nil {
            c.Error(err) // Will be handled by error middleware
            return
        }
        
        c.JSON(http.StatusCreated, user)
    }
}

// Register the handler with security middleware
func RegisterUserRoutes(
    router *gin.Engine, 
    userService services.UserService,
    authService services.AuthService,
    logger *slog.Logger
) {
    users := router.Group("/api/v1/users")
    
    // Apply authentication
    users.Use(middleware.AuthMiddleware(authService, logger))
    
    // Apply stricter rate limiting for user creation
    users.Use(middleware.RateLimitMiddleware(
        middleware.StrictRateLimitConfig(),
        logger,
    ))
    
    // Register handlers
    users.POST("/", CreateUserHandler(userService))
    users.GET("/:id", GetUserHandler(userService))
    users.PUT("/:id", UpdateUserHandler(userService))
    users.DELETE("/:id", DeleteUserHandler(userService))
}
```

### 2. Frontend Integration

#### JavaScript/TypeScript Example

```typescript
class SecurityClient {
    private csrfToken: string = '';
    private accessToken: string = '';
    
    constructor(private baseURL: string) {
        this.initializeCSRF();
    }
    
    // Initialize CSRF token
    async initializeCSRF(): Promise<void> {
        try {
            const response = await fetch(`${this.baseURL}/api/v1/csrf-token`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            const data = await response.json();
            this.csrfToken = data.csrf_token;
        } catch (error) {
            console.error('Failed to initialize CSRF token:', error);
        }
    }
    
    // Make authenticated API request
    async apiRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
        const headers = {
            'Content-Type': 'application/json',
            'X-CSRF-Token': this.csrfToken,
            ...options.headers,
        };
        
        if (this.accessToken) {
            headers['Authorization'] = `Bearer ${this.accessToken}`;
        }
        
        const response = await fetch(`${this.baseURL}${endpoint}`, {
            ...options,
            credentials: 'include',
            headers,
        });
        
        // Handle token refresh
        if (response.status === 401) {
            await this.refreshToken();
            // Retry request with new token
            headers['Authorization'] = `Bearer ${this.accessToken}`;
            return fetch(`${this.baseURL}${endpoint}`, {
                ...options,
                credentials: 'include',
                headers,
            });
        }
        
        return response;
    }
    
    // Refresh access token
    async refreshToken(): Promise<void> {
        const response = await fetch(`${this.baseURL}/api/v1/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': this.csrfToken,
            },
        });
        
        if (response.ok) {
            const data = await response.json();
            this.accessToken = data.access_token;
        } else {
            // Redirect to login
            window.location.href = '/login';
        }
    }
}

// Usage example
const client = new SecurityClient('https://api.example.com');

// Create user
async function createUser(userData: CreateUserRequest) {
    const response = await client.apiRequest('/api/v1/users', {
        method: 'POST',
        body: JSON.stringify(userData),
    });
    
    return response.json();
}
```

## Configuration

### 1. Security Configuration

```go
// Production security configuration
func ProductionSecurityConfig() *security.SecurityConfig {
    return &security.SecurityConfig{
        JWT: security.JWTSecurityConfig{
            Secret:               os.Getenv("JWT_SECRET"), // 256-bit secret
            AccessTokenDuration:  15 * time.Minute,
            RefreshTokenDuration: 7 * 24 * time.Hour,
            Algorithm:            "RS256", // Use RSA in production
            Issuer:               "lumen-auth-service",
            Audience:             []string{"lumen-api"},
            EnableFingerprinting: true,
            FingerprintSalt:      os.Getenv("FINGERPRINT_SALT"),
        },
        CSRF: security.CSRFConfig{
            Enabled:         true,
            TokenFieldName:  "csrf_token",
            TokenHeaderName: "X-CSRF-Token",
            TokenLength:     32,
            TokenLifetime:   24 * time.Hour,
            SecureCookie:    true,
            SameSite:        "Strict",
            TrustedOrigins: []string{
                "https://yourdomain.com",
                "https://www.yourdomain.com",
            },
        },
        RateLimit: security.RateLimitConfig{
            Enabled:     true,
            GlobalRPM:   1000,
            PerIPRPM:    60,
            AuthRPM:     10,
            APIRPM:      100,
            Burst:       10,
            Window:      time.Minute,
            Distributed: true, // Use Redis for distributed rate limiting
        },
        Headers: security.SecurityHeaders{
            Enabled: true,
            HSTS: security.HSTSConfig{
                Enabled:           true,
                MaxAge:            31536000, // 1 year
                IncludeSubdomains: true,
                Preload:           true,
            },
            ContentTypeOptions:  "nosniff",
            FrameOptions:        "DENY",
            XSSProtection:       "1; mode=block",
            ReferrerPolicy:      "strict-origin-when-cross-origin",
            RemoveServerHeader:  true,
        },
        CSP: security.CSPConfig{
            Enabled:    true,
            DefaultSrc: []string{"'self'"},
            ScriptSrc:  []string{"'self'", "'unsafe-inline'"},
            StyleSrc:   []string{"'self'", "'unsafe-inline'"},
            ImgSrc:     []string{"'self'", "data:", "https:"},
            ConnectSrc: []string{"'self'"},
            ReportURI:  "/api/v1/csp-report",
            ReportOnly: false,
        },
    }
}
```

### 2. Environment Variables

```bash
# JWT Configuration
JWT_SECRET=your-256-bit-secret-key-here
FINGERPRINT_SALT=your-fingerprint-salt-here

# Database
DATABASE_URL=postgres://user:pass@localhost/lumen

# Redis (for distributed rate limiting)
REDIS_URL=redis://localhost:6379

# CORS
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Security
CSRF_ENABLED=true
RATE_LIMIT_ENABLED=true
XSS_PROTECTION_ENABLED=true

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

## Best Practices

### 1. Security Headers

```go
// Implement comprehensive security headers
func enhancedSecurityHeaders() gin.HandlerFunc {
    return func(c *gin.Context) {
        // Prevent clickjacking
        c.Header("X-Frame-Options", "DENY")
        
        // Prevent MIME type sniffing
        c.Header("X-Content-Type-Options", "nosniff")
        
        // Enable XSS protection
        c.Header("X-XSS-Protection", "1; mode=block")
        
        // Strict transport security
        c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
        
        // Referrer policy
        c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
        
        // Permissions policy
        c.Header("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
        
        // Content Security Policy
        csp := "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
        c.Header("Content-Security-Policy", csp)
        
        c.Next()
    }
}
```

### 2. Input Validation

```go
// Comprehensive input validation
type CreateUserRequest struct {
    Email     string `json:"email" binding:"required,email,max=255"`
    Password  string `json:"password" binding:"required,min=8,max=128"`
    FirstName string `json:"first_name" binding:"required,max=100"`
    LastName  string `json:"last_name" binding:"required,max=100"`
}

// Custom validation middleware
func validateInput() gin.HandlerFunc {
    return func(c *gin.Context) {
        // Validate content type
        if !strings.Contains(c.GetHeader("Content-Type"), "application/json") {
            c.JSON(400, gin.H{"error": "Content-Type must be application/json"})
            c.Abort()
            return
        }
        
        // Validate content length
        if c.Request.ContentLength > 1024*1024 { // 1MB limit
            c.JSON(413, gin.H{"error": "Request too large"})
            c.Abort()
            return
        }
        
        c.Next()
    }
}
```

### 3. Secure Session Management

```go
// Secure session configuration
func configureSession() {
    store := sessions.NewCookieStore([]byte(os.Getenv("SESSION_SECRET")))
    store.Options.Secure = true      // HTTPS only
    store.Options.HttpOnly = true    // No JavaScript access
    store.Options.SameSite = http.SameSiteStrictMode
    store.Options.MaxAge = 3600      // 1 hour
    store.Options.Path = "/"
}
```

## Monitoring & Logging

### 1. Security Event Logging

```go
// Security event logger
type SecurityLogger struct {
    logger *slog.Logger
}

func (sl *SecurityLogger) LogSecurityEvent(
    event string, 
    severity string, 
    details map[string]interface{},
) {
    sl.logger.With(
        "event_type", "security",
        "event", event,
        "severity", severity,
        "timestamp", time.Now().UTC(),
    ).Info("Security event", "details", details)
}

// Usage examples
securityLogger.LogSecurityEvent("authentication_failure", "medium", map[string]interface{}{
    "user_id": userID,
    "ip_address": clientIP,
    "user_agent": userAgent,
    "reason": "invalid_credentials",
})

securityLogger.LogSecurityEvent("rate_limit_exceeded", "high", map[string]interface{}{
    "client_id": clientID,
    "endpoint": endpoint,
    "requests_count": requestCount,
})
```

### 2. Metrics Collection

```go
// Security metrics
var (
    authenticationAttempts = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "auth_attempts_total",
            Help: "Total number of authentication attempts",
        },
        []string{"status", "method"},
    )
    
    rateLimitHits = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "rate_limit_hits_total",
            Help: "Total number of rate limit hits",
        },
        []string{"endpoint", "client_type"},
    )
    
    csrfValidationResults = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "csrf_validations_total",
            Help: "Total number of CSRF validations",
        },
        []string{"result"},
    )
)
```

## Troubleshooting

### Common Issues

1. **CSRF Token Mismatch**
   ```
   Error: CSRF validation failed: Session ID mismatch
   Solution: Ensure session cookies are properly set and maintained
   ```

2. **JWT Token Expired**
   ```
   Error: Token validation failed: token is expired
   Solution: Implement automatic token refresh on the client side
   ```

3. **Rate Limit Exceeded**
   ```
   Error: Rate limit exceeded: 60 requests per minute
   Solution: Implement exponential backoff in client applications
   ```

4. **CORS Issues**
   ```
   Error: CORS policy blocks request
   Solution: Add your domain to allowed origins in CORS configuration
   ```

### Debug Mode

```go
// Enable debug logging for security components
func enableSecurityDebug(config *security.SecurityConfig) {
    config.Debug = true
    
    // This will log:
    // - JWT token validation steps
    // - CSRF token generation and validation
    // - XSS threat detection
    // - Rate limiting decisions
    // - CORS origin validation
}
```

### Health Checks

```go
// Security health check endpoint
func securityHealthCheck(c *gin.Context) {
    checks := map[string]bool{
        "jwt_service":   true, // Check JWT service health
        "csrf_service":  true, // Check CSRF service health
        "rate_limiter":  true, // Check rate limiter health
        "xss_service":   true, // Check XSS service health
    }
    
    allHealthy := true
    for _, healthy := range checks {
        if !healthy {
            allHealthy = false
            break
        }
    }
    
    status := "healthy"
    if !allHealthy {
        status = "unhealthy"
    }
    
    c.JSON(200, gin.H{
        "status": status,
        "checks": checks,
        "timestamp": time.Now().UTC(),
    })
}
```

This comprehensive security layer provides enterprise-grade protection for your Go web applications. Follow the implementation guide and best practices to ensure maximum security for your APIs and user data.