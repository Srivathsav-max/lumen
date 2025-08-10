package container

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"fmt"
	"os"
	"time"

	"github.com/Srivathsav-max/lumen/backend/internal/config"
	"github.com/Srivathsav-max/lumen/backend/internal/constants"
	"github.com/Srivathsav-max/lumen/backend/internal/database"
	"github.com/Srivathsav-max/lumen/backend/internal/logger"
	"github.com/Srivathsav-max/lumen/backend/internal/repository/postgres"
	"github.com/Srivathsav-max/lumen/backend/internal/security"
	"github.com/Srivathsav-max/lumen/backend/internal/services"
	_ "github.com/lib/pq"
)

type Builder struct {
	container *Container
}

func NewBuilder() *Builder {
	return &Builder{
		container: New(),
	}
}

func (b *Builder) WithConfig(configLoader config.ConfigLoader) (*Builder, error) {
	cfg, err := configLoader.Load()
	if err != nil {
		return nil, fmt.Errorf("failed to load configuration: %w", err)
	}

	b.container.SetConfig(cfg)
	return b, nil
}

func (b *Builder) WithLogger() (*Builder, error) {
	if b.container.Config == nil {
		return nil, ErrMissingDependency("config (required for logger)")
	}

	log := logger.New(b.container.Config.Logging)
	b.container.SetLogger(log)
	return b, nil
}

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

func (b *Builder) WithRepositories() (*Builder, error) {
	if b.container.DB == nil {
		return nil, ErrMissingDependency("database (required for repositories)")
	}
	if b.container.Logger == nil {
		return nil, ErrMissingDependency("logger (required for repositories)")
	}

	dbManager := database.NewPostgresManager(b.container.DB, b.container.Logger)

	userRepo := postgres.NewUserRepository(dbManager, b.container.Logger)
	roleRepo := postgres.NewRoleRepository(dbManager, b.container.Logger)
	tokenRepo := postgres.NewTokenRepository(dbManager, b.container.Logger)
	verificationTokenRepo := postgres.NewVerificationTokenRepository(dbManager, b.container.Logger)
	waitlistRepo := postgres.NewWaitlistRepository(dbManager, b.container.Logger)
	systemSettingsRepo := postgres.NewSystemSettingsRepository(dbManager, b.container.Logger)

	// Notes System Repositories
	workspaceRepo := postgres.NewWorkspaceRepository(dbManager, b.container.Logger)
	pageRepo := postgres.NewPageRepository(dbManager, b.container.Logger)
	blockRepo := postgres.NewBlockRepository(dbManager, b.container.Logger)
	commentRepo := postgres.NewCommentRepository(dbManager, b.container.Logger)
	aiConvRepo := postgres.NewAIConversationRepository(dbManager, b.container.Logger)
	aiMsgRepo := postgres.NewAIMessageRepository(dbManager, b.container.Logger)
	// Knowledge repos
	knowledgeDocRepo := postgres.NewKnowledgeDocumentRepository(dbManager, b.container.Logger)
	knowledgeChunkRepo := postgres.NewKnowledgeChunkRepository(dbManager, b.container.Logger)
	knowledgeEmbRepo := postgres.NewKnowledgeEmbeddingRepository(dbManager, b.container.Logger)

	b.container.SetUserRepository(userRepo)
	b.container.SetRoleRepository(roleRepo)
	b.container.SetTokenRepository(tokenRepo)
	b.container.SetVerificationTokenRepository(verificationTokenRepo)
	b.container.SetWaitlistRepository(waitlistRepo)
	b.container.SetSystemSettingsRepository(systemSettingsRepo)

	// Set Notes System Repositories
	b.container.SetWorkspaceRepository(workspaceRepo)
	b.container.SetPageRepository(pageRepo)
	b.container.SetBlockRepository(blockRepo)
	b.container.SetCommentRepository(commentRepo)
	b.container.SetAIConversationRepository(aiConvRepo)
	b.container.SetAIMessageRepository(aiMsgRepo)
	// Knowledge repos
	b.container.SetKnowledgeDocumentRepository(knowledgeDocRepo)
	b.container.SetKnowledgeChunkRepository(knowledgeChunkRepo)
	b.container.SetKnowledgeEmbeddingRepository(knowledgeEmbRepo)

	return b, nil
}

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

	emailService, err := services.NewEmailService(
		&b.container.Config.Email,
		b.container.UserRepository,
		b.container.VerificationTokenRepository,
		b.container.Logger,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create email service: %w", err)
	}

	verificationTokenService := services.NewVerificationTokenService(
		b.container.VerificationTokenRepository,
	)

	userService := services.NewUserService(
		b.container.UserRepository,
		b.container.RoleRepository,
		emailService,
		b.container.Logger,
	)

	authService := services.NewAuthService(
		b.container.Config,
		b.container.UserRepository,
		b.container.TokenRepository,
		b.container.RoleRepository,
		verificationTokenService,
		emailService,
		b.container.Logger,
	)

	roleService := services.NewRoleService(
		b.container.RoleRepository,
		b.container.UserRepository,
		b.container.Logger,
	)

	waitlistService := services.NewWaitlistService(
		b.container.WaitlistRepository,
		b.container.Logger,
	)

	systemSettingsService := services.NewSystemSettingsService(
		b.container.SystemSettingsRepository,
		b.container.Logger,
	)

	// Notes System Services
	workspaceService := services.NewWorkspaceService(
		b.container.WorkspaceRepository,
		b.container.UserRepository,
		b.container.Logger,
	)

	pageService := services.NewPageService(
		b.container.PageRepository,
		b.container.BlockRepository,
		b.container.WorkspaceRepository,
		b.container.UserRepository,
		b.container.Logger,
	)

	aiService := services.NewAIService(&b.container.Config.AI, pageService, b.container.Logger)
	aiChatService := services.NewAIChatService(b.container.GetAIConversationRepository(), b.container.GetAIMessageRepository(), b.container.Logger)

	b.container.SetEmailService(emailService)
	b.container.SetVerificationTokenService(verificationTokenService)
	b.container.SetUserService(userService)
	b.container.SetAuthService(authService)
	b.container.SetRoleService(roleService)
	b.container.SetWaitlistService(waitlistService)
	b.container.SetSystemSettingsService(systemSettingsService)

	b.container.SetWorkspaceService(workspaceService)
	b.container.SetPageService(pageService)
	b.container.SetAIService(aiService)
	b.container.AIChatService = aiChatService

	// Knowledge services
	appwriteEndpoint := os.Getenv("APPWRITE_ENDPOINT")
	if appwriteEndpoint == "" {
		appwriteEndpoint = "https://cloud.appwrite.io/v1"
	}
	appwriteProjectID := os.Getenv("APPWRITE_PROJECT_ID")
	appwriteAPIKey := os.Getenv("APPWRITE_API_KEY")
	ingestSvc, _ := services.NewKnowledgeServices(&b.container.Config.AI, services.AppwriteConfig{Endpoint: appwriteEndpoint, ProjectID: appwriteProjectID, APIKey: appwriteAPIKey}, b.container.KnowledgeDocumentRepository, b.container.KnowledgeChunkRepository, b.container.KnowledgeEmbeddingRepository, b.container.Logger)
	b.container.KnowledgeIngestService = ingestSvc
	b.container.RAGService = services.NewRAGService(&b.container.Config.AI, b.container.KnowledgeEmbeddingRepository, b.container.Logger)
	b.container.BrainstormerService = services.NewBrainstormerService(
		&b.container.Config.AI,
		b.container.KnowledgeDocumentRepository,
		b.container.KnowledgeChunkRepository,
		b.container.KnowledgeEmbeddingRepository,
	)

	return b, nil
}

