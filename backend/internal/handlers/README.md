# Handlers Package

## Overview

The `handlers` package implements HTTP request handlers for the Lumen backend application. It provides RESTful API endpoints, request/response processing, input validation, and integrates with business services to handle client requests.

## Purpose

- **HTTP API Endpoints**: RESTful API implementation for client applications
- **Request Processing**: HTTP request parsing, validation, and routing
- **Response Formatting**: Consistent JSON response formatting and error handling
- **Authentication Integration**: JWT token validation and user context management
- **Input Validation**: Request payload validation and sanitization
- **Middleware Integration**: Security, logging, and rate limiting middleware

## Dependencies

### External Dependencies
```go
// Core dependencies
"context"               // Context handling
"encoding/json"        // JSON serialization
"fmt"                   // String formatting
"net/http"             // HTTP server functionality
"strconv"               // String conversion
"time"                  // Time handling
"io"                    // I/O operations

// HTTP routing and middleware
"github.com/gorilla/mux"           // HTTP router
"github.com/gorilla/handlers"      // HTTP middleware
"github.com/rs/cors"               // CORS handling

// Validation and utilities
"github.com/go-playground/validator/v10" // Input validation
"github.com/google/uuid"                 // UUID generation
"github.com/pkg/errors"                  // Enhanced error handling
```

### Internal Dependencies
```go
"github.com/Srivathsav-max/lumen/backend/internal/services"   // Business services
"github.com/Srivathsav-max/lumen/backend/internal/errors"     // Error handling
"github.com/Srivathsav-max/lumen/backend/internal/logger"     // Logging services
"github.com/Srivathsav-max/lumen/backend/internal/middleware" // HTTP middleware
"github.com/Srivathsav-max/lumen/backend/internal/security"   // Security services
"github.com/Srivathsav-max/lumen/backend/internal/container"  // Dependency injection
```

## Handler Structure

### Base Handler
```go
type BaseHandler struct {
    logger    *logger.Logger
    validator *validator.Validate
    container *container.Container
}

func NewBaseHandler(logger *logger.Logger, container *container.Container) *BaseHandler {
    return &BaseHandler{
        logger:    logger,
        validator: validator.New(),
        container: container,
    }
}

// Common response structures
type APIResponse struct {
    Success   bool        `json:"success"`
    Data      interface{} `json:"data,omitempty"`
    Message   string      `json:"message,omitempty"`
    RequestID string      `json:"request_id,omitempty"`
    Timestamp time.Time   `json:"timestamp"`
}

type PaginatedResponse struct {
    APIResponse
    Pagination PaginationMeta `json:"pagination"`
}

type PaginationMeta struct {
    Page       int `json:"page"`
    Limit      int `json:"limit"`
    Total      int `json:"total"`
    TotalPages int `json:"total_pages"`
}
```

### Handler Factory
```go
type HandlerFactory struct {
    container *container.Container
    logger    *logger.Logger
}

func NewHandlerFactory(container *container.Container, logger *logger.Logger) *HandlerFactory {
    return &HandlerFactory{
        container: container,
        logger:    logger,
    }
}

// Handler creation methods
func (f *HandlerFactory) CreateAuthHandlers() (*AuthHandlers, error) {
    var authService services.AuthService
    if err := f.container.Resolve(&authService); err != nil {
        return nil, err
    }
    
    return NewAuthHandlers(authService, f.logger), nil
}

func (f *HandlerFactory) CreateUserHandlers() (*UserHandlers, error) {
    var userService services.UserService
    if err := f.container.Resolve(&userService); err != nil {
        return nil, err
    }
    
    return NewUserHandlers(userService, f.logger), nil
}
```

## Handler Implementations

### 1. Authentication Handlers

