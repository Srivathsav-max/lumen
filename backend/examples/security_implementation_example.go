package examples

// This file demonstrates practical implementation of the Lumen Security Layer
// for production-ready APIs with complete security integration.

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/Srivathsav-max/lumen/backend/internal/middleware"
	"github.com/Srivathsav-max/lumen/backend/internal/security"
	"github.com/Srivathsav-max/lumen/backend/internal/services"
)

// SecurityAwareServer demonstrates a complete server setup with all security layers
type SecurityAwareServer struct {
	router             *gin.Engine
	securityMiddleware *security.SecurityMiddleware
	authService        services.AuthService
	userService        services.UserService
	logger             *slog.Logger
}

// NewSecurityAwareServer creates a new server with complete security setup
func NewSecurityAwareServer(
	authService services.AuthService,
	userService services.UserService,
	logger *slog.Logger,
) *SecurityAwareServer {
	// Create production security configuration
	securityConfig := createProductionSecurityConfig()

	// Initialize security middleware
	securityMiddleware := security.NewSecurityMiddleware(securityConfig, logger)

	// Create Gin router
	router := gin.New()

	server := &SecurityAwareServer{
		router:             router,
		securityMiddleware: securityMiddleware,
		authService:        authService,
		userService:        userService,
		logger:             logger,
	}

	// Setup middleware chain
	server.setupMiddleware()

	// Setup routes
	server.setupRoutes()

	return server
}

// createProductionSecurityConfig creates a production-ready security configuration
func createProductionSecurityConfig() *security.SecurityConfig {
	return &security.SecurityConfig{
		JWT: security.JWTSecurityConfig{
			Secret:               os.Getenv("JWT_SECRET"),
			AccessTokenDuration:  15 * time.Minute,
			RefreshTokenDuration: 7 * 24 * time.Hour,
			Algorithm:            "HS256",
			Issuer:               "lumen-api",
			Audience:             []string{"lumen-frontend"},
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
				"http://localhost:3000",
				"https://yourdomain.com",
			},
		},
		XSS: security.XSSConfig{
			Enabled:     true,
			StrictMode:  true,
			AllowedTags: []string{"b", "i", "em", "strong", "p", "br"},
			AllowedAttributes: map[string][]string{
				"a": {"href", "title"},
			},
			AllowedProtocols: []string{"http", "https", "mailto"},
		},
		RateLimit: security.RateLimitConfig{
			Enabled:   true,
			GlobalRPM: 1000,
			PerIPRPM:  60,
			AuthRPM:   10,
			APIRPM:    100,
			Burst:     10,
			Window:    time.Minute,
		},
		Headers: security.SecurityHeaders{
			Enabled: true,
			HSTS: security.HSTSConfig{
				Enabled:           true,
				MaxAge:            31536000,
				IncludeSubdomains: true,
				Preload:           true,
			},
			ContentTypeOptions: "nosniff",
			FrameOptions:       "DENY",
			XSSProtection:      "1; mode=block",
			ReferrerPolicy:     "strict-origin-when-cross-origin",
			RemoveServerHeader: true,
		},
		CSP: security.CSPConfig{
			Enabled:    true,
			DefaultSrc: []string{"'self'"},
			ScriptSrc:  []string{"'self'"},
			StyleSrc:   []string{"'self'", "'unsafe-inline'"},
			ImgSrc:     []string{"'self'", "data:", "https:"},
			ConnectSrc: []string{"'self'"},
			ReportURI:  "/api/v1/csp-report",
			ReportOnly: false,
		},
	}
}

// setupMiddleware configures the complete middleware chain
func (s *SecurityAwareServer) setupMiddleware() {
	// Recovery middleware (should be first)
	s.router.Use(gin.Recovery())

	// Request ID middleware (for tracing)
	s.router.Use(middleware.RequestIDMiddleware())

	// Logging middleware
	s.router.Use(middleware.LoggingMiddleware(s.logger))

	// CORS middleware
	s.router.Use(middleware.CORSMiddleware())

	// Security headers middleware
	s.router.Use(s.securityMiddleware.SecurityHeadersMiddleware())

	// Rate limiting middleware
	s.router.Use(middleware.RateLimitMiddleware(
		middleware.DefaultRateLimitConfig(),
		s.logger,
	))

	// XSS protection middleware
	s.router.Use(s.securityMiddleware.XSSProtectionMiddleware())

	// Error handling middleware (should be last)
	s.router.Use(middleware.ErrorHandlingMiddleware(s.logger))
}

// setupRoutes configures all application routes with appropriate security
func (s *SecurityAwareServer) setupRoutes() {
	// Health check endpoint (no security required)
	s.router.GET("/health", s.healthCheck)

	// Security endpoints
	s.setupSecurityRoutes()

	// Public API routes
	s.setupPublicRoutes()

	// Protected API routes
	s.setupProtectedRoutes()

	// Admin routes
	s.setupAdminRoutes()
}

