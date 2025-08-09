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

func (f *HandlerFactory) CreateNotesHandlers() *NotesHandlers {
	return NewNotesHandlers(
		f.container.GetWorkspaceService(),
		f.container.GetPageService(),
		f.container.GetLogger(),
	)
}

func (f *HandlerFactory) CreateAIHandlers() *AIHandlers {
	h := NewAIHandlers(
		f.container.GetAIService(),
		f.container.GetLogger(),
	)
	// Inject chat service via exported field for simplicity
	h.chat = f.container.AIChatService
	h.rag = f.container.RAGService
	return h
}

func (f *HandlerFactory) CreateKnowledgeHandlers() *KnowledgeHandlers {
	return NewKnowledgeHandlers(
		f.container.KnowledgeIngestService,
		f.container.RAGService,
		f.container.GetLogger(),
	)
}

type AllHandlers struct {
	Auth        *AuthHandlers
	User        *UserHandlers
	Waitlist    *WaitlistHandlers
	System      *SystemHandlers
	Email       *EmailHandlers
	Maintenance *MaintenanceHandlers
	Notes       *NotesHandlers

	SystemSettings *SystemSettingsHandlers
	Security       *SecurityHandlers
	AI             *AIHandlers
	Knowledge      *KnowledgeHandlers
}

func (f *HandlerFactory) CreateAllHandlers() *AllHandlers {
	return &AllHandlers{
		Auth:        f.CreateAuthHandlers(),
		User:        f.CreateUserHandlers(),
		Waitlist:    f.CreateWaitlistHandlers(),
		System:      f.CreateSystemHandlers(),
		Email:       f.CreateEmailHandlers(),
		Maintenance: f.CreateMaintenanceHandlers(),
		Notes:       f.CreateNotesHandlers(),

		SystemSettings: f.CreateSystemSettingsHandlers(),
		Security:       f.CreateSecurityHandlers(),
		AI:             f.CreateAIHandlers(),
		Knowledge:      f.CreateKnowledgeHandlers(),
	}
}
