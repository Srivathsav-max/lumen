package services

import (
	"time"
)

type RegisterRequest struct {
	Username  string `json:"username" validate:"required,min=3,max=50,alphanum"`
	Email     string `json:"email" validate:"required,email,max=255"`
	Password  string `json:"password" validate:"required,min=8,max=128"`
	FirstName string `json:"first_name" validate:"omitempty,max=100"`
	LastName  string `json:"last_name" validate:"omitempty,max=100"`
}

// LoginRequest represents a user login request
type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

// UpdateProfileRequest represents a profile update request
type UpdateProfileRequest struct {
	Username  *string `json:"username" validate:"omitempty,min=3,max=50,alphanum"`
	Email     *string `json:"email" validate:"omitempty,email,max=255"`
	FirstName *string `json:"first_name" validate:"omitempty,max=100"`
	LastName  *string `json:"last_name" validate:"omitempty,max=100"`
}

// ChangePasswordRequest represents a password change request
type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password" validate:"required"`
	NewPassword     string `json:"new_password" validate:"required,min=8,max=128"`
	ConfirmPassword string `json:"confirm_password" validate:"required,eqfield=NewPassword"`
}

// ResetPasswordRequest represents a password reset request
type ResetPasswordRequest struct {
	Token           string `json:"token" validate:"required"`
	NewPassword     string `json:"new_password" validate:"required,min=8,max=128"`
	ConfirmPassword string `json:"confirm_password" validate:"required,eqfield=NewPassword"`
}

// UserResponse represents a user in API responses
type UserResponse struct {
	ID            int64     `json:"id"`
	Username      string    `json:"username"`
	Email         string    `json:"email"`
	FirstName     string    `json:"first_name"`
	LastName      string    `json:"last_name"`
	EmailVerified bool      `json:"email_verified"`
	Roles         []string  `json:"roles"`
	IsAdmin       bool      `json:"is_admin"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// Role-related DTOs

// RoleResponse represents a role in API responses
type RoleResponse struct {
	ID          int64    `json:"id"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Permissions []string `json:"permissions"`
}

// Waitlist-related DTOs

// WaitlistRequest represents a waitlist signup request
type WaitlistRequest struct {
	Email     string `json:"email" validate:"required,email,max=255"`
	FirstName string `json:"first_name" validate:"omitempty,max=100"`
	LastName  string `json:"last_name" validate:"omitempty,max=100"`
	Reason    string `json:"reason" validate:"omitempty,max=500"`
}

// WaitlistPositionResponse represents a user's position in the waitlist
type WaitlistPositionResponse struct {
	Email     string    `json:"email"`
	Position  int       `json:"position"`
	CreatedAt time.Time `json:"created_at"`
	Status    string    `json:"status"`
}

// GetWaitlistRequest represents a request to get waitlist entries
type GetWaitlistRequest struct {
	Page     int    `json:"page" validate:"min=1"`
	PageSize int    `json:"page_size" validate:"min=1,max=100"`
	Status   string `json:"status" validate:"omitempty,oneof=pending approved rejected"`
	Search   string `json:"search" validate:"omitempty,max=255"`
}

// WaitlistListResponse represents a paginated list of waitlist entries
type WaitlistListResponse struct {
	Entries    []WaitlistEntryResponse `json:"entries"`
	Total      int64                   `json:"total"`
	Page       int                     `json:"page"`
	PageSize   int                     `json:"page_size"`
	TotalPages int                     `json:"total_pages"`
}

// WaitlistEntryResponse represents a waitlist entry in API responses
type WaitlistEntryResponse struct {
	ID        int64     `json:"id"`
	Email     string    `json:"email"`
	FirstName string    `json:"first_name"`
	LastName  string    `json:"last_name"`
	Reason    string    `json:"reason"`
	Status    string    `json:"status"`
	Position  int       `json:"position"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// System Settings DTOs

// SetSettingRequest represents a request to set a system setting
type SetSettingRequest struct {
	Key   string      `json:"key" validate:"required,max=255"`
	Value interface{} `json:"value" validate:"required"`
}

// SettingResponse represents a system setting in API responses
type SettingResponse struct {
	Key       string      `json:"key"`
	Value     interface{} `json:"value"`
	UpdatedAt time.Time   `json:"updated_at"`
}

// Pagination DTOs

// PaginationRequest represents common pagination parameters
type PaginationRequest struct {
	Page     int `json:"page" validate:"min=1"`
	PageSize int `json:"page_size" validate:"min=1,max=100"`
}

// PaginationResponse represents common pagination metadata
type PaginationResponse struct {
	Page       int   `json:"page"`
	PageSize   int   `json:"page_size"`
	Total      int64 `json:"total"`
	TotalPages int   `json:"total_pages"`
}

// Error DTOs

// ValidationErrorDetail represents a field validation error
type ValidationErrorDetail struct {
	Field   string `json:"field"`
	Message string `json:"message"`
	Value   string `json:"value,omitempty"`
}

// ValidationErrorResponse represents a validation error response
type ValidationErrorResponse struct {
	Message string                  `json:"message"`
	Errors  []ValidationErrorDetail `json:"errors"`
}

// Health Check DTOs

// HealthCheckResponse represents the health status of the application
type HealthCheckResponse struct {
	Status    string                   `json:"status"`
	Timestamp time.Time                `json:"timestamp"`
	Services  map[string]ServiceHealth `json:"services"`
	Version   string                   `json:"version"`
}

// ServiceHealth represents the health status of a service component
type ServiceHealth struct {
	Status  string `json:"status"`
	Message string `json:"message,omitempty"`
	Latency string `json:"latency,omitempty"`
}
