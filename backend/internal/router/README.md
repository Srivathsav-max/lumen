# Router Package

## Overview

The `router` package implements HTTP routing and endpoint management for the Lumen backend application. It provides a centralized routing system with middleware integration, route grouping, parameter handling, and comprehensive request/response management.

## Purpose

- **HTTP Routing**: Define and manage API endpoints and routes
- **Middleware Integration**: Apply cross-cutting concerns like authentication, logging, and rate limiting
- **Route Grouping**: Organize related endpoints with shared middleware and prefixes
- **Parameter Handling**: Extract and validate path parameters, query parameters, and request bodies
- **Content Negotiation**: Handle different content types and response formats
- **API Versioning**: Support multiple API versions with backward compatibility
- **Documentation Integration**: Generate API documentation from route definitions

## Dependencies

### External Dependencies
```go
// HTTP routing and middleware
"net/http"                        // Standard HTTP library
"context"                         // Context handling
"encoding/json"                   // JSON encoding/decoding
"fmt"                             // String formatting
"strings"                         // String manipulation
"strconv"                         // String conversion
"time"                            // Time handling

// HTTP router (choose one)
"github.com/gorilla/mux"          // Gorilla Mux router
"github.com/gin-gonic/gin"        // Gin web framework
"github.com/labstack/echo/v4"     // Echo web framework
"github.com/go-chi/chi/v5"        // Chi router
"github.com/julienschmidt/httprouter" // HttpRouter

// Middleware libraries
"github.com/gorilla/handlers"     // CORS, logging middleware
"github.com/rs/cors"              // CORS middleware
"github.com/unrolled/secure"      // Security middleware

// Validation
"github.com/go-playground/validator/v10" // Request validation
"github.com/asaskevich/govalidator"       // Additional validation

// Documentation
"github.com/swaggo/swag"          // Swagger documentation
"github.com/swaggo/http-swagger"  // Swagger HTTP handler

// Utilities
"github.com/google/uuid"          // UUID handling
"github.com/pkg/errors"           // Enhanced error handling
```

### Internal Dependencies
```go
"github.com/Srivathsav-max/lumen/backend/internal/handlers"    // HTTP handlers
"github.com/Srivathsav-max/lumen/backend/internal/middleware"  // Custom middleware
"github.com/Srivathsav-max/lumen/backend/internal/logger"      // Logging services
"github.com/Srivathsav-max/lumen/backend/internal/errors"      // Error handling
"github.com/Srivathsav-max/lumen/backend/internal/config"      // Configuration
"github.com/Srivathsav-max/lumen/backend/internal/security"    // Security services
```

## Router Structure

### Core Router Interface
```go
// Router defines the main routing interface
type Router interface {
    // Route registration
    GET(path string, handler http.HandlerFunc, middleware ...MiddlewareFunc)
    POST(path string, handler http.HandlerFunc, middleware ...MiddlewareFunc)
    PUT(path string, handler http.HandlerFunc, middleware ...MiddlewareFunc)
    PATCH(path string, handler http.HandlerFunc, middleware ...MiddlewareFunc)
    DELETE(path string, handler http.HandlerFunc, middleware ...MiddlewareFunc)
    OPTIONS(path string, handler http.HandlerFunc, middleware ...MiddlewareFunc)
    
    // Route grouping
    Group(prefix string, middleware ...MiddlewareFunc) RouteGroup
    
    // Middleware management
    Use(middleware ...MiddlewareFunc)
    
    // Static file serving
    Static(path, root string)
    StaticFile(path, filepath string)
    
    // Server management
    Start(addr string) error
    Shutdown(ctx context.Context) error
    
    // Route information
    Routes() []RouteInfo
    Handler() http.Handler
}

// RouteGroup defines route grouping interface
type RouteGroup interface {
    GET(path string, handler http.HandlerFunc, middleware ...MiddlewareFunc)
    POST(path string, handler http.HandlerFunc, middleware ...MiddlewareFunc)
    PUT(path string, handler http.HandlerFunc, middleware ...MiddlewareFunc)
    PATCH(path string, handler http.HandlerFunc, middleware ...MiddlewareFunc)
    DELETE(path string, handler http.HandlerFunc, middleware ...MiddlewareFunc)
    OPTIONS(path string, handler http.HandlerFunc, middleware ...MiddlewareFunc)
    
    Group(prefix string, middleware ...MiddlewareFunc) RouteGroup
    Use(middleware ...MiddlewareFunc)
}

// MiddlewareFunc defines middleware function signature
type MiddlewareFunc func(http.Handler) http.Handler

// RouteInfo contains information about registered routes
type RouteInfo struct {
    Method      string            `json:"method"`
    Path        string            `json:"path"`
    Handler     string            `json:"handler"`
    Middleware  []string          `json:"middleware"`
    Description string            `json:"description,omitempty"`
    Tags        []string          `json:"tags,omitempty"`
    Parameters  []ParameterInfo   `json:"parameters,omitempty"`
}

type ParameterInfo struct {
    Name        string `json:"name"`
    Type        string `json:"type"`
    Location    string `json:"location"` // path, query, header, body
    Required    bool   `json:"required"`
    Description string `json:"description,omitempty"`
}
```

