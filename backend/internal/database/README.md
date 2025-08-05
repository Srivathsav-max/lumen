# Database Package

## Overview

The `database` package provides comprehensive database management for the Lumen backend application. It handles database connections, migrations, transaction management, and provides a foundation for data access patterns using PostgreSQL.

## Purpose

- **Connection Management**: Efficient database connection pooling and lifecycle management
- **Migration System**: Version-controlled database schema migrations
- **Transaction Management**: Safe and consistent transaction handling
- **Query Building**: Type-safe query construction and execution
- **Performance Monitoring**: Database performance metrics and health checks
- **Multi-Environment Support**: Different configurations for development, testing, and production

## Dependencies

### External Dependencies
```go
// Core dependencies
"context"               // Context handling
"database/sql"          // SQL database interface
"fmt"                   // String formatting
"time"                  // Time handling
"sync"                  // Synchronization primitives

// Database drivers and tools
"github.com/lib/pq"                    // PostgreSQL driver
"github.com/golang-migrate/migrate/v4" // Database migrations
"github.com/golang-migrate/migrate/v4/database/postgres" // PostgreSQL migration driver
"github.com/golang-migrate/migrate/v4/source/file"      // File-based migration source
"github.com/jmoiron/sqlx"              // Extended SQL interface
"github.com/pkg/errors"                // Enhanced error handling

// Monitoring and metrics
"github.com/prometheus/client_golang/prometheus" // Metrics collection
```

### Internal Dependencies
```go
"github.com/Srivathsav-max/lumen/backend/internal/config" // Configuration management
"github.com/Srivathsav-max/lumen/backend/internal/logger" // Logging services
"github.com/Srivathsav-max/lumen/backend/internal/errors" // Error handling
```

## Database Structure

### Database Manager
```go
type Manager struct {
    db       *sqlx.DB
    config   *config.DatabaseConfig
    logger   *logger.Logger
    metrics  *Metrics
    migrator *migrate.Migrate
    mu       sync.RWMutex
    health   *HealthChecker
}

type Metrics struct {
    ConnectionsOpen     prometheus.Gauge
    ConnectionsIdle     prometheus.Gauge
    ConnectionsInUse    prometheus.Gauge
    QueryDuration       prometheus.HistogramVec
    QueryErrors         prometheus.CounterVec
    TransactionDuration prometheus.Histogram
}
```

### Transaction Manager
```go
type TxManager struct {
    db     *sqlx.DB
    logger *logger.Logger
}

type TxFunc func(*sqlx.Tx) error

type TxOptions struct {
    Isolation sql.IsolationLevel
    ReadOnly  bool
    Timeout   time.Duration
}
```

### Query Builder
```go
type QueryBuilder struct {
    query  strings.Builder
    args   []interface{}
    params map[string]interface{}
}

type QueryResult struct {
    Rows         *sqlx.Rows
    RowsAffected int64
    LastInsertID int64
    Duration     time.Duration
}
```

## Implementation Patterns

### 1. Database Manager Initialization

```go
// NewManager creates a new database manager with connection pooling
func NewManager(cfg *config.DatabaseConfig, logger *logger.Logger) (*Manager, error) {
    // Parse database URL
    dbURL, err := url.Parse(cfg.URL)
    if err != nil {
        return nil, fmt.Errorf("invalid database URL: %w", err)
    }
    
    // Open database connection
    db, err := sqlx.Connect("postgres", cfg.URL)
    if err != nil {
        return nil, fmt.Errorf("failed to connect to database: %w", err)
    }
    
    // Configure connection pool
    db.SetMaxOpenConns(cfg.MaxOpenConns)
    db.SetMaxIdleConns(cfg.MaxIdleConns)
    db.SetConnMaxLifetime(cfg.ConnMaxLifetime)
    db.SetConnMaxIdleTime(cfg.ConnMaxIdleTime)
    
    // Initialize metrics
    metrics := initializeMetrics()
    
    // Initialize migrator
    migrator, err := initializeMigrator(cfg.URL, cfg.MigrationsPath)
    if err != nil {
        return nil, fmt.Errorf("failed to initialize migrator: %w", err)
    }
    
    manager := &Manager{
        db:       db,
        config:   cfg,
        logger:   logger,
        metrics:  metrics,
        migrator: migrator,
        health:   NewHealthChecker(db, logger),
    }
    
    // Start metrics collection
    go manager.collectMetrics()
    
    return manager, nil
}
```

