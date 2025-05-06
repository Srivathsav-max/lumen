package api

import (
	"github.com/Srivathsav-max/lumen/backend/config"
	"github.com/gin-gonic/gin"
)

// SetupRouter sets up the API routes
func SetupRouter(handler *Handler, cfg *config.Config) *gin.Engine {
	// Create a new router
	router := gin.Default()

	// Apply middleware
	router.Use(CORSMiddleware())

	// Health check endpoint
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "ok",
		})
	})

	// API v1 routes
	v1 := router.Group("/api/v1")
	{
		// Public routes
		v1.POST("/register", handler.Register)
		v1.POST("/login", handler.Login)
		v1.GET("/users/:id", handler.GetUserByID)
		
		// Auth validation endpoint
		v1.GET("/auth/validate", handler.ValidateAuth)

		// Protected routes
		auth := v1.Group("/")
		auth.Use(AuthMiddleware(cfg))
		{
			auth.GET("/profile", handler.GetProfile)
			auth.PUT("/profile", handler.UpdateProfile)
		}
	}

	return router
}
