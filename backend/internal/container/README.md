# Container Package

## Overview

The `container` package implements a dependency injection container for the Lumen backend application. It provides centralized service management, dependency resolution, and lifecycle management for all application components.

## Purpose

- **Dependency Injection**: Automatic resolution and injection of service dependencies
- **Service Lifecycle Management**: Control over service initialization, configuration, and cleanup
- **Loose Coupling**: Reduce tight coupling between application components
- **Testability**: Easy mocking and testing through interface-based dependencies
- **Configuration Management**: Centralized service configuration and initialization

## Dependencies

### External Dependencies
```go
// Core dependencies
"context"               // Context handling
"fmt"                   // String formatting
"log"                   // Logging
"sync"                  // Synchronization primitives
"reflect"               // Reflection for dependency resolution

// Third-party dependencies
"go.uber.org/dig"       // Dependency injection framework
"github.com/pkg/errors" // Enhanced error handling
```

### Internal Dependencies
```go
"github.com/Srivathsav-max/lumen/backend/internal/config"     // Configuration management
"github.com/Srivathsav-max/lumen/backend/internal/database"   // Database connections
"github.com/Srivathsav-max/lumen/backend/internal/logger"     // Logging services
"github.com/Srivathsav-max/lumen/backend/internal/repository" // Data repositories
"github.com/Srivathsav-max/lumen/backend/internal/services"   // Business services
"github.com/Srivathsav-max/lumen/backend/internal/security"   // Security services
"github.com/Srivathsav-max/lumen/backend/internal/middleware" // HTTP middleware
"github.com/Srivathsav-max/lumen/backend/internal/handlers"   // HTTP handlers
```

## Container Structure

### Main Container
```go
type Container struct {
    container *dig.Container
    config    *config.Config
    logger    *logger.Logger
    mu        sync.RWMutex
    services  map[string]interface{}
    lifecycle []LifecycleHook
}

type LifecycleHook struct {
    Name     string
    Start    func(context.Context) error
    Stop     func(context.Context) error
    Priority int
}
```

### Service Registration
```go
type ServiceProvider interface {
    Provide(container *dig.Container) error
    Name() string
    Dependencies() []string
}

type ServiceDefinition struct {
    Name         string
    Constructor  interface{}
    Dependencies []string
    Singleton    bool
    Lifecycle    *LifecycleHook
}
```

## Implementation Patterns

### 1. Container Initialization

```go
// NewContainer creates and configures a new dependency injection container
func NewContainer(cfg *config.Config) (*Container, error) {
    digContainer := dig.New()
    
    container := &Container{
        container: digContainer,
        config:    cfg,
        services:  make(map[string]interface{}),
        lifecycle: make([]LifecycleHook, 0),
    }
    
    // Register core services
    if err := container.registerCoreServices(); err != nil {
        return nil, fmt.Errorf("failed to register core services: %w", err)
    }
    
    return container, nil
}
```

### 2. Service Registration

```go
// RegisterService registers a service with the container
func (c *Container) RegisterService(def ServiceDefinition) error {
    c.mu.Lock()
    defer c.mu.Unlock()
    
    // Check dependencies
    for _, dep := range def.Dependencies {
        if !c.hasService(dep) {
            return fmt.Errorf("dependency %s not found for service %s", dep, def.Name)
        }
    }
    
    // Register constructor
    var err error
    if def.Singleton {
        err = c.container.Provide(def.Constructor, dig.Name(def.Name))
    } else {
        err = c.container.Provide(def.Constructor)
    }
    
    if err != nil {
        return fmt.Errorf("failed to register service %s: %w", def.Name, err)
    }
    
    // Register lifecycle hook
    if def.Lifecycle != nil {
        c.lifecycle = append(c.lifecycle, *def.Lifecycle)
    }
    
    c.services[def.Name] = def
    return nil
}
```

### 3. Service Resolution