### 2. Connection Management

```go
// Connect establishes database connection and runs health checks
func (m *Manager) Connect(ctx context.Context) error {
    m.mu.Lock()
    defer m.mu.Unlock()
    
    // Test connection
    if err := m.db.PingContext(ctx); err != nil {
        return fmt.Errorf("database ping failed: %w", err)
    }
    
    // Run health check
    if err := m.health.Check(ctx); err != nil {
        return fmt.Errorf("database health check failed: %w", err)
    }
    
    m.logger.Info("Database connected successfully",
        "max_open_conns", m.config.MaxOpenConns,
        "max_idle_conns", m.config.MaxIdleConns,
        "conn_max_lifetime", m.config.ConnMaxLifetime,
    )
    
    return nil
}

// Close gracefully closes database connections
func (m *Manager) Close() error {
    m.mu.Lock()
    defer m.mu.Unlock()
    
    if m.db != nil {
        if err := m.db.Close(); err != nil {
            return fmt.Errorf("failed to close database: %w", err)
        }
        m.logger.Info("Database connection closed")
    }
    
    return nil
}
```

### 3. Migration Management

```go
// RunMigrations executes pending database migrations
func (m *Manager) RunMigrations(ctx context.Context) error {
    m.logger.Info("Running database migrations")
    
    // Get current version
    version, dirty, err := m.migrator.Version()
    if err != nil && err != migrate.ErrNilVersion {
        return fmt.Errorf("failed to get migration version: %w", err)
    }
    
    if dirty {
        return fmt.Errorf("database is in dirty state at version %d", version)
    }
    
    // Run migrations
    if err := m.migrator.Up(); err != nil && err != migrate.ErrNoChange {
        return fmt.Errorf("migration failed: %w", err)
    }
    
    // Get new version
    newVersion, _, err := m.migrator.Version()
    if err != nil {
        return fmt.Errorf("failed to get new migration version: %w", err)
    }
    
    m.logger.Info("Migrations completed",
        "from_version", version,
        "to_version", newVersion,
    )
    
    return nil
}

// CreateMigration creates a new migration file
func (m *Manager) CreateMigration(name string) error {
    timestamp := time.Now().Unix()
    upFile := fmt.Sprintf("%s/%d_%s.up.sql", m.config.MigrationsPath, timestamp, name)
    downFile := fmt.Sprintf("%s/%d_%s.down.sql", m.config.MigrationsPath, timestamp, name)
    
    // Create up migration file
    if err := createMigrationFile(upFile, fmt.Sprintf("-- Migration: %s (up)", name)); err != nil {
        return err
    }
    
    // Create down migration file
    if err := createMigrationFile(downFile, fmt.Sprintf("-- Migration: %s (down)", name)); err != nil {
        return err
    }
    
    m.logger.Info("Migration files created",
        "up_file", upFile,
        "down_file", downFile,
    )
    
    return nil
}
```

### 4. Transaction Management