### Router Implementation
```go
// router implements the Router interface using Gorilla Mux
type router struct {
    mux        *mux.Router
    logger     logger.Logger
    config     *config.Config
    middleware []MiddlewareFunc
    routes     []RouteInfo
    server     *http.Server
}

// NewRouter creates a new router instance
func NewRouter(logger logger.Logger, config *config.Config) Router {
    r := &router{
        mux:        mux.NewRouter(),
        logger:     logger,
        config:     config,
        middleware: make([]MiddlewareFunc, 0),
        routes:     make([]RouteInfo, 0),
    }
    
    // Configure router
    r.mux.StrictSlash(true)
    r.mux.SkipClean(false)
    
    return r
}

// GET registers a GET route
func (r *router) GET(path string, handler http.HandlerFunc, middleware ...MiddlewareFunc) {
    r.registerRoute("GET", path, handler, middleware...)
}

// POST registers a POST route
func (r *router) POST(path string, handler http.HandlerFunc, middleware ...MiddlewareFunc) {
    r.registerRoute("POST", path, handler, middleware...)
}

// PUT registers a PUT route
func (r *router) PUT(path string, handler http.HandlerFunc, middleware ...MiddlewareFunc) {
    r.registerRoute("PUT", path, handler, middleware...)
}

// PATCH registers a PATCH route
func (r *router) PATCH(path string, handler http.HandlerFunc, middleware ...MiddlewareFunc) {
    r.registerRoute("PATCH", path, handler, middleware...)
}

// DELETE registers a DELETE route
func (r *router) DELETE(path string, handler http.HandlerFunc, middleware ...MiddlewareFunc) {
    r.registerRoute("DELETE", path, handler, middleware...)
}

// OPTIONS registers an OPTIONS route
func (r *router) OPTIONS(path string, handler http.HandlerFunc, middleware ...MiddlewareFunc) {
    r.registerRoute("OPTIONS", path, handler, middleware...)
}

// registerRoute registers a route with the specified method
func (r *router) registerRoute(method, path string, handler http.HandlerFunc, middleware ...MiddlewareFunc) {
    // Combine global and route-specific middleware
    allMiddleware := append(r.middleware, middleware...)
    
    // Wrap handler with middleware
    wrappedHandler := r.wrapWithMiddleware(handler, allMiddleware)
    
    // Register route
    r.mux.HandleFunc(path, wrappedHandler).Methods(method)
    
    // Store route info
    routeInfo := RouteInfo{
        Method:     method,
        Path:       path,
        Handler:    getFunctionName(handler),
        Middleware: getMiddlewareNames(allMiddleware),
    }
    r.routes = append(r.routes, routeInfo)
    
    r.logger.Debug("Route registered",
        "method", method,
        "path", path,
        "handler", routeInfo.Handler,
        "middleware_count", len(allMiddleware),
    )
}

// Group creates a route group with shared prefix and middleware
func (r *router) Group(prefix string, middleware ...MiddlewareFunc) RouteGroup {
    return &routeGroup{
        router:     r,
        prefix:     prefix,
        middleware: middleware,
    }
}

// Use adds global middleware
func (r *router) Use(middleware ...MiddlewareFunc) {
    r.middleware = append(r.middleware, middleware...)
}

// Static serves static files
func (r *router) Static(path, root string) {
    fileServer := http.FileServer(http.Dir(root))
    r.mux.PathPrefix(path).Handler(http.StripPrefix(path, fileServer))
    
    r.logger.Debug("Static route registered",
        "path", path,
        "root", root,
    )
}

// StaticFile serves a single static file
func (r *router) StaticFile(path, filepath string) {
    r.mux.HandleFunc(path, func(w http.ResponseWriter, req *http.Request) {
        http.ServeFile(w, req, filepath)
    })
    
    r.logger.Debug("Static file route registered",
        "path", path,
        "file", filepath,
    )
}

// Start starts the HTTP server
func (r *router) Start(addr string) error {
    r.server = &http.Server{
        Addr:         addr,
        Handler:      r.mux,
        ReadTimeout:  time.Duration(r.config.Server.ReadTimeout) * time.Second,
        WriteTimeout: time.Duration(r.config.Server.WriteTimeout) * time.Second,
        IdleTimeout:  time.Duration(r.config.Server.IdleTimeout) * time.Second,
    }
    
    r.logger.Info("Starting HTTP server",
        "addr", addr,
        "routes_count", len(r.routes),
    )
    
    return r.server.ListenAndServe()
}

// Shutdown gracefully shuts down the server
func (r *router) Shutdown(ctx context.Context) error {
    if r.server == nil {
        return nil
    }
    
    r.logger.Info("Shutting down HTTP server")
    return r.server.Shutdown(ctx)
}

// Routes returns information about all registered routes
func (r *router) Routes() []RouteInfo {
    return r.routes
}

// Handler returns the underlying HTTP handler
func (r *router) Handler() http.Handler {
    return r.mux
}

// wrapWithMiddleware wraps a handler with middleware chain
func (r *router) wrapWithMiddleware(handler http.HandlerFunc, middleware []MiddlewareFunc) http.HandlerFunc {
    // Apply middleware in reverse order (last middleware wraps first)
    wrapped := http.Handler(handler)
    for i := len(middleware) - 1; i >= 0; i-- {
        wrapped = middleware[i](wrapped)
    }
    return wrapped.ServeHTTP
}
```

