package services

import (
	"fmt"
	"net/http"

	"github.com/Srivathsav-max/lumen/backend/internal/errors"
)

// Service-specific error constructors

// User Service Errors

// NewUserNotFoundError creates an error for when a user is not found
func NewUserNotFoundError(identifier string) *errors.AppError {
	return errors.NewNotFoundError("User").
		WithCause(fmt.Errorf("user not found: %s", identifier))
}

// NewUserAlreadyExistsError creates an error for when a user already exists
func NewUserAlreadyExistsError(field, value string) *errors.AppError {
	return errors.NewConflictError(
		fmt.Sprintf("User with this %s already exists", field),
		fmt.Sprintf("A user with %s '%s' is already registered", field, value),
	)
}

// NewInvalidCredentialsError creates an error for invalid login credentials
func NewInvalidCredentialsError() *errors.AppError {
	return errors.NewAuthenticationError("Invalid email or password")
}

// NewEmailNotVerifiedError creates an error for unverified email
func NewEmailNotVerifiedError() *errors.AppError {
	return errors.NewAuthenticationError("Email address is not verified")
}

// NewAccountDisabledError creates an error for disabled accounts
func NewAccountDisabledError() *errors.AppError {
	return errors.NewAuthenticationError("Account has been disabled")
}

// Auth Service Errors

// NewInvalidTokenError creates an error for invalid tokens
func NewInvalidTokenError(reason string) *errors.AppError {
	return errors.NewAuthenticationError("Invalid or expired token").
		WithCause(fmt.Errorf("token validation failed: %s", reason))
}

// NewTokenExpiredError creates an error for expired tokens
func NewTokenExpiredError() *errors.AppError {
	return errors.NewAuthenticationError("Token has expired")
}

// NewTokenRevokedError creates an error for revoked tokens
func NewTokenRevokedError() *errors.AppError {
	return errors.NewAuthenticationError("Token has been revoked")
}

// NewInvalidRefreshTokenError creates an error for invalid refresh tokens
func NewInvalidRefreshTokenError() *errors.AppError {
	return errors.NewAuthenticationError("Invalid refresh token")
}

// NewPasswordMismatchError creates an error for password mismatches
func NewPasswordMismatchError() *errors.AppError {
	return errors.NewValidationError(
		"Current password is incorrect",
		"The provided current password does not match",
	)
}

// NewWeakPasswordError creates an error for weak passwords
func NewWeakPasswordError(requirements string) *errors.AppError {
	return errors.NewValidationError(
		"Password does not meet security requirements",
		requirements,
	)
}

// NewPasswordResetTokenInvalidError creates an error for invalid password reset tokens
func NewPasswordResetTokenInvalidError() *errors.AppError {
	return errors.NewValidationError(
		"Invalid or expired password reset token",
		"The password reset token is either invalid or has expired",
	)
}

// Email Service Errors

// NewEmailDeliveryError creates an error for email delivery failures
func NewEmailDeliveryError(recipient string, cause error) *errors.AppError {
	return errors.NewExternalServiceError(
		"Email",
		fmt.Sprintf("Failed to send email to %s", recipient),
	).WithCause(cause)
}

// NewEmailTemplateError creates an error for email template issues
func NewEmailTemplateError(templateName string, cause error) *errors.AppError {
	return errors.NewInternalError(
		fmt.Sprintf("Failed to render email template: %s", templateName),
	).WithCause(cause)
}

// NewInvalidEmailAddressError creates an error for invalid email addresses
func NewInvalidEmailAddressError(email string) *errors.AppError {
	return errors.NewValidationError(
		"Invalid email address format",
		fmt.Sprintf("The email address '%s' is not valid", email),
	)
}

// Role Service Errors

// NewRoleNotFoundError creates an error for when a role is not found
func NewRoleNotFoundError(roleName string) *errors.AppError {
	return errors.NewNotFoundError("Role").
		WithCause(fmt.Errorf("role not found: %s", roleName))
}

// NewInsufficientPermissionsError creates an error for insufficient permissions
func NewInsufficientPermissionsError(resource, action string) *errors.AppError {
	return errors.NewAuthorizationError(
		fmt.Sprintf("Insufficient permissions to %s %s", action, resource),
	)
}

// NewRoleAlreadyAssignedError creates an error for already assigned roles
func NewRoleAlreadyAssignedError(roleName string) *errors.AppError {
	return errors.NewConflictError(
		"Role already assigned",
		fmt.Sprintf("User already has the role '%s'", roleName),
	)
}

// NewRoleNotAssignedError creates an error for roles not assigned to user
func NewRoleNotAssignedError(roleName string) *errors.AppError {
	return errors.NewConflictError(
		"Role not assigned",
		fmt.Sprintf("User does not have the role '%s'", roleName),
	)
}

// Waitlist Service Errors

// NewWaitlistAlreadyExistsError creates an error for existing waitlist entries
func NewWaitlistAlreadyExistsError(email string) *errors.AppError {
	return errors.NewConflictError(
		"Already on waitlist",
		fmt.Sprintf("Email '%s' is already on the waitlist", email),
	)
}

// NewWaitlistNotFoundError creates an error for non-existent waitlist entries
func NewWaitlistNotFoundError(email string) *errors.AppError {
	return errors.NewNotFoundError("Waitlist entry").
		WithCause(fmt.Errorf("waitlist entry not found for email: %s", email))
}

