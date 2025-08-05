# Config Package

## Overview

The `config` package provides centralized configuration management for the Lumen backend application. It handles loading, parsing, and validating configuration from environment variables and configuration files, ensuring type-safe access to application settings.

## Purpose

- **Centralized Configuration**: Single source of truth for all application settings
- **Environment-based Configuration**: Support for different environments (development, staging, production)
- **Type Safety**: Strongly typed configuration structures with validation
- **Default Values**: Sensible defaults for all configuration options
- **Environment Variable Support**: Load configuration from environment variables

## Dependencies

### External Dependencies
```go
// Core dependencies
"os"                    // Environment variable access
"time"                  // Duration parsing
"strconv"               // String to type conversion
"fmt"                   // String formatting
"log"                   // Logging

// Third-party dependencies
"github.com/joho/godotenv"  // .env file loading
"github.com/kelseyhightower/envconfig"  // Environment variable parsing
```

### Internal Dependencies
```go
// No internal dependencies - this is a foundational package
```

## Configuration Structure

### Main Configuration
```go
type Config struct {
    Server   ServerConfig   `envconfig:"SERVER"`
    Database DatabaseConfig `envconfig:"DATABASE"`
    JWT      JWTConfig      `envconfig:"JWT"`
    Email    EmailConfig    `envconfig:"EMAIL"`
    Redis    RedisConfig    `envconfig:"REDIS"`
    Security SecurityConfig `envconfig:"SECURITY"`
    Logging  LoggingConfig  `envconfig:"LOGGING"`
}
```

### Server Configuration
```go
type ServerConfig struct {
    Port         string        `envconfig:"PORT" default:"8080"`
    Host         string        `envconfig:"HOST" default:"localhost"`
    Environment  string        `envconfig:"ENVIRONMENT" default:"development"`
    ReadTimeout  time.Duration `envconfig:"READ_TIMEOUT" default:"30s"`
    WriteTimeout time.Duration `envconfig:"WRITE_TIMEOUT" default:"30s"`
    IdleTimeout  time.Duration `envconfig:"IDLE_TIMEOUT" default:"60s"`
}
```

## Implementation Patterns

### 1. Configuration Loading

```go
// Load configuration with environment variable support
func Load() (*Config, error) {
    // Load .env file if exists
    if err := godotenv.Load(); err != nil {
        log.Printf("No .env file found: %v", err)
    }
    
    var cfg Config
    
    // Parse environment variables into config struct
    if err := envconfig.Process("", &cfg); err != nil {
        return nil, fmt.Errorf("failed to process config: %w", err)
    }
    
    // Validate configuration
    if err := cfg.Validate(); err != nil {
        return nil, fmt.Errorf("config validation failed: %w", err)
    }
    
    return &cfg, nil
}
```

### 2. Configuration Validation

```go
// Validate ensures all required configuration is present and valid
func (c *Config) Validate() error {
    if c.Database.URL == "" {
        return errors.New("database URL is required")
    }
    
    if c.JWT.Secret == "" {
        return errors.New("JWT secret is required")
    }
    
    if len(c.JWT.Secret) < 32 {
        return errors.New("JWT secret must be at least 32 characters")
    }
    
    return nil
}
```

### 3. Environment-Specific Configuration

```go
// GetDatabaseConfig returns database configuration based on environment
func (c *Config) GetDatabaseConfig() DatabaseConfig {
    config := c.Database
    
    switch c.Server.Environment {
    case "production":
        config.MaxOpenConns = 25
        config.MaxIdleConns = 5
        config.ConnMaxLifetime = 5 * time.Minute
    case "development":
        config.MaxOpenConns = 10
        config.MaxIdleConns = 2
        config.ConnMaxLifetime = 1 * time.Minute
    }
    
    return config
}
```

## Adding New Configuration

### Step 1: Define Configuration Structure

```go
// Add new configuration section
type NewFeatureConfig struct {
    Enabled     bool          `envconfig:"ENABLED" default:"false"`
    APIKey      string        `envconfig:"API_KEY"`
    Timeout     time.Duration `envconfig:"TIMEOUT" default:"30s"`
    MaxRetries  int           `envconfig:"MAX_RETRIES" default:"3"`
}
```

### Step 2: Add to Main Config

```go
type Config struct {
    // ... existing fields
    NewFeature NewFeatureConfig `envconfig:"NEW_FEATURE"`
}
```

### Step 3: Add Validation

```go
func (c *Config) Validate() error {
    // ... existing validations
    
    if c.NewFeature.Enabled && c.NewFeature.APIKey == "" {
        return errors.New("new feature API key is required when enabled")
    }
    
    return nil
}
```

### Step 4: Add Environment Variables

```bash
# .env file
NEW_FEATURE_ENABLED=true
NEW_FEATURE_API_KEY=your-api-key
NEW_FEATURE_TIMEOUT=45s
NEW_FEATURE_MAX_RETRIES=5
```

## Development Workflow

### 1. Local Development Setup

