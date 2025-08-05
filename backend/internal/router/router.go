package router

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/Srivathsav-max/lumen/backend/internal/container"
	"github.com/Srivathsav-max/lumen/backend/internal/handlers"
	"github.com/Srivathsav-max/lumen/backend/internal/middleware"
)

// Router manages HTTP routing and middleware
type Router struct {
	container *container.Container
	handlers  *handlers.AllHandlers
	engine    *gin.Engine
}

// RouterConfig holds router configuration
type RouterConfig struct {
	EnableRateLimit bool
	EnableCORS      bool
	TrustedProxies  []string
	AllowedOrigins  []string
}

// NewRouter creates a new Router instance
func NewRouter(container *container.Container) *Router {
	// Create handler factory and all handlers
	handlerFactory := handlers.NewHandlerFactory(container)
	allHandlers := handlerFactory.CreateAllHandlers()

	// Create Gin engine with custom configuration
	engine := gin.New()
	
	// Set trusted proxies for production
	config := container.GetConfig()
	if config.IsProduction() {
		engine.SetTrustedProxies([]string{"127.0.0.1", "::1"})
	}

	return &Router{
		container: container,
		handlers:  allHandlers,
		engine:    engine,
	}
}

// SetupRoutes configures all routes and middleware
func (r *Router) SetupRoutes() *gin.Engine {
	// Add global middleware
	r.setupGlobalMiddleware()

	// Setup route groups
	r.setupHealthRoutes()
	r.setupAPIRoutes()

	return r.engine
}

// setupGlobalMiddleware configures global middleware
func (r *Router) setupGlobalMiddleware() {
	logger := r.container.GetLogger()
	config := r.container.GetConfig()

	// Recovery middleware with custom recovery handler
	r.engine.Use(gin.CustomRecovery(func(c *gin.Context, recovered interface{}) {
		logger.Error("Panic recovered",
			"panic", recovered,
			"request_id", getRequestID(c),
			"method", c.Request.Method,
			"path", c.Request.URL.Path,
		)
		c.AbortWithStatus(http.StatusInternalServerError)
	}))

	// Request ID middleware (must be first to ensure all logs have request ID)
	r.engine.Use(middleware.RequestIDMiddleware(logger))

	// Security headers middleware
	r.engine.Use(r.securityHeadersMiddleware())

	// CORS middleware
	r.engine.Use(middleware.CORSMiddleware())

	// CSRF middleware
	r.engine.Use(middleware.CSRFMiddleware())

	// Rate limiting middleware (applied globally with different configs per route group)
	if !config.IsDevelopment() {
		r.engine.Use(middleware.RateLimitMiddleware(
			middleware.DefaultRateLimitConfig(),
			logger,
		))
	}

	// Error handling middleware (should be last)
	r.engine.Use(middleware.ErrorHandlingMiddleware(logger))
}

// setupHealthRoutes configures health check routes
func (r *Router) setupHealthRoutes() {
	// Simple health check endpoint (no rate limiting)
	r.engine.GET("/health", r.handlers.System.HealthCheck)
	r.engine.GET("/ping", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "timestamp": time.Now().Unix()})
	})
}

// setupAPIRoutes configures all API routes with proper versioning
func (r *Router) setupAPIRoutes() {
	// API v1 routes
	v1 := r.engine.Group("/api/v1")
	{
		r.setupV1PublicRoutes(v1)
		r.setupV1AuthRoutes(v1)
		r.setupV1ProtectedRoutes(v1)
	}
}

