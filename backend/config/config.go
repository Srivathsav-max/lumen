package config

import (
	"fmt"
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

// Config holds all configuration for the application
type Config struct {
	Database DatabaseConfig
	Server   ServerConfig
	JWT      JWTConfig
}

// DatabaseConfig holds database configuration
type DatabaseConfig struct {
	Host     string
	Port     int
	User     string
	Password string
	DBName   string
	SSLMode  string
	URL      string // For Heroku DATABASE_URL
}

// ServerConfig holds server configuration
type ServerConfig struct {
	Port int
	Env  string
}

// JWTConfig holds JWT configuration
type JWTConfig struct {
	Secret string
}

// LoadConfig loads the configuration from environment variables
func LoadConfig() (*Config, error) {
	// Load .env file if it exists
	err := godotenv.Load()
	if err != nil {
		log.Println("Warning: .env file not found, using environment variables")
	}

	// Server config - Check for Heroku PORT first, then SERVER_PORT
	var serverPort int
	portStr := os.Getenv("PORT") // Heroku sets this
	if portStr == "" {
		portStr = getEnv("SERVER_PORT", "8080")
	}
	serverPort, err = strconv.Atoi(portStr)
	if err != nil {
		return nil, fmt.Errorf("invalid PORT/SERVER_PORT: %w", err)
	}

	// Database config
	var dbConfig DatabaseConfig

	// Check for Heroku DATABASE_URL
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL != "" {
		// For Heroku, we'll use the DATABASE_URL directly
		// Format: postgres://username:password@host:port/database_name?sslmode=require
		log.Println("Using DATABASE_URL from environment")
		dbConfig = DatabaseConfig{
			// These values will be ignored when using DATABASE_URL
			Host:     "from_url",
			Port:     5432,
			User:     "from_url",
			Password: "from_url",
			DBName:   "from_url",
			SSLMode:  "require",   // Heroku requires SSL
			URL:      databaseURL, // Store the full URL
		}
	} else {
		// Use individual environment variables
		dbPort, err := strconv.Atoi(getEnv("DB_PORT", "5432"))
		if err != nil {
			return nil, fmt.Errorf("invalid DB_PORT: %w", err)
		}

		dbConfig = DatabaseConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     dbPort,
			User:     getEnv("DB_USER", "postgres"),
			Password: getEnv("DB_PASSWORD", "postgres"),
			DBName:   getEnv("DB_NAME", "lumen_db"),
			SSLMode:  getEnv("DB_SSL_MODE", "disable"),
			URL:      "", // No URL in this case
		}
	}

	config := &Config{
		Database: dbConfig,
		Server: ServerConfig{
			Port: serverPort,
			Env:  getEnv("ENV", "development"), // Default to development for local environment
		},
		JWT: JWTConfig{
			Secret: getEnv("JWT_SECRET", "default_jwt_secret"),
		},
	}

	return config, nil
}

// GetDSN returns the PostgreSQL connection string
func (c *DatabaseConfig) GetDSN() string {
	// If we have a URL (from Heroku), use it directly
	if c.URL != "" {
		return c.URL
	}

	// Otherwise build the connection string from individual parts
	return fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		c.Host, c.Port, c.User, c.Password, c.DBName, c.SSLMode)
}

// Helper function to get environment variable with a default value
func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}