// NewWaitlistFullError creates an error for when waitlist is full
func NewWaitlistFullError() *errors.AppError {
	return errors.NewAppError(
		errors.ConflictError,
		"Waitlist is currently full",
		"Please try again later",
		http.StatusConflict,
	)
}

// System Settings Service Errors

// NewSettingNotFoundError creates an error for non-existent settings
func NewSettingNotFoundError(key string) *errors.AppError {
	return errors.NewNotFoundError("Setting").
		WithCause(fmt.Errorf("setting not found: %s", key))
}

// NewInvalidSettingValueError creates an error for invalid setting values
func NewInvalidSettingValueError(key string, expectedType string) *errors.AppError {
	return errors.NewValidationError(
		"Invalid setting value",
		fmt.Sprintf("Setting '%s' expects a value of type %s", key, expectedType),
	)
}

// NewReadOnlySettingError creates an error for read-only settings
func NewReadOnlySettingError(key string) *errors.AppError {
	return errors.NewValidationError(
		"Setting is read-only",
		fmt.Sprintf("Setting '%s' cannot be modified", key),
	)
}

// NewMaintenanceModeActiveError creates an error for when maintenance mode is active
func NewMaintenanceModeActiveError(message string) *errors.AppError {
	return errors.NewAppError(
		errors.ExternalServiceError,
		"Service temporarily unavailable",
		message,
		http.StatusServiceUnavailable,
	)
}

// Generic Service Errors

// NewServiceUnavailableError creates an error for service unavailability
func NewServiceUnavailableError(serviceName string, cause error) *errors.AppError {
	return errors.NewExternalServiceError(
		serviceName,
		"Service is temporarily unavailable",
	).WithCause(cause)
}

// NewRateLimitExceededError creates an error for rate limit violations
func NewRateLimitExceededError(limit string) *errors.AppError {
	return errors.NewAppError(
		errors.ValidationError,
		"Rate limit exceeded",
		fmt.Sprintf("Request rate limit of %s exceeded", limit),
		http.StatusTooManyRequests,
	)
}

// NewConcurrentModificationError creates an error for concurrent modifications
func NewConcurrentModificationError(resource string) *errors.AppError {
	return errors.NewConflictError(
		"Concurrent modification detected",
		fmt.Sprintf("The %s was modified by another process", resource),
	)
}

// NewResourceLockedError creates an error for locked resources
func NewResourceLockedError(resource string) *errors.AppError {
	return errors.NewConflictError(
		"Resource is locked",
		fmt.Sprintf("The %s is currently locked and cannot be modified", resource),
	)
}

// NewQuotaExceededError creates an error for quota violations
func NewQuotaExceededError(quotaType string, limit int64) *errors.AppError {
	return errors.NewAppError(
		errors.ValidationError,
		"Quota exceeded",
		fmt.Sprintf("%s quota of %d exceeded", quotaType, limit),
		http.StatusPaymentRequired,
	)
}

// Helper functions for error handling

// IsValidationError checks if an error is a validation error
func IsValidationError(err error) bool {
	if appErr, ok := errors.AsAppError(err); ok {
		return appErr.Code == errors.ValidationError
	}
	return false
}

// IsNotFoundError checks if an error is a not found error
func IsNotFoundError(err error) bool {
	if appErr, ok := errors.AsAppError(err); ok {
		return appErr.Code == errors.NotFoundError
	}
	return false
}

// IsConflictError checks if an error is a conflict error
func IsConflictError(err error) bool {
	if appErr, ok := errors.AsAppError(err); ok {
		return appErr.Code == errors.ConflictError
	}
	return false
}

// IsAuthenticationError checks if an error is an authentication error
func IsAuthenticationError(err error) bool {
	if appErr, ok := errors.AsAppError(err); ok {
		return appErr.Code == errors.AuthenticationError
	}
	return false
}

// IsAuthorizationError checks if an error is an authorization error
func IsAuthorizationError(err error) bool {
	if appErr, ok := errors.AsAppError(err); ok {
		return appErr.Code == errors.AuthorizationError
	}
	return false
}

// Additional validation errors

// NewInvalidUserIDError creates an error for invalid user IDs
func NewInvalidUserIDError() *errors.AppError {
	return errors.NewValidationError("Invalid user ID", "User ID must be positive")
}

// NewInvalidRoleNameError creates an error for invalid role names
func NewInvalidRoleNameError() *errors.AppError {
	return errors.NewValidationError("Invalid role name", "Role name cannot be empty")
}

// NewInvalidResourceError creates an error for invalid resources
func NewInvalidResourceError() *errors.AppError {
	return errors.NewValidationError("Invalid resource", "Resource cannot be empty")
}

// NewInvalidActionError creates an error for invalid actions
func NewInvalidActionError() *errors.AppError {
	return errors.NewValidationError("Invalid action", "Action cannot be empty")
}

// NewInvalidSettingKeyError creates an error for invalid setting keys
func NewInvalidSettingKeyError() *errors.AppError {
	return errors.NewValidationError("Invalid setting key", "Setting key cannot be empty")
}

// NewInvalidEmailError creates an error for invalid emails
func NewInvalidEmailError() *errors.AppError {
	return errors.NewValidationError("Invalid email", "Email cannot be empty")
}