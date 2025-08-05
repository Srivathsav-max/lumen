# Services Package

## Overview

The `services` package implements the business logic layer for the Lumen backend application. It contains all domain-specific business rules, orchestrates data operations through repositories, handles complex workflows, and provides a clean interface between the presentation layer (handlers) and data access layer (repositories).

## Purpose

- **Business Logic**: Implement core business rules and domain logic
- **Data Orchestration**: Coordinate operations across multiple repositories
- **Transaction Management**: Handle complex multi-step operations with proper transaction boundaries
- **Validation**: Perform business-level validation beyond basic input validation
- **External Integration**: Manage interactions with external services and APIs
- **Caching Strategy**: Implement intelligent caching for performance optimization
- **Event Handling**: Trigger and handle domain events and notifications

## Dependencies

### External Dependencies
```go
// Core libraries
"context"                         // Context handling
"time"                            // Time operations
"fmt"                             // String formatting
"strings"                         // String manipulation
"crypto/rand"                     // Cryptographic random generation
"encoding/json"                   // JSON operations

// Validation and utilities
"github.com/go-playground/validator/v10" // Struct validation
"github.com/google/uuid"          // UUID generation
"github.com/pkg/errors"           // Enhanced error handling

// Cryptography and security
"golang.org/x/crypto/bcrypt"      // Password hashing
"golang.org/x/crypto/argon2"      // Advanced password hashing
"crypto/subtle"                   // Constant-time comparisons

// Email and notifications
"github.com/sendgrid/sendgrid-go" // SendGrid email service
"github.com/mailgun/mailgun-go/v4" // Mailgun email service
"github.com/twilio/twilio-go"     // SMS notifications

// External APIs
"github.com/stripe/stripe-go/v74" // Payment processing
"github.com/aws/aws-sdk-go/v2"    // AWS services
"github.com/slack-go/slack"       // Slack integration

// Caching and queuing
"github.com/go-redis/redis/v8"    // Redis client
"github.com/hibiken/asynq"        // Background job processing

// Monitoring and observability
"github.com/prometheus/client_golang" // Metrics
"go.opentelemetry.io/otel"        // Distributed tracing
```

### Internal Dependencies
```go
"github.com/Srivathsav-max/lumen/backend/internal/repository"  // Data access layer
"github.com/Srivathsav-max/lumen/backend/internal/logger"      // Logging services
"github.com/Srivathsav-max/lumen/backend/internal/errors"      // Error handling
"github.com/Srivathsav-max/lumen/backend/internal/config"      // Configuration
"github.com/Srivathsav-max/lumen/backend/internal/security"    // Security services
"github.com/Srivathsav-max/lumen/backend/internal/database"    // Database utilities
```

## Service Architecture

### Base Service Interface
```go
// BaseService defines common service operations
type BaseService interface {
    // Health and status
    HealthCheck(ctx context.Context) error
    GetMetrics(ctx context.Context) (*ServiceMetrics, error)
    
    // Lifecycle management
    Start(ctx context.Context) error
    Stop(ctx context.Context) error
}

// ServiceMetrics contains service performance metrics
type ServiceMetrics struct {
    RequestCount    int64         `json:"request_count"`
    ErrorCount      int64         `json:"error_count"`
    AverageLatency  time.Duration `json:"average_latency"`
    CacheHitRate    float64       `json:"cache_hit_rate"`
    LastHealthCheck time.Time     `json:"last_health_check"`
}

// ServiceConfig contains common service configuration
type ServiceConfig struct {
    EnableCaching   bool          `json:"enable_caching"`
    CacheTTL        time.Duration `json:"cache_ttl"`
    EnableMetrics   bool          `json:"enable_metrics"`
    RateLimitRPS    int           `json:"rate_limit_rps"`
    TimeoutDuration time.Duration `json:"timeout_duration"`
}
```

### Base Service Implementation
```go
// baseService provides common service functionality
type baseService struct {
    logger     logger.Logger
    config     *ServiceConfig
    metrics    *ServiceMetrics
    startTime  time.Time
    isRunning  bool
    mu         sync.RWMutex
}

func newBaseService(logger logger.Logger, config *ServiceConfig) *baseService {
    return &baseService{
        logger:    logger,
        config:    config,
        metrics:   &ServiceMetrics{},
        startTime: time.Now(),
    }
}

// HealthCheck performs basic health check
func (s *baseService) HealthCheck(ctx context.Context) error {
    s.mu.Lock()
    defer s.mu.Unlock()
    
    if !s.isRunning {
        return errors.New("service is not running")
    }
    
    s.metrics.LastHealthCheck = time.Now()
    return nil
}

// GetMetrics returns current service metrics
func (s *baseService) GetMetrics(ctx context.Context) (*ServiceMetrics, error) {
    s.mu.RLock()
    defer s.mu.RUnlock()
    
    // Create a copy to avoid race conditions
    metrics := *s.metrics
    return &metrics, nil
}

// Start initializes the service
func (s *baseService) Start(ctx context.Context) error {
    s.mu.Lock()
    defer s.mu.Unlock()
    
    if s.isRunning {
        return errors.New("service is already running")
    }
    
    s.isRunning = true
    s.startTime = time.Now()
    
    s.logger.Info("Service started",
        "service", s.getServiceName(),
        "config", s.config,
    )
    
    return nil
}

// Stop gracefully shuts down the service
func (s *baseService) Stop(ctx context.Context) error {
    s.mu.Lock()
    defer s.mu.Unlock()
    
    if !s.isRunning {
        return nil
    }
    
    s.isRunning = false
    
    s.logger.Info("Service stopped",
        "service", s.getServiceName(),
        "uptime", time.Since(s.startTime),
    )
    
    return nil
}

// recordMetrics updates service metrics
func (s *baseService) recordMetrics(duration time.Duration, err error) {
    s.mu.Lock()
    defer s.mu.Unlock()
    
    s.metrics.RequestCount++
    if err != nil {
        s.metrics.ErrorCount++
    }
    
    // Update average latency using exponential moving average
    alpha := 0.1
    s.metrics.AverageLatency = time.Duration(float64(s.metrics.AverageLatency)*(1-alpha) + float64(duration)*alpha)
}

// withMetrics wraps a function call with metrics recording
func (s *baseService) withMetrics(ctx context.Context, operation string, fn func(ctx context.Context) error) error {
    start := time.Now()
    err := fn(ctx)
    duration := time.Since(start)
    
    s.recordMetrics(duration, err)
    
    if err != nil {
        s.logger.ErrorContext(ctx, "Service operation failed",
            "operation", operation,
            "duration", duration,
            "error", err,
        )
    } else {
        s.logger.DebugContext(ctx, "Service operation completed",
            "operation", operation,
            "duration", duration,
        )
    }
    
    return err
}

func (s *baseService) getServiceName() string {
    return reflect.TypeOf(s).Elem().Name()
}
```

## Core Services

### 1. User Service

