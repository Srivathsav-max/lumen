# Errors Package

## Overview

The `errors` package provides centralized error handling for the Lumen backend application. It defines custom error types, error codes, error wrapping, and standardized error responses for consistent error management across all application layers.

## Purpose

- **Standardized Error Types**: Consistent error classification and handling
- **HTTP Status Mapping**: Automatic mapping of business errors to HTTP status codes
- **Error Context**: Rich error context with stack traces and metadata
- **Localization Support**: Multi-language error messages
- **Logging Integration**: Structured error logging with appropriate severity levels
- **Client-Safe Errors**: Sanitized error responses for external clients

## Dependencies

### External Dependencies
```go
// Core dependencies
"fmt"                   // String formatting
"net/http"             // HTTP status codes
"encoding/json"        // JSON serialization
"time"                 // Timestamp handling
"runtime"              // Stack trace information

// Third-party dependencies
"github.com/pkg/errors" // Enhanced error handling with stack traces
"github.com/go-playground/validator/v10" // Validation error handling
"google.golang.org/grpc/codes"           // gRPC error codes
"google.golang.org/grpc/status"          // gRPC status handling
```

### Internal Dependencies
```go
"github.com/Srivathsav-max/lumen/backend/internal/logger" // Logging services
```

## Error Structure

### Base Error Interface
```go
type AppError interface {
    error
    Code() string
    Message() string
    Details() map[string]interface{}
    HTTPStatus() int
    GRPCStatus() codes.Code
    Severity() Severity
    Timestamp() time.Time
    StackTrace() string
    Cause() error
    WithContext(key string, value interface{}) AppError
    WithCause(err error) AppError
    IsRetryable() bool
}

type Severity int

const (
    SeverityLow Severity = iota
    SeverityMedium
    SeverityHigh
    SeverityCritical
)
```

### Error Implementation
```go
type appError struct {
    code       string
    message    string
    details    map[string]interface{}
    httpStatus int
    grpcStatus codes.Code
    severity   Severity
    timestamp  time.Time
    stackTrace string
    cause      error
    retryable  bool
}

func (e *appError) Error() string {
    if e.cause != nil {
        return fmt.Sprintf("%s: %v", e.message, e.cause)
    }
    return e.message
}

func (e *appError) Code() string       { return e.code }
func (e *appError) Message() string    { return e.message }
func (e *appError) Details() map[string]interface{} { return e.details }
func (e *appError) HTTPStatus() int    { return e.httpStatus }
func (e *appError) GRPCStatus() codes.Code { return e.grpcStatus }
func (e *appError) Severity() Severity { return e.severity }
func (e *appError) Timestamp() time.Time { return e.timestamp }
func (e *appError) StackTrace() string { return e.stackTrace }
func (e *appError) Cause() error       { return e.cause }
func (e *appError) IsRetryable() bool  { return e.retryable }
```

### Error Response Format
```go
type ErrorResponse struct {
    Error ErrorDetail `json:"error"`
}

type ErrorDetail struct {
    Code      string                 `json:"code"`
    Message   string                 `json:"message"`
    Details   map[string]interface{} `json:"details,omitempty"`
    Timestamp time.Time              `json:"timestamp"`
    RequestID string                 `json:"request_id,omitempty"`
    TraceID   string                 `json:"trace_id,omitempty"`
}

type ValidationErrorDetail struct {
    Field   string `json:"field"`
    Value   string `json:"value"`
    Message string `json:"message"`
    Tag     string `json:"tag"`
}
```

## Error Types and Codes

