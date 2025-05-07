package api

import (
	"net/http"
	
	"github.com/Srivathsav-max/lumen/backend/config"
	"github.com/gin-gonic/gin"
)

// SetupRouter sets up the API routes
func SetupRouter(handler *Handler, cfg *config.Config) *gin.Engine {
	// Create a new router
	router := gin.Default()

	// Apply middleware
	router.Use(CORSMiddleware())
	// Apply CSRF middleware to all routes
	router.Use(CSRFMiddleware())

	// Health check endpoint
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "ok",
		})
	})

	// API v1 routes
	public := router.Group("/api/v1")
	{
		// Public routes
		public.POST("/register", handler.Register)
		public.POST("/login", handler.Login)
		public.POST("/waitlist", handler.JoinWaitlist)
		public.GET("/health", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"status": "ok"})
		})
		
		// Registration status endpoint (public)
		public.GET("/registration/status", handler.GetRegistrationStatus)
	}
	v1 := router.Group("/api/v1")
	{
		// Auth endpoints
		v1.GET("/auth/validate", handler.ValidateAuth)
		v1.POST("/auth/logout", handler.EnhancedLogoutHandler)
		v1.POST("/auth/refresh", handler.RefreshToken)
		v1.POST("/auth/revoke", handler.RevokeToken)

		// Protected routes
		protected := v1.Group("/")
		protected.Use(AuthMiddleware(handler, cfg))
		{
			protected.GET("/profile", handler.GetProfile)
			protected.PUT("/profile", handler.UpdateProfile)
			protected.GET("/users/:id", handler.GetUserByID)
			
			// Waitlist management (admin only)
			protected.GET("/waitlist", handler.GetAllWaitlistEntries)
			protected.PUT("/waitlist/:id", handler.UpdateWaitlistStatus)
			protected.DELETE("/waitlist/:id", handler.DeleteWaitlistEntry)
			
			// System settings management (admin only)
			protected.GET("/settings", handler.GetAllSystemSettings)
			protected.PUT("/settings/:key", handler.UpdateSystemSetting)
			protected.PUT("/registration/toggle", handler.ToggleRegistrationStatus)
		}
	}

	return router
}