```go
// UserService defines user management operations
type UserService interface {
    BaseService
    
    // User CRUD operations
    Create(ctx context.Context, req *CreateUserRequest) (*User, error)
    GetByID(ctx context.Context, userID string) (*User, error)
    GetByEmail(ctx context.Context, email string) (*User, error)
    Update(ctx context.Context, userID string, req *UpdateUserRequest) (*User, error)
    Delete(ctx context.Context, userID string) error
    
    // User listing and search
    List(ctx context.Context, req *ListUsersRequest) (*ListUsersResponse, error)
    Search(ctx context.Context, query string, limit int) ([]*User, error)
    
    // User status management
    Activate(ctx context.Context, userID string) error
    Deactivate(ctx context.Context, userID string) error
    VerifyEmail(ctx context.Context, userID string) error
    
    // Password management
    ChangePassword(ctx context.Context, userID string, req *ChangePasswordRequest) error
    ResetPassword(ctx context.Context, email string) error
    
    // User analytics
    GetUserStats(ctx context.Context) (*UserStats, error)
    GetUserActivity(ctx context.Context, userID string, limit int) ([]*UserActivity, error)
}

// Request/Response types
type CreateUserRequest struct {
    Email     string `json:"email" validate:"required,email"`
    Password  string `json:"password" validate:"required,min=8"`
    FirstName string `json:"first_name" validate:"required,min=2,max=50"`
    LastName  string `json:"last_name" validate:"required,min=2,max=50"`
    Role      string `json:"role,omitempty" validate:"omitempty,oneof=user admin"`
}

type UpdateUserRequest struct {
    FirstName *string `json:"first_name,omitempty" validate:"omitempty,min=2,max=50"`
    LastName  *string `json:"last_name,omitempty" validate:"omitempty,min=2,max=50"`
    Email     *string `json:"email,omitempty" validate:"omitempty,email"`
}

type ChangePasswordRequest struct {
    CurrentPassword string `json:"current_password" validate:"required"`
    NewPassword     string `json:"new_password" validate:"required,min=8"`
}

type ListUsersRequest struct {
    Page     int                    `json:"page" validate:"min=1"`
    Limit    int                    `json:"limit" validate:"min=1,max=100"`
    SortBy   string                 `json:"sort_by" validate:"omitempty,oneof=created_at email first_name last_name"`
    SortDir  string                 `json:"sort_dir" validate:"omitempty,oneof=asc desc"`
    Filters  map[string]interface{} `json:"filters,omitempty"`
    Search   string                 `json:"search,omitempty"`
}

type ListUsersResponse struct {
    Users      []*User            `json:"users"`
    Pagination *PaginationInfo    `json:"pagination"`
    Filters    map[string]interface{} `json:"applied_filters"`
}

type UserStats struct {
    TotalUsers       int64 `json:"total_users"`
    ActiveUsers      int64 `json:"active_users"`
    VerifiedUsers    int64 `json:"verified_users"`
    NewUsersToday    int64 `json:"new_users_today"`
    NewUsersThisWeek int64 `json:"new_users_this_week"`
    NewUsersThisMonth int64 `json:"new_users_this_month"`
}

type UserActivity struct {
    ID        string    `json:"id"`
    UserID    string    `json:"user_id"`
    Action    string    `json:"action"`
    Details   string    `json:"details"`
    IPAddress string    `json:"ip_address"`
    UserAgent string    `json:"user_agent"`
    CreatedAt time.Time `json:"created_at"`
}

// User entity
type User struct {
    ID           string     `json:"id"`
    Email        string     `json:"email"`
    FirstName    string     `json:"first_name"`
    LastName     string     `json:"last_name"`
    IsActive     bool       `json:"is_active"`
    IsVerified   bool       `json:"is_verified"`
    Role         string     `json:"role"`
    LastLoginAt  *time.Time `json:"last_login_at"`
    CreatedAt    time.Time  `json:"created_at"`
    UpdatedAt    time.Time  `json:"updated_at"`
}

// userService implements UserService
type userService struct {
    *baseService
    userRepo       repository.UserRepository
    roleRepo       repository.RoleRepository
    activityRepo   repository.UserActivityRepository
    emailService   EmailService
    passwordHasher PasswordHasher
    validator      *validator.Validate
    cache          CacheService
    eventBus       EventBus
}

// NewUserService creates a new user service
func NewUserService(
    logger logger.Logger,
    config *ServiceConfig,
    userRepo repository.UserRepository,
    roleRepo repository.RoleRepository,
    activityRepo repository.UserActivityRepository,
    emailService EmailService,
    passwordHasher PasswordHasher,
    cache CacheService,
    eventBus EventBus,
) UserService {
    return &userService{
        baseService:    newBaseService(logger, config),
        userRepo:       userRepo,
        roleRepo:       roleRepo,
        activityRepo:   activityRepo,
        emailService:   emailService,
        passwordHasher: passwordHasher,
        validator:      validator.New(),
        cache:          cache,
        eventBus:       eventBus,
    }
}

// Create creates a new user
func (s *userService) Create(ctx context.Context, req *CreateUserRequest) (*User, error) {
    return s.withMetricsResult(ctx, "create_user", func(ctx context.Context) (*User, error) {
        // Validate request
        if err := s.validator.Struct(req); err != nil {
            return nil, errors.NewValidationError("Invalid user data: " + err.Error())
        }
        
        // Check if user already exists
        existingUser, err := s.userRepo.GetByEmail(ctx, req.Email)
        if err != nil && !errors.IsNotFoundError(err) {
            return nil, errors.Wrap(err, "failed to check existing user")
        }
        if existingUser != nil {
            return nil, errors.NewConflictError("user", "email", "User with this email already exists")
        }
        
        // Hash password
        passwordHash, err := s.passwordHasher.Hash(req.Password)
        if err != nil {
            return nil, errors.Wrap(err, "failed to hash password")
        }
        
        // Create user entity
        user := &repository.User{
            ID:           uuid.New().String(),
            Email:        strings.ToLower(req.Email),
            PasswordHash: passwordHash,
            FirstName:    req.FirstName,
            LastName:     req.LastName,
            IsActive:     true,
            IsVerified:   false,
            CreatedAt:    time.Now(),
            UpdatedAt:    time.Now(),
        }
        
        // Set default role if not specified
        if req.Role == "" {
            req.Role = "user"
        }
        
        // Start transaction for user creation and role assignment
        err = s.userRepo.WithTransaction(ctx, func(ctx context.Context, tx repository.Transaction) error {
            // Create user
            if err := s.userRepo.WithTx(tx).Create(ctx, user); err != nil {
                return err
            }
            
            // Assign role
            role, err := s.roleRepo.WithTx(tx).GetByName(ctx, req.Role)
            if err != nil {
                return errors.Wrap(err, "failed to get role")
            }
            
            userRole := &repository.UserRole{
                UserID: user.ID,
                RoleID: role.ID,
            }
            
            if err := s.roleRepo.WithTx(tx).AssignUserRole(ctx, userRole); err != nil {
                return errors.Wrap(err, "failed to assign role")
            }
            
            return nil
        })
        
        if err != nil {
            return nil, errors.Wrap(err, "failed to create user")
        }
        
        // Convert to service model
        serviceUser := s.toServiceUser(user)
        serviceUser.Role = req.Role
        
        // Send welcome email asynchronously
        go func() {
            if err := s.emailService.SendWelcomeEmail(context.Background(), serviceUser); err != nil {
                s.logger.Error("Failed to send welcome email",
                    "user_id", user.ID,
                    "email", user.Email,
                    "error", err,
                )
            }
        }()
        
        // Record user activity
        s.recordUserActivity(ctx, user.ID, "user_created", "User account created", "")
        
        // Publish user created event
        s.eventBus.Publish(ctx, &UserCreatedEvent{
            UserID:    user.ID,
            Email:     user.Email,
            FirstName: user.FirstName,
            LastName:  user.LastName,
            CreatedAt: user.CreatedAt,
        })
        
        // Invalidate related caches
        s.cache.InvalidatePattern(ctx, "user:stats:*")
        
        return serviceUser, nil
    })
}

// GetByID retrieves a user by ID
func (s *userService) GetByID(ctx context.Context, userID string) (*User, error) {
    return s.withMetricsResult(ctx, "get_user_by_id", func(ctx context.Context) (*User, error) {
        // Validate UUID
        if _, err := uuid.Parse(userID); err != nil {
            return nil, errors.NewInvalidInputError("user_id", "Invalid user ID format")
        }
        
        // Try cache first
        cacheKey := fmt.Sprintf("user:id:%s", userID)
        var cachedUser User
        if s.cache.Get(ctx, cacheKey, &cachedUser) == nil {
            return &cachedUser, nil
        }
        
        // Get from repository
        repoUser, err := s.userRepo.GetByID(ctx, userID)
        if err != nil {
            return nil, err
        }
        
        // Get user role
        userRoles, err := s.roleRepo.GetUserRoles(ctx, userID)
        if err != nil {
            return nil, errors.Wrap(err, "failed to get user roles")
        }
        
        serviceUser := s.toServiceUser(repoUser)
        if len(userRoles) > 0 {
            serviceUser.Role = userRoles[0].Name // Assuming single role for simplicity
        }
        
        // Cache the result
        s.cache.Set(ctx, cacheKey, serviceUser, s.config.CacheTTL)
        
        return serviceUser, nil
    })
}

// Update updates a user
func (s *userService) Update(ctx context.Context, userID string, req *UpdateUserRequest) (*User, error) {
    return s.withMetricsResult(ctx, "update_user", func(ctx context.Context) (*User, error) {
        // Validate request
        if err := s.validator.Struct(req); err != nil {
            return nil, errors.NewValidationError("Invalid update data: " + err.Error())
        }
        
        // Get existing user
        existingUser, err := s.userRepo.GetByID(ctx, userID)
        if err != nil {
            return nil, err
        }
        
        // Check email uniqueness if email is being updated
        if req.Email != nil && *req.Email != existingUser.Email {
            emailUser, err := s.userRepo.GetByEmail(ctx, *req.Email)
            if err != nil && !errors.IsNotFoundError(err) {
                return nil, errors.Wrap(err, "failed to check email uniqueness")
            }
            if emailUser != nil {
                return nil, errors.NewConflictError("user", "email", "Email already in use")
            }
        }
        
        // Update fields
        updatedUser := *existingUser
        if req.FirstName != nil {
            updatedUser.FirstName = *req.FirstName
        }
        if req.LastName != nil {
            updatedUser.LastName = *req.LastName
        }
        if req.Email != nil {
            updatedUser.Email = strings.ToLower(*req.Email)
            updatedUser.IsVerified = false // Reset verification if email changed
        }
        updatedUser.UpdatedAt = time.Now()
        
        // Update in repository
        if err := s.userRepo.Update(ctx, &updatedUser); err != nil {
            return nil, errors.Wrap(err, "failed to update user")
        }
        
        // Convert to service model
        serviceUser := s.toServiceUser(&updatedUser)
        
        // Record activity
        s.recordUserActivity(ctx, userID, "user_updated", "User profile updated", "")
        
        // Invalidate caches
        s.cache.Delete(ctx, fmt.Sprintf("user:id:%s", userID))
        if req.Email != nil {
            s.cache.Delete(ctx, fmt.Sprintf("user:email:%s", existingUser.Email))
        }
        
        // Publish user updated event
        s.eventBus.Publish(ctx, &UserUpdatedEvent{
            UserID:    userID,
            Changes:   req,
            UpdatedAt: updatedUser.UpdatedAt,
        })
        
        return serviceUser, nil
    })
}

// ChangePassword changes a user's password
func (s *userService) ChangePassword(ctx context.Context, userID string, req *ChangePasswordRequest) error {
    return s.withMetrics(ctx, "change_password", func(ctx context.Context) error {
        // Validate request
        if err := s.validator.Struct(req); err != nil {
            return errors.NewValidationError("Invalid password change data: " + err.Error())
        }
        
        // Get user with password
        user, err := s.userRepo.GetByIDWithPassword(ctx, userID)
        if err != nil {
            return err
        }
        
        // Verify current password
        if !s.passwordHasher.Verify(req.CurrentPassword, user.PasswordHash) {
            return errors.NewUnauthorizedError("Current password is incorrect")
        }
        
        // Hash new password
        newPasswordHash, err := s.passwordHasher.Hash(req.NewPassword)
        if err != nil {
            return errors.Wrap(err, "failed to hash new password")
        }
        
        // Update password
        if err := s.userRepo.UpdatePassword(ctx, userID, newPasswordHash); err != nil {
            return errors.Wrap(err, "failed to update password")
        }
        
        // Record activity
        s.recordUserActivity(ctx, userID, "password_changed", "User password changed", "")
        
        // Send notification email
        go func() {
            serviceUser := s.toServiceUser(user)
            if err := s.emailService.SendPasswordChangedNotification(context.Background(), serviceUser); err != nil {
                s.logger.Error("Failed to send password change notification",
                    "user_id", userID,
                    "error", err,
                )
            }
        }()
        
        return nil
    })
}

// List retrieves users with filtering and pagination
func (s *userService) List(ctx context.Context, req *ListUsersRequest) (*ListUsersResponse, error) {
    return s.withMetricsResult(ctx, "list_users", func(ctx context.Context) (*ListUsersResponse, error) {
        // Validate request
        if err := s.validator.Struct(req); err != nil {
            return nil, errors.NewValidationError("Invalid list request: " + err.Error())
        }
        
        // Set defaults
        if req.Page == 0 {
            req.Page = 1
        }
        if req.Limit == 0 {
            req.Limit = 20
        }
        if req.SortBy == "" {
            req.SortBy = "created_at"
        }
        if req.SortDir == "" {
            req.SortDir = "desc"
        }
        
        // Build repository filter
        repoFilter := &repository.ListFilter{
            Limit:   req.Limit,
            Offset:  (req.Page - 1) * req.Limit,
            OrderBy: req.SortBy,
            OrderDir: req.SortDir,
            Filters: req.Filters,
        }
        
        if req.Search != "" {
            repoFilter.Search = &req.Search
        }
        
        // Get users from repository
        repoUsers, err := s.userRepo.List(ctx, repoFilter)
        if err != nil {
            return nil, errors.Wrap(err, "failed to list users")
        }
        
        // Get total count
        countFilter := &repository.CountFilter{
            Filters: req.Filters,
        }
        if req.Search != "" {
            countFilter.Search = &req.Search
        }
        
        total, err := s.userRepo.Count(ctx, countFilter)
        if err != nil {
            return nil, errors.Wrap(err, "failed to count users")
        }
        
        // Convert to service models
        users := make([]*User, len(repoUsers))
        for i, repoUser := range repoUsers {
            users[i] = s.toServiceUser(repoUser)
        }
        
        // Calculate pagination
        totalPages := int((total + int64(req.Limit) - 1) / int64(req.Limit))
        pagination := &PaginationInfo{
            Page:       req.Page,
            Limit:      req.Limit,
            Total:      total,
            TotalPages: totalPages,
            HasNext:    req.Page < totalPages,
            HasPrev:    req.Page > 1,
        }
        
        return &ListUsersResponse{
            Users:      users,
            Pagination: pagination,
            Filters:    req.Filters,
        }, nil
    })
}

// GetUserStats retrieves user statistics
func (s *userService) GetUserStats(ctx context.Context) (*UserStats, error) {
    return s.withMetricsResult(ctx, "get_user_stats", func(ctx context.Context) (*UserStats, error) {
        // Try cache first
        cacheKey := "user:stats:all"
        var cachedStats UserStats
        if s.cache.Get(ctx, cacheKey, &cachedStats) == nil {
            return &cachedStats, nil
        }
        
        // Get from repository
        repoStats, err := s.userRepo.GetUserStats(ctx)
        if err != nil {
            return nil, errors.Wrap(err, "failed to get user stats")
        }
        
        stats := &UserStats{
            TotalUsers:        repoStats.TotalUsers,
            ActiveUsers:       repoStats.ActiveUsers,
            VerifiedUsers:     repoStats.VerifiedUsers,
            NewUsersToday:     repoStats.NewUsersToday,
            NewUsersThisWeek:  repoStats.NewUsersThisWeek,
            NewUsersThisMonth: repoStats.NewUsersThisMonth,
        }
        
        // Cache the result
        s.cache.Set(ctx, cacheKey, stats, 5*time.Minute)
        
        return stats, nil
    })
}

// Helper methods
func (s *userService) toServiceUser(repoUser *repository.User) *User {
    return &User{
        ID:          repoUser.ID,
        Email:       repoUser.Email,
        FirstName:   repoUser.FirstName,
        LastName:    repoUser.LastName,
        IsActive:    repoUser.IsActive,
        IsVerified:  repoUser.IsVerified,
        LastLoginAt: repoUser.LastLoginAt,
        CreatedAt:   repoUser.CreatedAt,
        UpdatedAt:   repoUser.UpdatedAt,
    }
}

func (s *userService) recordUserActivity(ctx context.Context, userID, action, details, ipAddress string) {
    activity := &repository.UserActivity{
        ID:        uuid.New().String(),
        UserID:    userID,
        Action:    action,
        Details:   details,
        IPAddress: ipAddress,
        CreatedAt: time.Now(),
    }
    
    go func() {
        if err := s.activityRepo.Create(context.Background(), activity); err != nil {
            s.logger.Error("Failed to record user activity",
                "user_id", userID,
                "action", action,
                "error", err,
            )
        }
    }()
}

// withMetricsResult wraps a function that returns a result with metrics recording
func (s *userService) withMetricsResult[T any](ctx context.Context, operation string, fn func(ctx context.Context) (T, error)) (T, error) {
    start := time.Now()
    result, err := fn(ctx)
    duration := time.Since(start)
    
    s.recordMetrics(duration, err)
    
    if err != nil {
        s.logger.ErrorContext(ctx, "Service operation failed",
            "operation", operation,
            "duration", duration,
            "error", err,
        )
    } else {
        s.logger.DebugContext(ctx, "Service operation completed",
            "operation", operation,
            "duration", duration,
        )
    }
    
    return result, err
}
```

