package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/Srivathsav-max/lumen/backend/internal/constants"
	"github.com/Srivathsav-max/lumen/backend/internal/logger"
	"github.com/go-playground/validator/v10"
)

type Config struct {
	Server   ServerConfig   `validate:"required"`
	Database DatabaseConfig `validate:"required"`
	JWT      JWTConfig      `validate:"required"`
	Email    EmailConfig    `validate:"required"`
	Logging  logger.Config  `validate:"required"`
	AI       AIConfig       `validate:"required"`
}

type ServerConfig struct {
	Port int    `validate:"required,min=1,max=65535"`
	Env  string `validate:"required,oneof=development staging production"`
}

type DatabaseConfig struct {
	Host            string `validate:"required_without=URL"`
	Port            int    `validate:"required_without=URL,min=1,max=65535"`
	User            string `validate:"required_without=URL"`
	Password        string `validate:"required_without=URL"`
	DBName          string `validate:"required_without=URL"`
	SSLMode         string `validate:"required_without=URL,oneof=disable require verify-ca verify-full"`
	URL             string `validate:"required_without_all=Host Port User Password DBName"`
	MaxOpenConns    int    `validate:"min=1"`
	MaxIdleConns    int    `validate:"min=1"`
	ConnMaxLifetime int    `validate:"min=1"`
	ConnMaxIdleTime int    `validate:"min=1"`
}

type JWTConfig struct {
	Secret               string `validate:"required,min=32"`
	AccessTokenDuration  int    `validate:"required,min=1"`
	RefreshTokenDuration int    `validate:"required,min=1"`
}

type EmailConfig struct {
	Host         string `validate:"required"`
	Port         string `validate:"required"`
	Username     string `validate:"required"`
	Password     string `validate:"required"`
	FromEmail    string `validate:"required,email"`
	FromName     string `validate:"required"`
	TemplatesDir string `validate:"required"`
}

// AIConfig contains configuration required for AI integrations (Gemini)
type AIConfig struct {
	// Gemini API key. Keep this secret and only load from environment/secrets
	GeminiAPIKey string `validate:"required"`
	// Model name to use. Example: gemini-2.5-flash, gemini-2.5-pro
	GeminiModel string `validate:"required"`
}

type ConfigLoader interface {
	Load() (*Config, error)
	Validate(*Config) error
}

type EnvConfigLoader struct {
	validator *validator.Validate
}

func NewEnvConfigLoader() *EnvConfigLoader {
	return &EnvConfigLoader{
		validator: validator.New(),
	}
}

func (l *EnvConfigLoader) Load() (*Config, error) {
	config := &Config{}

	serverPort, err := getRequiredEnvInt("SERVER_PORT")
	if err != nil {
		if port := os.Getenv("PORT"); port != "" {
			if serverPort, err = strconv.Atoi(port); err != nil {
				return nil, fmt.Errorf("invalid PORT: %w", err)
			}
		} else {
			return nil, err
		}
	}

	config.Server = ServerConfig{
		Port: serverPort,
		Env:  getRequiredEnv("ENV"),
	}

	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL != "" {
		config.Database = DatabaseConfig{
			URL:             databaseURL,
			MaxOpenConns:    getEnvInt("DB_MAX_OPEN_CONNS", 25),
			MaxIdleConns:    getEnvInt("DB_MAX_IDLE_CONNS", 5),
			ConnMaxLifetime: getEnvInt("DB_CONN_MAX_LIFETIME", 60),
			ConnMaxIdleTime: getEnvInt("DB_CONN_MAX_IDLE_TIME", 10),
		}
	} else {
		dbPort, err := getRequiredEnvInt("DB_PORT")
		if err != nil {
			return nil, err
		}

		config.Database = DatabaseConfig{
			Host:            getRequiredEnv("DB_HOST"),
			Port:            dbPort,
			User:            getRequiredEnv("DB_USER"),
			Password:        getRequiredEnv("DB_PASSWORD"),
			DBName:          getRequiredEnv("DB_NAME"),
			SSLMode:         getRequiredEnv("DB_SSL_MODE"),
			MaxOpenConns:    getEnvInt("DB_MAX_OPEN_CONNS", 25),
			MaxIdleConns:    getEnvInt("DB_MAX_IDLE_CONNS", 5),
			ConnMaxLifetime: getEnvInt("DB_CONN_MAX_LIFETIME", 60),
			ConnMaxIdleTime: getEnvInt("DB_CONN_MAX_IDLE_TIME", 10),
		}
	}

	config.JWT = JWTConfig{
		Secret:               getRequiredEnv("JWT_SECRET"),
		AccessTokenDuration:  getEnvInt("JWT_ACCESS_TOKEN_DURATION", constants.DefaultJWTAccessTokenDuration),
		RefreshTokenDuration: getEnvInt("JWT_REFRESH_TOKEN_DURATION", constants.DefaultJWTRefreshTokenDuration),
	}

	config.Email = EmailConfig{
		Host:         getRequiredEnv("EMAIL_HOST"),
		Port:         getRequiredEnv("EMAIL_PORT"),
		Username:     getRequiredEnv("EMAIL_USERNAME"),
		Password:     getRequiredEnv("EMAIL_PASSWORD"),
		FromEmail:    getRequiredEnv("EMAIL_FROM"),
		FromName:     getRequiredEnv("EMAIL_FROM_NAME"),
		TemplatesDir: getEnv("EMAIL_TEMPLATES_DIR", constants.DefaultEmailTemplatesDir),
	}

	config.AI = AIConfig{
		GeminiAPIKey: getRequiredEnv("GEMINI_API_KEY"),
		GeminiModel:  getEnv("GEMINI_MODEL", "gemini-2.5-flash"),
	}

	config.Logging = logger.Config{
		Level:  logger.LogLevel(getEnv("LOG_LEVEL", constants.LogLevelInfo)),
		Format: getEnv("LOG_FORMAT", constants.LogFormatJSON),
	}

	if err := l.Validate(config); err != nil {
		return nil, err
	}

	return config, nil
}

func (l *EnvConfigLoader) Validate(config *Config) error {
	if err := l.validator.Struct(config); err != nil {
		return fmt.Errorf("configuration validation failed: %w", err)
	}
	return nil
}

func (c *DatabaseConfig) GetDSN() string {
	if c.URL != "" {
		if !strings.Contains(c.URL, "?") {
			return c.URL + "?prefer_simple_protocol=true"
		}
		if !strings.Contains(c.URL, "prefer_simple_protocol") {
			return c.URL + "&prefer_simple_protocol=true"
		}
		return c.URL
	}

	return fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s prefer_simple_protocol=true",
		c.Host, c.Port, c.User, c.Password, c.DBName, c.SSLMode)
}

func getRequiredEnv(key string) string {
	value := os.Getenv(key)
	if value == "" {
		panic(fmt.Sprintf("required environment variable %s is not set", key))
	}
	return value
}

func getRequiredEnvInt(key string) (int, error) {
	value := getRequiredEnv(key)
	intValue, err := strconv.Atoi(value)
	if err != nil {
		return 0, fmt.Errorf("invalid integer value for %s: %w", key, err)
	}
	return intValue, nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

func (c *Config) IsDevelopment() bool {
	return strings.ToLower(c.Server.Env) == constants.EnvDevelopment
}

func (c *Config) IsProduction() bool {
	return strings.ToLower(c.Server.Env) == constants.EnvProduction
}

func (c *Config) IsStaging() bool {
	return strings.ToLower(c.Server.Env) == constants.EnvStaging
}