// setupV1PublicRoutes configures public routes for API v1
func (r *Router) setupV1PublicRoutes(v1 *gin.RouterGroup) {
	logger := r.container.GetLogger()
	config := r.container.GetConfig()

	// Public routes group
	public := v1.Group("/")
	
	// Apply stricter rate limiting for auth endpoints in production
	if !config.IsDevelopment() {
		authLimited := public.Group("/")
		authLimited.Use(middleware.RateLimitMiddleware(
			middleware.StrictRateLimitConfig(),
			logger,
		))
		{
			// Authentication routes (rate limited)
			authLimited.POST("/register", r.handlers.Auth.Register)
			authLimited.POST("/login", r.handlers.Auth.Login)
			authLimited.POST("/auth/forgot-password", r.handlers.Auth.InitiatePasswordReset)
			authLimited.POST("/auth/reset-password", r.handlers.Auth.ResetPassword)
		}
	} else {
		// Development - no rate limiting
		public.POST("/register", r.handlers.Auth.Register)
		public.POST("/login", r.handlers.Auth.Login)
		public.POST("/auth/forgot-password", r.handlers.Auth.InitiatePasswordReset)
		public.POST("/auth/reset-password", r.handlers.Auth.ResetPassword)
	}

	// Waitlist routes
	public.POST("/waitlist", r.handlers.Waitlist.JoinWaitlist)
	public.GET("/waitlist/position", r.handlers.Waitlist.GetWaitlistPosition)

	// System status routes
	public.GET("/system/maintenance", r.handlers.Maintenance.GetMaintenanceStatus)
	public.GET("/system/registration", r.handlers.SystemSettings.GetRegistrationStatus)
}

// setupV1AuthRoutes configures authentication-related routes for API v1
func (r *Router) setupV1AuthRoutes(v1 *gin.RouterGroup) {
	authService := r.container.GetAuthService()
	roleService := r.container.GetRoleService()
	logger := r.container.GetLogger()

	// Auth routes group
	auth := v1.Group("/auth")
	{
		// Token validation (no auth required, validates provided token)
		auth.GET("/validate", r.handlers.Auth.ValidateToken)

		// Token refresh (no auth required, uses refresh token)
		auth.POST("/refresh", r.handlers.Token.RefreshToken)

		// Protected auth routes (require authentication)
		authProtected := auth.Group("/")
		authProtected.Use(middleware.AuthMiddleware(authService, roleService, logger))
		{
			authProtected.POST("/logout", r.handlers.Token.Logout)
			authProtected.POST("/revoke", r.handlers.Token.RevokeToken)
			authProtected.POST("/change-password", r.handlers.Auth.ChangePassword)
		}
	}
}

// setupV1ProtectedRoutes configures protected routes for API v1
func (r *Router) setupV1ProtectedRoutes(v1 *gin.RouterGroup) {
	authService := r.container.GetAuthService()
	roleService := r.container.GetRoleService()
	logger := r.container.GetLogger()

	// Protected routes group (requires authentication)
	protected := v1.Group("/")
	protected.Use(middleware.AuthMiddleware(authService, roleService, logger))
	{
		// User profile routes
		r.setupUserRoutes(protected)

		// Admin routes
		r.setupAdminRoutes(protected)
	}
}

// setupUserRoutes configures user-related protected routes
func (r *Router) setupUserRoutes(protected *gin.RouterGroup) {
	// User profile management
	profile := protected.Group("/profile")
	{
		profile.GET("", r.handlers.User.GetProfile)
		profile.PUT("", r.handlers.User.UpdateProfile)
		profile.POST("/verify-email", r.handlers.User.VerifyEmail)
		profile.GET("/email-verification", r.handlers.User.CheckEmailVerification)
	}

	// User-specific routes
	users := protected.Group("/users")
	{
		users.GET("/:id", r.handlers.User.GetUserByID)
	}
}

// setupAdminRoutes configures admin-only routes
func (r *Router) setupAdminRoutes(protected *gin.RouterGroup) {
	logger := r.container.GetLogger()
	
	// Admin-only routes
	admin := protected.Group("/admin")
	admin.Use(middleware.AdminRequiredMiddleware(logger))
	{
		// Waitlist management
		r.setupAdminWaitlistRoutes(admin)

		// System management
		r.setupAdminSystemRoutes(admin)

		// User management
		r.setupAdminUserRoutes(admin)

		// Email testing
		email := admin.Group("/email")
		{
			email.POST("/test", r.handlers.Email.SendTestEmail)
		}
	}
}