### 2. Authentication Service

```go
// AuthService defines authentication operations
type AuthService interface {
    BaseService
    
    // Authentication
    Login(ctx context.Context, req *LoginRequest) (*AuthResponse, error)
    Logout(ctx context.Context, userID string, tokenID string) error
    RefreshToken(ctx context.Context, refreshToken string) (*TokenPair, error)
    
    // Registration
    Register(ctx context.Context, req *RegisterRequest) (*AuthResponse, error)
    VerifyEmail(ctx context.Context, token string) error
    ResendVerification(ctx context.Context, email string) error
    
    // Password reset
    ForgotPassword(ctx context.Context, email string) error
    ResetPassword(ctx context.Context, token string, newPassword string) error
    
    // Token management
    ValidateToken(ctx context.Context, token string) (*TokenClaims, error)
    RevokeToken(ctx context.Context, tokenID string) error
    RevokeAllUserTokens(ctx context.Context, userID string) error
    
    // Multi-factor authentication
    SetupMFA(ctx context.Context, userID string) (*MFASetupResponse, error)
    VerifyMFA(ctx context.Context, userID string, code string) error
    DisableMFA(ctx context.Context, userID string) error
}

// Request/Response types
type LoginRequest struct {
    Email    string `json:"email" validate:"required,email"`
    Password string `json:"password" validate:"required"`
    MFACode  string `json:"mfa_code,omitempty"`
}

type RegisterRequest struct {
    Email     string `json:"email" validate:"required,email"`
    Password  string `json:"password" validate:"required,min=8"`
    FirstName string `json:"first_name" validate:"required,min=2,max=50"`
    LastName  string `json:"last_name" validate:"required,min=2,max=50"`
}

type AuthResponse struct {
    User         *User      `json:"user"`
    TokenPair    *TokenPair `json:"tokens"`
    RequiresMFA  bool       `json:"requires_mfa"`
    MFAChallenge string     `json:"mfa_challenge,omitempty"`
}

type TokenPair struct {
    AccessToken  string    `json:"access_token"`
    RefreshToken string    `json:"refresh_token"`
    ExpiresAt    time.Time `json:"expires_at"`
}

type TokenClaims struct {
    UserID    string    `json:"user_id"`
    Email     string    `json:"email"`
    Role      string    `json:"role"`
    TokenID   string    `json:"token_id"`
    IssuedAt  time.Time `json:"issued_at"`
    ExpiresAt time.Time `json:"expires_at"`
}

type MFASetupResponse struct {
    Secret    string   `json:"secret"`
    QRCode    string   `json:"qr_code"`
    BackupCodes []string `json:"backup_codes"`
}

// authService implements AuthService
type authService struct {
    *baseService
    userService    UserService
    tokenService   security.JWTService
    userRepo       repository.UserRepository
    tokenRepo      repository.TokenRepository
    emailService   EmailService
    passwordHasher PasswordHasher
    mfaService     MFAService
    validator      *validator.Validate
    cache          CacheService
    eventBus       EventBus
    config         *AuthConfig
}

type AuthConfig struct {
    TokenExpiry        time.Duration `json:"token_expiry"`
    RefreshTokenExpiry time.Duration `json:"refresh_token_expiry"`
    MaxLoginAttempts   int           `json:"max_login_attempts"`
    LockoutDuration    time.Duration `json:"lockout_duration"`
    RequireEmailVerification bool    `json:"require_email_verification"`
    EnableMFA          bool          `json:"enable_mfa"`
}

// NewAuthService creates a new authentication service
func NewAuthService(
    logger logger.Logger,
    serviceConfig *ServiceConfig,
    authConfig *AuthConfig,
    userService UserService,
    tokenService security.JWTService,
    userRepo repository.UserRepository,
    tokenRepo repository.TokenRepository,
    emailService EmailService,
    passwordHasher PasswordHasher,
    mfaService MFAService,
    cache CacheService,
    eventBus EventBus,
) AuthService {
    return &authService{
        baseService:    newBaseService(logger, serviceConfig),
        userService:    userService,
        tokenService:   tokenService,
        userRepo:       userRepo,
        tokenRepo:      tokenRepo,
        emailService:   emailService,
        passwordHasher: passwordHasher,
        mfaService:     mfaService,
        validator:      validator.New(),
        cache:          cache,
        eventBus:       eventBus,
        config:         authConfig,
    }
}

// Login authenticates a user and returns tokens
func (s *authService) Login(ctx context.Context, req *LoginRequest) (*AuthResponse, error) {
    return s.withMetricsResult(ctx, "login", func(ctx context.Context) (*AuthResponse, error) {
        // Validate request
        if err := s.validator.Struct(req); err != nil {
            return nil, errors.NewValidationError("Invalid login data: " + err.Error())
        }
        
        // Check rate limiting
        if err := s.checkLoginRateLimit(ctx, req.Email); err != nil {
            return nil, err
        }
        
        // Get user with password
        user, err := s.userRepo.GetByEmailWithPassword(ctx, req.Email)
        if err != nil {
            if errors.IsNotFoundError(err) {
                s.recordFailedLogin(ctx, req.Email, "user_not_found")
                return nil, errors.NewUnauthorizedError("Invalid email or password")
            }
            return nil, errors.Wrap(err, "failed to get user")
        }
        
        // Check if user is active
        if !user.IsActive {
            s.recordFailedLogin(ctx, req.Email, "user_inactive")
            return nil, errors.NewUnauthorizedError("Account is deactivated")
        }
        
        // Verify password
        if !s.passwordHasher.Verify(req.Password, user.PasswordHash) {
            s.recordFailedLogin(ctx, req.Email, "invalid_password")
            return nil, errors.NewUnauthorizedError("Invalid email or password")
        }
        
        // Check email verification if required
        if s.config.RequireEmailVerification && !user.IsVerified {
            return nil, errors.NewUnauthorizedError("Email verification required")
        }
        
        // Check MFA if enabled
        if s.config.EnableMFA && s.userHasMFA(ctx, user.ID) {
            if req.MFACode == "" {
                // Return MFA challenge
                challenge := s.generateMFAChallenge(ctx, user.ID)
                return &AuthResponse{
                    RequiresMFA:  true,
                    MFAChallenge: challenge,
                }, nil
            }
            
            // Verify MFA code
            if err := s.mfaService.VerifyCode(ctx, user.ID, req.MFACode); err != nil {
                s.recordFailedLogin(ctx, req.Email, "invalid_mfa")
                return nil, errors.NewUnauthorizedError("Invalid MFA code")
            }
        }
        
        // Generate tokens
        tokenPair, err := s.generateTokenPair(ctx, user)
        if err != nil {
            return nil, errors.Wrap(err, "failed to generate tokens")
        }
        
        // Update last login
        if err := s.userRepo.UpdateLastLogin(ctx, user.ID); err != nil {
            s.logger.Warn("Failed to update last login", "user_id", user.ID, "error", err)
        }
        
        // Convert to service user
        serviceUser := s.userService.toServiceUser(user)
        
        // Record successful login
        s.recordSuccessfulLogin(ctx, user.ID, req.Email)
        
        // Clear rate limit
        s.clearLoginRateLimit(ctx, req.Email)
        
        // Publish login event
        s.eventBus.Publish(ctx, &UserLoginEvent{
            UserID:    user.ID,
            Email:     user.Email,
            LoginAt:   time.Now(),
            IPAddress: s.getClientIP(ctx),
            UserAgent: s.getUserAgent(ctx),
        })
        
        return &AuthResponse{
            User:      serviceUser,
            TokenPair: tokenPair,
        }, nil
    })
}

// Register creates a new user account
func (s *authService) Register(ctx context.Context, req *RegisterRequest) (*AuthResponse, error) {
    return s.withMetricsResult(ctx, "register", func(ctx context.Context) (*AuthResponse, error) {
        // Validate request
        if err := s.validator.Struct(req); err != nil {
            return nil, errors.NewValidationError("Invalid registration data: " + err.Error())
        }
        
        // Create user through user service
        createUserReq := &CreateUserRequest{
            Email:     req.Email,
            Password:  req.Password,
            FirstName: req.FirstName,
            LastName:  req.LastName,
            Role:      "user",
        }
        
        user, err := s.userService.Create(ctx, createUserReq)
        if err != nil {
            return nil, err
        }
        
        // Send verification email if required
        if s.config.RequireEmailVerification {
            if err := s.sendVerificationEmail(ctx, user); err != nil {
                s.logger.Error("Failed to send verification email",
                    "user_id", user.ID,
                    "email", user.Email,
                    "error", err,
                )
            }
            
            // Return without tokens if verification is required
            return &AuthResponse{
                User: user,
            }, nil
        }
        
        // Generate tokens if verification is not required
        repoUser, err := s.userRepo.GetByID(ctx, user.ID)
        if err != nil {
            return nil, errors.Wrap(err, "failed to get created user")
        }
        
        tokenPair, err := s.generateTokenPair(ctx, repoUser)
        if err != nil {
            return nil, errors.Wrap(err, "failed to generate tokens")
        }
        
        // Publish registration event
        s.eventBus.Publish(ctx, &UserRegisteredEvent{
            UserID:      user.ID,
            Email:       user.Email,
            FirstName:   user.FirstName,
            LastName:    user.LastName,
            RegisteredAt: user.CreatedAt,
        })
        
        return &AuthResponse{
            User:      user,
            TokenPair: tokenPair,
        }, nil
    })
}

// Helper methods
func (s *authService) generateTokenPair(ctx context.Context, user *repository.User) (*TokenPair, error) {
    // Get user roles
    userRoles, err := s.roleRepo.GetUserRoles(ctx, user.ID)
    if err != nil {
        return nil, errors.Wrap(err, "failed to get user roles")
    }
    
    var role string
    if len(userRoles) > 0 {
        role = userRoles[0].Name
    } else {
        role = "user"
    }
    
    // Create token claims
    claims := &security.SecureJWTClaims{
        UserClaims: security.UserClaims{
            UserID:    user.ID,
            Email:     user.Email,
            FirstName: user.FirstName,
            LastName:  user.LastName,
        },
        SecurityClaims: security.SecurityClaims{
            Role:        role,
            Permissions: s.getUserPermissions(ctx, userRoles),
        },
        SessionClaims: security.SessionClaims{
            SessionID: uuid.New().String(),
            IssuedAt:  time.Now(),
            ExpiresAt: time.Now().Add(s.config.TokenExpiry),
        },
    }
    
    // Generate token pair
    tokenPair, err := s.tokenService.GenerateTokenPair(claims)
    if err != nil {
        return nil, errors.Wrap(err, "failed to generate token pair")
    }
    
    // Store refresh token in database
    refreshTokenHash := s.hashToken(tokenPair.RefreshToken)
    token := &repository.Token{
        ID:        uuid.New().String(),
        UserID:    user.ID,
        TokenHash: refreshTokenHash,
        Type:      "refresh",
        ExpiresAt: time.Now().Add(s.config.RefreshTokenExpiry),
        CreatedAt: time.Now(),
    }
    
    if err := s.tokenRepo.Create(ctx, token); err != nil {
        return nil, errors.Wrap(err, "failed to store refresh token")
    }
    
    return &TokenPair{
        AccessToken:  tokenPair.AccessToken,
        RefreshToken: tokenPair.RefreshToken,
        ExpiresAt:    claims.SessionClaims.ExpiresAt,
    }, nil
}

func (s *authService) checkLoginRateLimit(ctx context.Context, email string) error {
    key := fmt.Sprintf("login_attempts:%s", email)
    attempts, err := s.cache.GetInt(ctx, key)
    if err != nil {
        return nil // Cache miss, allow login
    }
    
    if attempts >= s.config.MaxLoginAttempts {
        return errors.NewTooManyRequestsError("Too many login attempts. Please try again later.")
    }
    
    return nil
}

func (s *authService) recordFailedLogin(ctx context.Context, email, reason string) {
    key := fmt.Sprintf("login_attempts:%s", email)
    attempts, _ := s.cache.GetInt(ctx, key)
    attempts++
    
    s.cache.SetInt(ctx, key, attempts, s.config.LockoutDuration)
    
    s.logger.Warn("Failed login attempt",
        "email", email,
        "reason", reason,
        "attempts", attempts,
    )
}

func (s *authService) recordSuccessfulLogin(ctx context.Context, userID, email string) {
    s.logger.Info("Successful login",
        "user_id", userID,
        "email", email,
    )
}

func (s *authService) clearLoginRateLimit(ctx context.Context, email string) {
    key := fmt.Sprintf("login_attempts:%s", email)
    s.cache.Delete(ctx, key)
}
```