```go
type AuthHandlers struct {
    *BaseHandler
    authService services.AuthService
}

func NewAuthHandlers(authService services.AuthService, logger *logger.Logger) *AuthHandlers {
    return &AuthHandlers{
        BaseHandler: NewBaseHandler(logger, nil),
        authService: authService,
    }
}

// Login handles user authentication
func (h *AuthHandlers) Login(w http.ResponseWriter, r *http.Request) {
    var req LoginRequest
    if err := h.parseJSONRequest(r, &req); err != nil {
        h.writeErrorResponse(w, err, h.getRequestID(r))
        return
    }
    
    // Validate request
    if err := h.validator.Struct(&req); err != nil {
        validationErr := errors.NewValidationError(err.(validator.ValidationErrors))
        h.writeErrorResponse(w, validationErr, h.getRequestID(r))
        return
    }
    
    // Authenticate user
    authResponse, err := h.authService.Login(r.Context(), &services.LoginRequest{
        Email:    req.Email,
        Password: req.Password,
    })
    if err != nil {
        h.writeErrorResponse(w, err, h.getRequestID(r))
        return
    }
    
    // Set secure cookie for refresh token
    h.setRefreshTokenCookie(w, authResponse.RefreshToken)
    
    // Return response without refresh token
    response := LoginResponse{
        AccessToken: authResponse.AccessToken,
        ExpiresIn:   authResponse.ExpiresIn,
        User:        authResponse.User,
    }
    
    h.writeJSONResponse(w, http.StatusOK, response, "Login successful")
}

// Logout handles user logout
func (h *AuthHandlers) Logout(w http.ResponseWriter, r *http.Request) {
    // Get refresh token from cookie
    refreshToken := h.getRefreshTokenFromCookie(r)
    if refreshToken != "" {
        // Revoke refresh token
        if err := h.authService.RevokeToken(r.Context(), refreshToken); err != nil {
            h.logger.Warn("Failed to revoke refresh token", "error", err)
        }
    }
    
    // Clear refresh token cookie
    h.clearRefreshTokenCookie(w)
    
    h.writeJSONResponse(w, http.StatusOK, nil, "Logout successful")
}

// RefreshToken handles token refresh
func (h *AuthHandlers) RefreshToken(w http.ResponseWriter, r *http.Request) {
    refreshToken := h.getRefreshTokenFromCookie(r)
    if refreshToken == "" {
        h.writeErrorResponse(w, errors.NewUnauthorizedError("Refresh token not found"), h.getRequestID(r))
        return
    }
    
    tokenPair, err := h.authService.RefreshToken(r.Context(), refreshToken)
    if err != nil {
        h.clearRefreshTokenCookie(w)
        h.writeErrorResponse(w, err, h.getRequestID(r))
        return
    }
    
    // Set new refresh token cookie
    h.setRefreshTokenCookie(w, tokenPair.RefreshToken)
    
    response := RefreshTokenResponse{
        AccessToken: tokenPair.AccessToken,
        ExpiresIn:   tokenPair.ExpiresIn,
    }
    
    h.writeJSONResponse(w, http.StatusOK, response, "Token refreshed successfully")
}
```

### 2. User Handlers

