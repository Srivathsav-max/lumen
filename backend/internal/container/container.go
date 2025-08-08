package container

import (
	"database/sql"
	"log/slog"

	"github.com/Srivathsav-max/lumen/backend/internal/config"
	"github.com/Srivathsav-max/lumen/backend/internal/repository"
	"github.com/Srivathsav-max/lumen/backend/internal/security"
	"github.com/Srivathsav-max/lumen/backend/internal/services"
)

type Container struct {
	Config         *config.Config
	Logger         *slog.Logger
	DB             *sql.DB
	SecurityConfig *security.SecurityConfig

	UserRepository              repository.UserRepository
	RoleRepository              repository.RoleRepository
	TokenRepository             repository.TokenRepository
	VerificationTokenRepository repository.VerificationTokenRepository
	WaitlistRepository          repository.WaitlistRepository
	SystemSettingsRepository    repository.SystemSettingsRepository

	// Notes System Repositories
	WorkspaceRepository      repository.WorkspaceRepository
	PageRepository           repository.PageRepository
	BlockRepository          repository.BlockRepository
	CommentRepository        repository.CommentRepository
	AIConversationRepository repository.AIConversationRepository
	AIMessageRepository      repository.AIMessageRepository

	UserService              services.UserService
	AuthService              services.AuthService
	EmailService             services.EmailService
	VerificationTokenService services.VerificationTokenService
	RoleService              services.RoleService
	WaitlistService          services.WaitlistService
	SystemSettingsService    services.SystemSettingsService

	// Notes System Services
	WorkspaceService services.WorkspaceService
	PageService      services.PageService
	AIChatService    services.AIChatService

	// AI Service
	AIService services.AIService

	SecurityMiddleware *security.SecurityMiddleware
}

func New() *Container {
	return &Container{}
}

func (c *Container) SetConfig(config *config.Config) {
	c.Config = config
}

func (c *Container) SetLogger(logger *slog.Logger) {
	c.Logger = logger
}

func (c *Container) SetDB(db *sql.DB) {
	c.DB = db
}

func (c *Container) SetSecurityConfig(securityConfig *security.SecurityConfig) {
	c.SecurityConfig = securityConfig
}

func (c *Container) SetSecurityMiddleware(middleware *security.SecurityMiddleware) {
	c.SecurityMiddleware = middleware
}

func (c *Container) GetConfig() *config.Config {
	return c.Config
}

func (c *Container) GetLogger() *slog.Logger {
	return c.Logger
}

func (c *Container) GetDB() *sql.DB {
	return c.DB
}

func (c *Container) GetSecurityConfig() *security.SecurityConfig {
	return c.SecurityConfig
}

func (c *Container) GetSecurityMiddleware() *security.SecurityMiddleware {
	return c.SecurityMiddleware
}

func (c *Container) SetUserRepository(repo repository.UserRepository) {
	c.UserRepository = repo
}

func (c *Container) SetRoleRepository(repo repository.RoleRepository) {
	c.RoleRepository = repo
}

func (c *Container) SetTokenRepository(repo repository.TokenRepository) {
	c.TokenRepository = repo
}

func (c *Container) SetVerificationTokenRepository(repo repository.VerificationTokenRepository) {
	c.VerificationTokenRepository = repo
}

func (c *Container) SetWaitlistRepository(repo repository.WaitlistRepository) {
	c.WaitlistRepository = repo
}

func (c *Container) SetSystemSettingsRepository(repo repository.SystemSettingsRepository) {
	c.SystemSettingsRepository = repo
}

func (c *Container) SetUserService(service services.UserService) {
	c.UserService = service
}

func (c *Container) SetAuthService(service services.AuthService) {
	c.AuthService = service
}

func (c *Container) SetEmailService(service services.EmailService) {
	c.EmailService = service
}

func (c *Container) SetRoleService(service services.RoleService) {
	c.RoleService = service
}