### Route Group Implementation
```go
// routeGroup implements RouteGroup interface
type routeGroup struct {
    router     *router
    prefix     string
    middleware []MiddlewareFunc
}

// GET registers a GET route in the group
func (g *routeGroup) GET(path string, handler http.HandlerFunc, middleware ...MiddlewareFunc) {
    fullPath := g.prefix + path
    allMiddleware := append(g.middleware, middleware...)
    g.router.GET(fullPath, handler, allMiddleware...)
}

// POST registers a POST route in the group
func (g *routeGroup) POST(path string, handler http.HandlerFunc, middleware ...MiddlewareFunc) {
    fullPath := g.prefix + path
    allMiddleware := append(g.middleware, middleware...)
    g.router.POST(fullPath, handler, allMiddleware...)
}

// PUT registers a PUT route in the group
func (g *routeGroup) PUT(path string, handler http.HandlerFunc, middleware ...MiddlewareFunc) {
    fullPath := g.prefix + path
    allMiddleware := append(g.middleware, middleware...)
    g.router.PUT(fullPath, handler, allMiddleware...)
}

// PATCH registers a PATCH route in the group
func (g *routeGroup) PATCH(path string, handler http.HandlerFunc, middleware ...MiddlewareFunc) {
    fullPath := g.prefix + path
    allMiddleware := append(g.middleware, middleware...)
    g.router.PATCH(fullPath, handler, allMiddleware...)
}

// DELETE registers a DELETE route in the group
func (g *routeGroup) DELETE(path string, handler http.HandlerFunc, middleware ...MiddlewareFunc) {
    fullPath := g.prefix + path
    allMiddleware := append(g.middleware, middleware...)
    g.router.DELETE(fullPath, handler, allMiddleware...)
}

// OPTIONS registers an OPTIONS route in the group
func (g *routeGroup) OPTIONS(path string, handler http.HandlerFunc, middleware ...MiddlewareFunc) {
    fullPath := g.prefix + path
    allMiddleware := append(g.middleware, middleware...)
    g.router.OPTIONS(fullPath, handler, allMiddleware...)
}

// Group creates a nested route group
func (g *routeGroup) Group(prefix string, middleware ...MiddlewareFunc) RouteGroup {
    fullPrefix := g.prefix + prefix
    allMiddleware := append(g.middleware, middleware...)
    return &routeGroup{
        router:     g.router,
        prefix:     fullPrefix,
        middleware: allMiddleware,
    }
}

// Use adds middleware to the group
func (g *routeGroup) Use(middleware ...MiddlewareFunc) {
    g.middleware = append(g.middleware, middleware...)
}
```

## Route Registration Patterns

### 1. Basic Route Registration

```go
// SetupRoutes configures all application routes
func SetupRoutes(router Router, handlers *handlers.HandlerFactory, middleware *middleware.Manager) {
    // Global middleware
    router.Use(
        middleware.RequestID(),
        middleware.Logger(),
        middleware.Recovery(),
        middleware.CORS(),
        middleware.SecurityHeaders(),
    )
    
    // Health check routes
    router.GET("/health", handlers.System.HealthCheck)
    router.GET("/ready", handlers.System.ReadinessCheck)
    router.GET("/metrics", handlers.System.Metrics)
    
    // API versioning
    setupV1Routes(router, handlers, middleware)
    setupV2Routes(router, handlers, middleware)
    
    // Static files
    router.Static("/static/", "./web/static/")
    router.StaticFile("/favicon.ico", "./web/static/favicon.ico")
    
    // Documentation
    router.GET("/docs/*", handlers.System.SwaggerHandler)
}

// setupV1Routes configures version 1 API routes
func setupV1Routes(router Router, handlers *handlers.HandlerFactory, middleware *middleware.Manager) {
    v1 := router.Group("/api/v1")
    
    // Public routes (no authentication required)
    public := v1.Group("/public")
    public.POST("/auth/login", handlers.Auth.Login)
    public.POST("/auth/register", handlers.Auth.Register)
    public.POST("/auth/forgot-password", handlers.Auth.ForgotPassword)
    public.POST("/auth/reset-password", handlers.Auth.ResetPassword)
    public.GET("/auth/verify-email", handlers.Auth.VerifyEmail)
    
    // Waitlist routes
    public.POST("/waitlist", handlers.Waitlist.Join)
    public.GET("/waitlist/status", handlers.Waitlist.GetStatus)
    
    // Protected routes (authentication required)
    protected := v1.Group("/protected", middleware.JWTAuth())
    
    // User routes
    users := protected.Group("/users")
    users.GET("/profile", handlers.User.GetProfile)
    users.PUT("/profile", handlers.User.UpdateProfile)
    users.POST("/change-password", handlers.User.ChangePassword)
    users.DELETE("/account", handlers.User.DeleteAccount)
    
    // Admin routes (admin role required)
    admin := protected.Group("/admin", middleware.RequireRole("admin"))
    admin.GET("/users", handlers.User.ListUsers)
    admin.GET("/users/{id}", handlers.User.GetUser)
    admin.PUT("/users/{id}", handlers.User.UpdateUser)
    admin.DELETE("/users/{id}", handlers.User.DeleteUser)
    admin.GET("/analytics", handlers.System.GetAnalytics)
    
    // Rate limited routes
    rateLimited := protected.Group("/api", middleware.RateLimit(100, time.Hour))
    rateLimited.POST("/data/export", handlers.Data.Export)
    rateLimited.POST("/reports/generate", handlers.Reports.Generate)
}

// setupV2Routes configures version 2 API routes
func setupV2Routes(router Router, handlers *handlers.HandlerFactory, middleware *middleware.Manager) {
    v2 := router.Group("/api/v2")
    
    // Enhanced authentication with MFA
    auth := v2.Group("/auth")
    auth.POST("/login", handlers.Auth.LoginV2)
    auth.POST("/mfa/setup", handlers.Auth.SetupMFA, middleware.JWTAuth())
    auth.POST("/mfa/verify", handlers.Auth.VerifyMFA)
    
    // GraphQL endpoint
    v2.POST("/graphql", handlers.GraphQL.Handler, middleware.JWTAuth())
    v2.GET("/graphql/playground", handlers.GraphQL.Playground)
}

### Brainstormer Routes

Under `/api/v1/brainstrommer/` (authenticated):

- POST `/flashcards` → generate flashcards from uploaded knowledge context
- POST `/mcqs` → generate multiple-choice questions
- POST `/cloze` → generate fill-in-the-blank (cloze) items

Request body:

```
{
  "workspace_id": 123,
  "document_ids": ["uuid-1", "uuid-2"],
  "topics": ["algebra"],
  "difficulty": "medium",
  "num_items": 12
}
```

Each endpoint returns `{ "data": { "items": [...] } }` matching the DTOs in `services/dtos.go`.
```

