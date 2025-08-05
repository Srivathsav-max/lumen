package router

import (
	"net/http"
	"time"

	"github.com/Srivathsav-max/lumen/backend/internal/container"
	"github.com/Srivathsav-max/lumen/backend/internal/handlers"
	"github.com/Srivathsav-max/lumen/backend/internal/middleware"
	"github.com/gin-gonic/gin"
)

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

func NewRouter(container *container.Container) *Router {
	handlerFactory := handlers.NewHandlerFactory(container)
	allHandlers := handlerFactory.CreateAllHandlers()

	engine := gin.New()

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

func (r *Router) SetupRoutes() *gin.Engine {
	// Add global middleware
	r.setupGlobalMiddleware()

	// Setup route groups
	r.setupHealthRoutes()
	r.setupAPIRoutes()

	return r.engine
}

func (r *Router) setupGlobalMiddleware() {
	logger := r.container.GetLogger()
	config := r.container.GetConfig()
	securityMiddleware := r.container.GetSecurityMiddleware()

	r.engine.Use(gin.CustomRecovery(func(c *gin.Context, recovered interface{}) {
		logger.Error("Panic recovered",
			"panic", recovered,
			"request_id", getRequestID(c),
			"method", c.Request.Method,
			"path", c.Request.URL.Path,
		)
		c.AbortWithStatus(http.StatusInternalServerError)
	}))

	r.engine.Use(middleware.RequestIDMiddleware(logger))

	if securityMiddleware != nil {
		r.engine.Use(securityMiddleware.SecurityHeadersMiddleware())

		r.engine.Use(securityMiddleware.CORSMiddleware())

		r.engine.Use(securityMiddleware.XSSProtectionMiddleware())

		if !config.IsDevelopment() {
			r.engine.Use(securityMiddleware.RateLimitMiddleware())
		}
	} else {
		logger.Warn("Security middleware not available, using basic security")
		r.engine.Use(r.securityHeadersMiddleware())
		r.engine.Use(r.corsMiddleware())
	}

	r.engine.Use(middleware.ErrorHandlingMiddleware(logger))
}

func (r *Router) setupHealthRoutes() {
	r.engine.GET("/health", r.handlers.System.HealthCheck)
	r.engine.GET("/ping", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "timestamp": time.Now().Unix()})
	})
}

func (r *Router) setupAPIRoutes() {
	// API v1 routes
	v1 := r.engine.Group("/api/v1")
	{
		r.setupV1PublicRoutes(v1)
		r.setupV1AuthRoutes(v1)
		r.setupV1ProtectedRoutes(v1)
	}
}

func (r *Router) setupV1PublicRoutes(v1 *gin.RouterGroup) {
	logger := r.container.GetLogger()
	securityMiddleware := r.container.GetSecurityMiddleware()

	public := v1.Group("/")

	public.POST("/register", r.handlers.Auth.Register)
	public.POST("/login", r.handlers.Auth.Login)
	public.POST("/auth/forgot-password", r.handlers.Auth.InitiatePasswordReset)
	public.POST("/auth/reset-password", r.handlers.Auth.ResetPassword)

	if securityMiddleware != nil {
		csrfProtected := public.Group("/")
		csrfProtected.Use(securityMiddleware.CSRFMiddleware())
		{
			csrfProtected.POST("/waitlist", r.handlers.Waitlist.JoinWaitlist)
		}
	} else {
		logger.Warn("CSRF protection not available for public routes")
		public.POST("/waitlist", r.handlers.Waitlist.JoinWaitlist)
	}

	public.GET("/waitlist/position", r.handlers.Waitlist.GetWaitlistPosition)
	public.GET("/system/maintenance", r.handlers.Maintenance.GetMaintenanceStatus)
	public.GET("/system/registration", r.handlers.SystemSettings.GetRegistrationStatus)

	security := v1.Group("/security")
	{
		security.POST("/csrf-token", r.handlers.Security.GetCSRFToken)
		security.POST("/csp-report", r.handlers.Security.CSPReport)
	}
}

func (r *Router) setupV1AuthRoutes(v1 *gin.RouterGroup) {
	securityMiddleware := r.container.GetSecurityMiddleware()
	logger := r.container.GetLogger()

	auth := v1.Group("/auth")
	{
		auth.GET("/validate", r.handlers.Auth.ValidateToken)

		auth.POST("/refresh", r.handlers.Auth.RefreshToken)

		authProtected := auth.Group("/")
		if securityMiddleware != nil {
			authProtected.Use(securityMiddleware.JWTAuthMiddleware())
		} else {
			authService := r.container.GetAuthService()
			authProtected.Use(middleware.AuthMiddleware(authService, logger))
		}
		{
			authProtected.POST("/logout", r.handlers.Auth.Logout)
			authProtected.POST("/revoke", r.handlers.Auth.RevokeToken)
			authProtected.POST("/change-password", r.handlers.Auth.ChangePassword)
		}
	}
}