```go
type UserHandlers struct {
    *BaseHandler
    userService services.UserService
}

func NewUserHandlers(userService services.UserService, logger *logger.Logger) *UserHandlers {
    return &UserHandlers{
        BaseHandler: NewBaseHandler(logger, nil),
        userService: userService,
    }
}

// GetProfile returns the current user's profile
func (h *UserHandlers) GetProfile(w http.ResponseWriter, r *http.Request) {
    userID := h.getUserIDFromContext(r.Context())
    if userID == "" {
        h.writeErrorResponse(w, errors.NewUnauthorizedError("User not authenticated"), h.getRequestID(r))
        return
    }
    
    user, err := h.userService.GetByID(r.Context(), userID)
    if err != nil {
        h.writeErrorResponse(w, err, h.getRequestID(r))
        return
    }
    
    response := UserProfileResponse{
        ID:        user.ID,
        Email:     user.Email,
        FirstName: user.FirstName,
        LastName:  user.LastName,
        CreatedAt: user.CreatedAt,
        UpdatedAt: user.UpdatedAt,
    }
    
    h.writeJSONResponse(w, http.StatusOK, response, "Profile retrieved successfully")
}

// UpdateProfile updates the current user's profile
func (h *UserHandlers) UpdateProfile(w http.ResponseWriter, r *http.Request) {
    userID := h.getUserIDFromContext(r.Context())
    if userID == "" {
        h.writeErrorResponse(w, errors.NewUnauthorizedError("User not authenticated"), h.getRequestID(r))
        return
    }
    
    var req UpdateProfileRequest
    if err := h.parseJSONRequest(r, &req); err != nil {
        h.writeErrorResponse(w, err, h.getRequestID(r))
        return
    }
    
    if err := h.validator.Struct(&req); err != nil {
        validationErr := errors.NewValidationError(err.(validator.ValidationErrors))
        h.writeErrorResponse(w, validationErr, h.getRequestID(r))
        return
    }
    
    updateReq := &services.UpdateUserRequest{
        ID:        userID,
        FirstName: req.FirstName,
        LastName:  req.LastName,
    }
    
    user, err := h.userService.Update(r.Context(), updateReq)
    if err != nil {
        h.writeErrorResponse(w, err, h.getRequestID(r))
        return
    }
    
    response := UserProfileResponse{
        ID:        user.ID,
        Email:     user.Email,
        FirstName: user.FirstName,
        LastName:  user.LastName,
        CreatedAt: user.CreatedAt,
        UpdatedAt: user.UpdatedAt,
    }
    
    h.writeJSONResponse(w, http.StatusOK, response, "Profile updated successfully")
}

// ListUsers returns a paginated list of users (admin only)
func (h *UserHandlers) ListUsers(w http.ResponseWriter, r *http.Request) {
    // Check admin permissions
    if !h.hasAdminRole(r.Context()) {
        h.writeErrorResponse(w, errors.NewForbiddenError("Admin access required"), h.getRequestID(r))
        return
    }
    
    // Parse query parameters
    filter := h.parseUserFilter(r)
    
    users, total, err := h.userService.List(r.Context(), filter)
    if err != nil {
        h.writeErrorResponse(w, err, h.getRequestID(r))
        return
    }
    
    // Convert to response format
    userResponses := make([]UserResponse, len(users))
    for i, user := range users {
        userResponses[i] = UserResponse{
            ID:        user.ID,
            Email:     user.Email,
            FirstName: user.FirstName,
            LastName:  user.LastName,
            IsActive:  user.IsActive,
            CreatedAt: user.CreatedAt,
        }
    }
    
    pagination := PaginationMeta{
        Page:       filter.Page,
        Limit:      filter.Limit,
        Total:      total,
        TotalPages: (total + filter.Limit - 1) / filter.Limit,
    }
    
    response := PaginatedResponse{
        APIResponse: APIResponse{
            Success:   true,
            Data:      userResponses,
            Message:   "Users retrieved successfully",
            RequestID: h.getRequestID(r),
            Timestamp: time.Now(),
        },
        Pagination: pagination,
    }
    
    h.writeJSONResponseWithStatus(w, http.StatusOK, response)
}
```

### 3. System Handlers

```go
type SystemHandlers struct {
    *BaseHandler
    systemService services.SystemService
}

func NewSystemHandlers(systemService services.SystemService, logger *logger.Logger) *SystemHandlers {
    return &SystemHandlers{
        BaseHandler:   NewBaseHandler(logger, nil),
        systemService: systemService,
    }
}

// Health returns the system health status
func (h *SystemHandlers) Health(w http.ResponseWriter, r *http.Request) {
    health, err := h.systemService.GetHealthStatus(r.Context())
    if err != nil {
        h.writeErrorResponse(w, err, h.getRequestID(r))
        return
    }
    
    status := http.StatusOK
    if health.Status != "healthy" {
        status = http.StatusServiceUnavailable
    }
    
    h.writeJSONResponse(w, status, health, "Health check completed")
}

// Metrics returns system metrics (admin only)
func (h *SystemHandlers) Metrics(w http.ResponseWriter, r *http.Request) {
    if !h.hasAdminRole(r.Context()) {
        h.writeErrorResponse(w, errors.NewForbiddenError("Admin access required"), h.getRequestID(r))
        return
    }
    
    metrics, err := h.systemService.GetMetrics(r.Context())
    if err != nil {
        h.writeErrorResponse(w, err, h.getRequestID(r))
        return
    }
    
    h.writeJSONResponse(w, http.StatusOK, metrics, "Metrics retrieved successfully")
}
```

