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

	UserService           services.UserService
	AuthService           services.AuthService
	EmailService          services.EmailService
	RoleService           services.RoleService
	WaitlistService       services.WaitlistService
	SystemSettingsService services.SystemSettingsService

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