// setupSecurityRoutes configures security-related endpoints
func (s *SecurityAwareServer) setupSecurityRoutes() {
	security := s.router.Group("/api/v1/security")

	// CSRF token endpoint
	security.GET("/csrf-token", s.getCSRFToken)

	// CSP report endpoint
	security.POST("/csp-report", s.handleCSPReport)

	// Security health check
	security.GET("/health", s.securityHealthCheck)
}

// setupPublicRoutes configures public API endpoints
func (s *SecurityAwareServer) setupPublicRoutes() {
	public := s.router.Group("/api/v1/public")

	// Optional authentication for public endpoints
	public.Use(middleware.OptionalAuthMiddleware(s.authService, s.logger))

	// Public endpoints
	public.GET("/posts", s.listPublicPosts)
	public.GET("/posts/:id", s.getPublicPost)
	public.GET("/users/:id/profile", s.getPublicUserProfile)
}

// setupProtectedRoutes configures authenticated API endpoints
func (s *SecurityAwareServer) setupProtectedRoutes() {
	api := s.router.Group("/api/v1")

	// Authentication middleware
	api.Use(middleware.AuthMiddleware(s.authService, s.logger))

	// CSRF protection for state-changing operations
	api.Use(s.securityMiddleware.CSRFMiddleware())

	// User management endpoints
	users := api.Group("/users")
	users.GET("/me", s.getCurrentUser)
	users.PUT("/me", s.updateCurrentUser)
	users.DELETE("/me", s.deleteCurrentUser)
	users.POST("/me/change-password", s.changePassword)

	// Post management endpoints
	posts := api.Group("/posts")
	posts.GET("/", s.listUserPosts)
	posts.POST("/", s.createPost)
	posts.GET("/:id", s.getUserPost)
	posts.PUT("/:id", s.updatePost)
	posts.DELETE("/:id", s.deletePost)
}

// setupAdminRoutes configures admin-only endpoints
func (s *SecurityAwareServer) setupAdminRoutes() {
	admin := s.router.Group("/api/v1/admin")

	// Authentication middleware
	admin.Use(middleware.AuthMiddleware(s.authService, s.logger))

	// Role-based access control
	admin.Use(middleware.RoleMiddleware([]string{"admin"}, s.logger))

	// CSRF protection
	admin.Use(s.securityMiddleware.CSRFMiddleware())

	// Stricter rate limiting for admin operations
	admin.Use(middleware.RateLimitMiddleware(
		middleware.StrictRateLimitConfig(),
		s.logger,
	))

	// Admin endpoints
	admin.GET("/users", s.listAllUsers)
	admin.GET("/users/:id", s.getAnyUser)
	admin.POST("/users/:id/ban", s.banUser)
	admin.POST("/users/:id/unban", s.unbanUser)
	admin.DELETE("/users/:id", s.deleteAnyUser)
	admin.GET("/security/logs", s.getSecurityLogs)
	admin.GET("/security/metrics", s.getSecurityMetrics)
}

// Handler implementations with security best practices

// healthCheck provides a basic health check endpoint
func (s *SecurityAwareServer) healthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":    "healthy",
		"timestamp": time.Now().UTC(),
		"version":   "1.0.0",
	})
}

// getCSRFToken generates and returns a CSRF token
func (s *SecurityAwareServer) getCSRFToken(c *gin.Context) {
	csrfService := s.securityMiddleware.GetCSRFService()

	// Get session information
	sessionID := getSessionID(c)
	userID := getUserIDFromContext(c)

	// Generate CSRF token
	token, err := csrfService.GenerateToken(sessionID, userID, c.Request)
	if err != nil {
		s.logger.Error("Failed to generate CSRF token", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to generate CSRF token",
		})
		return
	}

	// Set secure cookie
	csrfService.SetCSRFCookie(c.Writer, token)

	c.JSON(http.StatusOK, gin.H{
		"csrf_token": token.Token,
		"expires_at": token.ExpiresAt,
	})
}

// handleCSPReport handles Content Security Policy violation reports
func (s *SecurityAwareServer) handleCSPReport(c *gin.Context) {
	var report map[string]interface{}
	if err := c.ShouldBindJSON(&report); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid CSP report"})
		return
	}

	// Log CSP violation
	s.logger.Warn("CSP violation reported",
		"report", report,
		"user_agent", c.GetHeader("User-Agent"),
		"ip_address", c.ClientIP(),
	)

	c.Status(http.StatusNoContent)
}