// setupAdminWaitlistRoutes configures admin waitlist management routes
func (r *Router) setupAdminWaitlistRoutes(admin *gin.RouterGroup) {
	waitlist := admin.Group("/waitlist")
	{
		waitlist.GET("", r.handlers.Waitlist.GetWaitlistEntries)
		waitlist.POST("/approve", r.handlers.Waitlist.ApproveWaitlistEntry)
		waitlist.DELETE("/:email", r.handlers.Waitlist.RemoveFromWaitlist)
		waitlist.PUT("/:id", r.handlers.Waitlist.UpdateWaitlistStatus)
	}
}

// setupAdminSystemRoutes configures admin system management routes
func (r *Router) setupAdminSystemRoutes(admin *gin.RouterGroup) {
	// System settings
	settings := admin.Group("/settings")
	{
		settings.GET("", r.handlers.SystemSettings.GetAllSystemSettings)
		settings.GET("/:key", r.handlers.System.GetSetting)
		settings.PUT("/:key", r.handlers.SystemSettings.UpdateSystemSetting)
	}

	// System controls
	system := admin.Group("/system")
	{
		system.POST("/maintenance/enable", r.handlers.Maintenance.EnableMaintenanceMode)
		system.POST("/maintenance/disable", r.handlers.Maintenance.DisableMaintenanceMode)
		system.PUT("/registration/toggle", r.handlers.SystemSettings.ToggleRegistrationStatus)
	}
}

// setupAdminUserRoutes configures admin user management routes
func (r *Router) setupAdminUserRoutes(admin *gin.RouterGroup) {
	users := admin.Group("/users")
	{
		users.GET("/role/:role", r.handlers.User.GetUsersByRole)
	}
}

// corsMiddleware creates CORS middleware with enhanced security
func (r *Router) corsMiddleware() gin.HandlerFunc {
	config := r.container.GetConfig()
	
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")

		// Define allowed origins based on environment
		var allowedOrigins []string
		if config.IsDevelopment() {
			allowedOrigins = []string{
				"http://localhost:3000",
				"http://localhost:3001",
				"http://127.0.0.1:3000",
			}
		} else {
			allowedOrigins = []string{
				"https://moxium.tech",
				"https://www.moxium.tech",
				"https://api.moxium.tech",
			}
		}

		// Check if the request origin is allowed
		allowed := false
		for _, allowedOrigin := range allowedOrigins {
			if origin == allowedOrigin {
				allowed = true
				break
			}
		}

		// Set CORS headers
		if allowed {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
			c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		} else if config.IsDevelopment() && (origin == "" || origin == "null") {
			// Allow requests without origin in development (e.g., Postman, curl)
			c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		}

		// Set allowed headers and methods
		c.Writer.Header().Set("Access-Control-Allow-Headers", 
			"Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With, X-Request-ID")
		c.Writer.Header().Set("Access-Control-Allow-Methods", 
			"GET, POST, PUT, DELETE, PATCH, OPTIONS")
		c.Writer.Header().Set("Access-Control-Max-Age", "86400") // 24 hours

		// Handle preflight requests
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

// securityHeadersMiddleware adds security headers
func (r *Router) securityHeadersMiddleware() gin.HandlerFunc {
	config := r.container.GetConfig()
	
	return func(c *gin.Context) {
		// Prevent MIME type sniffing
		c.Writer.Header().Set("X-Content-Type-Options", "nosniff")
		
		// Prevent clickjacking
		c.Writer.Header().Set("X-Frame-Options", "DENY")
		
		// XSS protection
		c.Writer.Header().Set("X-XSS-Protection", "1; mode=block")
		
		// Referrer policy
		c.Writer.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		
		// Content Security Policy (basic)
		if config.IsProduction() {
			c.Writer.Header().Set("Content-Security-Policy", 
				"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.moxium.tech")
		}
		
		// HSTS (only in production with HTTPS)
		if config.IsProduction() {
			c.Writer.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		}
		
		// Remove server information
		c.Writer.Header().Set("Server", "")
		
		c.Next()
	}
}

// GetEngine returns the Gin engine
func (r *Router) GetEngine() *gin.Engine {
	return r.engine
}

// getRequestID extracts request ID from context
func getRequestID(c *gin.Context) string {
	if requestID, exists := c.Get("request_id"); exists {
		if id, ok := requestID.(string); ok {
			return id
		}
	}
	return "unknown"
}