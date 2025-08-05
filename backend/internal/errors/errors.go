package errors

import (
	"fmt"
	"net/http"
	"time"
)

// ErrorCategory represents different types of application errors
type ErrorCategory string

const (
	ValidationError     ErrorCategory = "VALIDATION_ERROR"
	NotFoundError      ErrorCategory = "NOT_FOUND"
	ConflictError      ErrorCategory = "CONFLICT"
	AuthenticationError ErrorCategory = "AUTHENTICATION_ERROR"
	AuthorizationError  ErrorCategory = "AUTHORIZATION_ERROR"
	InternalError      ErrorCategory = "INTERNAL_ERROR"
	DatabaseError      ErrorCategory = "DATABASE_ERROR"
	ExternalServiceError ErrorCategory = "EXTERNAL_SERVICE_ERROR"
)

// AppError represents a structured application error
type AppError struct {
	Code       ErrorCategory `json:"code"`
	Message    string        `json:"message"`
	Details    string        `json:"details,omitempty"`
	StatusCode int           `json:"-"`
	Timestamp  time.Time     `json:"timestamp"`
	RequestID  string        `json:"request_id,omitempty"`
	Cause      error         `json:"-"`
}

// Error implements the error interface
func (e *AppError) Error() string {
	if e.Details != "" {
		return fmt.Sprintf("%s: %s - %s", e.Code, e.Message, e.Details)
	}
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

// Unwrap returns the underlying cause error
func (e *AppError) Unwrap() error {
	return e.Cause
}

// NewAppError creates a new application error
func NewAppError(category ErrorCategory, message, details string, statusCode int) *AppError {
	return &AppError{
		Code:       category,
		Message:    message,
		Details:    details,
		StatusCode: statusCode,
		Timestamp:  time.Now().UTC(),
	}
}

// WithRequestID adds a request ID to the error
func (e *AppError) WithRequestID(requestID string) *AppError {
	e.RequestID = requestID
	return e
}

// WithCause adds a cause error
func (e *AppError) WithCause(cause error) *AppError {
	e.Cause = cause
	return e
}

// Predefined error constructors
func NewValidationError(message, details string) *AppError {
	return NewAppError(ValidationError, message, details, http.StatusBadRequest)
}

func NewNotFoundError(resource string) *AppError {
	return NewAppError(NotFoundError, fmt.Sprintf("%s not found", resource), "", http.StatusNotFound)
}

func NewConflictError(message, details string) *AppError {
	return NewAppError(ConflictError, message, details, http.StatusConflict)
}

func NewAuthenticationError(message string) *AppError {
	return NewAppError(AuthenticationError, message, "", http.StatusUnauthorized)
}

func NewAuthorizationError(message string) *AppError {
	return NewAppError(AuthorizationError, message, "", http.StatusForbidden)
}

func NewInternalError(message string) *AppError {
	return NewAppError(InternalError, message, "", http.StatusInternalServerError)
}

func NewDatabaseError(message string, cause error) *AppError {
	return NewAppError(DatabaseError, message, "", http.StatusInternalServerError).WithCause(cause)
}

func NewExternalServiceError(service, message string) *AppError {
	return NewAppError(ExternalServiceError, fmt.Sprintf("%s service error", service), message, http.StatusServiceUnavailable)
}

// IsAppError checks if an error is an AppError
func IsAppError(err error) bool {
	_, ok := err.(*AppError)
	return ok
}

// AsAppError converts an error to AppError if possible
func AsAppError(err error) (*AppError, bool) {
	appErr, ok := err.(*AppError)
	return appErr, ok
}