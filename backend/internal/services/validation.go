package services

import (
	"fmt"
	"reflect"
	"strings"

	"github.com/Srivathsav-max/lumen/backend/internal/errors"
	"github.com/go-playground/validator/v10"
)

type Validator struct {
	validate *validator.Validate
}

func NewValidator() *Validator {
	validate := validator.New()

	validate.RegisterValidation("alphanum", validateAlphaNum)

	validate.RegisterTagNameFunc(func(fld reflect.StructField) string {
		name := strings.SplitN(fld.Tag.Get("json"), ",", 2)[0]
		if name == "-" {
			return ""
		}
		return name
	})

	return &Validator{validate: validate}
}

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

func validateAlphaNum(fl validator.FieldLevel) bool {
	value := fl.Field().String()
	for _, char := range value {
		if !((char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || (char >= '0' && char <= '9')) {
			return false
		}
	}
	return true
}

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

func ValidateRegisterRequest(v *Validator, req *RegisterRequest) error {
	if err := v.ValidateStruct(req); err != nil {
		return err
	}

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

func ValidateUpdateProfileRequest(v *Validator, req *UpdateProfileRequest) error {
	if err := v.ValidateStruct(req); err != nil {
		return err
	}

	if req.Username == nil && req.Email == nil && req.FirstName == nil && req.LastName == nil {
		return errors.NewValidationError(
			"Validation failed",
			"At least one field must be provided for update",
		)
	}

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

// Global validator instance
var globalValidator *Validator

func init() {
	globalValidator = NewValidator()
}

// Helper function to validate structs
func validateStruct(s interface{}) error {
	return globalValidator.ValidateStruct(s)
}

// ValidateBrainstormerGenerateRequest applies constraints suitable for production
func ValidateBrainstormerGenerateRequest(v *Validator, req *BrainstormerGenerateRequest) error {
	// Set sane defaults and limits
	if req.NumItems <= 0 {
		req.NumItems = 10
	}
	if req.NumItems > 50 {
		req.NumItems = 50
	}
	if req.MaxContextTokens <= 0 {
		req.MaxContextTokens = 1600
	}
	if req.MaxContextTokens > 3500 {
		req.MaxContextTokens = 3500
	}

	// Trim and bound topics
	if len(req.Topics) > 20 {
		req.Topics = req.Topics[:20]
	}
	for i := range req.Topics {
		req.Topics[i] = strings.TrimSpace(req.Topics[i])
	}

	// Optional difficulty normalization
	if req.Difficulty != "" {
		d := strings.ToLower(strings.TrimSpace(req.Difficulty))
		switch d {
		case "easy", "medium", "hard":
			req.Difficulty = d
		default:
			// Map unknown values to medium to avoid over/under shooting complexity
			req.Difficulty = "medium"
		}
	}

	// Limit number of document IDs and trim
	if len(req.DocumentIDs) > 50 {
		req.DocumentIDs = req.DocumentIDs[:50]
	}
	for i := range req.DocumentIDs {
		req.DocumentIDs[i] = strings.TrimSpace(req.DocumentIDs[i])
	}

	return v.ValidateStruct(req)
}
