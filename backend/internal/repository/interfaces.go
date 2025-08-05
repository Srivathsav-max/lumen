package repository

import (
	"context"
	"time"
)

// User represents the user entity
type User struct {
	ID            int64     `db:"id" json:"id"`
	Username      string    `db:"username" json:"username"`
	Email         string    `db:"email" json:"email"`
	PasswordHash  string    `db:"password_hash" json:"-"`
	FirstName     string    `db:"first_name" json:"first_name"`
	LastName      string    `db:"last_name" json:"last_name"`
	EmailVerified bool      `db:"email_verified" json:"email_verified"`
	CreatedAt     time.Time `db:"created_at" json:"created_at"`
	UpdatedAt     time.Time `db:"updated_at" json:"updated_at"`
}

// Role represents the role entity
type Role struct {
	ID          int64     `db:"id" json:"id"`
	Name        string    `db:"name" json:"name"`
	Description string    `db:"description" json:"description"`
	CreatedAt   time.Time `db:"created_at" json:"created_at"`
	UpdatedAt   time.Time `db:"updated_at" json:"updated_at"`
}

// Token represents the token entity
type Token struct {
	ID         int64     `db:"id" json:"id"`
	UserID     int64     `db:"user_id" json:"user_id"`
	Token      string    `db:"refresh_token" json:"refresh_token"`
	DeviceInfo string    `db:"device_info" json:"device_info"`
	ExpiresAt  time.Time `db:"expires_at" json:"expires_at"`
	CreatedAt  time.Time `db:"created_at" json:"created_at"`
	UpdatedAt  time.Time `db:"updated_at" json:"updated_at"`
}

// VerificationToken represents the verification token entity
type VerificationToken struct {
	ID        int64     `db:"id" json:"id"`
	UserID    int64     `db:"user_id" json:"user_id"`
	Token     string    `db:"token" json:"token"`
	TokenType string    `db:"token_type" json:"token_type"`
	ExpiresAt time.Time `db:"expires_at" json:"expires_at"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
	IsUsed    bool      `db:"is_used" json:"is_used"`
}

// WaitlistEntry represents the waitlist entity
type WaitlistEntry struct {
	ID        int64     `db:"id" json:"id"`
	Email     string    `db:"email" json:"email"`
	FirstName string    `db:"first_name" json:"first_name"`
	LastName  string    `db:"last_name" json:"last_name"`
	Reason    string    `db:"reason" json:"reason"`
	Status    string    `db:"status" json:"status"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
	UpdatedAt time.Time `db:"updated_at" json:"updated_at"`
}

// SystemSetting represents the system settings entity
type SystemSetting struct {
	ID          int64     `db:"id" json:"id"`
	Key         string    `db:"key" json:"key"`
	Value       string    `db:"value" json:"value"`
	Description string    `db:"description" json:"description"`
	CreatedAt   time.Time `db:"created_at" json:"created_at"`
	UpdatedAt   time.Time `db:"updated_at" json:"updated_at"`
}

// UserRepository defines the interface for user data access
type UserRepository interface {
	Create(ctx context.Context, user *User) error
	GetByID(ctx context.Context, id int64) (*User, error)
	GetByEmail(ctx context.Context, email string) (*User, error)
	GetByUsername(ctx context.Context, username string) (*User, error)
	Update(ctx context.Context, user *User) error
	Delete(ctx context.Context, id int64) error
	ExistsByEmail(ctx context.Context, email string) (bool, error)
	ExistsByUsername(ctx context.Context, username string) (bool, error)
	List(ctx context.Context, limit, offset int) ([]*User, error)
	Count(ctx context.Context) (int64, error)
}

// RoleRepository defines the interface for role data access
type RoleRepository interface {
	Create(ctx context.Context, role *Role) error
	GetByID(ctx context.Context, id int64) (*Role, error)
	GetByName(ctx context.Context, name string) (*Role, error)
	Update(ctx context.Context, role *Role) error
	Delete(ctx context.Context, id int64) error
	List(ctx context.Context) ([]*Role, error)
	AssignRoleToUser(ctx context.Context, userID, roleID int64) error
	RemoveRoleFromUser(ctx context.Context, userID, roleID int64) error
	GetUserRoles(ctx context.Context, userID int64) ([]*Role, error)
	HasRole(ctx context.Context, userID int64, roleName string) (bool, error)
}

// TokenRepository defines the interface for token data access
type TokenRepository interface {
	Create(ctx context.Context, token *Token) error
	GetByToken(ctx context.Context, tokenString string) (*Token, error)
	GetByUserID(ctx context.Context, userID int64, tokenType string) ([]*Token, error)
	Update(ctx context.Context, token *Token) error
	Delete(ctx context.Context, id int64) error
	RevokeToken(ctx context.Context, tokenString string) error
	RevokeAllUserTokens(ctx context.Context, userID int64, tokenType string) error
	CleanupExpiredTokens(ctx context.Context) error
	// Refresh token specific methods
	StoreRefreshToken(ctx context.Context, userID int64, token string, expiresAt time.Time) error
	ValidateRefreshToken(ctx context.Context, token string) (int64, error)
	RevokeRefreshToken(ctx context.Context, token string) error
}

// VerificationTokenRepository defines the interface for verification token data access
type VerificationTokenRepository interface {
	Create(ctx context.Context, token interface{}) error
	GetByToken(ctx context.Context, tokenString, tokenType string) (interface{}, error)
	GetByUserID(ctx context.Context, userID int64, tokenType string) (interface{}, error)
	Update(ctx context.Context, token interface{}) error
	Delete(ctx context.Context, id int64) error
	MarkAsUsed(ctx context.Context, tokenID int64) error
	DeleteExpiredTokens(ctx context.Context) error
	DeleteUserTokensByType(ctx context.Context, userID int64, tokenType string) error
}

// WaitlistRepository defines the interface for waitlist data access
type WaitlistRepository interface {
	Create(ctx context.Context, waitlist *WaitlistEntry) error
	GetByID(ctx context.Context, id int64) (*WaitlistEntry, error)
	GetByEmail(ctx context.Context, email string) (*WaitlistEntry, error)
	Update(ctx context.Context, waitlist *WaitlistEntry) error
	Delete(ctx context.Context, id int64) error
	DeleteByEmail(ctx context.Context, email string) error
	List(ctx context.Context, limit, offset int) ([]*WaitlistEntry, error)
	GetPaginated(ctx context.Context, limit, offset int, status, search string) ([]*WaitlistEntry, error)
	GetTotalCount(ctx context.Context, status, search string) (int64, error)
	GetPositionByEmail(ctx context.Context, email string) (int, error)
	Count(ctx context.Context) (int64, error)
	ExistsByEmail(ctx context.Context, email string) (bool, error)
}

// SystemSettingsRepository defines the interface for system settings data access
type SystemSettingsRepository interface {
	Create(ctx context.Context, setting *SystemSetting) error
	GetByKey(ctx context.Context, key string) (*SystemSetting, error)
	GetAll(ctx context.Context) ([]*SystemSetting, error)
	Update(ctx context.Context, setting *SystemSetting) error
	Delete(ctx context.Context, key string) error
	List(ctx context.Context) ([]*SystemSetting, error)
	GetValue(ctx context.Context, key string) (string, error)
	SetValue(ctx context.Context, key, value string) error
}