### 1. Authentication Errors
```go
const (
    ErrCodeUnauthorized        = "AUTH_UNAUTHORIZED"
    ErrCodeInvalidCredentials  = "AUTH_INVALID_CREDENTIALS"
    ErrCodeTokenExpired        = "AUTH_TOKEN_EXPIRED"
    ErrCodeTokenInvalid        = "AUTH_TOKEN_INVALID"
    ErrCodeInsufficientScope   = "AUTH_INSUFFICIENT_SCOPE"
    ErrCodeAccountLocked       = "AUTH_ACCOUNT_LOCKED"
    ErrCodeAccountNotVerified  = "AUTH_ACCOUNT_NOT_VERIFIED"
)

// NewUnauthorizedError creates an unauthorized error
func NewUnauthorizedError(message string) AppError {
    return &appError{
        code:       ErrCodeUnauthorized,
        message:    message,
        httpStatus: http.StatusUnauthorized,
        grpcStatus: codes.Unauthenticated,
        severity:   SeverityMedium,
        timestamp:  time.Now(),
        stackTrace: getStackTrace(),
        retryable:  false,
    }
}

// NewTokenExpiredError creates a token expired error
func NewTokenExpiredError() AppError {
    return &appError{
        code:       ErrCodeTokenExpired,
        message:    "Authentication token has expired",
        httpStatus: http.StatusUnauthorized,
        grpcStatus: codes.Unauthenticated,
        severity:   SeverityLow,
        timestamp:  time.Now(),
        stackTrace: getStackTrace(),
        retryable:  true,
    }
}
```

### 2. Validation Errors
```go
const (
    ErrCodeValidationFailed    = "VALIDATION_FAILED"
    ErrCodeInvalidInput        = "VALIDATION_INVALID_INPUT"
    ErrCodeMissingField        = "VALIDATION_MISSING_FIELD"
    ErrCodeInvalidFormat       = "VALIDATION_INVALID_FORMAT"
    ErrCodeValueOutOfRange     = "VALIDATION_VALUE_OUT_OF_RANGE"
)

// NewValidationError creates a validation error from validator errors
func NewValidationError(validationErrors validator.ValidationErrors) AppError {
    details := make(map[string]interface{})
    var fieldErrors []ValidationErrorDetail
    
    for _, err := range validationErrors {
        fieldError := ValidationErrorDetail{
            Field:   err.Field(),
            Value:   fmt.Sprintf("%v", err.Value()),
            Message: getValidationMessage(err),
            Tag:     err.Tag(),
        }
        fieldErrors = append(fieldErrors, fieldError)
    }
    
    details["fields"] = fieldErrors
    
    return &appError{
        code:       ErrCodeValidationFailed,
        message:    "Validation failed",
        details:    details,
        httpStatus: http.StatusBadRequest,
        grpcStatus: codes.InvalidArgument,
        severity:   SeverityLow,
        timestamp:  time.Now(),
        stackTrace: getStackTrace(),
        retryable:  false,
    }
}

// NewInvalidInputError creates an invalid input error
func NewInvalidInputError(field, message string) AppError {
    details := map[string]interface{}{
        "field": field,
    }
    
    return &appError{
        code:       ErrCodeInvalidInput,
        message:    message,
        details:    details,
        httpStatus: http.StatusBadRequest,
        grpcStatus: codes.InvalidArgument,
        severity:   SeverityLow,
        timestamp:  time.Now(),
        stackTrace: getStackTrace(),
        retryable:  false,
    }
}
```

### 3. Business Logic Errors
```go
const (
    ErrCodeNotFound           = "RESOURCE_NOT_FOUND"
    ErrCodeAlreadyExists      = "RESOURCE_ALREADY_EXISTS"
    ErrCodeConflict           = "RESOURCE_CONFLICT"
    ErrCodeForbidden          = "ACCESS_FORBIDDEN"
    ErrCodeBusinessRule       = "BUSINESS_RULE_VIOLATION"
    ErrCodeInsufficientFunds  = "INSUFFICIENT_FUNDS"
    ErrCodeQuotaExceeded      = "QUOTA_EXCEEDED"
)

// NewNotFoundError creates a not found error
func NewNotFoundError(resource string) AppError {
    return &appError{
        code:       ErrCodeNotFound,
        message:    fmt.Sprintf("%s not found", resource),
        details:    map[string]interface{}{"resource": resource},
        httpStatus: http.StatusNotFound,
        grpcStatus: codes.NotFound,
        severity:   SeverityLow,
        timestamp:  time.Now(),
        stackTrace: getStackTrace(),
        retryable:  false,
    }
}

// NewConflictError creates a conflict error
func NewConflictError(message string) AppError {
    return &appError{
        code:       ErrCodeConflict,
        message:    message,
        httpStatus: http.StatusConflict,
        grpcStatus: codes.AlreadyExists,
        severity:   SeverityMedium,
        timestamp:  time.Now(),
        stackTrace: getStackTrace(),
        retryable:  false,
    }
}
```