```go
// Resolve resolves a service from the container
func (c *Container) Resolve(target interface{}) error {
    c.mu.RLock()
    defer c.mu.RUnlock()
    
    if err := c.container.Invoke(func(service interface{}) {
        reflect.ValueOf(target).Elem().Set(reflect.ValueOf(service))
    }); err != nil {
        return fmt.Errorf("failed to resolve service: %w", err)
    }
    
    return nil
}
```

### 4. Lifecycle Management

```go
// Start starts all registered services
func (c *Container) Start(ctx context.Context) error {
    // Sort lifecycle hooks by priority
    sort.Slice(c.lifecycle, func(i, j int) bool {
        return c.lifecycle[i].Priority < c.lifecycle[j].Priority
    })
    
    for _, hook := range c.lifecycle {
        if hook.Start != nil {
            if err := hook.Start(ctx); err != nil {
                return fmt.Errorf("failed to start service %s: %w", hook.Name, err)
            }
        }
    }
    
    return nil
}

// Stop stops all registered services
func (c *Container) Stop(ctx context.Context) error {
    // Stop in reverse order
    for i := len(c.lifecycle) - 1; i >= 0; i-- {
        hook := c.lifecycle[i]
        if hook.Stop != nil {
            if err := hook.Stop(ctx); err != nil {
                c.logger.Error("Failed to stop service", "service", hook.Name, "error", err)
            }
        }
    }
    
    return nil
}
```

## Core Service Registration

### 1. Database Services

```go
func (c *Container) registerDatabaseServices() error {
    // Database manager
    if err := c.RegisterService(ServiceDefinition{
        Name: "database.Manager",
        Constructor: func(cfg *config.Config, logger *logger.Logger) (*database.Manager, error) {
            return database.NewManager(cfg.Database, logger)
        },
        Dependencies: []string{"config", "logger"},
        Singleton:    true,
        Lifecycle: &LifecycleHook{
            Name:     "database",
            Priority: 1,
            Start: func(ctx context.Context) error {
                var db *database.Manager
                if err := c.Resolve(&db); err != nil {
                    return err
                }
                return db.Connect(ctx)
            },
            Stop: func(ctx context.Context) error {
                var db *database.Manager
                if err := c.Resolve(&db); err != nil {
                    return err
                }
                return db.Close()
            },
        },
    }); err != nil {
        return err
    }
    
    return nil
}
```

### 2. Repository Services

```go
func (c *Container) registerRepositoryServices() error {
    repositories := []ServiceDefinition{
        {
            Name: "repository.User",
            Constructor: func(db *database.Manager) repository.UserRepository {
                return repository.NewUserRepository(db)
            },
            Dependencies: []string{"database.Manager"},
            Singleton:    true,
        },
        {
            Name: "repository.Role",
            Constructor: func(db *database.Manager) repository.RoleRepository {
                return repository.NewRoleRepository(db)
            },
            Dependencies: []string{"database.Manager"},
            Singleton:    true,
        },
        // Add more repositories...
    }
    
    for _, repo := range repositories {
        if err := c.RegisterService(repo); err != nil {
            return err
        }
    }
    
    return nil
}
```

### 3. Business Services

```go
func (c *Container) registerBusinessServices() error {
    services := []ServiceDefinition{
        {
            Name: "service.User",
            Constructor: func(
                userRepo repository.UserRepository,
                roleRepo repository.RoleRepository,
                logger *logger.Logger,
            ) services.UserService {
                return services.NewUserService(userRepo, roleRepo, logger)
            },
            Dependencies: []string{"repository.User", "repository.Role", "logger"},
            Singleton:    true,
        },
        {
            Name: "service.Auth",
            Constructor: func(
                userService services.UserService,
                jwtService *security.JWTService,
                logger *logger.Logger,
            ) services.AuthService {
                return services.NewAuthService(userService, jwtService, logger)
            },
            Dependencies: []string{"service.User", "security.JWT", "logger"},
            Singleton:    true,
        },
        // Add more services...
    }
    
    for _, service := range services {
        if err := c.RegisterService(service); err != nil {
            return err
        }
    }
    
    return nil
}
```