## Request/Response Utilities

### 1. Request Parsing

```go
// parseJSONRequest parses JSON request body into a struct
func (h *BaseHandler) parseJSONRequest(r *http.Request, dest interface{}) error {
    if r.Body == nil {
        return errors.NewInvalidInputError("body", "Request body is required")
    }
    
    defer r.Body.Close()
    
    decoder := json.NewDecoder(r.Body)
    decoder.DisallowUnknownFields() // Strict JSON parsing
    
    if err := decoder.Decode(dest); err != nil {
        return errors.NewInvalidInputError("body", "Invalid JSON format")
    }
    
    return nil
}

// parseQueryParams parses query parameters with validation
func (h *BaseHandler) parseQueryParams(r *http.Request, dest interface{}) error {
    values := r.URL.Query()
    
    // Use reflection or a query parser library to populate dest
    // Implementation depends on specific requirements
    
    return nil
}

// getPathParam extracts path parameter from URL
func (h *BaseHandler) getPathParam(r *http.Request, key string) string {
    vars := mux.Vars(r)
    return vars[key]
}

// parseUserFilter parses user list filter parameters
func (h *UserHandlers) parseUserFilter(r *http.Request) *services.UserFilter {
    query := r.URL.Query()
    
    filter := &services.UserFilter{
        Page:  1,
        Limit: 20,
    }
    
    if page := query.Get("page"); page != "" {
        if p, err := strconv.Atoi(page); err == nil && p > 0 {
            filter.Page = p
        }
    }
    
    if limit := query.Get("limit"); limit != "" {
        if l, err := strconv.Atoi(limit); err == nil && l > 0 && l <= 100 {
            filter.Limit = l
        }
    }
    
    if search := query.Get("search"); search != "" {
        filter.Search = &search
    }
    
    if isActive := query.Get("is_active"); isActive != "" {
        if active, err := strconv.ParseBool(isActive); err == nil {
            filter.IsActive = &active
        }
    }
    
    return filter
}
```

### 2. Response Writing

```go
// writeJSONResponse writes a successful JSON response
func (h *BaseHandler) writeJSONResponse(w http.ResponseWriter, status int, data interface{}, message string) {
    response := APIResponse{
        Success:   true,
        Data:      data,
        Message:   message,
        Timestamp: time.Now(),
    }
    
    h.writeJSONResponseWithStatus(w, status, response)
}

// writeErrorResponse writes an error JSON response
func (h *BaseHandler) writeErrorResponse(w http.ResponseWriter, err error, requestID string) {
    // Log error
    if appErr, ok := err.(errors.AppError); ok {
        switch appErr.Severity() {
        case errors.SeverityLow:
            h.logger.Info("Request error", "error", err, "request_id", requestID)
        case errors.SeverityMedium:
            h.logger.Warn("Request warning", "error", err, "request_id", requestID)
        case errors.SeverityHigh, errors.SeverityCritical:
            h.logger.Error("Request error", "error", err, "request_id", requestID)
        }
    } else {
        h.logger.Error("Unexpected error", "error", err, "request_id", requestID)
    }
    
    // Generate error response
    errorResponse := errors.ToErrorResponse(err, requestID)
    httpStatus := errors.GetHTTPStatus(err)
    
    h.writeJSONResponseWithStatus(w, httpStatus, errorResponse)
}

// writeJSONResponseWithStatus writes a JSON response with specific status
func (h *BaseHandler) writeJSONResponseWithStatus(w http.ResponseWriter, status int, data interface{}) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(status)
    
    if err := json.NewEncoder(w).Encode(data); err != nil {
        h.logger.Error("Failed to encode JSON response", "error", err)
        http.Error(w, "Internal server error", http.StatusInternalServerError)
    }
}
```

### 3. Context Utilities