### 4. System Errors
```go
const (
    ErrCodeInternalError      = "INTERNAL_ERROR"
    ErrCodeServiceUnavailable = "SERVICE_UNAVAILABLE"
    ErrCodeTimeout            = "TIMEOUT"
    ErrCodeRateLimitExceeded  = "RATE_LIMIT_EXCEEDED"
    ErrCodeDatabaseError      = "DATABASE_ERROR"
    ErrCodeExternalService    = "EXTERNAL_SERVICE_ERROR"
)

// NewInternalError creates an internal server error
func NewInternalError(message string) AppError {
    return &appError{
        code:       ErrCodeInternalError,
        message:    message,
        httpStatus: http.StatusInternalServerError,
        grpcStatus: codes.Internal,
        severity:   SeverityHigh,
        timestamp:  time.Now(),
        stackTrace: getStackTrace(),
        retryable:  true,
    }
}

// NewServiceUnavailableError creates a service unavailable error
func NewServiceUnavailableError(service string) AppError {
    return &appError{
        code:       ErrCodeServiceUnavailable,
        message:    fmt.Sprintf("%s service is currently unavailable", service),
        details:    map[string]interface{}{"service": service},
        httpStatus: http.StatusServiceUnavailable,
        grpcStatus: codes.Unavailable,
        severity:   SeverityHigh,
        timestamp:  time.Now(),
        stackTrace: getStackTrace(),
        retryable:  true,
    }
}

// NewTimeoutError creates a timeout error
func NewTimeoutError(operation string) AppError {
    return &appError{
        code:       ErrCodeTimeout,
        message:    fmt.Sprintf("%s operation timed out", operation),
        details:    map[string]interface{}{"operation": operation},
        httpStatus: http.StatusRequestTimeout,
        grpcStatus: codes.DeadlineExceeded,
        severity:   SeverityMedium,
        timestamp:  time.Now(),
        stackTrace: getStackTrace(),
        retryable:  true,
    }
}
```

## Error Handling Utilities

### 1. Error Wrapping and Context
```go
// WithContext adds context to an error
func (e *appError) WithContext(key string, value interface{}) AppError {
    if e.details == nil {
        e.details = make(map[string]interface{})
    }
    e.details[key] = value
    return e
}

// WithCause adds a cause to an error
func (e *appError) WithCause(err error) AppError {
    e.cause = err
    return e
}

// Wrap wraps an existing error with additional context
func Wrap(err error, message string) AppError {
    if err == nil {
        return nil
    }
    
    if appErr, ok := err.(AppError); ok {
        return &appError{
            code:       appErr.Code(),
            message:    message,
            details:    appErr.Details(),
            httpStatus: appErr.HTTPStatus(),
            grpcStatus: appErr.GRPCStatus(),
            severity:   appErr.Severity(),
            timestamp:  time.Now(),
            stackTrace: getStackTrace(),
            cause:      err,
            retryable:  appErr.IsRetryable(),
        }
    }
    
    return &appError{
        code:       ErrCodeInternalError,
        message:    message,
        httpStatus: http.StatusInternalServerError,
        grpcStatus: codes.Internal,
        severity:   SeverityHigh,
        timestamp:  time.Now(),
        stackTrace: getStackTrace(),
        cause:      err,
        retryable:  true,
    }
}
```

### 2. Error Classification
```go
// IsAppError checks if an error is an AppError
func IsAppError(err error) bool {
    _, ok := err.(AppError)
    return ok
}

// IsRetryable checks if an error is retryable
func IsRetryable(err error) bool {
    if appErr, ok := err.(AppError); ok {
        return appErr.IsRetryable()
    }
    return false
}

// GetErrorCode extracts error code from an error
func GetErrorCode(err error) string {
    if appErr, ok := err.(AppError); ok {
        return appErr.Code()
    }
    return ErrCodeInternalError
}

// GetHTTPStatus extracts HTTP status from an error
func GetHTTPStatus(err error) int {
    if appErr, ok := err.(AppError); ok {
        return appErr.HTTPStatus()
    }
    return http.StatusInternalServerError
}
```