```go
// WithTransaction executes a function within a database transaction
func (m *Manager) WithTransaction(ctx context.Context, opts *TxOptions, fn TxFunc) error {
    start := time.Now()
    
    // Begin transaction with options
    txOpts := &sql.TxOptions{}
    if opts != nil {
        txOpts.Isolation = opts.Isolation
        txOpts.ReadOnly = opts.ReadOnly
    }
    
    tx, err := m.db.BeginTxx(ctx, txOpts)
    if err != nil {
        m.metrics.QueryErrors.WithLabelValues("begin_transaction").Inc()
        return fmt.Errorf("failed to begin transaction: %w", err)
    }
    
    // Set timeout if specified
    if opts != nil && opts.Timeout > 0 {
        var cancel context.CancelFunc
        ctx, cancel = context.WithTimeout(ctx, opts.Timeout)
        defer cancel()
    }
    
    // Execute function
    err = fn(tx)
    
    if err != nil {
        // Rollback on error
        if rbErr := tx.Rollback(); rbErr != nil {
            m.logger.Error("Failed to rollback transaction",
                "original_error", err,
                "rollback_error", rbErr,
            )
        }
        m.metrics.QueryErrors.WithLabelValues("transaction_rollback").Inc()
        return err
    }
    
    // Commit transaction
    if err := tx.Commit(); err != nil {
        m.metrics.QueryErrors.WithLabelValues("transaction_commit").Inc()
        return fmt.Errorf("failed to commit transaction: %w", err)
    }
    
    // Record metrics
    duration := time.Since(start)
    m.metrics.TransactionDuration.Observe(duration.Seconds())
    
    return nil
}
```

### 5. Query Execution

```go
// Query executes a SELECT query and returns rows
func (m *Manager) Query(ctx context.Context, query string, args ...interface{}) (*QueryResult, error) {
    start := time.Now()
    
    rows, err := m.db.QueryxContext(ctx, query, args...)
    if err != nil {
        m.metrics.QueryErrors.WithLabelValues("select").Inc()
        return nil, fmt.Errorf("query failed: %w", err)
    }
    
    duration := time.Since(start)
    m.metrics.QueryDuration.WithLabelValues("select").Observe(duration.Seconds())
    
    return &QueryResult{
        Rows:     rows,
        Duration: duration,
    }, nil
}

// Exec executes an INSERT, UPDATE, or DELETE query
func (m *Manager) Exec(ctx context.Context, query string, args ...interface{}) (*QueryResult, error) {
    start := time.Now()
    
    result, err := m.db.ExecContext(ctx, query, args...)
    if err != nil {
        m.metrics.QueryErrors.WithLabelValues("exec").Inc()
        return nil, fmt.Errorf("exec failed: %w", err)
    }
    
    rowsAffected, _ := result.RowsAffected()
    lastInsertID, _ := result.LastInsertId()
    
    duration := time.Since(start)
    m.metrics.QueryDuration.WithLabelValues("exec").Observe(duration.Seconds())
    
    return &QueryResult{
        RowsAffected: rowsAffected,
        LastInsertID: lastInsertID,
        Duration:     duration,
    }, nil
}
```

## Repository Pattern Implementation

### 1. Base Repository

```go
// BaseRepository provides common database operations
type BaseRepository struct {
    db     *Manager
    logger *logger.Logger
    table  string
}

func NewBaseRepository(db *Manager, logger *logger.Logger, table string) *BaseRepository {
    return &BaseRepository{
        db:     db,
        logger: logger,
        table:  table,
    }
}

// FindByID finds a record by ID
func (r *BaseRepository) FindByID(ctx context.Context, dest interface{}, id interface{}) error {
    query := fmt.Sprintf("SELECT * FROM %s WHERE id = $1", r.table)
    
    err := r.db.db.GetContext(ctx, dest, query, id)
    if err != nil {
        if err == sql.ErrNoRows {
            return errors.NewNotFoundError(fmt.Sprintf("%s not found", r.table))
        }
        return fmt.Errorf("failed to find %s by ID: %w", r.table, err)
    }
    
    return nil
}

// Create inserts a new record
func (r *BaseRepository) Create(ctx context.Context, data interface{}) error {
    return r.db.WithTransaction(ctx, nil, func(tx *sqlx.Tx) error {
        query, args, err := r.buildInsertQuery(data)
        if err != nil {
            return err
        }
        
        _, err = tx.ExecContext(ctx, query, args...)
        return err
    })
}
```

