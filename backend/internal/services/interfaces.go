package services

import (
	"context"
	"time"
)

// UserService defines the interface for user business logic operations
type UserService interface {
	// User registration and authentication
	Register(ctx context.Context, req *RegisterRequest) (*UserResponse, error)
	Login(ctx context.Context, req *LoginRequest) (*AuthResponse, error)
	
	// User profile management
	GetProfile(ctx context.Context, userID int64) (*UserResponse, error)
	UpdateProfile(ctx context.Context, userID int64, req *UpdateProfileRequest) error
	
	// User lookup operations
	GetByID(ctx context.Context, userID int64) (*UserResponse, error)
	GetByEmail(ctx context.Context, email string) (*UserResponse, error)
	
	// User verification
	VerifyEmail(ctx context.Context, userID int64) error
	IsEmailVerified(ctx context.Context, userID int64) (bool, error)
}

// AuthService defines the interface for authentication and token management
type AuthService interface {
	// Token operations
	GenerateTokenPair(ctx context.Context, userID int64) (*TokenPair, error)
	ValidateAccessToken(ctx context.Context, token string) (*TokenClaims, error)
	RefreshTokens(ctx context.Context, refreshToken string) (*TokenPair, error)
	RevokeToken(ctx context.Context, token string) error
	
	// Password operations
	ChangePassword(ctx context.Context, userID int64, req *ChangePasswordRequest) error
	InitiatePasswordReset(ctx context.Context, email string) error
	ResetPassword(ctx context.Context, req *ResetPasswordRequest) error
	
	// Session management
	InvalidateAllSessions(ctx context.Context, userID int64) error
	RevokeAllUserTokens(ctx context.Context, userID int64) error
	
	// Token blacklist management (for monitoring and maintenance)
	GetBlacklistSize() int
}

// EmailService defines the interface for email operations
type EmailService interface {
	// Email sending
	SendVerificationEmail(ctx context.Context, userID int64, email string) error
	SendPasswordResetEmail(ctx context.Context, userID int64, email string, resetToken string) error
	SendWelcomeEmail(ctx context.Context, userID int64, email, username string) error
	
	// Template management
	RenderTemplate(templateName string, data interface{}) (string, error)
	
	// Email validation
	ValidateEmailAddress(email string) error
	
	// Health check
	HealthCheck(ctx context.Context) error
}

// RoleService defines the interface for role and permission management
type RoleService interface {
	// Role assignment
	AssignRole(ctx context.Context, userID int64, roleName string) error
	RemoveRole(ctx context.Context, userID int64, roleName string) error
	
	// Role queries
	GetUserRoles(ctx context.Context, userID int64) ([]RoleResponse, error)
	HasRole(ctx context.Context, userID int64, roleName string) (bool, error)
	
	// Permission checks
	HasPermission(ctx context.Context, userID int64, resource, action string) (bool, error)
}

// WaitlistService defines the interface for waitlist management
type WaitlistService interface {
	// Waitlist operations
	AddToWaitlist(ctx context.Context, req *WaitlistRequest) error
	GetWaitlistPosition(ctx context.Context, email string) (*WaitlistPositionResponse, error)
	RemoveFromWaitlist(ctx context.Context, email string) error
	
	// Admin operations
	GetWaitlistEntries(ctx context.Context, req *GetWaitlistRequest) (*WaitlistListResponse, error)
	ApproveWaitlistEntry(ctx context.Context, email string) error
}

// SystemSettingsService defines the interface for system configuration
type SystemSettingsService interface {
	// Settings management
	GetSetting(ctx context.Context, key string) (*SettingResponse, error)
	SetSetting(ctx context.Context, req *SetSettingRequest) error
	GetAllSettings(ctx context.Context) (map[string]interface{}, error)
	
	// Maintenance mode
	EnableMaintenanceMode(ctx context.Context, message string) error
	DisableMaintenanceMode(ctx context.Context) error
	IsMaintenanceModeEnabled(ctx context.Context) (bool, error)
}

// Common response types
type TokenPair struct {
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token"`
	ExpiresIn    int64     `json:"expires_in"`
	TokenType    string    `json:"token_type"`
	IssuedAt     time.Time `json:"issued_at"`
}

type TokenClaims struct {
	UserID    int64     `json:"user_id"`
	Email     string    `json:"email"`
	Roles     []string  `json:"roles"`
	TokenID   string    `json:"token_id"`
	ExpiresAt time.Time `json:"expires_at"`
	IssuedAt  time.Time `json:"issued_at"`
}

type AuthResponse struct {
	User         *UserResponse `json:"user"`
	AccessToken  string        `json:"access_token"`
	RefreshToken string        `json:"refresh_token"`
	ExpiresIn    int64         `json:"expires_in"`
	TokenType    string        `json:"token_type"`
}