### 3. Error Response Generation
```go
// ToErrorResponse converts an error to a standardized error response
func ToErrorResponse(err error, requestID string) *ErrorResponse {
    if err == nil {
        return nil
    }
    
    if appErr, ok := err.(AppError); ok {
        return &ErrorResponse{
            Error: ErrorDetail{
                Code:      appErr.Code(),
                Message:   appErr.Message(),
                Details:   appErr.Details(),
                Timestamp: appErr.Timestamp(),
                RequestID: requestID,
            },
        }
    }
    
    // Handle non-AppError types
    return &ErrorResponse{
        Error: ErrorDetail{
            Code:      ErrCodeInternalError,
            Message:   "An internal error occurred",
            Timestamp: time.Now(),
            RequestID: requestID,
        },
    }
}

// ToJSON converts an error response to JSON
func (er *ErrorResponse) ToJSON() ([]byte, error) {
    return json.Marshal(er)
}
```

## Implementation Patterns

### 1. Service Layer Error Handling
```go
// UserService example with proper error handling
type userService struct {
    repo   repository.UserRepository
    logger *logger.Logger
}

func (s *userService) GetUser(ctx context.Context, id string) (*User, error) {
    // Validate input
    if id == "" {
        return nil, NewInvalidInputError("id", "User ID is required")
    }
    
    // Call repository
    user, err := s.repo.FindByID(ctx, id)
    if err != nil {
        // Check if it's a known error type
        if IsAppError(err) {
            return nil, err
        }
        
        // Wrap unknown errors
        s.logger.Error("Failed to get user", "error", err, "user_id", id)
        return nil, Wrap(err, "Failed to retrieve user").WithContext("user_id", id)
    }
    
    return user, nil
}

func (s *userService) CreateUser(ctx context.Context, req *CreateUserRequest) (*User, error) {
    // Validate request
    if err := s.validateCreateUserRequest(req); err != nil {
        return nil, err
    }
    
    // Check if user already exists
    existingUser, err := s.repo.FindByEmail(ctx, req.Email)
    if err != nil && GetErrorCode(err) != ErrCodeNotFound {
        return nil, Wrap(err, "Failed to check existing user")
    }
    
    if existingUser != nil {
        return nil, NewConflictError("User with this email already exists")
    }
    
    // Create user
    user := &User{
        Email:     req.Email,
        FirstName: req.FirstName,
        LastName:  req.LastName,
    }
    
    if err := s.repo.Create(ctx, user); err != nil {
        s.logger.Error("Failed to create user", "error", err, "email", req.Email)
        return nil, Wrap(err, "Failed to create user")
    }
    
    return user, nil
}
```

### 2. Handler Layer Error Handling
```go
// HTTP handler with error handling
func (h *UserHandler) GetUser(w http.ResponseWriter, r *http.Request) {
    userID := mux.Vars(r)["id"]
    requestID := r.Header.Get("X-Request-ID")
    
    user, err := h.userService.GetUser(r.Context(), userID)
    if err != nil {
        h.handleError(w, err, requestID)
        return
    }
    
    h.writeJSONResponse(w, http.StatusOK, user)
}

func (h *UserHandler) handleError(w http.ResponseWriter, err error, requestID string) {
    // Log error with appropriate level
    if appErr, ok := err.(AppError); ok {
        switch appErr.Severity() {
        case SeverityLow:
            h.logger.Info("Request error", "error", err, "request_id", requestID)
        case SeverityMedium:
            h.logger.Warn("Request warning", "error", err, "request_id", requestID)
        case SeverityHigh, SeverityCritical:
            h.logger.Error("Request error", "error", err, "request_id", requestID, "stack_trace", appErr.StackTrace())
        }
    } else {
        h.logger.Error("Unexpected error", "error", err, "request_id", requestID)
    }
    
    // Generate error response
    errorResponse := ToErrorResponse(err, requestID)
    httpStatus := GetHTTPStatus(err)
    
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(httpStatus)
    
    if jsonData, jsonErr := errorResponse.ToJSON(); jsonErr == nil {
        w.Write(jsonData)
    }
}
```