### 2. Specific Repository Implementation

```go
// UserRepository implements user-specific database operations
type UserRepository struct {
    *BaseRepository
}

func NewUserRepository(db *Manager, logger *logger.Logger) *UserRepository {
    return &UserRepository{
        BaseRepository: NewBaseRepository(db, logger, "users"),
    }
}

// FindByEmail finds a user by email address
func (r *UserRepository) FindByEmail(ctx context.Context, email string) (*User, error) {
    var user User
    query := `
        SELECT id, email, password_hash, first_name, last_name, 
               is_verified, created_at, updated_at
        FROM users 
        WHERE email = $1 AND deleted_at IS NULL
    `
    
    err := r.db.db.GetContext(ctx, &user, query, email)
    if err != nil {
        if err == sql.ErrNoRows {
            return nil, errors.NewNotFoundError("user not found")
        }
        return nil, fmt.Errorf("failed to find user by email: %w", err)
    }
    
    return &user, nil
}

// UpdateLastLogin updates the user's last login timestamp
func (r *UserRepository) UpdateLastLogin(ctx context.Context, userID string) error {
    query := `
        UPDATE users 
        SET last_login_at = NOW(), updated_at = NOW()
        WHERE id = $1
    `
    
    result, err := r.db.Exec(ctx, query, userID)
    if err != nil {
        return fmt.Errorf("failed to update last login: %w", err)
    }
    
    if result.RowsAffected == 0 {
        return errors.NewNotFoundError("user not found")
    }
    
    return nil
}
```

## Adding New Database Features

### Step 1: Create Migration

```bash
# Create new migration
go run cmd/migrate/main.go create add_new_feature_table
```

```sql
-- 1234567890_add_new_feature_table.up.sql
CREATE TABLE new_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_enabled BOOLEAN DEFAULT false,
    config JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_new_features_name ON new_features(name) WHERE deleted_at IS NULL;
CREATE INDEX idx_new_features_enabled ON new_features(is_enabled) WHERE deleted_at IS NULL;
```

```sql
-- 1234567890_add_new_feature_table.down.sql
DROP TABLE IF EXISTS new_features;
```

### Step 2: Define Data Model

```go
// models/new_feature.go
type NewFeature struct {
    ID          string                 `db:"id" json:"id"`
    Name        string                 `db:"name" json:"name"`
    Description *string                `db:"description" json:"description"`
    IsEnabled   bool                   `db:"is_enabled" json:"is_enabled"`
    Config      map[string]interface{} `db:"config" json:"config"`
    CreatedAt   time.Time              `db:"created_at" json:"created_at"`
    UpdatedAt   time.Time              `db:"updated_at" json:"updated_at"`
    DeletedAt   *time.Time             `db:"deleted_at" json:"deleted_at,omitempty"`
}

type NewFeatureFilter struct {
    Name      *string `json:"name"`
    IsEnabled *bool   `json:"is_enabled"`
    Limit     int     `json:"limit"`
    Offset    int     `json:"offset"`
}
```

### Step 3: Implement Repository