## Adding New Services

### Step 1: Define Service Interface

```go
// ProductService defines product management operations
type ProductService interface {
    BaseService
    
    // Product CRUD
    Create(ctx context.Context, req *CreateProductRequest) (*Product, error)
    GetByID(ctx context.Context, productID string) (*Product, error)
    Update(ctx context.Context, productID string, req *UpdateProductRequest) (*Product, error)
    Delete(ctx context.Context, productID string) error
    
    // Product listing
    List(ctx context.Context, req *ListProductsRequest) (*ListProductsResponse, error)
    Search(ctx context.Context, query string, limit int) ([]*Product, error)
    
    // Product management
    UpdateStock(ctx context.Context, productID string, quantity int) error
    UpdatePrice(ctx context.Context, productID string, price float64) error
    
    // Analytics
    GetProductStats(ctx context.Context) (*ProductStats, error)
}

// Request/Response types
type CreateProductRequest struct {
    Name        string  `json:"name" validate:"required,min=2,max=100"`
    Description string  `json:"description" validate:"required,min=10,max=1000"`
    Price       float64 `json:"price" validate:"required,gt=0"`
    CategoryID  string  `json:"category_id" validate:"required,uuid"`
    SKU         string  `json:"sku" validate:"required,min=3,max=50"`
    Stock       int     `json:"stock" validate:"gte=0"`
}

type UpdateProductRequest struct {
    Name        *string  `json:"name,omitempty" validate:"omitempty,min=2,max=100"`
    Description *string  `json:"description,omitempty" validate:"omitempty,min=10,max=1000"`
    Price       *float64 `json:"price,omitempty" validate:"omitempty,gt=0"`
    CategoryID  *string  `json:"category_id,omitempty" validate:"omitempty,uuid"`
    Stock       *int     `json:"stock,omitempty" validate:"omitempty,gte=0"`
}

type Product struct {
    ID          string    `json:"id"`
    Name        string    `json:"name"`
    Description string    `json:"description"`
    Price       float64   `json:"price"`
    CategoryID  string    `json:"category_id"`
    SKU         string    `json:"sku"`
    Stock       int       `json:"stock"`
    IsActive    bool      `json:"is_active"`
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
}
```

