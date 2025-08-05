package config

import (
	"github.com/Srivathsav-max/lumen/backend/internal/config"
	"github.com/Srivathsav-max/lumen/backend/internal/logger"
)

type Config = config.Config
type DatabaseConfig = config.DatabaseConfig
type ServerConfig = config.ServerConfig
type JWTConfig = config.JWTConfig
type EmailConfig = config.EmailConfig
type LoggingConfig = logger.Config

func LoadConfig() (*Config, error) {
	loader := &config.EnvConfigLoader{}
	return loader.Load()
}