func (b *Builder) WithSecurity() (*Builder, error) {
	if b.container.Config == nil {
		return nil, ErrMissingDependency("config (required for security)")
	}
	if b.container.Logger == nil {
		return nil, ErrMissingDependency("logger (required for security)")
	}

	securityConfig := b.createSecurityConfig()
	b.container.SetSecurityConfig(securityConfig)

	securityMiddleware := security.NewSecurityMiddleware(securityConfig, b.container.Logger)
	b.container.SetSecurityMiddleware(securityMiddleware)

	b.container.Logger.Info("Security configuration initialized",
		"csrf_enabled", securityConfig.CSRF.Enabled,
		"csp_enabled", securityConfig.CSP.Enabled,
		"rate_limit_enabled", securityConfig.RateLimit.Enabled,
	)

	return b, nil
}

func (b *Builder) Build() (*Container, error) {
	if err := b.container.Validate(); err != nil {
		return nil, fmt.Errorf("container validation failed: %w", err)
	}

	return b.container, nil
}

func (b *Builder) createDatabaseConnection() (*sql.DB, error) {
	cfg := b.container.Config
	logger := b.container.Logger

	dsn := cfg.Database.GetDSN()

	if cfg.Database.URL != "" {
		logger.Info("Connecting to database using DATABASE_URL")
	} else {
		logger.Info("Connecting to database",
			"host", cfg.Database.Host,
			"port", cfg.Database.Port,
			"database", cfg.Database.DBName,
		)
	}

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open database connection: %w", err)
	}

	if cfg.IsDevelopment() {
		db.SetMaxOpenConns(1)
		db.SetMaxIdleConns(0)
		db.SetConnMaxLifetime(1 * time.Minute)
		db.SetConnMaxIdleTime(30 * time.Second)
	} else {
		db.SetMaxOpenConns(cfg.Database.MaxOpenConns)
		db.SetMaxIdleConns(cfg.Database.MaxIdleConns)
		db.SetConnMaxLifetime(time.Duration(cfg.Database.ConnMaxLifetime) * time.Minute)
		db.SetConnMaxIdleTime(time.Duration(cfg.Database.ConnMaxIdleTime) * time.Minute)
	}

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