### 2. Middleware Integration

```go
// Custom middleware for specific routes
func setupSpecialRoutes(router Router, handlers *handlers.HandlerFactory, middleware *middleware.Manager) {
    // File upload with size limit
    router.POST("/upload", handlers.File.Upload,
        middleware.JWTAuth(),
        middleware.MaxFileSize(10*1024*1024), // 10MB limit
        middleware.AllowedFileTypes("image/jpeg", "image/png", "application/pdf"),
    )
    
    // Webhook endpoint with signature verification
    router.POST("/webhooks/stripe", handlers.Webhook.Stripe,
        middleware.VerifyWebhookSignature("stripe"),
        middleware.RawBody(), // Preserve raw body for signature verification
    )
    
    // Real-time endpoints with WebSocket upgrade
    router.GET("/ws/notifications", handlers.WebSocket.Notifications,
        middleware.JWTAuth(),
        middleware.WebSocketUpgrade(),
    )
    
    // Cache-enabled routes
    router.GET("/api/public/stats", handlers.Public.GetStats,
        middleware.Cache(5*time.Minute),
        middleware.ETag(),
    )
    
    // Content negotiation
    router.GET("/api/data/export", handlers.Data.Export,
        middleware.JWTAuth(),
        middleware.ContentNegotiation("application/json", "text/csv", "application/xml"),
    )
}
```

### 3. Parameter Handling

```go
// Parameter extraction utilities
type ParamExtractor struct {
    logger logger.Logger
}

func NewParamExtractor(logger logger.Logger) *ParamExtractor {
    return &ParamExtractor{logger: logger}
}

// GetPathParam extracts path parameter
func (p *ParamExtractor) GetPathParam(r *http.Request, key string) (string, error) {
    vars := mux.Vars(r)
    value, exists := vars[key]
    if !exists {
        return "", errors.NewInvalidInputError(key, "Path parameter not found")
    }
    if value == "" {
        return "", errors.NewInvalidInputError(key, "Path parameter is empty")
    }
    return value, nil
}

// GetPathParamUUID extracts and validates UUID path parameter
func (p *ParamExtractor) GetPathParamUUID(r *http.Request, key string) (string, error) {
    value, err := p.GetPathParam(r, key)
    if err != nil {
        return "", err
    }
    
    if _, err := uuid.Parse(value); err != nil {
        return "", errors.NewInvalidInputError(key, "Invalid UUID format")
    }
    
    return value, nil
}

// GetQueryParam extracts query parameter with default value
func (p *ParamExtractor) GetQueryParam(r *http.Request, key, defaultValue string) string {
    value := r.URL.Query().Get(key)
    if value == "" {
        return defaultValue
    }
    return value
}

// GetQueryParamInt extracts integer query parameter
func (p *ParamExtractor) GetQueryParamInt(r *http.Request, key string, defaultValue int) (int, error) {
    value := r.URL.Query().Get(key)
    if value == "" {
        return defaultValue, nil
    }
    
    intValue, err := strconv.Atoi(value)
    if err != nil {
        return 0, errors.NewInvalidInputError(key, "Invalid integer value")
    }
    
    return intValue, nil
}

// GetQueryParamBool extracts boolean query parameter
func (p *ParamExtractor) GetQueryParamBool(r *http.Request, key string, defaultValue bool) (bool, error) {
    value := r.URL.Query().Get(key)
    if value == "" {
        return defaultValue, nil
    }
    
    boolValue, err := strconv.ParseBool(value)
    if err != nil {
        return false, errors.NewInvalidInputError(key, "Invalid boolean value")
    }
    
    return boolValue, nil
}

// ParsePaginationParams extracts pagination parameters
func (p *ParamExtractor) ParsePaginationParams(r *http.Request) (*PaginationParams, error) {
    page, err := p.GetQueryParamInt(r, "page", 1)
    if err != nil {
        return nil, err
    }
    
    limit, err := p.GetQueryParamInt(r, "limit", 20)
    if err != nil {
        return nil, err
    }
    
    // Validate limits
    if page < 1 {
        return nil, errors.NewInvalidInputError("page", "Page must be greater than 0")
    }
    
    if limit < 1 || limit > 100 {
        return nil, errors.NewInvalidInputError("limit", "Limit must be between 1 and 100")
    }
    
    return &PaginationParams{
        Page:   page,
        Limit:  limit,
        Offset: (page - 1) * limit,
    }, nil
}

type PaginationParams struct {
    Page   int `json:"page"`
    Limit  int `json:"limit"`
    Offset int `json:"offset"`
}

// ParseSortParams extracts sorting parameters
func (p *ParamExtractor) ParseSortParams(r *http.Request, allowedFields []string) (*SortParams, error) {
    sortBy := p.GetQueryParam(r, "sort_by", "created_at")
    sortOrder := p.GetQueryParam(r, "sort_order", "desc")
    
    // Validate sort field
    if !contains(allowedFields, sortBy) {
        return nil, errors.NewInvalidInputError("sort_by", fmt.Sprintf("Invalid sort field. Allowed: %v", allowedFields))
    }
    
    // Validate sort order
    if sortOrder != "asc" && sortOrder != "desc" {
        return nil, errors.NewInvalidInputError("sort_order", "Sort order must be 'asc' or 'desc'")
    }
    
    return &SortParams{
        Field: sortBy,
        Order: sortOrder,
    }, nil
}

type SortParams struct {
    Field string `json:"field"`
    Order string `json:"order"`
}

// ParseFilterParams extracts filter parameters
func (p *ParamExtractor) ParseFilterParams(r *http.Request) map[string]interface{} {
    filters := make(map[string]interface{})
    
    for key, values := range r.URL.Query() {
        if strings.HasPrefix(key, "filter_") {
            filterKey := strings.TrimPrefix(key, "filter_")
            if len(values) == 1 {
                filters[filterKey] = values[0]
            } else {
                filters[filterKey] = values
            }
        }
    }
    
    return filters
}

// Helper function
func contains(slice []string, item string) bool {
    for _, s := range slice {
        if s == item {
            return true
        }
    }
    return false
}
```