```bash
# Copy example environment file
cp .env.example .env

# Edit configuration values
vim .env

# Verify configuration loading
go run main.go --config-check
```

### 2. Testing Configuration

```go
// config_test.go
func TestConfigLoad(t *testing.T) {
    // Set test environment variables
    os.Setenv("DATABASE_URL", "postgres://test")
    os.Setenv("JWT_SECRET", "test-secret-key-32-characters-long")
    
    defer func() {
        os.Unsetenv("DATABASE_URL")
        os.Unsetenv("JWT_SECRET")
    }()
    
    cfg, err := Load()
    assert.NoError(t, err)
    assert.Equal(t, "postgres://test", cfg.Database.URL)
}
```

### 3. Configuration Documentation

```go
// Document all configuration options
type DatabaseConfig struct {
    // Database connection URL
    // Format: postgres://user:password@host:port/dbname?sslmode=disable
    // Required: Yes
    // Example: postgres://lumen:password@localhost:5432/lumen_dev
    URL string `envconfig:"URL" required:"true"`
    
    // Maximum number of open database connections
    // Default: 10 (development), 25 (production)
    // Range: 1-100
    MaxOpenConns int `envconfig:"MAX_OPEN_CONNS" default:"10"`
}
```

## Best Practices

### 1. Configuration Naming

```go
// Use consistent naming conventions
// ✅ Good
type ServerConfig struct {
    Port        string `envconfig:"PORT"`
    Host        string `envconfig:"HOST"`
    Environment string `envconfig:"ENVIRONMENT"`
}

// ❌ Bad
type ServerConfig struct {
    ServerPort string `envconfig:"SRV_P"`
    HostName   string `envconfig:"hostname"`
    Env        string `envconfig:"ENV_TYPE"`
}
```

### 2. Default Values

```go
// Always provide sensible defaults
type Config struct {
    Timeout     time.Duration `envconfig:"TIMEOUT" default:"30s"`
    MaxRetries  int           `envconfig:"MAX_RETRIES" default:"3"`
    BufferSize  int           `envconfig:"BUFFER_SIZE" default:"1024"`
}
```

### 3. Validation

```go
// Validate configuration at startup
func (c *Config) Validate() error {
    if c.Server.Port == "" {
        return errors.New("server port is required")
    }
    
    if port, err := strconv.Atoi(c.Server.Port); err != nil || port < 1 || port > 65535 {
        return errors.New("server port must be a valid port number (1-65535)")
    }
    
    return nil
}
```

### 4. Environment-Specific Overrides

```go
// Apply environment-specific configurations
func (c *Config) ApplyEnvironmentDefaults() {
    switch c.Server.Environment {
    case "production":
        c.Logging.Level = "info"
        c.Database.MaxOpenConns = 25
        c.Security.StrictMode = true
    case "development":
        c.Logging.Level = "debug"
        c.Database.MaxOpenConns = 10
        c.Security.StrictMode = false
    case "test":
        c.Logging.Level = "error"
        c.Database.MaxOpenConns = 5
        c.Security.StrictMode = false
    }
}
```

## Usage Examples

### Basic Usage

```go
package main

import (
    "log"
    "github.com/Srivathsav-max/lumen/backend/internal/config"
)

func main() {
    // Load configuration
    cfg, err := config.Load()
    if err != nil {
        log.Fatalf("Failed to load config: %v", err)
    }
    
    // Use configuration
    log.Printf("Starting server on %s:%s", cfg.Server.Host, cfg.Server.Port)
    log.Printf("Environment: %s", cfg.Server.Environment)
    log.Printf("Database: %s", cfg.Database.URL)
}
```

### Advanced Usage

```go
// Custom configuration loading with overrides
func LoadWithOverrides(overrides map[string]string) (*config.Config, error) {
    // Set environment variable overrides
    for key, value := range overrides {
        os.Setenv(key, value)
    }
    
    defer func() {
        // Clean up overrides
        for key := range overrides {
            os.Unsetenv(key)
        }
    }()
    
    return config.Load()
}
```

## Error Handling

```go
// Handle configuration errors gracefully
func LoadConfig() (*Config, error) {
    cfg, err := Load()
    if err != nil {
        switch {
        case strings.Contains(err.Error(), "validation failed"):
            return nil, fmt.Errorf("configuration validation error: %w", err)
        case strings.Contains(err.Error(), "failed to process"):
            return nil, fmt.Errorf("environment variable parsing error: %w", err)
        default:
            return nil, fmt.Errorf("configuration loading error: %w", err)
        }
    }
    
    return cfg, nil
}
```

## Integration with Other Packages

```go
// Pass configuration to other packages
func InitializeServices(cfg *config.Config) error {
    // Initialize database with config
    db, err := database.NewManager(cfg.Database)
    if err != nil {
        return err
    }
    
    // Initialize logger with config
    logger := logger.New(cfg.Logging)
    
    // Initialize security with config
    security := security.NewMiddleware(cfg.Security, logger)
    
    return nil
}
```

This configuration package serves as the foundation for all other packages in the application, providing type-safe, validated, and environment-aware configuration management.