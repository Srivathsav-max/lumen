package services

import (
	"fmt"
	"reflect"
	"strings"

	"github.com/go-playground/validator/v10"
	"github.com/Srivathsav-max/lumen/backend/internal/errors"
)

// Validator wraps the go-playground validator
type Validator struct {
	validate *validator.Validate
}

// NewValidator creates a new validator instance with custom validation rules
func NewValidator() *Validator {
	validate := validator.New()
	
	// Register custom validation tags
	validate.RegisterValidation("alphanum", validateAlphaNum)
	
	// Use JSON tag names for field names in error messages
	validate.RegisterTagNameFunc(func(fld reflect.StructField) string {
		name := strings.SplitN(fld.Tag.Get("json"), ",", 2)[0]
		if name == "-" {
			return ""
		}
		return name
	})
	
	return &Validator{validate: validate}
}

// ValidateStruct validates a struct and returns a structured error
func (v *Validator) ValidateStruct(s interface{}) error {
	err := v.validate.Struct(s)
	if err == nil {
		return nil
	}
	
	var validationErrors []ValidationErrorDetail
	
	if validationErrs, ok := err.(validator.ValidationErrors); ok {
		for _, fieldErr := range validationErrs {
			validationErrors = append(validationErrors, ValidationErrorDetail{
				Field:   fieldErr.Field(),
				Message: getValidationMessage(fieldErr),
				Value:   fmt.Sprintf("%v", fieldErr.Value()),
			})
		}
	}
	
	return errors.NewValidationError(
		"Validation failed",
		fmt.Sprintf("Found %d validation errors", len(validationErrors)),
	).WithCause(&ValidationError{Errors: validationErrors})
}

// ValidationError represents validation errors with field details
type ValidationError struct {
	Errors []ValidationErrorDetail `json:"errors"`
}

func (e *ValidationError) Error() string {
	var messages []string
	for _, err := range e.Errors {
		messages = append(messages, fmt.Sprintf("%s: %s", err.Field, err.Message))
	}
	return strings.Join(messages, "; ")
}

// Custom validation functions

// validateAlphaNum validates that a string contains only alphanumeric characters
func validateAlphaNum(fl validator.FieldLevel) bool {
	value := fl.Field().String()
	for _, char := range value {
		if !((char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || (char >= '0' && char <= '9')) {
			return false
		}
	}
	return true
}

// getValidationMessage returns a human-readable validation error message
func getValidationMessage(fe validator.FieldError) string {
	switch fe.Tag() {
	case "required":
		return "This field is required"
	case "email":
		return "Must be a valid email address"
	case "min":
		if fe.Kind() == reflect.String {
			return fmt.Sprintf("Must be at least %s characters long", fe.Param())
		}
		return fmt.Sprintf("Must be at least %s", fe.Param())
	case "max":
		if fe.Kind() == reflect.String {
			return fmt.Sprintf("Must be no more than %s characters long", fe.Param())
		}
		return fmt.Sprintf("Must be no more than %s", fe.Param())
	case "alphanum":
		return "Must contain only letters and numbers"
	case "eqfield":
		return fmt.Sprintf("Must match %s", fe.Param())
	case "oneof":
		return fmt.Sprintf("Must be one of: %s", fe.Param())
	default:
		return fmt.Sprintf("Validation failed for tag '%s'", fe.Tag())
	}
}

// Validation helper functions

// ValidateRegisterRequest validates a user registration request
func ValidateRegisterRequest(v *Validator, req *RegisterRequest) error {
	if err := v.ValidateStruct(req); err != nil {
		return err
	}
	
	// Additional custom validations
	if strings.TrimSpace(req.Username) != req.Username {
		return errors.NewValidationError(
			"Validation failed",
			"Username cannot have leading or trailing spaces",
		)
	}
	
	if strings.TrimSpace(req.Email) != req.Email {
		return errors.NewValidationError(
			"Validation failed",
			"Email cannot have leading or trailing spaces",
		)
	}
	
	return nil
}

// ValidateLoginRequest validates a user login request
func ValidateLoginRequest(v *Validator, req *LoginRequest) error {
	if err := v.ValidateStruct(req); err != nil {
		return err
	}
	
	if strings.TrimSpace(req.Email) != req.Email {
		return errors.NewValidationError(
			"Validation failed",
			"Email cannot have leading or trailing spaces",
		)
	}
	
	return nil
}

// ValidateUpdateProfileRequest validates a profile update request
func ValidateUpdateProfileRequest(v *Validator, req *UpdateProfileRequest) error {
	if err := v.ValidateStruct(req); err != nil {
		return err
	}
	
	// Check that at least one field is being updated
	if req.Username == nil && req.Email == nil && req.FirstName == nil && req.LastName == nil {
		return errors.NewValidationError(
			"Validation failed",
			"At least one field must be provided for update",
		)
	}
	
	// Validate trimmed values
	if req.Username != nil && strings.TrimSpace(*req.Username) != *req.Username {
		return errors.NewValidationError(
			"Validation failed",
			"Username cannot have leading or trailing spaces",
		)
	}
	
	if req.Email != nil && strings.TrimSpace(*req.Email) != *req.Email {
		return errors.NewValidationError(
			"Validation failed",
			"Email cannot have leading or trailing spaces",
		)
	}
	
	return nil
}

// ValidateChangePasswordRequest validates a password change request
func ValidateChangePasswordRequest(v *Validator, req *ChangePasswordRequest) error {
	if err := v.ValidateStruct(req); err != nil {
		return err
	}
	
	if req.CurrentPassword == req.NewPassword {
		return errors.NewValidationError(
			"Validation failed",
			"New password must be different from current password",
		)
	}
	
	return nil
}

// ValidateWaitlistRequest validates a waitlist signup request
func ValidateWaitlistRequest(v *Validator, req *WaitlistRequest) error {
	if err := v.ValidateStruct(req); err != nil {
		return err
	}
	
	if strings.TrimSpace(req.Email) != req.Email {
		return errors.NewValidationError(
			"Validation failed",
			"Email cannot have leading or trailing spaces",
		)
	}
	
	return nil
}

// ValidatePaginationRequest validates pagination parameters
func ValidatePaginationRequest(v *Validator, req *PaginationRequest) error {
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PageSize <= 0 {
		req.PageSize = 20
	}
	if req.PageSize > 100 {
		req.PageSize = 100
	}
	
	return v.ValidateStruct(req)
}

// ValidateGetWaitlistRequest validates a get waitlist entries request
func ValidateGetWaitlistRequest(v *Validator, req *GetWaitlistRequest) error {
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PageSize <= 0 {
		req.PageSize = 20
	}
	if req.PageSize > 100 {
		req.PageSize = 100
	}
	
	return v.ValidateStruct(req)
}

// ValidateSetSettingRequest validates a set setting request
func ValidateSetSettingRequest(v *Validator, req *SetSettingRequest) error {
	if err := v.ValidateStruct(req); err != nil {
		return err
	}
	
	if strings.TrimSpace(req.Key) != req.Key {
		return errors.NewValidationError(
			"Validation failed",
			"Setting key cannot have leading or trailing spaces",
		)
	}
	
	if req.Key == "" {
		return errors.NewValidationError(
			"Validation failed",
			"Setting key cannot be empty",
		)
	}
	
	return nil
}