### Step 2: Implement Service

```go
// productService implements ProductService
type productService struct {
    *baseService
    productRepo  repository.ProductRepository
    categoryRepo repository.CategoryRepository
    validator    *validator.Validate
    cache        CacheService
    eventBus     EventBus
}

// NewProductService creates a new product service
func NewProductService(
    logger logger.Logger,
    config *ServiceConfig,
    productRepo repository.ProductRepository,
    categoryRepo repository.CategoryRepository,
    cache CacheService,
    eventBus EventBus,
) ProductService {
    return &productService{
        baseService:  newBaseService(logger, config),
        productRepo:  productRepo,
        categoryRepo: categoryRepo,
        validator:    validator.New(),
        cache:        cache,
        eventBus:     eventBus,
    }
}

// Create creates a new product
func (s *productService) Create(ctx context.Context, req *CreateProductRequest) (*Product, error) {
    return s.withMetricsResult(ctx, "create_product", func(ctx context.Context) (*Product, error) {
        // Validate request
        if err := s.validator.Struct(req); err != nil {
            return nil, errors.NewValidationError("Invalid product data: " + err.Error())
        }
        
        // Check if category exists
        _, err := s.categoryRepo.GetByID(ctx, req.CategoryID)
        if err != nil {
            if errors.IsNotFoundError(err) {
                return nil, errors.NewInvalidInputError("category_id", "Category does not exist")
            }
            return nil, errors.Wrap(err, "failed to validate category")
        }
        
        // Check SKU uniqueness
        existingProduct, err := s.productRepo.GetBySKU(ctx, req.SKU)
        if err != nil && !errors.IsNotFoundError(err) {
            return nil, errors.Wrap(err, "failed to check SKU uniqueness")
        }
        if existingProduct != nil {
            return nil, errors.NewConflictError("product", "sku", "SKU already exists")
        }
        
        // Create product entity
        product := &repository.Product{
            ID:          uuid.New().String(),
            Name:        req.Name,
            Description: req.Description,
            Price:       req.Price,
            CategoryID:  req.CategoryID,
            SKU:         req.SKU,
            Stock:       req.Stock,
            IsActive:    true,
            CreatedAt:   time.Now(),
            UpdatedAt:   time.Now(),
        }
        
        // Save to repository
        if err := s.productRepo.Create(ctx, product); err != nil {
            return nil, errors.Wrap(err, "failed to create product")
        }
        
        // Convert to service model
        serviceProduct := s.toServiceProduct(product)
        
        // Invalidate caches
        s.cache.InvalidatePattern(ctx, "product:list:*")
        s.cache.InvalidatePattern(ctx, "product:stats:*")
        
        // Publish event
        s.eventBus.Publish(ctx, &ProductCreatedEvent{
            ProductID: product.ID,
            Name:      product.Name,
            Price:     product.Price,
            CreatedAt: product.CreatedAt,
        })
        
        return serviceProduct, nil
    })
}

// Helper method
func (s *productService) toServiceProduct(repoProduct *repository.Product) *Product {
    return &Product{
        ID:          repoProduct.ID,
        Name:        repoProduct.Name,
        Description: repoProduct.Description,
        Price:       repoProduct.Price,
        CategoryID:  repoProduct.CategoryID,
        SKU:         repoProduct.SKU,
        Stock:       repoProduct.Stock,
        IsActive:    repoProduct.IsActive,
        CreatedAt:   repoProduct.CreatedAt,
        UpdatedAt:   repoProduct.UpdatedAt,
    }
}
```