```go
// getUserIDFromContext extracts user ID from request context
func (h *BaseHandler) getUserIDFromContext(ctx context.Context) string {
    if userID, ok := ctx.Value("user_id").(string); ok {
        return userID
    }
    return ""
}

// getUserFromContext extracts user from request context
func (h *BaseHandler) getUserFromContext(ctx context.Context) *services.UserContext {
    if user, ok := ctx.Value("user").(*services.UserContext); ok {
        return user
    }
    return nil
}

// getRequestID extracts request ID from request
func (h *BaseHandler) getRequestID(r *http.Request) string {
    if requestID := r.Header.Get("X-Request-ID"); requestID != "" {
        return requestID
    }
    if requestID := r.Context().Value("request_id"); requestID != nil {
        if id, ok := requestID.(string); ok {
            return id
        }
    }
    return uuid.New().String()
}

// hasAdminRole checks if user has admin role
func (h *BaseHandler) hasAdminRole(ctx context.Context) bool {
    user := h.getUserFromContext(ctx)
    if user == nil {
        return false
    }
    
    for _, role := range user.Roles {
        if role == "admin" {
            return true
        }
    }
    return false
}
```

## Adding New Handlers

### Step 1: Define Request/Response Models

```go
// requests.go
type CreateProductRequest struct {
    Name        string  `json:"name" validate:"required,min=1,max=255"`
    Description string  `json:"description" validate:"max=1000"`
    Price       float64 `json:"price" validate:"required,min=0"`
    CategoryID  string  `json:"category_id" validate:"required,uuid"`
}

type UpdateProductRequest struct {
    Name        *string  `json:"name,omitempty" validate:"omitempty,min=1,max=255"`
    Description *string  `json:"description,omitempty" validate:"omitempty,max=1000"`
    Price       *float64 `json:"price,omitempty" validate:"omitempty,min=0"`
    CategoryID  *string  `json:"category_id,omitempty" validate:"omitempty,uuid"`
}

// responses.go
type ProductResponse struct {
    ID          string    `json:"id"`
    Name        string    `json:"name"`
    Description string    `json:"description"`
    Price       float64   `json:"price"`
    CategoryID  string    `json:"category_id"`
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
}
```

### Step 2: Implement Handler

```go
// product_handlers.go
type ProductHandlers struct {
    *BaseHandler
    productService services.ProductService
}

func NewProductHandlers(productService services.ProductService, logger *logger.Logger) *ProductHandlers {
    return &ProductHandlers{
        BaseHandler:    NewBaseHandler(logger, nil),
        productService: productService,
    }
}

func (h *ProductHandlers) CreateProduct(w http.ResponseWriter, r *http.Request) {
    var req CreateProductRequest
    if err := h.parseJSONRequest(r, &req); err != nil {
        h.writeErrorResponse(w, err, h.getRequestID(r))
        return
    }
    
    if err := h.validator.Struct(&req); err != nil {
        validationErr := errors.NewValidationError(err.(validator.ValidationErrors))
        h.writeErrorResponse(w, validationErr, h.getRequestID(r))
        return
    }
    
    serviceReq := &services.CreateProductRequest{
        Name:        req.Name,
        Description: req.Description,
        Price:       req.Price,
        CategoryID:  req.CategoryID,
    }
    
    product, err := h.productService.Create(r.Context(), serviceReq)
    if err != nil {
        h.writeErrorResponse(w, err, h.getRequestID(r))
        return
    }
    
    response := ProductResponse{
        ID:          product.ID,
        Name:        product.Name,
        Description: product.Description,
        Price:       product.Price,
        CategoryID:  product.CategoryID,
        CreatedAt:   product.CreatedAt,
        UpdatedAt:   product.UpdatedAt,
    }
    
    h.writeJSONResponse(w, http.StatusCreated, response, "Product created successfully")
}

func (h *ProductHandlers) GetProduct(w http.ResponseWriter, r *http.Request) {
    productID := h.getPathParam(r, "id")
    if productID == "" {
        h.writeErrorResponse(w, errors.NewInvalidInputError("id", "Product ID is required"), h.getRequestID(r))
        return
    }
    
    product, err := h.productService.GetByID(r.Context(), productID)
    if err != nil {
        h.writeErrorResponse(w, err, h.getRequestID(r))
        return
    }
    
    response := ProductResponse{
        ID:          product.ID,
        Name:        product.Name,
        Description: product.Description,
        Price:       product.Price,
        CategoryID:  product.CategoryID,
        CreatedAt:   product.CreatedAt,
        UpdatedAt:   product.UpdatedAt,
    }
    
    h.writeJSONResponse(w, http.StatusOK, response, "Product retrieved successfully")
}
```

