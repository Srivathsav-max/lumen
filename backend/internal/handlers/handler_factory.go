package handlers

import (
	"github.com/Srivathsav-max/lumen/backend/internal/container"
)

type HandlerFactory struct {
	container *container.Container
}

func NewHandlerFactory(container *container.Container) *HandlerFactory {
	return &HandlerFactory{
		container: container,
	}
}

func (f *HandlerFactory) CreateAuthHandlers() *AuthHandlers {
	return NewAuthHandlers(
		f.container.GetAuthService(),
		f.container.GetUserService(),
		f.container.GetSecurityConfig(),
		f.container.GetLogger(),
	)
}

// CreateUserHandlers c	reates user management handlers
func (f *HandlerFactory) CreateUserHandlers() *UserHandlers {
	return NewUserHandlers(
		f.container.GetUserService(),
		f.container.GetRoleService(),
		f.container.GetAuthService(),
	)
}

func (f *HandlerFactory) CreateWaitlistHandlers() *WaitlistHandlers {
	return NewWaitlistHandlers(
		f.container.GetWaitlistService(),
	)
}

func (f *HandlerFactory) CreateSystemHandlers() *SystemHandlers {
	return NewSystemHandlers(
		f.container.GetSystemSettingsService(),
	)
}

func (f *HandlerFactory) CreateEmailHandlers() *EmailHandlers {
	return NewEmailHandlers(f.container)
}

func (f *HandlerFactory) CreateMaintenanceHandlers() *MaintenanceHandlers {
	return NewMaintenanceHandlers(f.container)
}

func (f *HandlerFactory) CreateSystemSettingsHandlers() *SystemSettingsHandlers {
	return NewSystemSettingsHandlers(f.container)
}

func (f *HandlerFactory) CreateSecurityHandlers() *SecurityHandlers {
	securityMiddleware := f.container.GetSecurityMiddleware()
	return NewSecurityHandlers(securityMiddleware.GetCSRFService())
}

type AllHandlers struct {
	Auth        *AuthHandlers
	User        *UserHandlers
	Waitlist    *WaitlistHandlers
	System      *SystemHandlers
	Email       *EmailHandlers
	Maintenance *MaintenanceHandlers

	SystemSettings *SystemSettingsHandlers
	Security       *SecurityHandlers
}

func (f *HandlerFactory) CreateAllHandlers() *AllHandlers {
	return &AllHandlers{
		Auth:        f.CreateAuthHandlers(),
		User:        f.CreateUserHandlers(),
		Waitlist:    f.CreateWaitlistHandlers(),
		System:      f.CreateSystemHandlers(),
		Email:       f.CreateEmailHandlers(),
		Maintenance: f.CreateMaintenanceHandlers(),

		SystemSettings: f.CreateSystemSettingsHandlers(),
		Security:       f.CreateSecurityHandlers(),
	}
}