```go
// repository/new_feature_repository.go
type NewFeatureRepository interface {
    Create(ctx context.Context, feature *NewFeature) error
    FindByID(ctx context.Context, id string) (*NewFeature, error)
    FindByName(ctx context.Context, name string) (*NewFeature, error)
    List(ctx context.Context, filter *NewFeatureFilter) ([]*NewFeature, error)
    Update(ctx context.Context, feature *NewFeature) error
    Delete(ctx context.Context, id string) error
}

type newFeatureRepository struct {
    *BaseRepository
}

func NewNewFeatureRepository(db *database.Manager, logger *logger.Logger) NewFeatureRepository {
    return &newFeatureRepository{
        BaseRepository: NewBaseRepository(db, logger, "new_features"),
    }
}

func (r *newFeatureRepository) Create(ctx context.Context, feature *NewFeature) error {
    query := `
        INSERT INTO new_features (name, description, is_enabled, config)
        VALUES ($1, $2, $3, $4)
        RETURNING id, created_at, updated_at
    `
    
    return r.db.WithTransaction(ctx, nil, func(tx *sqlx.Tx) error {
        return tx.QueryRowContext(ctx, query,
            feature.Name,
            feature.Description,
            feature.IsEnabled,
            feature.Config,
        ).Scan(&feature.ID, &feature.CreatedAt, &feature.UpdatedAt)
    })
}

func (r *newFeatureRepository) List(ctx context.Context, filter *NewFeatureFilter) ([]*NewFeature, error) {
    query := `
        SELECT id, name, description, is_enabled, config, created_at, updated_at
        FROM new_features
        WHERE deleted_at IS NULL
    `
    args := []interface{}{}
    argIndex := 1
    
    if filter.Name != nil {
        query += fmt.Sprintf(" AND name ILIKE $%d", argIndex)
        args = append(args, "%"+*filter.Name+"%")
        argIndex++
    }
    
    if filter.IsEnabled != nil {
        query += fmt.Sprintf(" AND is_enabled = $%d", argIndex)
        args = append(args, *filter.IsEnabled)
        argIndex++
    }
    
    query += " ORDER BY created_at DESC"
    
    if filter.Limit > 0 {
        query += fmt.Sprintf(" LIMIT $%d", argIndex)
        args = append(args, filter.Limit)
        argIndex++
    }
    
    if filter.Offset > 0 {
        query += fmt.Sprintf(" OFFSET $%d", argIndex)
        args = append(args, filter.Offset)
    }
    
    var features []*NewFeature
    err := r.db.db.SelectContext(ctx, &features, query, args...)
    if err != nil {
        return nil, fmt.Errorf("failed to list new features: %w", err)
    }
    
    return features, nil
}
```

## Development Workflow

### 1. Database Development Cycle

```bash
# 1. Create migration
go run cmd/migrate/main.go create add_feature

# 2. Edit migration files
vim migrations/1234567890_add_feature.up.sql
vim migrations/1234567890_add_feature.down.sql

# 3. Run migration
go run cmd/migrate/main.go up

# 4. Verify migration
psql $DATABASE_URL -c "\dt"

# 5. Test rollback (optional)
go run cmd/migrate/main.go down 1
go run cmd/migrate/main.go up
```

### 2. Testing Database Code

```go
// database_test.go
func TestDatabaseOperations(t *testing.T) {
    // Setup test database
    testDB := setupTestDB(t)
    defer testDB.Close()
    
    // Run migrations
    err := testDB.RunMigrations(context.Background())
    require.NoError(t, err)
    
    // Test repository operations
    repo := NewUserRepository(testDB, logger.NewNoop())
    
    user := &User{
        Email:     "test@example.com",
        FirstName: "Test",
        LastName:  "User",
    }
    
    // Test create
    err = repo.Create(context.Background(), user)
    assert.NoError(t, err)
    assert.NotEmpty(t, user.ID)
    
    // Test find
    foundUser, err := repo.FindByEmail(context.Background(), user.Email)
    assert.NoError(t, err)
    assert.Equal(t, user.Email, foundUser.Email)
}

func setupTestDB(t *testing.T) *database.Manager {
    cfg := &config.DatabaseConfig{
        URL:             "postgres://test:test@localhost:5432/test_db",
        MaxOpenConns:    5,
        MaxIdleConns:    2,
        ConnMaxLifetime: time.Minute,
        MigrationsPath:  "../../migrations",
    }
    
    db, err := database.NewManager(cfg, logger.NewNoop())
    require.NoError(t, err)
    
    err = db.Connect(context.Background())
    require.NoError(t, err)
    
    return db
}
```

### 3. Performance Monitoring