## Request/Response Utilities

### 1. Request Body Parsing

```go
// RequestParser handles request body parsing and validation
type RequestParser struct {
    validator *validator.Validate
    logger    logger.Logger
}

func NewRequestParser(logger logger.Logger) *RequestParser {
    return &RequestParser{
        validator: validator.New(),
        logger:    logger,
    }
}

// ParseJSON parses JSON request body
func (p *RequestParser) ParseJSON(r *http.Request, dest interface{}) error {
    if r.Body == nil {
        return errors.NewInvalidInputError("body", "Request body is required")
    }
    
    defer r.Body.Close()
    
    // Limit request body size
    r.Body = http.MaxBytesReader(nil, r.Body, 1024*1024) // 1MB limit
    
    decoder := json.NewDecoder(r.Body)
    decoder.DisallowUnknownFields() // Strict parsing
    
    if err := decoder.Decode(dest); err != nil {
        if err.Error() == "http: request body too large" {
            return errors.NewInvalidInputError("body", "Request body too large")
        }
        
        var syntaxError *json.SyntaxError
        var unmarshalTypeError *json.UnmarshalTypeError
        
        switch {
        case errors.As(err, &syntaxError):
            return errors.NewInvalidInputError("body", fmt.Sprintf("Invalid JSON at position %d", syntaxError.Offset))
        case errors.As(err, &unmarshalTypeError):
            return errors.NewInvalidInputError("body", fmt.Sprintf("Invalid type for field %s", unmarshalTypeError.Field))
        case strings.HasPrefix(err.Error(), "json: unknown field"):
            fieldName := strings.TrimPrefix(err.Error(), "json: unknown field ")
            return errors.NewInvalidInputError("body", fmt.Sprintf("Unknown field %s", fieldName))
        default:
            return errors.NewInvalidInputError("body", "Invalid JSON format")
        }
    }
    
    return nil
}

// ParseAndValidateJSON parses and validates JSON request body
func (p *RequestParser) ParseAndValidateJSON(r *http.Request, dest interface{}) error {
    if err := p.ParseJSON(r, dest); err != nil {
        return err
    }
    
    if err := p.validator.Struct(dest); err != nil {
        return p.formatValidationError(err)
    }
    
    return nil
}

// formatValidationError formats validation errors
func (p *RequestParser) formatValidationError(err error) error {
    var validationErrors []string
    
    for _, err := range err.(validator.ValidationErrors) {
        field := err.Field()
        tag := err.Tag()
        
        var message string
        switch tag {
        case "required":
            message = fmt.Sprintf("%s is required", field)
        case "email":
            message = fmt.Sprintf("%s must be a valid email address", field)
        case "min":
            message = fmt.Sprintf("%s must be at least %s characters", field, err.Param())
        case "max":
            message = fmt.Sprintf("%s must be at most %s characters", field, err.Param())
        case "uuid":
            message = fmt.Sprintf("%s must be a valid UUID", field)
        default:
            message = fmt.Sprintf("%s is invalid", field)
        }
        
        validationErrors = append(validationErrors, message)
    }
    
    return errors.NewValidationError(strings.Join(validationErrors, ", "))
}
```

### 2. Response Utilities

