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
	// Set trusted proxies for all environments to avoid Gin warning
	if config.IsProduction() {
		// In production, only trust specific proxy IPs
		engine.SetTrustedProxies([]string{"127.0.0.1", "::1"})
	} else {
		// In development, trust localhost addresses
		engine.SetTrustedProxies([]string{"127.0.0.1", "::1", "localhost"})
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

		r.setupNotesRoutes(protected)

		r.setupAIRoutes(protected)
		r.setupNotesLMRoutes(protected)

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

func (r *Router) setupNotesRoutes(protected *gin.RouterGroup) {
	notes := protected.Group("/notes")
	{
		// Workspace routes
		workspaces := notes.Group("/workspaces")
		{
			workspaces.POST("", r.handlers.Notes.CreateWorkspace)
			workspaces.GET("", r.handlers.Notes.GetUserWorkspaces)
			workspaces.GET("/:workspace_id", r.handlers.Notes.GetWorkspace)
			workspaces.PUT("/:workspace_id", r.handlers.Notes.UpdateWorkspace)
			workspaces.DELETE("/:workspace_id", r.handlers.Notes.DeleteWorkspace)

			// Workspace members
			workspaces.POST("/:workspace_id/members", r.handlers.Notes.AddWorkspaceMember)
			workspaces.GET("/:workspace_id/members", r.handlers.Notes.GetWorkspaceMembers)
			workspaces.DELETE("/:workspace_id/members/:user_id", r.handlers.Notes.RemoveWorkspaceMember)
			workspaces.PUT("/:workspace_id/members/:user_id/role", r.handlers.Notes.UpdateMemberRole)

			// Workspace pages
			workspaces.GET("/:workspace_id/pages", r.handlers.Notes.GetWorkspacePages)
			workspaces.GET("/:workspace_id/pages/root", r.handlers.Notes.GetRootPages)
		}

		// Page routes
		pages := notes.Group("/pages")
		{
			pages.POST("", r.handlers.Notes.CreatePage)
			pages.GET("/:page_id", r.handlers.Notes.GetPage)
			pages.PUT("/:page_id", r.handlers.Notes.UpdatePage)
			pages.POST("/:page_id/content", r.handlers.Notes.SavePageContent)
			pages.DELETE("/:page_id", r.handlers.Notes.DeletePage)
			pages.POST("/:page_id/archive", r.handlers.Notes.ArchivePage)
			pages.POST("/:page_id/restore", r.handlers.Notes.RestorePage)

			// Child pages
			pages.GET("/:page_id/children", r.handlers.Notes.GetChildPages)

			// Page permissions
			pages.POST("/:page_id/permissions", r.handlers.Notes.GrantPagePermission)
			pages.GET("/:page_id/permissions", r.handlers.Notes.GetPagePermissions)
			pages.DELETE("/:page_id/permissions/:user_id", r.handlers.Notes.RevokePagePermission)

			// Page versions
			pages.GET("/:page_id/versions", r.handlers.Notes.GetPageVersions)
			pages.GET("/:page_id/versions/:version_number", r.handlers.Notes.GetPageVersion)
		}

		// Search and recent pages
		notes.POST("/search", r.handlers.Notes.SearchPages)
		notes.GET("/recent", r.handlers.Notes.GetRecentPages)
	}
}

func (r *Router) setupAIRoutes(protected *gin.RouterGroup) {
	ai := protected.Group("/ai")
	{
		ai.POST("/generate", r.handlers.AI.GenerateNoteContent)
		ai.POST("/chat/exchange", r.handlers.AI.SaveExchange)
		ai.GET("/chat/history", r.handlers.AI.GetHistory)
		ai.POST("/ask", r.handlers.AI.AskRAG)
	}
}

// Deprecated knowledge routes removed in favor of /noteslm

// Unified NotesLM API group
func (r *Router) setupNotesLMRoutes(protected *gin.RouterGroup) {
	g := protected.Group("/noteslm")
	{
		g.POST("/files", r.handlers.Knowledge.UploadAndIndex)
		g.GET("/files", r.handlers.Knowledge.ListDocuments)
		g.DELETE("/files/:document_id", r.handlers.Knowledge.DeleteDocument)
		g.POST("/ask", r.handlers.Knowledge.Ask)
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