```go
// Add query performance monitoring
func (m *Manager) QueryWithMetrics(ctx context.Context, query string, args ...interface{}) (*QueryResult, error) {
    start := time.Now()
    
    // Extract query type for metrics
    queryType := extractQueryType(query)
    
    result, err := m.Query(ctx, query, args...)
    
    duration := time.Since(start)
    m.metrics.QueryDuration.WithLabelValues(queryType).Observe(duration.Seconds())
    
    if err != nil {
        m.metrics.QueryErrors.WithLabelValues(queryType).Inc()
    }
    
    // Log slow queries
    if duration > m.config.SlowQueryThreshold {
        m.logger.Warn("Slow query detected",
            "query", query,
            "duration", duration,
            "args", args,
        )
    }
    
    return result, err
}
```

## Best Practices

### 1. Query Optimization

```go
// ✅ Good: Use prepared statements and proper indexing
func (r *userRepository) FindActiveUsers(ctx context.Context, limit int) ([]*User, error) {
    query := `
        SELECT id, email, first_name, last_name, created_at
        FROM users 
        WHERE deleted_at IS NULL 
          AND is_active = true
        ORDER BY last_login_at DESC
        LIMIT $1
    `
    // Ensure index: CREATE INDEX idx_users_active_login ON users(is_active, last_login_at) WHERE deleted_at IS NULL;
    
    var users []*User
    err := r.db.db.SelectContext(ctx, &users, query, limit)
    return users, err
}

// ❌ Bad: N+1 queries
func (r *userRepository) GetUsersWithRoles(ctx context.Context) ([]*UserWithRole, error) {
    users, err := r.FindAll(ctx)
    if err != nil {
        return nil, err
    }
    
    var result []*UserWithRole
    for _, user := range users {
        role, err := r.roleRepo.FindByUserID(ctx, user.ID) // N+1 query!
        if err != nil {
            return nil, err
        }
        result = append(result, &UserWithRole{User: user, Role: role})
    }
    
    return result, nil
}
```

### 2. Transaction Management

```go
// ✅ Good: Proper transaction handling
func (s *userService) CreateUserWithRole(ctx context.Context, userData *CreateUserRequest) error {
    return s.db.WithTransaction(ctx, &database.TxOptions{
        Isolation: sql.LevelReadCommitted,
        Timeout:   30 * time.Second,
    }, func(tx *sqlx.Tx) error {
        // Create user
        user := &User{
            Email:     userData.Email,
            FirstName: userData.FirstName,
            LastName:  userData.LastName,
        }
        
        if err := s.userRepo.CreateWithTx(ctx, tx, user); err != nil {
            return err
        }
        
        // Assign role
        if err := s.roleRepo.AssignRoleWithTx(ctx, tx, user.ID, userData.RoleID); err != nil {
            return err
        }
        
        // Send welcome email (idempotent operation)
        if err := s.emailService.SendWelcomeEmail(ctx, user.Email); err != nil {
            // Log error but don't fail transaction
            s.logger.Error("Failed to send welcome email", "error", err, "user_id", user.ID)
        }
        
        return nil
    })
}
```

### 3. Error Handling

```go
// Handle database errors appropriately
func (r *userRepository) FindByID(ctx context.Context, id string) (*User, error) {
    var user User
    query := "SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL"
    
    err := r.db.db.GetContext(ctx, &user, query, id)
    if err != nil {
        switch {
        case err == sql.ErrNoRows:
            return nil, errors.NewNotFoundError("user not found")
        case isConnectionError(err):
            return nil, errors.NewServiceUnavailableError("database connection failed")
        case isTimeoutError(err):
            return nil, errors.NewTimeoutError("database query timeout")
        default:
            return nil, fmt.Errorf("failed to find user: %w", err)
        }
    }
    
    return &user, nil
}
```

The database package provides a robust foundation for data persistence, ensuring data integrity, performance, and maintainability across the entire application.