### Step 3: Register Service

```go
// In container registration
func (c *Container) RegisterServices() error {
    // Register product service
    c.Singleton(func() services.ProductService {
        return services.NewProductService(
            c.MustResolve("logger").(logger.Logger),
            c.MustResolve("service_config").(*services.ServiceConfig),
            c.MustResolve("product_repository").(repository.ProductRepository),
            c.MustResolve("category_repository").(repository.CategoryRepository),
            c.MustResolve("cache_service").(services.CacheService),
            c.MustResolve("event_bus").(services.EventBus),
        )
    })
    
    return nil
}
```

## Development Workflow

### 1. Service Development Pattern

```bash
# 1. Define service interface
vim internal/services/interfaces.go

# 2. Define request/response types
vim internal/services/types.go

# 3. Implement service
vim internal/services/product_service.go

# 4. Write tests
vim internal/services/product_service_test.go

# 5. Register in container
vim internal/container/services.go

# 6. Update handlers to use service
vim internal/handlers/product_handler.go

# 7. Run tests
go test ./internal/services/...
```

### 2. Testing Services

```go
// product_service_test.go
func TestProductService_Create(t *testing.T) {
    // Setup test dependencies
    logger := logger.NewNoop()
    config := &ServiceConfig{EnableCaching: false}
    
    mockProductRepo := &mocks.ProductRepository{}
    mockCategoryRepo := &mocks.CategoryRepository{}
    mockCache := &mocks.CacheService{}
    mockEventBus := &mocks.EventBus{}
    
    service := NewProductService(logger, config, mockProductRepo, mockCategoryRepo, mockCache, mockEventBus)
    
    tests := []struct {
        name        string
        request     *CreateProductRequest
        setupMocks  func()
        expectedErr error
    }{
        {
            name: "successful creation",
            request: &CreateProductRequest{
                Name:        "Test Product",
                Description: "Test Description",
                Price:       99.99,
                CategoryID:  "cat-123",
                SKU:         "TEST-001",
                Stock:       10,
            },
            setupMocks: func() {
                mockCategoryRepo.On("GetByID", mock.Anything, "cat-123").Return(&repository.Category{ID: "cat-123"}, nil)
                mockProductRepo.On("GetBySKU", mock.Anything, "TEST-001").Return(nil, errors.NewNotFoundError("product", "TEST-001"))
                mockProductRepo.On("Create", mock.Anything, mock.AnythingOfType("*repository.Product")).Return(nil)
                mockEventBus.On("Publish", mock.Anything, mock.AnythingOfType("*ProductCreatedEvent")).Return(nil)
            },
            expectedErr: nil,
        },
        {
            name: "duplicate SKU",
            request: &CreateProductRequest{
                Name:        "Test Product",
                Description: "Test Description",
                Price:       99.99,
                CategoryID:  "cat-123",
                SKU:         "EXISTING-001",
                Stock:       10,
            },
            setupMocks: func() {
                mockCategoryRepo.On("GetByID", mock.Anything, "cat-123").Return(&repository.Category{ID: "cat-123"}, nil)
                mockProductRepo.On("GetBySKU", mock.Anything, "EXISTING-001").Return(&repository.Product{SKU: "EXISTING-001"}, nil)
            },
            expectedErr: errors.NewConflictError("product", "sku", "SKU already exists"),
        },
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Setup mocks
            tt.setupMocks()
            
            // Execute
            result, err := service.Create(context.Background(), tt.request)
            
            // Assert
            if tt.expectedErr != nil {
                assert.Error(t, err)
                assert.Equal(t, tt.expectedErr.Error(), err.Error())
                assert.Nil(t, result)
            } else {
                assert.NoError(t, err)
                assert.NotNil(t, result)
                assert.Equal(t, tt.request.Name, result.Name)
                assert.Equal(t, tt.request.Price, result.Price)
            }
            
            // Verify mocks
            mockProductRepo.AssertExpectations(t)
            mockCategoryRepo.AssertExpectations(t)
        })
    }
}

// Benchmark test
func BenchmarkProductService_Create(b *testing.B) {
    service := setupTestProductService()
    req := &CreateProductRequest{
        Name:        "Benchmark Product",
        Description: "Benchmark Description",
        Price:       99.99,
        CategoryID:  "cat-123",
        SKU:         "BENCH-001",
        Stock:       10,
    }
    
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        req.SKU = fmt.Sprintf("BENCH-%d", i)
        _, _ = service.Create(context.Background(), req)
    }
}
```

