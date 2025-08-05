package container

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/Srivathsav-max/lumen/backend/internal/config"
	"github.com/Srivathsav-max/lumen/backend/internal/database"
	"github.com/Srivathsav-max/lumen/backend/internal/logger"
	"github.com/Srivathsav-max/lumen/backend/internal/repository/postgres"
	"github.com/Srivathsav-max/lumen/backend/internal/services"
	_ "github.com/lib/pq"
)

// Builder helps build the dependency injection container
type Builder struct {
	container *Container
}

// NewBuilder creates a new container builder
func NewBuilder() *Builder {
	return &Builder{
		container: New(),
	}
}

// WithConfig loads and sets the configuration
func (b *Builder) WithConfig(configLoader config.ConfigLoader) (*Builder, error) {
	cfg, err := configLoader.Load()
	if err != nil {
		return nil, fmt.Errorf("failed to load configuration: %w", err)
	}

	b.container.SetConfig(cfg)
	return b, nil
}

// WithLogger creates and sets the logger
func (b *Builder) WithLogger() (*Builder, error) {
	if b.container.Config == nil {
		return nil, ErrMissingDependency("config (required for logger)")
	}

	log := logger.New(b.container.Config.Logging)
	b.container.SetLogger(log)
	return b, nil
}

// WithDatabase creates and sets the database connection
func (b *Builder) WithDatabase() (*Builder, error) {
	if b.container.Config == nil {
		return nil, ErrMissingDependency("config (required for database)")
	}
	if b.container.Logger == nil {
		return nil, ErrMissingDependency("logger (required for database)")
	}

	db, err := b.createDatabaseConnection()
	if err != nil {
		return nil, fmt.Errorf("failed to create database connection: %w", err)
	}

	b.container.SetDB(db)
	return b, nil
}

// WithRepositories creates and sets all repositories
func (b *Builder) WithRepositories() (*Builder, error) {
	if b.container.DB == nil {
		return nil, ErrMissingDependency("database (required for repositories)")
	}
	if b.container.Logger == nil {
		return nil, ErrMissingDependency("logger (required for repositories)")
	}

	dbManager := database.NewPostgresManager(b.container.DB, b.container.Logger)

	// Create repositories
	userRepo := postgres.NewUserRepository(dbManager, b.container.Logger)
	roleRepo := postgres.NewRoleRepository(dbManager, b.container.Logger)
	tokenRepo := postgres.NewTokenRepository(dbManager, b.container.Logger)
	verificationTokenRepo := postgres.NewVerificationTokenRepository(dbManager, b.container.Logger)
	waitlistRepo := postgres.NewWaitlistRepository(dbManager, b.container.Logger)
	systemSettingsRepo := postgres.NewSystemSettingsRepository(dbManager, b.container.Logger)

	// Set repositories in container
	b.container.SetUserRepository(userRepo)
	b.container.SetRoleRepository(roleRepo)
	b.container.SetTokenRepository(tokenRepo)
	b.container.SetVerificationTokenRepository(verificationTokenRepo)
	b.container.SetWaitlistRepository(waitlistRepo)
	b.container.SetSystemSettingsRepository(systemSettingsRepo)

	return b, nil
}

// WithServices creates and sets all services
func (b *Builder) WithServices() (*Builder, error) {
	if b.container.UserRepository == nil {
		return nil, ErrMissingDependency("user repository (required for services)")
	}
	if b.container.Logger == nil {
		return nil, ErrMissingDependency("logger (required for services)")
	}
	if b.container.Config == nil {
		return nil, ErrMissingDependency("config (required for services)")
	}

	// Create EmailService
	emailService, err := services.NewEmailService(
		&b.container.Config.Email,
		b.container.UserRepository,
		b.container.VerificationTokenRepository,
		b.container.Logger,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create email service: %w", err)
	}

	// Create UserService
	userService := services.NewUserService(
		b.container.UserRepository,
		b.container.RoleRepository,
		emailService,
		b.container.Logger,
	)

	// Create AuthService
	authService := services.NewAuthService(
		b.container.Config,
		b.container.UserRepository,
		b.container.TokenRepository,
		b.container.RoleRepository,
		b.container.Logger,
	)

	// Create RoleService
	roleService := services.NewRoleService(
		b.container.RoleRepository,
		b.container.UserRepository,
		b.container.Logger,
	)

	// Create WaitlistService
	waitlistService := services.NewWaitlistService(
		b.container.WaitlistRepository,
		b.container.Logger,
	)

	// Create SystemSettingsService
	systemSettingsService := services.NewSystemSettingsService(
		b.container.SystemSettingsRepository,
		b.container.Logger,
	)

	// Set services in container
	b.container.SetEmailService(emailService)
	b.container.SetUserService(userService)
	b.container.SetAuthService(authService)
	b.container.SetRoleService(roleService)
	b.container.SetWaitlistService(waitlistService)
	b.container.SetSystemSettingsService(systemSettingsService)

	return b, nil
}

// Build validates and returns the container
func (b *Builder) Build() (*Container, error) {
	if err := b.container.Validate(); err != nil {
		return nil, fmt.Errorf("container validation failed: %w", err)
	}

	return b.container, nil
}

// createDatabaseConnection creates a new database connection with proper configuration
func (b *Builder) createDatabaseConnection() (*sql.DB, error) {
	cfg := b.container.Config
	logger := b.container.Logger

	dsn := cfg.Database.GetDSN()

	// Log connection attempt (without credentials)
	if cfg.Database.URL != "" {
		logger.Info("Connecting to database using DATABASE_URL")
	} else {
		logger.Info("Connecting to database",
			"host", cfg.Database.Host,
			"port", cfg.Database.Port,
			"database", cfg.Database.DBName,
		)
	}

	// Open database connection
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open database connection: %w", err)
	}

	// Configure connection pool
	db.SetMaxOpenConns(cfg.Database.MaxOpenConns)
	db.SetMaxIdleConns(cfg.Database.MaxIdleConns)
	db.SetConnMaxLifetime(time.Duration(cfg.Database.ConnMaxLifetime) * time.Minute)
	db.SetConnMaxIdleTime(time.Duration(cfg.Database.ConnMaxIdleTime) * time.Minute)

	// Test the connection
	if err := db.Ping(); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	logger.Info("Successfully connected to database",
		"max_open_conns", cfg.Database.MaxOpenConns,
		"max_idle_conns", cfg.Database.MaxIdleConns,
		"conn_max_lifetime", fmt.Sprintf("%dm", cfg.Database.ConnMaxLifetime),
		"conn_max_idle_time", fmt.Sprintf("%dm", cfg.Database.ConnMaxIdleTime),
	)

	return db, nil
}