func (c *Container) SetWaitlistService(service services.WaitlistService) {
	c.WaitlistService = service
}

func (c *Container) SetSystemSettingsService(service services.SystemSettingsService) {
	c.SystemSettingsService = service
}

func (c *Container) SetVerificationTokenService(service services.VerificationTokenService) {
	c.VerificationTokenService = service
}

// Notes System Repository Setters
func (c *Container) SetWorkspaceRepository(repo repository.WorkspaceRepository) {
	c.WorkspaceRepository = repo
}

func (c *Container) SetPageRepository(repo repository.PageRepository) {
	c.PageRepository = repo
}

func (c *Container) SetBlockRepository(repo repository.BlockRepository) {
	c.BlockRepository = repo
}

func (c *Container) SetCommentRepository(repo repository.CommentRepository) {
	c.CommentRepository = repo
}

func (c *Container) SetAIConversationRepository(repo repository.AIConversationRepository) {
	c.AIConversationRepository = repo
}

func (c *Container) SetAIMessageRepository(repo repository.AIMessageRepository) {
	c.AIMessageRepository = repo
}

// Notes System Service Setters
func (c *Container) SetWorkspaceService(service services.WorkspaceService) {
	c.WorkspaceService = service
}

func (c *Container) SetPageService(service services.PageService) {
	c.PageService = service
}

func (c *Container) SetAIService(service services.AIService) {
	c.AIService = service
}

func (c *Container) GetUserRepository() repository.UserRepository {
	return c.UserRepository
}

func (c *Container) GetRoleRepository() repository.RoleRepository {
	return c.RoleRepository
}

func (c *Container) GetTokenRepository() repository.TokenRepository {
	return c.TokenRepository
}

func (c *Container) GetVerificationTokenRepository() repository.VerificationTokenRepository {
	return c.VerificationTokenRepository
}

func (c *Container) GetWaitlistRepository() repository.WaitlistRepository {
	return c.WaitlistRepository
}

func (c *Container) GetSystemSettingsRepository() repository.SystemSettingsRepository {
	return c.SystemSettingsRepository
}

func (c *Container) GetUserService() services.UserService {
	return c.UserService
}

func (c *Container) GetAuthService() services.AuthService {
	return c.AuthService
}

func (c *Container) GetEmailService() services.EmailService {
	return c.EmailService
}

func (c *Container) GetRoleService() services.RoleService {
	return c.RoleService
}

func (c *Container) GetWaitlistService() services.WaitlistService {
	return c.WaitlistService
}

func (c *Container) GetSystemSettingsService() services.SystemSettingsService {
	return c.SystemSettingsService
}

// Notes System Repository Getters
func (c *Container) GetWorkspaceRepository() repository.WorkspaceRepository {
	return c.WorkspaceRepository
}

func (c *Container) GetPageRepository() repository.PageRepository {
	return c.PageRepository
}

func (c *Container) GetBlockRepository() repository.BlockRepository {
	return c.BlockRepository
}

func (c *Container) GetCommentRepository() repository.CommentRepository {
	return c.CommentRepository
}

func (c *Container) GetAIConversationRepository() repository.AIConversationRepository {
	return c.AIConversationRepository
}

func (c *Container) GetAIMessageRepository() repository.AIMessageRepository {
	return c.AIMessageRepository
}

// Notes System Service Getters
func (c *Container) GetWorkspaceService() services.WorkspaceService {
	return c.WorkspaceService
}

func (c *Container) GetPageService() services.PageService {
	return c.PageService
}

func (c *Container) GetAIService() services.AIService {
	return c.AIService
}

func (c *Container) Validate() error {
	if c.Config == nil {
		return ErrMissingDependency("config")
	}
	if c.Logger == nil {
		return ErrMissingDependency("logger")
	}
	if c.DB == nil {
		return ErrMissingDependency("database")
	}
	return nil
}