### 3. Service Integration Testing

```go
// integration_test.go
func TestServiceIntegration(t *testing.T) {
    // Setup test database
    db := setupTestDB(t)
    defer db.Close()
    
    // Setup container with real dependencies
    container := setupTestContainer(db)
    
    // Get services
    userService := container.MustResolve("user_service").(UserService)
    authService := container.MustResolve("auth_service").(AuthService)
    
    // Test user registration and login flow
    t.Run("user registration and login flow", func(t *testing.T) {
        ctx := context.Background()
        
        // Register user
        registerReq := &RegisterRequest{
            Email:     "test@example.com",
            Password:  "password123",
            FirstName: "Test",
            LastName:  "User",
        }
        
        authResp, err := authService.Register(ctx, registerReq)
        require.NoError(t, err)
        require.NotNil(t, authResp.User)
        
        // Login user
        loginReq := &LoginRequest{
            Email:    "test@example.com",
            Password: "password123",
        }
        
        loginResp, err := authService.Login(ctx, loginReq)
        require.NoError(t, err)
        require.NotNil(t, loginResp.TokenPair)
        
        // Verify user data consistency
        user, err := userService.GetByID(ctx, authResp.User.ID)
        require.NoError(t, err)
        assert.Equal(t, authResp.User.Email, user.Email)
    })
}
```

## Best Practices

### 1. Error Handling

```go
// Always wrap repository errors with context
if err := s.userRepo.Create(ctx, user); err != nil {
    return nil, errors.Wrap(err, "failed to create user")
}

// Use specific error types for business logic
if existingUser != nil {
    return nil, errors.NewConflictError("user", "email", "User already exists")
}

// Log errors with context
s.logger.ErrorContext(ctx, "Service operation failed",
    "operation", "create_user",
    "user_id", userID,
    "error", err,
)
```

### 2. Transaction Management