### 3. Repository Layer Error Handling
```go
// Repository with proper error handling
func (r *userRepository) FindByID(ctx context.Context, id string) (*User, error) {
    var user User
    query := "SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL"
    
    err := r.db.GetContext(ctx, &user, query, id)
    if err != nil {
        if err == sql.ErrNoRows {
            return nil, NewNotFoundError("user")
        }
        
        // Check for specific database errors
        if isDatabaseConnectionError(err) {
            return nil, NewServiceUnavailableError("database")
        }
        
        if isDatabaseTimeoutError(err) {
            return nil, NewTimeoutError("database query")
        }
        
        // Wrap unknown database errors
        return nil, Wrap(err, "Database query failed").WithContext("query", query).WithContext("user_id", id)
    }
    
    return &user, nil
}
```

## Adding New Error Types

### Step 1: Define Error Codes
```go
// Add new error codes to constants
const (
    ErrCodePaymentFailed      = "PAYMENT_FAILED"
    ErrCodePaymentDeclined    = "PAYMENT_DECLINED"
    ErrCodeInsufficientFunds  = "INSUFFICIENT_FUNDS"
    ErrCodePaymentMethodInvalid = "PAYMENT_METHOD_INVALID"
)
```

### Step 2: Create Error Constructors
```go
// NewPaymentFailedError creates a payment failed error
func NewPaymentFailedError(reason string) AppError {
    return &appError{
        code:       ErrCodePaymentFailed,
        message:    fmt.Sprintf("Payment failed: %s", reason),
        details:    map[string]interface{}{"reason": reason},
        httpStatus: http.StatusPaymentRequired,
        grpcStatus: codes.FailedPrecondition,
        severity:   SeverityMedium,
        timestamp:  time.Now(),
        stackTrace: getStackTrace(),
        retryable:  true,
    }
}

// NewInsufficientFundsError creates an insufficient funds error
func NewInsufficientFundsError(available, required float64) AppError {
    details := map[string]interface{}{
        "available_amount": available,
        "required_amount":  required,
        "shortfall":        required - available,
    }
    
    return &appError{
        code:       ErrCodeInsufficientFunds,
        message:    "Insufficient funds for this transaction",
        details:    details,
        httpStatus: http.StatusPaymentRequired,
        grpcStatus: codes.FailedPrecondition,
        severity:   SeverityLow,
        timestamp:  time.Now(),
        stackTrace: getStackTrace(),
        retryable:  false,
    }
}
```

### Step 3: Use in Services
```go
// PaymentService using new error types
func (s *paymentService) ProcessPayment(ctx context.Context, req *PaymentRequest) (*Payment, error) {
    // Validate payment method
    if !s.isValidPaymentMethod(req.PaymentMethod) {
        return nil, NewInvalidInputError("payment_method", "Invalid payment method")
    }
    
    // Check account balance
    balance, err := s.getAccountBalance(ctx, req.AccountID)
    if err != nil {
        return nil, Wrap(err, "Failed to get account balance")
    }
    
    if balance < req.Amount {
        return nil, NewInsufficientFundsError(balance, req.Amount)
    }
    
    // Process payment
    payment, err := s.paymentGateway.ProcessPayment(ctx, req)
    if err != nil {
        if isDeclinedError(err) {
            return nil, NewPaymentFailedError("Payment was declined by the bank")
        }
        return nil, Wrap(err, "Payment processing failed")
    }
    
    return payment, nil
}
```

## Development Workflow