## Adding New Services

### Step 1: Define Service Interface

```go
// In services/interfaces.go
type NewFeatureService interface {
    ProcessFeature(ctx context.Context, input FeatureInput) (*FeatureOutput, error)
    GetFeatureStatus(ctx context.Context, id string) (*FeatureStatus, error)
}
```

### Step 2: Implement Service

```go
// In services/new_feature_service.go
type newFeatureService struct {
    repo   repository.FeatureRepository
    logger *logger.Logger
    config *config.NewFeatureConfig
}

func NewNewFeatureService(
    repo repository.FeatureRepository,
    logger *logger.Logger,
    config *config.NewFeatureConfig,
) NewFeatureService {
    return &newFeatureService{
        repo:   repo,
        logger: logger,
        config: config,
    }
}
```

### Step 3: Register Service in Container

```go
// Add to registerBusinessServices()
{
    Name: "service.NewFeature",
    Constructor: func(
        featureRepo repository.FeatureRepository,
        logger *logger.Logger,
        cfg *config.Config,
    ) services.NewFeatureService {
        return services.NewNewFeatureService(featureRepo, logger, &cfg.NewFeature)
    },
    Dependencies: []string{"repository.Feature", "logger", "config"},
    Singleton:    true,
    Lifecycle: &LifecycleHook{
        Name:     "newFeature",
        Priority: 5,
        Start: func(ctx context.Context) error {
            var service services.NewFeatureService
            if err := c.Resolve(&service); err != nil {
                return err
            }
            // Initialize service if needed
            return nil
        },
    },
},
```

### Step 4: Use Service in Handlers

```go
// In handlers/new_feature_handler.go
type NewFeatureHandler struct {
    service services.NewFeatureService
    logger  *logger.Logger
}

func NewNewFeatureHandler(container *Container) (*NewFeatureHandler, error) {
    var service services.NewFeatureService
    var logger *logger.Logger
    
    if err := container.Resolve(&service); err != nil {
        return nil, err
    }
    
    if err := container.Resolve(&logger); err != nil {
        return nil, err
    }
    
    return &NewFeatureHandler{
        service: service,
        logger:  logger,
    }, nil
}
```

## Development Workflow

### 1. Service Development Pattern

```go
// 1. Define interface in services/interfaces.go
type MyService interface {
    DoSomething(ctx context.Context, input Input) (*Output, error)
}

// 2. Implement service in services/my_service.go
type myService struct {
    // dependencies
}

func NewMyService(deps...) MyService {
    return &myService{...}
}

// 3. Register in container
func (c *Container) registerMyService() error {
    return c.RegisterService(ServiceDefinition{
        Name:         "service.My",
        Constructor:  services.NewMyService,
        Dependencies: []string{"dependency1", "dependency2"},
        Singleton:    true,
    })
}

// 4. Use in handlers or other services
func (h *Handler) useMyService() {
    var myService services.MyService
    if err := h.container.Resolve(&myService); err != nil {
        // handle error
    }
    // use service
}
```

### 2. Testing with Container

```go
// container_test.go
func TestServiceRegistration(t *testing.T) {
    cfg := &config.Config{/* test config */}
    container, err := NewContainer(cfg)
    require.NoError(t, err)
    
    // Test service resolution
    var userService services.UserService
    err = container.Resolve(&userService)
    assert.NoError(t, err)
    assert.NotNil(t, userService)
}

// Mock services for testing
func TestWithMockServices(t *testing.T) {
    container := dig.New()
    
    // Register mock services
    container.Provide(func() services.UserService {
        return &mocks.MockUserService{}
    })
    
    // Test handler with mock
    var handler *handlers.UserHandler
    err := container.Invoke(func(us services.UserService) {
        handler = handlers.NewUserHandler(us)
    })
    
    require.NoError(t, err)
    // Test handler behavior
}
```