```go
// ResponseWriter handles HTTP responses
type ResponseWriter struct {
    logger logger.Logger
}

func NewResponseWriter(logger logger.Logger) *ResponseWriter {
    return &ResponseWriter{logger: logger}
}

// WriteJSON writes JSON response
func (rw *ResponseWriter) WriteJSON(w http.ResponseWriter, statusCode int, data interface{}) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(statusCode)
    
    if data != nil {
        if err := json.NewEncoder(w).Encode(data); err != nil {
            rw.logger.Error("Failed to encode JSON response", "error", err)
        }
    }
}

// WriteError writes error response
func (rw *ResponseWriter) WriteError(w http.ResponseWriter, err error) {
    var statusCode int
    var errorResponse interface{}
    
    switch e := err.(type) {
    case *errors.AppError:
        statusCode = e.HTTPStatusCode()
        errorResponse = map[string]interface{}{
            "error": map[string]interface{}{
                "code":    e.Code(),
                "message": e.Message(),
                "type":    e.Type(),
            },
        }
    default:
        statusCode = http.StatusInternalServerError
        errorResponse = map[string]interface{}{
            "error": map[string]interface{}{
                "code":    "INTERNAL_ERROR",
                "message": "An internal error occurred",
                "type":    "system",
            },
        }
    }
    
    rw.WriteJSON(w, statusCode, errorResponse)
}

// WriteSuccess writes success response with data
func (rw *ResponseWriter) WriteSuccess(w http.ResponseWriter, data interface{}) {
    response := map[string]interface{}{
        "success": true,
        "data":    data,
    }
    rw.WriteJSON(w, http.StatusOK, response)
}

// WriteCreated writes created response
func (rw *ResponseWriter) WriteCreated(w http.ResponseWriter, data interface{}) {
    response := map[string]interface{}{
        "success": true,
        "data":    data,
    }
    rw.WriteJSON(w, http.StatusCreated, response)
}

// WriteNoContent writes no content response
func (rw *ResponseWriter) WriteNoContent(w http.ResponseWriter) {
    w.WriteHeader(http.StatusNoContent)
}

// WritePaginated writes paginated response
func (rw *ResponseWriter) WritePaginated(w http.ResponseWriter, data interface{}, pagination *PaginationInfo) {
    response := map[string]interface{}{
        "success":    true,
        "data":       data,
        "pagination": pagination,
    }
    rw.WriteJSON(w, http.StatusOK, response)
}

type PaginationInfo struct {
    Page       int   `json:"page"`
    Limit      int   `json:"limit"`
    Total      int64 `json:"total"`
    TotalPages int   `json:"total_pages"`
    HasNext    bool  `json:"has_next"`
    HasPrev    bool  `json:"has_prev"`
}

// CalculatePagination calculates pagination info
func CalculatePagination(page, limit int, total int64) *PaginationInfo {
    totalPages := int((total + int64(limit) - 1) / int64(limit))
    
    return &PaginationInfo{
        Page:       page,
        Limit:      limit,
        Total:      total,
        TotalPages: totalPages,
        HasNext:    page < totalPages,
        HasPrev:    page > 1,
    }
}
```

## API Documentation Integration

### 1. Swagger Integration

```go
// SwaggerInfo holds API documentation metadata
type SwaggerInfo struct {
    Title       string `json:"title"`
    Description string `json:"description"`
    Version     string `json:"version"`
    Host        string `json:"host"`
    BasePath    string `json:"basePath"`
}

// SetupSwagger configures Swagger documentation
func SetupSwagger(router Router, info SwaggerInfo) {
    // Swagger JSON endpoint
    router.GET("/swagger/doc.json", func(w http.ResponseWriter, r *http.Request) {
        doc := generateSwaggerDoc(router.Routes(), info)
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(doc)
    })
    
    // Swagger UI
    router.GET("/swagger/*", func(w http.ResponseWriter, r *http.Request) {
        httpSwagger.WrapHandler(w, r)
    })
}

// generateSwaggerDoc generates Swagger documentation from routes
func generateSwaggerDoc(routes []RouteInfo, info SwaggerInfo) map[string]interface{} {
    doc := map[string]interface{}{
        "swagger": "2.0",
        "info": map[string]interface{}{
            "title":       info.Title,
            "description": info.Description,
            "version":     info.Version,
        },
        "host":     info.Host,
        "basePath": info.BasePath,
        "schemes":  []string{"http", "https"},
        "consumes": []string{"application/json"},
        "produces": []string{"application/json"},
        "paths":    generatePaths(routes),
    }
    
    return doc
}

// generatePaths generates Swagger paths from routes
func generatePaths(routes []RouteInfo) map[string]interface{} {
    paths := make(map[string]interface{})
    
    for _, route := range routes {
        if paths[route.Path] == nil {
            paths[route.Path] = make(map[string]interface{})
        }
        
        pathItem := paths[route.Path].(map[string]interface{})
        pathItem[strings.ToLower(route.Method)] = generateOperation(route)
    }
    
    return paths
}

// generateOperation generates Swagger operation from route
func generateOperation(route RouteInfo) map[string]interface{} {
    operation := map[string]interface{}{
        "summary":     route.Description,
        "operationId": route.Handler,
        "tags":        route.Tags,
        "parameters":  generateParameters(route.Parameters),
        "responses": map[string]interface{}{
            "200": map[string]interface{}{
                "description": "Success",
            },
            "400": map[string]interface{}{
                "description": "Bad Request",
            },
            "401": map[string]interface{}{
                "description": "Unauthorized",
            },
            "500": map[string]interface{}{
                "description": "Internal Server Error",
            },
        },
    }
    
    return operation
}

// generateParameters generates Swagger parameters
func generateParameters(params []ParameterInfo) []map[string]interface{} {
    var parameters []map[string]interface{}
    
    for _, param := range params {
        parameter := map[string]interface{}{
            "name":        param.Name,
            "in":          param.Location,
            "required":    param.Required,
            "type":        param.Type,
            "description": param.Description,
        }
        parameters = append(parameters, parameter)
    }
    
    return parameters
}
```

