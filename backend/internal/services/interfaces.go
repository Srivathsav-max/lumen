package services

import (
	"context"
	"time"
)

type UserService interface {
	Register(ctx context.Context, req *RegisterRequest) (*UserResponse, error)
	Login(ctx context.Context, req *LoginRequest) (*AuthResponse, error)

	GetProfile(ctx context.Context, userID int64) (*UserResponse, error)
	UpdateProfile(ctx context.Context, userID int64, req *UpdateProfileRequest) error

	GetByID(ctx context.Context, userID int64) (*UserResponse, error)
	GetByEmail(ctx context.Context, email string) (*UserResponse, error)

	VerifyEmail(ctx context.Context, userID int64) error
	IsEmailVerified(ctx context.Context, userID int64) (bool, error)
}

type AuthService interface {
	GenerateTokenPair(ctx context.Context, userID int64) (*TokenPair, error)
	ValidateAccessToken(ctx context.Context, token string) (*TokenClaims, error)
	RefreshTokens(ctx context.Context, refreshToken string) (*TokenPair, error)
	RevokeToken(ctx context.Context, token string) error

	ChangePassword(ctx context.Context, userID int64, req *ChangePasswordRequest) error
	InitiatePasswordReset(ctx context.Context, email string) error
	ResetPassword(ctx context.Context, req *ResetPasswordRequest) error

	InvalidateAllSessions(ctx context.Context, userID int64) error
	RevokeAllUserTokens(ctx context.Context, userID int64) error
}

type EmailService interface {
	SendVerificationEmail(ctx context.Context, userID int64, email string) error
	SendPasswordResetEmail(ctx context.Context, userID int64, email string, resetToken string) error
	SendPasswordChangeNotification(ctx context.Context, userID int64, email string) error
	SendWelcomeEmail(ctx context.Context, userID int64, email, username string) error

	RenderTemplate(templateName string, data interface{}) (string, error)

	ValidateEmailAddress(email string) error

	HealthCheck(ctx context.Context) error
}

type RoleService interface {
	AssignRole(ctx context.Context, userID int64, roleName string) error
	RemoveRole(ctx context.Context, userID int64, roleName string) error

	GetUserRoles(ctx context.Context, userID int64) ([]RoleResponse, error)
	HasRole(ctx context.Context, userID int64, roleName string) (bool, error)

	HasPermission(ctx context.Context, userID int64, resource, action string) (bool, error)
}

type WaitlistService interface {
	AddToWaitlist(ctx context.Context, req *WaitlistRequest) error
	GetWaitlistPosition(ctx context.Context, email string) (*WaitlistPositionResponse, error)
	RemoveFromWaitlist(ctx context.Context, email string) error

	GetWaitlistEntries(ctx context.Context, req *GetWaitlistRequest) (*WaitlistListResponse, error)
	ApproveWaitlistEntry(ctx context.Context, email string) error
}

type SystemSettingsService interface {
	GetSetting(ctx context.Context, key string) (*SettingResponse, error)
	SetSetting(ctx context.Context, req *SetSettingRequest) error
	GetAllSettings(ctx context.Context) ([]*SettingResponse, error)

	EnableMaintenanceMode(ctx context.Context, message string) error
	DisableMaintenanceMode(ctx context.Context) error
	IsMaintenanceModeEnabled(ctx context.Context) (bool, error)
}

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
