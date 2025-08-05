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

type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

type UpdateProfileRequest struct {
	Username  *string `json:"username" validate:"omitempty,min=3,max=50,alphanum"`
	Email     *string `json:"email" validate:"omitempty,email,max=255"`
	FirstName *string `json:"first_name" validate:"omitempty,max=100"`
	LastName  *string `json:"last_name" validate:"omitempty,max=100"`
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password" validate:"required"`
	NewPassword     string `json:"new_password" validate:"required,min=8,max=128"`
	ConfirmPassword string `json:"confirm_password" validate:"required,eqfield=NewPassword"`
}

type ResetPasswordRequest struct {
	Token           string `json:"token" validate:"required"`
	NewPassword     string `json:"new_password" validate:"required,min=8,max=128"`
	ConfirmPassword string `json:"confirm_password" validate:"required,eqfield=NewPassword"`
}

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

type RoleResponse struct {
	ID          int64    `json:"id"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Permissions []string `json:"permissions"`
}

type WaitlistRequest struct {
	Email     string `json:"email" validate:"required,email,max=255"`
	FirstName string `json:"first_name" validate:"omitempty,max=100"`
	LastName  string `json:"last_name" validate:"omitempty,max=100"`
	Reason    string `json:"reason" validate:"omitempty,max=500"`
}

type WaitlistPositionResponse struct {
	Email     string    `json:"email"`
	Position  int       `json:"position"`
	CreatedAt time.Time `json:"created_at"`
	Status    string    `json:"status"`
}

type GetWaitlistRequest struct {
	Page     int    `json:"page" validate:"min=1"`
	PageSize int    `json:"page_size" validate:"min=1,max=100"`
	Status   string `json:"status" validate:"omitempty,oneof=pending approved rejected"`
	Search   string `json:"search" validate:"omitempty,max=255"`
}

type WaitlistListResponse struct {
	Entries    []WaitlistEntryResponse `json:"entries"`
	Total      int64                   `json:"total"`
	Page       int                     `json:"page"`
	PageSize   int                     `json:"page_size"`
	TotalPages int                     `json:"total_pages"`
}

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

type SetSettingRequest struct {
	Key   string      `json:"key" validate:"required,max=255"`
	Value interface{} `json:"value" validate:"required"`
}

type SettingResponse struct {
	Key       string      `json:"key"`
	Value     interface{} `json:"value"`
	UpdatedAt time.Time   `json:"updated_at"`
}

type PaginationRequest struct {
	Page     int `json:"page" validate:"min=1"`
	PageSize int `json:"page_size" validate:"min=1,max=100"`
}

type PaginationResponse struct {
	Page       int   `json:"page"`
	PageSize   int   `json:"page_size"`
	Total      int64 `json:"total"`
	TotalPages int   `json:"total_pages"`
}

type ValidationErrorDetail struct {
	Field   string `json:"field"`
	Message string `json:"message"`
	Value   string `json:"value,omitempty"`
}

type ValidationErrorResponse struct {
	Message string                  `json:"message"`
	Errors  []ValidationErrorDetail `json:"errors"`
}

type HealthCheckResponse struct {
	Status    string                   `json:"status"`
	Timestamp time.Time                `json:"timestamp"`
	Services  map[string]ServiceHealth `json:"services"`
	Version   string                   `json:"version"`
}

type ServiceHealth struct {
	Status  string `json:"status"`
	Message string `json:"message,omitempty"`
	Latency string `json:"latency,omitempty"`
}