## Adding New Routes

### Step 1: Define Route Handler

```go
// ProductHandler handles product-related requests
type ProductHandler struct {
    productService services.ProductService
    paramExtractor *ParamExtractor
    responseWriter *ResponseWriter
    logger         logger.Logger
}

func NewProductHandler(
    productService services.ProductService,
    paramExtractor *ParamExtractor,
    responseWriter *ResponseWriter,
    logger logger.Logger,
) *ProductHandler {
    return &ProductHandler{
        productService: productService,
        paramExtractor: paramExtractor,
        responseWriter: responseWriter,
        logger:         logger,
    }
}

// GetProduct handles GET /api/v1/products/{id}
func (h *ProductHandler) GetProduct(w http.ResponseWriter, r *http.Request) {
    // Extract path parameter
    productID, err := h.paramExtractor.GetPathParamUUID(r, "id")
    if err != nil {
        h.responseWriter.WriteError(w, err)
        return
    }
    
    // Get product from service
    product, err := h.productService.GetByID(r.Context(), productID)
    if err != nil {
        h.responseWriter.WriteError(w, err)
        return
    }
    
    // Return success response
    h.responseWriter.WriteSuccess(w, product)
}

// ListProducts handles GET /api/v1/products
func (h *ProductHandler) ListProducts(w http.ResponseWriter, r *http.Request) {
    // Parse pagination parameters
    pagination, err := h.paramExtractor.ParsePaginationParams(r)
    if err != nil {
        h.responseWriter.WriteError(w, err)
        return
    }
    
    // Parse sort parameters
    sort, err := h.paramExtractor.ParseSortParams(r, []string{"name", "price", "created_at"})
    if err != nil {
        h.responseWriter.WriteError(w, err)
        return
    }
    
    // Parse filter parameters
    filters := h.paramExtractor.ParseFilterParams(r)
    
    // Get products from service
    products, total, err := h.productService.List(r.Context(), &services.ListProductsRequest{
        Pagination: pagination,
        Sort:       sort,
        Filters:    filters,
    })
    if err != nil {
        h.responseWriter.WriteError(w, err)
        return
    }
    
    // Calculate pagination info
    paginationInfo := CalculatePagination(pagination.Page, pagination.Limit, total)
    
    // Return paginated response
    h.responseWriter.WritePaginated(w, products, paginationInfo)
}

// CreateProduct handles POST /api/v1/products
func (h *ProductHandler) CreateProduct(w http.ResponseWriter, r *http.Request) {
    var req services.CreateProductRequest
    
    // Parse and validate request body
    if err := h.paramExtractor.ParseAndValidateJSON(r, &req); err != nil {
        h.responseWriter.WriteError(w, err)
        return
    }
    
    // Create product
    product, err := h.productService.Create(r.Context(), &req)
    if err != nil {
        h.responseWriter.WriteError(w, err)
        return
    }
    
    // Return created response
    h.responseWriter.WriteCreated(w, product)
}
```

### Step 2: Register Routes

```go
// RegisterProductRoutes registers product-related routes
func RegisterProductRoutes(router Router, handlers *handlers.HandlerFactory, middleware *middleware.Manager) {
    products := router.Group("/api/v1/products")
    
    // Public routes
    products.GET("", handlers.Product.ListProducts)
    products.GET("/{id}", handlers.Product.GetProduct)
    
    // Protected routes (authentication required)
    protected := products.Group("", middleware.JWTAuth())
    protected.POST("", handlers.Product.CreateProduct)
    protected.PUT("/{id}", handlers.Product.UpdateProduct)
    protected.DELETE("/{id}", handlers.Product.DeleteProduct)
    
    // Admin routes (admin role required)
    admin := protected.Group("", middleware.RequireRole("admin"))
    admin.GET("/analytics", handlers.Product.GetAnalytics)
    admin.POST("/bulk-import", handlers.Product.BulkImport)
}
```

### Step 3: Add to Main Router Setup

```go
// In main router setup function
func SetupAllRoutes(router Router, handlers *handlers.HandlerFactory, middleware *middleware.Manager) {
    // Existing routes
    setupV1Routes(router, handlers, middleware)
    
    // Add new product routes
    RegisterProductRoutes(router, handlers, middleware)
    
    // Other route registrations...
}
```

## Development Workflow

### 1. Route Development Pattern

```bash
# 1. Define handler interface
vim internal/handlers/interfaces.go

# 2. Implement handler
vim internal/handlers/product_handler.go

# 3. Add route registration
vim internal/router/product_routes.go

# 4. Update main router setup
vim internal/router/router.go

# 5. Write tests
vim internal/router/product_routes_test.go

# 6. Update documentation
vim docs/api/products.md

# 7. Run tests
go test ./internal/router/...
```

### 2. Testing Routes