### Step 3: Register Routes

```go
// In router package
func (r *Router) registerProductRoutes(productHandlers *handlers.ProductHandlers) {
    productRouter := r.router.PathPrefix("/api/v1/products").Subrouter()
    
    // Public routes
    productRouter.HandleFunc("", productHandlers.ListProducts).Methods("GET")
    productRouter.HandleFunc("/{id}", productHandlers.GetProduct).Methods("GET")
    
    // Protected routes
    protectedRouter := productRouter.PathPrefix("").Subrouter()
    protectedRouter.Use(r.authMiddleware.RequireAuth)
    
    protectedRouter.HandleFunc("", productHandlers.CreateProduct).Methods("POST")
    protectedRouter.HandleFunc("/{id}", productHandlers.UpdateProduct).Methods("PUT")
    protectedRouter.HandleFunc("/{id}", productHandlers.DeleteProduct).Methods("DELETE")
}
```

## Development Workflow

### 1. Handler Development Pattern

```bash
# 1. Define API specification (OpenAPI/Swagger)
vim api/openapi.yaml

# 2. Generate request/response models
go generate ./internal/handlers/...

# 3. Implement handler methods
vim internal/handlers/product_handlers.go

# 4. Write handler tests
vim internal/handlers/product_handlers_test.go

# 5. Register routes
vim internal/router/routes.go

# 6. Test endpoints
curl -X POST http://localhost:8080/api/v1/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Product","price":99.99}'
```

### 2. Testing Handlers

```go
// product_handlers_test.go
func TestProductHandlers_CreateProduct(t *testing.T) {
    // Setup
    mockService := &mocks.MockProductService{}
    logger := logger.NewNoop()
    handler := NewProductHandlers(mockService, logger)
    
    tests := []struct {
        name           string
        requestBody    string
        mockSetup      func(*mocks.MockProductService)
        expectedStatus int
        expectedError  string
    }{
        {
            name:        "successful creation",
            requestBody: `{"name":"Test Product","price":99.99,"category_id":"123e4567-e89b-12d3-a456-426614174000"}`,
            mockSetup: func(m *mocks.MockProductService) {
                m.EXPECT().Create(gomock.Any(), gomock.Any()).Return(&services.Product{
                    ID:    "product-123",
                    Name:  "Test Product",
                    Price: 99.99,
                }, nil)
            },
            expectedStatus: http.StatusCreated,
        },
        {
            name:           "validation error",
            requestBody:    `{"name":"","price":-1}`,
            mockSetup:      func(m *mocks.MockProductService) {},
            expectedStatus: http.StatusBadRequest,
            expectedError:  "VALIDATION_FAILED",
        },
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            tt.mockSetup(mockService)
            
            req := httptest.NewRequest("POST", "/api/v1/products", strings.NewReader(tt.requestBody))
            req.Header.Set("Content-Type", "application/json")
            
            rr := httptest.NewRecorder()
            handler.CreateProduct(rr, req)
            
            assert.Equal(t, tt.expectedStatus, rr.Code)
            
            if tt.expectedError != "" {
                var errorResponse errors.ErrorResponse
                err := json.Unmarshal(rr.Body.Bytes(), &errorResponse)
                require.NoError(t, err)
                assert.Equal(t, tt.expectedError, errorResponse.Error.Code)
            }
        })
    }
}
```

### 3. Integration Testing

