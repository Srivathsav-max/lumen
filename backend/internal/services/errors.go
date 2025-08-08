package services

import (
	"fmt"
	"net/http"

	"github.com/Srivathsav-max/lumen/backend/internal/errors"
)

func NewUserNotFoundError(identifier string) *errors.AppError {
	return errors.NewNotFoundError("User").
		WithCause(fmt.Errorf("user not found: %s", identifier))
}

func NewUserAlreadyExistsError(field, value string) *errors.AppError {
	return errors.NewConflictError(
		fmt.Sprintf("User with this %s already exists", field),
		fmt.Sprintf("A user with %s '%s' is already registered", field, value),
	)
}

func NewInvalidCredentialsError() *errors.AppError {
	return errors.NewAuthenticationError("Invalid email or password")
}

func NewEmailNotVerifiedError() *errors.AppError {
	return errors.NewAuthenticationError("Email address is not verified")
}

func NewAccountDisabledError() *errors.AppError {
	return errors.NewAuthenticationError("Account has been disabled")
}

func NewInvalidTokenError(reason string) *errors.AppError {
	return errors.NewAuthenticationError("Invalid or expired token").
		WithCause(fmt.Errorf("token validation failed: %s", reason))
}

func NewTokenExpiredError() *errors.AppError {
	return errors.NewAuthenticationError("Token has expired")
}

func NewTokenRevokedError() *errors.AppError {
	return errors.NewAuthenticationError("Token has been revoked")
}

func NewInvalidRefreshTokenError() *errors.AppError {
	return errors.NewAuthenticationError("Invalid refresh token")
}

func NewPasswordMismatchError() *errors.AppError {
	return errors.NewValidationError(
		"Current password is incorrect",
		"The provided current password does not match",
	)
}

func NewWeakPasswordError(requirements string) *errors.AppError {
	return errors.NewValidationError(
		"Password does not meet security requirements",
		requirements,
	)
}

func NewPasswordResetTokenInvalidError() *errors.AppError {
	return errors.NewValidationError(
		"Invalid or expired password reset token",
		"The password reset token is either invalid or has expired",
	)
}

func NewEmailDeliveryError(recipient string, cause error) *errors.AppError {
	return errors.NewExternalServiceError(
		"Email",
		fmt.Sprintf("Failed to send email to %s", recipient),
	).WithCause(cause)
}

func NewEmailTemplateError(templateName string, cause error) *errors.AppError {
	return errors.NewInternalError(
		fmt.Sprintf("Failed to render email template: %s", templateName),
	).WithCause(cause)
}

func NewInvalidEmailAddressError(email string) *errors.AppError {
	return errors.NewValidationError(
		"Invalid email address format",
		fmt.Sprintf("The email address '%s' is not valid", email),
	)
}

func NewRoleNotFoundError(roleName string) *errors.AppError {
	return errors.NewNotFoundError("Role").
		WithCause(fmt.Errorf("role not found: %s", roleName))
}

func NewInsufficientPermissionsError(resource, action string) *errors.AppError {
	return errors.NewAuthorizationError(
		fmt.Sprintf("Insufficient permissions to %s %s", action, resource),
	)
}

func NewRoleAlreadyAssignedError(roleName string) *errors.AppError {
	return errors.NewConflictError(
		"Role already assigned",
		fmt.Sprintf("User already has the role '%s'", roleName),
	)
}

func NewRoleNotAssignedError(roleName string) *errors.AppError {
	return errors.NewConflictError(
		"Role not assigned",
		fmt.Sprintf("User does not have the role '%s'", roleName),
	)
}

func NewWaitlistAlreadyExistsError(email string) *errors.AppError {
	return errors.NewConflictError(
		"Already on waitlist",
		fmt.Sprintf("Email '%s' is already on the waitlist", email),
	)
}

func NewWaitlistNotFoundError(email string) *errors.AppError {
	return errors.NewNotFoundError("Waitlist entry").
		WithCause(fmt.Errorf("waitlist entry not found for email: %s", email))
}

func NewWaitlistFullError() *errors.AppError {
	return errors.NewAppError(
		errors.ConflictError,
		"Waitlist is currently full",
		"Please try again later",
		http.StatusConflict,
	)
}

func NewSettingNotFoundError(key string) *errors.AppError {
	return errors.NewNotFoundError("Setting").
		WithCause(fmt.Errorf("setting not found: %s", key))
}