// securityHealthCheck provides detailed security component health status
func (s *SecurityAwareServer) securityHealthCheck(c *gin.Context) {
	checks := map[string]bool{
		"jwt_service":   s.checkJWTService(),
		"csrf_service":  s.checkCSRFService(),
		"xss_service":   s.checkXSSService(),
		"rate_limiter":  s.checkRateLimiter(),
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

	c.JSON(http.StatusOK, gin.H{
		"status":    status,
		"checks":    checks,
		"timestamp": time.Now().UTC(),
	})
}

// getCurrentUser returns the current authenticated user
func (s *SecurityAwareServer) getCurrentUser(c *gin.Context) {
	userID := c.GetInt64("userID")

	user, err := s.userService.GetByID(c.Request.Context(), userID)
	if err != nil {
		c.Error(err)
		return
	}

	c.JSON(http.StatusOK, user)
}

// updateCurrentUser updates the current user's profile
func (s *SecurityAwareServer) updateCurrentUser(c *gin.Context) {
	userID := c.GetInt64("userID")

	var req UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// Input is automatically sanitized by XSS middleware
	user, err := s.userService.UpdateUser(c.Request.Context(), userID, &req)
	if err != nil {
		c.Error(err)
		return
	}

	c.JSON(http.StatusOK, user)
}

// createPost creates a new post with full security validation
func (s *SecurityAwareServer) createPost(c *gin.Context) {
	userID := c.GetInt64("userID")
	userRoles := c.GetStringSlice("userRoles")

	var req CreatePostRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// Additional validation for post content
	if len(req.Content) > 10000 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Content too long"})
		return
	}

	// Check user permissions
	if !hasPermission(userRoles, "create_post") {
		c.JSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions"})
		return
	}

	// Create post (content is sanitized by XSS middleware)
	post, err := s.postService.CreatePost(c.Request.Context(), userID, &req)
	if err != nil {
		c.Error(err)
		return
	}

	// Log security event
	s.logger.Info("Post created",
		"user_id", userID,
		"post_id", post.ID,
		"ip_address", c.ClientIP(),
	)

	c.JSON(http.StatusCreated, post)
}

// Helper functions

func getSessionID(c *gin.Context) string {
	// Extract session ID from cookie or header
	if sessionID := c.GetHeader("X-Session-ID"); sessionID != "" {
		return sessionID
	}
	return "anonymous"
}

func getUserIDFromContext(c *gin.Context) int64 {
	if userID, exists := c.Get("userID"); exists {
		if id, ok := userID.(int64); ok {
			return id
		}
	}
	return 0
}

func hasPermission(roles []string, permission string) bool {
	// Implement role-based permission checking
	for _, role := range roles {
		if role == "admin" {
			return true
		}
		if role == "user" && permission == "create_post" {
			return true
		}
	}
	return false
}

// Health check functions for security components

func (s *SecurityAwareServer) checkJWTService() bool {
	// Test JWT service by generating a test token
	jwtService := s.securityMiddleware.GetJWTService()
	testReq, _ := http.NewRequest("GET", "/test", nil)
	_, err := jwtService.GenerateTokenPair(1, "test@example.com", []string{"user"}, testReq)
	return err == nil
}

func (s *SecurityAwareServer) checkCSRFService() bool {
	// Test CSRF service by generating a test token
	csrfService := s.securityMiddleware.GetCSRFService()
	testReq, _ := http.NewRequest("GET", "/test", nil)
	_, err := csrfService.GenerateToken("test-session", 1, testReq)
	return err == nil
}

func (s *SecurityAwareServer) checkXSSService() bool {
	// Test XSS service by sanitizing test input
	xssService := s.securityMiddleware.GetXSSService()
	result := xssService.SanitizeInput("<script>alert('test')</script>")
	return result != nil
}

func (s *SecurityAwareServer) checkRateLimiter() bool {
	// Rate limiter is always healthy if initialized
	return true
}

// Request/Response types

type UpdateUserRequest struct {
	FirstName string `json:"first_name" binding:"required,max=100"`
	LastName  string `json:"last_name" binding:"required,max=100"`
	Email     string `json:"email" binding:"required,email,max=255"`
}

type CreatePostRequest struct {
	Title   string `json:"title" binding:"required,max=200"`
	Content string `json:"content" binding:"required,max=10000"`
	Tags    []string `json:"tags" binding:"max=10"`
}

// Start starts the secure server
func (s *SecurityAwareServer) Start(addr string) error {
	s.logger.Info("Starting secure server", "address", addr)
	return s.router.Run(addr)
}

// Example usage in main.go:
/*
func main() {
	// Initialize logger
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))

	// Initialize services
	authService := services.NewAuthService(db, logger)
	userService := services.NewUserService(db, logger)

	// Create secure server
	server := NewSecurityAwareServer(authService, userService, logger)

	// Start server
	if err := server.Start(":8080"); err != nil {
		logger.Error("Failed to start server", "error", err)
		os.Exit(1)
	}
}
*/