```go
// integration_test.go
func TestProductAPI_Integration(t *testing.T) {
    // Setup test server
    testServer := setupTestServer(t)
    defer testServer.Close()
    
    client := &http.Client{}
    
    // Test create product
    createReq := CreateProductRequest{
        Name:       "Integration Test Product",
        Price:      149.99,
        CategoryID: "123e4567-e89b-12d3-a456-426614174000",
    }
    
    reqBody, _ := json.Marshal(createReq)
    resp, err := client.Post(testServer.URL+"/api/v1/products", "application/json", bytes.NewBuffer(reqBody))
    require.NoError(t, err)
    defer resp.Body.Close()
    
    assert.Equal(t, http.StatusCreated, resp.StatusCode)
    
    var createResp APIResponse
    err = json.NewDecoder(resp.Body).Decode(&createResp)
    require.NoError(t, err)
    
    assert.True(t, createResp.Success)
    assert.Equal(t, "Product created successfully", createResp.Message)
}
```

## Best Practices

### 1. Request Validation

```go
// ✅ Good: Comprehensive validation
type CreateUserRequest struct {
    Email     string `json:"email" validate:"required,email,max=255"`
    Password  string `json:"password" validate:"required,min=8,max=128"`
    FirstName string `json:"first_name" validate:"required,min=1,max=100"`
    LastName  string `json:"last_name" validate:"required,min=1,max=100"`
}

// Custom validation
func (h *UserHandlers) validateCreateUserRequest(req *CreateUserRequest) error {
    if err := h.validator.Struct(req); err != nil {
        return errors.NewValidationError(err.(validator.ValidationErrors))
    }
    
    // Additional business logic validation
    if !isStrongPassword(req.Password) {
        return errors.NewInvalidInputError("password", "Password must contain uppercase, lowercase, number, and special character")
    }
    
    return nil
}

// ❌ Bad: Minimal validation
type CreateUserRequest struct {
    Email    string `json:"email"`
    Password string `json:"password"`
    Name     string `json:"name"`
}
```

### 2. Error Handling

```go
// ✅ Good: Proper error handling and logging
func (h *UserHandlers) CreateUser(w http.ResponseWriter, r *http.Request) {
    var req CreateUserRequest
    if err := h.parseJSONRequest(r, &req); err != nil {
        h.writeErrorResponse(w, err, h.getRequestID(r))
        return
    }
    
    if err := h.validateCreateUserRequest(&req); err != nil {
        h.writeErrorResponse(w, err, h.getRequestID(r))
        return
    }
    
    user, err := h.userService.Create(r.Context(), &services.CreateUserRequest{
        Email:     req.Email,
        Password:  req.Password,
        FirstName: req.FirstName,
        LastName:  req.LastName,
    })
    if err != nil {
        h.writeErrorResponse(w, err, h.getRequestID(r))
        return
    }
    
    response := UserResponse{
        ID:        user.ID,
        Email:     user.Email,
        FirstName: user.FirstName,
        LastName:  user.LastName,
        CreatedAt: user.CreatedAt,
    }
    
    h.writeJSONResponse(w, http.StatusCreated, response, "User created successfully")
}

// ❌ Bad: Poor error handling
func (h *UserHandlers) CreateUser(w http.ResponseWriter, r *http.Request) {
    var req CreateUserRequest
    json.NewDecoder(r.Body).Decode(&req)
    
    user, err := h.userService.Create(r.Context(), &req)
    if err != nil {
        http.Error(w, "Error creating user", 500)
        return
    }
    
    json.NewEncoder(w).Encode(user)
}
```

### 3. Response Consistency

```go
// ✅ Good: Consistent response format
type APIResponse struct {
    Success   bool        `json:"success"`
    Data      interface{} `json:"data,omitempty"`
    Message   string      `json:"message,omitempty"`
    RequestID string      `json:"request_id,omitempty"`
    Timestamp time.Time   `json:"timestamp"`
}

// All responses follow the same structure
{
    "success": true,
    "data": {...},
    "message": "Operation completed successfully",
    "request_id": "req-123",
    "timestamp": "2023-01-01T00:00:00Z"
}

// ❌ Bad: Inconsistent response formats
// Sometimes: {"user": {...}}
// Sometimes: {"data": {...}, "status": "ok"}
// Sometimes: {...} (direct object)
```

The handlers package provides a robust foundation for HTTP API development, ensuring consistent request processing, proper error handling, and maintainable code structure.