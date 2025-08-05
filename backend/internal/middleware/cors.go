package middleware

import (
	"github.com/gin-gonic/gin"
)

// CORSMiddleware handles CORS for the API
func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")

		// List of allowed origins
		allowedOrigins := []string{
			"http://localhost:3000",
			"https://moxium.tech",
			"https://www.moxium.tech",
			"https://api.moxium.tech",
		}

		// Check if the request origin is allowed
		allowed := false
		for _, allowedOrigin := range allowedOrigins {
			if origin == allowedOrigin {
				allowed = true
				break
			}
		}

		// If the origin is allowed or in development mode, set the CORS headers
		if allowed || origin == "" || origin == "null" {
			// If it's a valid origin, set it specifically (required for credentials)
			if origin != "" && origin != "null" {
				c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
			} else {
				// For development or testing without origin
				c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
			}

			c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
			c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
			c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")
		}

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