func NewInvalidSettingValueError(key string, expectedType string) *errors.AppError {
	return errors.NewValidationError(
		"Invalid setting value",
		fmt.Sprintf("Setting '%s' expects a value of type %s", key, expectedType),
	)
}

func NewReadOnlySettingError(key string) *errors.AppError {
	return errors.NewValidationError(
		"Setting is read-only",
		fmt.Sprintf("Setting '%s' cannot be modified", key),
	)
}

func NewMaintenanceModeActiveError(message string) *errors.AppError {
	return errors.NewAppError(
		errors.ExternalServiceError,
		"Service temporarily unavailable",
		message,
		http.StatusServiceUnavailable,
	)
}

func NewServiceUnavailableError(serviceName string, cause error) *errors.AppError {
	return errors.NewExternalServiceError(
		serviceName,
		"Service is temporarily unavailable",
	).WithCause(cause)
}

func NewRateLimitExceededError(limit string) *errors.AppError {
	return errors.NewAppError(
		errors.ValidationError,
		"Rate limit exceeded",
		fmt.Sprintf("Request rate limit of %s exceeded", limit),
		http.StatusTooManyRequests,
	)
}

func NewConcurrentModificationError(resource string) *errors.AppError {
	return errors.NewConflictError(
		"Concurrent modification detected",
		fmt.Sprintf("The %s was modified by another process", resource),
	)
}

func NewResourceLockedError(resource string) *errors.AppError {
	return errors.NewConflictError(
		"Resource is locked",
		fmt.Sprintf("The %s is currently locked and cannot be modified", resource),
	)
}

func NewQuotaExceededError(quotaType string, limit int64) *errors.AppError {
	return errors.NewAppError(
		errors.ValidationError,
		"Quota exceeded",
		fmt.Sprintf("%s quota of %d exceeded", quotaType, limit),
		http.StatusPaymentRequired,
	)
}

func IsValidationError(err error) bool {
	if appErr, ok := errors.AsAppError(err); ok {
		return appErr.Code == errors.ValidationError
	}
	return false
}

func IsNotFoundError(err error) bool {
	if appErr, ok := errors.AsAppError(err); ok {
		return appErr.Code == errors.NotFoundError
	}
	return false
}

func IsConflictError(err error) bool {
	if appErr, ok := errors.AsAppError(err); ok {
		return appErr.Code == errors.ConflictError
	}
	return false
}

func IsAuthenticationError(err error) bool {
	if appErr, ok := errors.AsAppError(err); ok {
		return appErr.Code == errors.AuthenticationError
	}
	return false
}

func IsAuthorizationError(err error) bool {
	if appErr, ok := errors.AsAppError(err); ok {
		return appErr.Code == errors.AuthorizationError
	}
	return false
}

func NewInvalidUserIDError() *errors.AppError {
	return errors.NewValidationError("Invalid user ID", "User ID must be positive")
}

func NewInvalidRoleNameError() *errors.AppError {
	return errors.NewValidationError("Invalid role name", "Role name cannot be empty")
}

func NewInvalidResourceError() *errors.AppError {
	return errors.NewValidationError("Invalid resource", "Resource cannot be empty")
}

func NewInvalidActionError() *errors.AppError {
	return errors.NewValidationError("Invalid action", "Action cannot be empty")
}

func NewInvalidSettingKeyError() *errors.AppError {
	return errors.NewValidationError("Invalid setting key", "Setting key cannot be empty")
}

func NewInvalidEmailError() *errors.AppError {
	return errors.NewValidationError("Invalid email", "Email cannot be empty")
}

// Error helper functions for service layer
func NewValidationError(err error) *errors.AppError {
	if validationErr, ok := err.(*ValidationError); ok {
		return errors.NewValidationError("Validation failed", validationErr.Error()).WithDetails(&ValidationErrorResponse{
			Message: "Validation failed",
			Errors:  validationErr.Errors,
		})
	}
	return errors.NewValidationError("Validation failed", err.Error())
}

func NewInternalError(message string) *errors.AppError {
	return errors.NewInternalError(message)
}

func NewNotFoundError(message string) *errors.AppError {
	return errors.NewNotFoundError(message)
}

func NewForbiddenError(message string) *errors.AppError {
	return errors.NewAuthorizationError(message)
}

func NewBadRequestError(message string) *errors.AppError {
	return errors.NewValidationError("Bad request", message)
}

func NewConflictError(message string) *errors.AppError {
	return errors.NewConflictError(message, "")
}

func NewUnauthorizedError(message string) *errors.AppError {
	return errors.NewAuthenticationError(message)
}