func (b *Builder) createSecurityConfig() *security.SecurityConfig {
	cfg := b.container.Config

	return &security.SecurityConfig{
		JWT: security.JWTSecurityConfig{
			Secret:               cfg.JWT.Secret,
			AccessTokenDuration:  time.Duration(cfg.JWT.AccessTokenDuration) * time.Minute,
			RefreshTokenDuration: time.Duration(cfg.JWT.RefreshTokenDuration) * time.Hour,
			Algorithm:            constants.JWTAlgorithmHS256,
			Issuer:               "lumen-backend",
			Audience:             []string{"lumen-frontend"},
			EnableFingerprinting: !cfg.IsDevelopment(),
			FingerprintSalt:      b.generateFingerprintSalt(),
		},
		CSRF: security.CSRFConfig{
			Enabled:         cfg.IsProduction(),
			TokenLength:     32,
			TokenLifetime:   time.Hour * 2,
			TokenHeaderName: constants.CSRFTokenHeaderName,
			TokenFieldName:  constants.CSRFTokenFieldName,
			SecureCookie:    cfg.IsProduction(),
			SameSite:        "strict",
			TrustedOrigins:  b.getAllowedOrigins(),
		},
		Session: security.SessionConfig{
			SessionIDLength: 32,
			Timeout:         time.Hour * 24,
			SecureCookie:    cfg.IsProduction(),
			HTTPOnly:        true,
			SameSite:        "Strict",
			Domain:          b.getDomain(),
			Path:            "/",
		},
		RateLimit: security.RateLimitConfig{
			Enabled:     !cfg.IsDevelopment(),
			GlobalRPM:   500,
			PerIPRPM:    100,
			AuthRPM:     20,
			APIRPM:      200,
			Burst:       50,
			Window:      time.Minute,
			Distributed: false,
		},
		CORS: security.CORSConfig{
			AllowedOrigins:   b.getAllowedOrigins(),
			AllowedMethods:   []string{constants.HTTPMethodGET, constants.HTTPMethodPOST, constants.HTTPMethodPUT, constants.HTTPMethodDELETE, constants.HTTPMethodPATCH, constants.HTTPMethodOPTIONS},
			AllowedHeaders:   []string{constants.HeaderContentType, constants.HeaderAuthorization, constants.HeaderCSRFToken, constants.HeaderRequestedWith, constants.HeaderRequestID, constants.HeaderBrowserFingerprint},
			ExposedHeaders:   []string{"X-Request-ID", "X-RateLimit-Limit", "X-RateLimit-Remaining"},
			AllowCredentials: true,
			MaxAge:           86400, // 24 hours
		},
		CSP: security.CSPConfig{
			Enabled:    cfg.IsProduction(),
			ReportOnly: !cfg.IsProduction(),
			ReportURI:  "/api/v1/security/csp-report",
			DefaultSrc: []string{"'self'"},
			ScriptSrc:  []string{"'self'", "'unsafe-inline'"},
			StyleSrc:   []string{"'self'", "'unsafe-inline'"},
			ImgSrc:     []string{"'self'", "data:", "https:"},
			FontSrc:    []string{"'self'"},
			ConnectSrc: []string{"'self'"},
			MediaSrc:   []string{"'self'"},
			FrameSrc:   []string{"'none'"},
		},
		Headers: security.SecurityHeaders{
			Enabled:            true,
			ContentTypeOptions: "nosniff",
			FrameOptions:       "DENY",
			XSSProtection:      "1; mode=block",
			ReferrerPolicy:     "strict-origin-when-cross-origin",
			PermissionsPolicy:  "geolocation=(), microphone=(), camera=()",
			RemoveServerHeader: true,
			HSTS: security.HSTSConfig{
				Enabled:           cfg.IsProduction(),
				MaxAge:            31536000, // 1 year
				IncludeSubdomains: true,
				Preload:           cfg.IsProduction(),
			},
		},
	}
}

func (b *Builder) getAllowedOrigins() []string {
	cfg := b.container.Config

	if cfg.IsDevelopment() {
		return []string{
			"http://localhost:3000",
			"http://127.0.0.1:3000",
			"http://localhost:8080",
		}
	}

	return []string{
		"https://moxium.tech",
		"https://www.moxium.tech",
		"https://api.moxium.tech",
	}
}

func (b *Builder) getDomain() string {
	cfg := b.container.Config

	if cfg.IsDevelopment() {
		return "localhost"
	}

	return "moxium.tech"
}

func (b *Builder) generateFingerprintSalt() string {
	salt := make([]byte, 32)
	rand.Read(salt)
	return hex.EncodeToString(salt)
}