### 3. Service Health Checks

```go
// Add health check capability
type HealthChecker interface {
    HealthCheck(ctx context.Context) error
}

// Implement in services
func (s *userService) HealthCheck(ctx context.Context) error {
    // Check database connectivity
    return s.repo.Ping(ctx)
}

// Add to container
func (c *Container) HealthCheck(ctx context.Context) map[string]error {
    results := make(map[string]error)
    
    for name, service := range c.services {
        if checker, ok := service.(HealthChecker); ok {
            results[name] = checker.HealthCheck(ctx)
        }
    }
    
    return results
}
```

## Best Practices

### 1. Service Design

```go
// ✅ Good: Interface-based dependencies
type UserService interface {
    GetUser(ctx context.Context, id string) (*User, error)
}

func NewUserHandler(userService UserService) *UserHandler {
    return &UserHandler{userService: userService}
}

// ❌ Bad: Concrete dependencies
func NewUserHandler(userRepo *UserRepository, db *sql.DB) *UserHandler {
    return &UserHandler{userRepo: userRepo, db: db}
}
```

### 2. Error Handling

```go
// Handle container errors gracefully
func (c *Container) MustResolve(target interface{}) {
    if err := c.Resolve(target); err != nil {
        panic(fmt.Sprintf("Failed to resolve dependency: %v", err))
    }
}

// Provide fallback services
func (c *Container) ResolveWithFallback(target interface{}, fallback interface{}) error {
    if err := c.Resolve(target); err != nil {
        reflect.ValueOf(target).Elem().Set(reflect.ValueOf(fallback))
        return nil
    }
    return nil
}
```

### 3. Configuration-based Registration

```go
// Register services based on configuration
func (c *Container) registerConditionalServices() error {
    if c.config.Features.EmailEnabled {
        if err := c.registerEmailServices(); err != nil {
            return err
        }
    }
    
    if c.config.Features.CacheEnabled {
        if err := c.registerCacheServices(); err != nil {
            return err
        }
    }
    
    return nil
}
```

## Usage Examples

### Basic Container Usage

```go
package main

import (
    "context"
    "log"
    "github.com/Srivathsav-max/lumen/backend/internal/container"
    "github.com/Srivathsav-max/lumen/backend/internal/config"
)

func main() {
    // Load configuration
    cfg, err := config.Load()
    if err != nil {
        log.Fatalf("Failed to load config: %v", err)
    }
    
    // Create container
    c, err := container.NewContainer(cfg)
    if err != nil {
        log.Fatalf("Failed to create container: %v", err)
    }
    
    // Start services
    ctx := context.Background()
    if err := c.Start(ctx); err != nil {
        log.Fatalf("Failed to start services: %v", err)
    }
    
    defer func() {
        if err := c.Stop(ctx); err != nil {
            log.Printf("Error stopping services: %v", err)
        }
    }()
    
    // Use services
    var userService services.UserService
    if err := c.Resolve(&userService); err != nil {
        log.Fatalf("Failed to resolve user service: %v", err)
    }
    
    // Application logic...
}
```

### Advanced Container Usage

```go
// Custom service provider
type CustomServiceProvider struct {
    config *config.Config
}

func (p *CustomServiceProvider) Provide(container *dig.Container) error {
    return container.Provide(func() *CustomService {
        return NewCustomService(p.config.Custom)
    })
}

func (p *CustomServiceProvider) Name() string {
    return "custom"
}

func (p *CustomServiceProvider) Dependencies() []string {
    return []string{"config"}
}

// Register custom provider
func main() {
    container, _ := container.NewContainer(cfg)
    
    provider := &CustomServiceProvider{config: cfg}
    if err := container.RegisterProvider(provider); err != nil {
        log.Fatalf("Failed to register provider: %v", err)
    }
}
```

The container package serves as the backbone of the application's architecture, providing clean dependency management and service lifecycle control that enables maintainable, testable, and scalable code.