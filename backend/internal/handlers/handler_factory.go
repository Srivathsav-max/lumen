package handlers

import (
	"github.com/Srivathsav-max/lumen/backend/internal/container"
)

// HandlerFactory creates and manages all HTTP handlers
type HandlerFactory struct {
	container *container.Container
}

// NewHandlerFactory creates a new HandlerFactory
func NewHandlerFactory(container *container.Container) *HandlerFactory {
	return &HandlerFactory{
		container: container,
	}
}

// CreateAuthHandlers creates authentication handlers
func (f *HandlerFactory) CreateAuthHandlers() *AuthHandlers {
	return NewAuthHandlers(
		f.container.GetAuthService(),
		f.container.GetUserService(),
	)
}

// CreateUserHandlers creates user management handlers
func (f *HandlerFactory) CreateUserHandlers() *UserHandlers {
	return NewUserHandlers(
		f.container.GetUserService(),
		f.container.GetRoleService(),
	)
}

// CreateWaitlistHandlers creates waitlist management handlers
func (f *HandlerFactory) CreateWaitlistHandlers() *WaitlistHandlers {
	return NewWaitlistHandlers(
		f.container.GetWaitlistService(),
	)
}

// CreateSystemHandlers creates system management handlers
func (f *HandlerFactory) CreateSystemHandlers() *SystemHandlers {
	return NewSystemHandlers(
		f.container.GetSystemSettingsService(),
	)
}

// CreateEmailHandlers creates email handlers
func (f *HandlerFactory) CreateEmailHandlers() *EmailHandlers {
	return NewEmailHandlers(f.container)
}

// CreateMaintenanceHandlers creates maintenance handlers
func (f *HandlerFactory) CreateMaintenanceHandlers() *MaintenanceHandlers {
	return NewMaintenanceHandlers(f.container)
}

// CreateTokenHandlers creates token handlers
func (f *HandlerFactory) CreateTokenHandlers() *TokenHandlers {
	return NewTokenHandlers(f.container)
}

// CreateSystemSettingsHandlers creates system settings handlers
func (f *HandlerFactory) CreateSystemSettingsHandlers() *SystemSettingsHandlers {
	return NewSystemSettingsHandlers(f.container)
}

// AllHandlers contains all handler instances
type AllHandlers struct {
	Auth           *AuthHandlers
	User           *UserHandlers
	Waitlist       *WaitlistHandlers
	System         *SystemHandlers
	Email          *EmailHandlers
	Maintenance    *MaintenanceHandlers
	Token          *TokenHandlers
	SystemSettings *SystemSettingsHandlers
}

// CreateAllHandlers creates all handler instances
func (f *HandlerFactory) CreateAllHandlers() *AllHandlers {
	return &AllHandlers{
		Auth:           f.CreateAuthHandlers(),
		User:           f.CreateUserHandlers(),
		Waitlist:       f.CreateWaitlistHandlers(),
		System:         f.CreateSystemHandlers(),
		Email:          f.CreateEmailHandlers(),
		Maintenance:    f.CreateMaintenanceHandlers(),
		Token:          f.CreateTokenHandlers(),
		SystemSettings: f.CreateSystemSettingsHandlers(),
	}
}