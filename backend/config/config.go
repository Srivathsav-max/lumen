package config

import (
	"github.com/Srivathsav-max/lumen/backend/internal/config"
	"github.com/Srivathsav-max/lumen/backend/internal/logger"
)

// Re-export the internal config types for backward compatibility
type Config = config.Config
type DatabaseConfig = config.DatabaseConfig
type ServerConfig = config.ServerConfig
type JWTConfig = config.JWTConfig
type EmailConfig = config.EmailConfig
type LoggingConfig = logger.Config

// LoadConfig loads the configuration from environment variables
// DEPRECATED: Use internal/config.EnvConfigLoader instead
func LoadConfig() (*Config, error) {
	loader := &config.EnvConfigLoader{}
	return loader.Load()
}