### 1. Error-First Development
```go
// 1. Define expected errors first
func (s *userService) UpdateUser(ctx context.Context, id string, req *UpdateUserRequest) (*User, error) {
    // Define all possible error scenarios
    // - User not found
    // - Validation errors
    // - Conflict errors (email already exists)
    // - Database errors
    
    // Implementation follows...
}

// 2. Write tests for error scenarios
func TestUserService_UpdateUser_Errors(t *testing.T) {
    tests := []struct {
        name          string
        userID        string
        request       *UpdateUserRequest
        mockSetup     func(*mocks.MockUserRepository)
        expectedError string
    }{
        {
            name:   "user not found",
            userID: "non-existent",
            request: &UpdateUserRequest{Email: "new@example.com"},
            mockSetup: func(repo *mocks.MockUserRepository) {
                repo.EXPECT().FindByID(gomock.Any(), "non-existent").Return(nil, NewNotFoundError("user"))
            },
            expectedError: ErrCodeNotFound,
        },
        // More test cases...
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Test implementation...
        })
    }
}
```

### 2. Error Documentation
```go
// Document all possible errors in service interfaces
type UserService interface {
    // GetUser retrieves a user by ID
    // 
    // Possible errors:
    // - ErrCodeInvalidInput: if id is empty
    // - ErrCodeNotFound: if user doesn't exist
    // - ErrCodeInternalError: for database or system errors
    GetUser(ctx context.Context, id string) (*User, error)
    
    // CreateUser creates a new user
    //
    // Possible errors:
    // - ErrCodeValidationFailed: if request validation fails
    // - ErrCodeConflict: if user with email already exists
    // - ErrCodeInternalError: for database or system errors
    CreateUser(ctx context.Context, req *CreateUserRequest) (*User, error)
}
```

### 3. Error Monitoring
```go
// Add error metrics and monitoring
type ErrorMetrics struct {
    ErrorCount    prometheus.CounterVec
    ErrorDuration prometheus.HistogramVec
}

func (m *ErrorMetrics) RecordError(err AppError) {
    labels := prometheus.Labels{
        "code":     err.Code(),
        "severity": err.Severity().String(),
        "retryable": fmt.Sprintf("%t", err.IsRetryable()),
    }
    
    m.ErrorCount.With(labels).Inc()
}
```

## Best Practices

### 1. Error Creation
```go
// ✅ Good: Specific, actionable error messages
func validateEmail(email string) error {
    if email == "" {
        return NewInvalidInputError("email", "Email address is required")
    }
    
    if !isValidEmailFormat(email) {
        return NewInvalidInputError("email", "Email address format is invalid")
    }
    
    return nil
}

// ❌ Bad: Generic, unhelpful error messages
func validateEmail(email string) error {
    if email == "" || !isValidEmailFormat(email) {
        return NewInvalidInputError("email", "Invalid email")
    }
    return nil
}
```

### 2. Error Propagation
```go
// ✅ Good: Preserve error context while adding information
func (s *userService) CreateUser(ctx context.Context, req *CreateUserRequest) (*User, error) {
    if err := s.repo.Create(ctx, user); err != nil {
        if GetErrorCode(err) == ErrCodeConflict {
            return nil, err // Preserve specific business error
        }
        return nil, Wrap(err, "Failed to create user").WithContext("email", req.Email)
    }
    return user, nil
}

// ❌ Bad: Losing error context
func (s *userService) CreateUser(ctx context.Context, req *CreateUserRequest) (*User, error) {
    if err := s.repo.Create(ctx, user); err != nil {
        return nil, NewInternalError("User creation failed") // Lost original error
    }
    return user, nil
}
```

### 3. Error Testing
```go
// Test error scenarios thoroughly
func TestErrorHandling(t *testing.T) {
    // Test error creation
    err := NewNotFoundError("user")
    assert.Equal(t, ErrCodeNotFound, err.Code())
    assert.Equal(t, http.StatusNotFound, err.HTTPStatus())
    
    // Test error wrapping
    originalErr := errors.New("database connection failed")
    wrappedErr := Wrap(originalErr, "Failed to get user")
    assert.Equal(t, originalErr, wrappedErr.Cause())
    
    // Test error response generation
    response := ToErrorResponse(err, "req-123")
    assert.Equal(t, ErrCodeNotFound, response.Error.Code)
    assert.Equal(t, "req-123", response.Error.RequestID)
}
```

The errors package provides a comprehensive foundation for error handling, ensuring consistent, informative, and actionable error responses throughout the application.