```go
// product_routes_test.go
func TestProductRoutes(t *testing.T) {
    // Setup test router
    router := setupTestRouter(t)
    
    tests := []struct {
        name           string
        method         string
        path           string
        body           interface{}
        expectedStatus int
        expectedBody   string
    }{
        {
            name:           "Get product success",
            method:         "GET",
            path:           "/api/v1/products/123e4567-e89b-12d3-a456-426614174000",
            expectedStatus: http.StatusOK,
        },
        {
            name:           "Get product invalid UUID",
            method:         "GET",
            path:           "/api/v1/products/invalid-uuid",
            expectedStatus: http.StatusBadRequest,
        },
        {
            name:   "Create product success",
            method: "POST",
            path:   "/api/v1/products",
            body: map[string]interface{}{
                "name":        "Test Product",
                "description": "Test Description",
                "price":       99.99,
            },
            expectedStatus: http.StatusCreated,
        },
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            var body io.Reader
            if tt.body != nil {
                jsonBody, _ := json.Marshal(tt.body)
                body = bytes.NewReader(jsonBody)
            }
            
            req := httptest.NewRequest(tt.method, tt.path, body)
            if tt.body != nil {
                req.Header.Set("Content-Type", "application/json")
            }
            
            w := httptest.NewRecorder()
            router.Handler().ServeHTTP(w, req)
            
            assert.Equal(t, tt.expectedStatus, w.Code)
            
            if tt.expectedBody != "" {
                assert.Contains(t, w.Body.String(), tt.expectedBody)
            }
        })
    }
}

func setupTestRouter(t *testing.T) Router {
    logger := logger.NewNoop()
    config := &config.Config{}
    
    router := NewRouter(logger, config)
    
    // Setup test handlers and middleware
    handlers := setupTestHandlers(t)
    middleware := setupTestMiddleware(t)
    
    // Register routes
    RegisterProductRoutes(router, handlers, middleware)
    
    return router
}
```

## Best Practices

### 1. Route Organization

```go
// ✅ Good: Organized route groups with clear hierarchy
func setupAPIRoutes(router Router, handlers *handlers.HandlerFactory, middleware *middleware.Manager) {
    api := router.Group("/api")
    
    // Version 1
    v1 := api.Group("/v1")
    setupV1AuthRoutes(v1, handlers, middleware)
    setupV1UserRoutes(v1, handlers, middleware)
    setupV1ProductRoutes(v1, handlers, middleware)
    
    // Version 2
    v2 := api.Group("/v2")
    setupV2AuthRoutes(v2, handlers, middleware)
    setupV2UserRoutes(v2, handlers, middleware)
}

// ❌ Bad: Flat route registration without organization
func badSetupRoutes(router Router, handlers *handlers.HandlerFactory) {
    router.POST("/api/v1/auth/login", handlers.Auth.Login)
    router.POST("/api/v1/auth/register", handlers.Auth.Register)
    router.GET("/api/v1/users", handlers.User.List)
    router.POST("/api/v1/users", handlers.User.Create)
    router.GET("/api/v1/products", handlers.Product.List)
    // ... many more routes without clear organization
}
```

### 2. Middleware Application

```go
// ✅ Good: Strategic middleware application
func setupSecureRoutes(router Router, handlers *handlers.HandlerFactory, middleware *middleware.Manager) {
    // Global middleware for all routes
    router.Use(
        middleware.RequestID(),
        middleware.Logger(),
        middleware.Recovery(),
    )
    
    // Public API with rate limiting
    public := router.Group("/api/public", middleware.RateLimit(100, time.Hour))
    public.GET("/status", handlers.System.Status)
    
    // Protected API with authentication
    protected := router.Group("/api/protected", 
        middleware.JWTAuth(),
        middleware.RateLimit(1000, time.Hour),
    )
    protected.GET("/profile", handlers.User.GetProfile)
    
    // Admin API with role-based access
    admin := protected.Group("/admin", middleware.RequireRole("admin"))
    admin.GET("/users", handlers.User.ListAll)
}

// ❌ Bad: Inconsistent middleware application
func badSetupMiddleware(router Router, handlers *handlers.HandlerFactory, middleware *middleware.Manager) {
    // Some routes have auth, some don't, inconsistently applied
    router.GET("/api/users", handlers.User.List, middleware.JWTAuth())
    router.GET("/api/products", handlers.Product.List) // No auth
    router.POST("/api/users", handlers.User.Create) // No auth for creation?
    router.DELETE("/api/users/{id}", handlers.User.Delete, middleware.JWTAuth(), middleware.RequireRole("admin"))
}
```

### 3. Error Handling

```go
// ✅ Good: Consistent error handling
func (h *UserHandler) GetUser(w http.ResponseWriter, r *http.Request) {
    userID, err := h.paramExtractor.GetPathParamUUID(r, "id")
    if err != nil {
        h.responseWriter.WriteError(w, err)
        return
    }
    
    user, err := h.userService.GetByID(r.Context(), userID)
    if err != nil {
        h.responseWriter.WriteError(w, err)
        return
    }
    
    h.responseWriter.WriteSuccess(w, user)
}

// ❌ Bad: Inconsistent error handling
func badGetUser(w http.ResponseWriter, r *http.Request) {
    userID := mux.Vars(r)["id"]
    if userID == "" {
        http.Error(w, "Missing user ID", http.StatusBadRequest)
        return
    }
    
    user, err := userService.GetByID(r.Context(), userID)
    if err != nil {
        // Different error format
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
        return
    }
    
    // Different success format
    json.NewEncoder(w).Encode(user)
}
```

The router package provides a robust foundation for HTTP routing, ensuring consistent request handling, proper middleware integration, and maintainable route organization across the entire application.