func (r *Router) setupV1ProtectedRoutes(v1 *gin.RouterGroup) {
	securityMiddleware := r.container.GetSecurityMiddleware()
	logger := r.container.GetLogger()

	protected := v1.Group("/")
	if securityMiddleware != nil {
		protected.Use(securityMiddleware.JWTAuthMiddleware())
		protected.Use(securityMiddleware.CSRFMiddleware())
	} else {
		authService := r.container.GetAuthService()
		protected.Use(middleware.AuthMiddleware(authService, logger))
	}
	{
		r.setupUserRoutes(protected)

		r.setupWaitlistRoutes(protected)

		r.setupAdminRoutes(protected)
	}
}

func (r *Router) setupUserRoutes(protected *gin.RouterGroup) {
	profile := protected.Group("/profile")
	{
		profile.GET("", r.handlers.User.GetProfile)
		profile.PUT("", r.handlers.User.UpdateProfile)
		profile.POST("/verify-email", r.handlers.User.VerifyEmail)
		profile.GET("/email-verification", r.handlers.User.CheckEmailVerification)
		profile.POST("/request-password-change-otp", r.handlers.User.RequestPasswordChangeOTP)
		profile.POST("/change-password", r.handlers.User.ChangePassword)
	}

	users := protected.Group("/users")
	{
		users.GET("/:id", r.handlers.User.GetUserByID)
	}
}

func (r *Router) setupWaitlistRoutes(protected *gin.RouterGroup) {
	logger := r.container.GetLogger()

	waitlist := protected.Group("/waitlist")
	waitlist.Use(middleware.AdminRequiredMiddleware(logger))
	{
		waitlist.GET("", r.handlers.Waitlist.GetWaitlistEntries)
		waitlist.POST("/approve", r.handlers.Waitlist.ApproveWaitlistEntry)
		waitlist.DELETE("/:email", r.handlers.Waitlist.RemoveFromWaitlist)
		waitlist.PUT("/:id", r.handlers.Waitlist.UpdateWaitlistStatus)
	}
}

func (r *Router) setupAdminRoutes(protected *gin.RouterGroup) {
	logger := r.container.GetLogger()

	admin := protected.Group("/admin")
	admin.Use(middleware.AdminRequiredMiddleware(logger))
	{
		r.setupAdminSystemRoutes(admin)

		r.setupAdminUserRoutes(admin)

		email := admin.Group("/email")
		{
			email.POST("/test", r.handlers.Email.SendTestEmail)
		}
	}
}

func (r *Router) setupAdminSystemRoutes(admin *gin.RouterGroup) {
	settings := admin.Group("/settings")
	{
		settings.GET("", r.handlers.SystemSettings.GetAllSystemSettings)
		settings.GET("/:key", r.handlers.System.GetSetting)
		settings.PUT("/:key", r.handlers.SystemSettings.UpdateSystemSetting)
	}

	system := admin.Group("/system")
	{
		system.POST("/maintenance/enable", r.handlers.Maintenance.EnableMaintenanceMode)
		system.POST("/maintenance/disable", r.handlers.Maintenance.DisableMaintenanceMode)
		system.PUT("/registration/toggle", r.handlers.SystemSettings.ToggleRegistrationStatus)
	}
}

func (r *Router) setupAdminUserRoutes(admin *gin.RouterGroup) {
	users := admin.Group("/users")
	{
		users.GET("/role/:role", r.handlers.User.GetUsersByRole)
	}
}

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

		allowed := false
		for _, allowedOrigin := range allowedOrigins {
			if origin == allowedOrigin {
				allowed = true
				break
			}
		}

		if allowed {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
			c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		} else if config.IsDevelopment() && (origin == "" || origin == "null") {
			c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		}

		c.Writer.Header().Set("Access-Control-Allow-Headers",
			"Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With, X-Request-ID")
		c.Writer.Header().Set("Access-Control-Allow-Methods",
			"GET, POST, PUT, DELETE, PATCH, OPTIONS")
		c.Writer.Header().Set("Access-Control-Max-Age", "86400") // 24 hours

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

func (r *Router) securityHeadersMiddleware() gin.HandlerFunc {
	config := r.container.GetConfig()

	return func(c *gin.Context) {
		c.Writer.Header().Set("X-Content-Type-Options", "nosniff")

		c.Writer.Header().Set("X-Frame-Options", "DENY")

		c.Writer.Header().Set("X-XSS-Protection", "1; mode=block")

		c.Writer.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")

		if config.IsProduction() {
			c.Writer.Header().Set("Content-Security-Policy",
				"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.moxium.tech")
		}

		if config.IsProduction() {
			c.Writer.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		}

		c.Writer.Header().Set("Server", "")

		c.Next()
	}
}

func (r *Router) GetEngine() *gin.Engine {
	return r.engine
}

func getRequestID(c *gin.Context) string {
	if requestID, exists := c.Get("request_id"); exists {
		if id, ok := requestID.(string); ok {
			return id
		}
	}
	return "unknown"
}