```go
// Use transactions for multi-step operations
err = s.userRepo.WithTransaction(ctx, func(ctx context.Context, tx repository.Transaction) error {
    // Step 1: Create user
    if err := s.userRepo.WithTx(tx).Create(ctx, user); err != nil {
        return err
    }
    
    // Step 2: Assign role
    if err := s.roleRepo.WithTx(tx).AssignUserRole(ctx, userRole); err != nil {
        return err
    }
    
    // Step 3: Send notification (outside transaction)
    defer func() {
        go s.sendWelcomeEmail(ctx, user)
    }()
    
    return nil
})
```

### 3. Caching Strategy

```go
// Cache frequently accessed data
cacheKey := fmt.Sprintf("user:id:%s", userID)
var cachedUser User
if s.cache.Get(ctx, cacheKey, &cachedUser) == nil {
    return &cachedUser, nil
}

// Cache with appropriate TTL
s.cache.Set(ctx, cacheKey, user, 15*time.Minute)

// Invalidate related caches on updates
s.cache.InvalidatePattern(ctx, "user:*")
s.cache.Delete(ctx, fmt.Sprintf("user:email:%s", oldEmail))
```

### 4. Event Publishing

```go
// Publish events for important business actions
s.eventBus.Publish(ctx, &UserCreatedEvent{
    UserID:    user.ID,
    Email:     user.Email,
    CreatedAt: user.CreatedAt,
})

// Use async processing for non-critical operations
go func() {
    if err := s.emailService.SendWelcomeEmail(context.Background(), user); err != nil {
        s.logger.Error("Failed to send welcome email", "error", err)
    }
}()
```

### 5. Validation

```go
// Validate input at service boundary
if err := s.validator.Struct(req); err != nil {
    return nil, errors.NewValidationError("Invalid input: " + err.Error())
}

// Perform business validation
if req.Price <= 0 {
    return nil, errors.NewInvalidInputError("price", "Price must be greater than zero")
}

// Validate business rules
if user.Role == "admin" && !s.canCreateAdmin(ctx, currentUser) {
    return nil, errors.NewForbiddenError("Insufficient permissions to create admin user")
}
```

### 6. Metrics and Monitoring

```go
// Record metrics for all operations
func (s *baseService) withMetrics(ctx context.Context, operation string, fn func(ctx context.Context) error) error {
    start := time.Now()
    err := fn(ctx)
    duration := time.Since(start)
    
    // Record metrics
    s.recordMetrics(duration, err)
    
    // Log performance
    if duration > s.config.SlowQueryThreshold {
        s.logger.Warn("Slow service operation",
            "operation", operation,
            "duration", duration,
        )
    }
    
    return err
}

// Health checks
func (s *userService) HealthCheck(ctx context.Context) error {
    // Check database connectivity
    if err := s.userRepo.Ping(ctx); err != nil {
        return errors.Wrap(err, "database connectivity check failed")
    }
    
    // Check external dependencies
    if err := s.emailService.HealthCheck(ctx); err != nil {
        return errors.Wrap(err, "email service check failed")
    }
    
    return nil
}
```

## Common Utilities

### 1. Pagination Helper

```go
type PaginationInfo struct {
    Page       int   `json:"page"`
    Limit      int   `json:"limit"`
    Total      int64 `json:"total"`
    TotalPages int   `json:"total_pages"`
    HasNext    bool  `json:"has_next"`
    HasPrev    bool  `json:"has_prev"`
}

func CalculatePagination(page, limit int, total int64) *PaginationInfo {
    if page <= 0 {
        page = 1
    }
    if limit <= 0 {
        limit = 20
    }
    
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

### 2. Event Types

```go
// User events
type UserCreatedEvent struct {
    UserID    string    `json:"user_id"`
    Email     string    `json:"email"`
    FirstName string    `json:"first_name"`
    LastName  string    `json:"last_name"`
    CreatedAt time.Time `json:"created_at"`
}

type UserUpdatedEvent struct {
    UserID    string                 `json:"user_id"`
    Changes   *UpdateUserRequest     `json:"changes"`
    UpdatedAt time.Time              `json:"updated_at"`
}

type UserLoginEvent struct {
    UserID    string    `json:"user_id"`
    Email     string    `json:"email"`
    LoginAt   time.Time `json:"login_at"`
    IPAddress string    `json:"ip_address"`
    UserAgent string    `json:"user_agent"`
}

// Product events
type ProductCreatedEvent struct {
    ProductID string    `json:"product_id"`
    Name      string    `json:"name"`
    Price     float64   `json:"price"`
    CreatedAt time.Time `json:"created_at"`
}

type ProductUpdatedEvent struct {
    ProductID string                  `json:"product_id"`
    Changes   *UpdateProductRequest   `json:"changes"`
    UpdatedAt time.Time               `json:"updated_at"`
}
```

### 3. Service Factory

```go
// ServiceFactory creates and manages service instances
type ServiceFactory struct {
    container *container.Container
    services  map[string]BaseService
    mu        sync.RWMutex
}

func NewServiceFactory(container *container.Container) *ServiceFactory {
    return &ServiceFactory{
        container: container,
        services:  make(map[string]BaseService),
    }
}

func (f *ServiceFactory) GetService(name string) (BaseService, error) {
    f.mu.RLock()
    if service, exists := f.services[name]; exists {
        f.mu.RUnlock()
        return service, nil
    }
    f.mu.RUnlock()
    
    f.mu.Lock()
    defer f.mu.Unlock()
    
    // Double-check pattern
    if service, exists := f.services[name]; exists {
        return service, nil
    }
    
    // Create service
    service, err := f.createService(name)
    if err != nil {
        return nil, err
    }
    
    f.services[name] = service
    return service, nil
}

func (f *ServiceFactory) createService(name string) (BaseService, error) {
    switch name {
    case "user":
        return f.container.MustResolve("user_service").(UserService), nil
    case "auth":
        return f.container.MustResolve("auth_service").(AuthService), nil
    case "product":
        return f.container.MustResolve("product_service").(ProductService), nil
    default:
        return nil, fmt.Errorf("unknown service: %s", name)
    }
}

// StartAll starts all registered services
func (f *ServiceFactory) StartAll(ctx context.Context) error {
    f.mu.RLock()
    defer f.mu.RUnlock()
    
    for name, service := range f.services {
        if err := service.Start(ctx); err != nil {
            return fmt.Errorf("failed to start service %s: %w", name, err)
        }
    }
    
    return nil
}

// StopAll stops all registered services
func (f *ServiceFactory) StopAll(ctx context.Context) error {
    f.mu.RLock()
    defer f.mu.RUnlock()
    
    var errors []error
    for name, service := range f.services {
        if err := service.Stop(ctx); err != nil {
            errors = append(errors, fmt.Errorf("failed to stop service %s: %w", name, err))
        }
    }
    
    if len(errors) > 0 {
        return fmt.Errorf("errors stopping services: %v", errors)
    }
    
    return nil
}
```

This services package provides a robust foundation for implementing business logic with proper error handling, caching, event publishing, metrics, and testing patterns. Follow these patterns when adding new services to maintain consistency and reliability across the application.