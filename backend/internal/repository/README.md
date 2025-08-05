# Repository Package

## Overview

The `repository` package implements the data access layer for the Lumen backend application. It provides a clean abstraction over database operations, implements the Repository pattern, and handles data persistence, retrieval, and management for all domain entities.

## Purpose

- **Data Access Layer**: Clean abstraction over database operations
- **Repository Pattern**: Consistent interface for data operations across entities
- **Query Management**: Optimized database queries and transaction handling
- **Data Validation**: Input validation and data integrity checks
- **Caching Integration**: Redis caching for frequently accessed data
- **Migration Support**: Database schema management and versioning

## Dependencies

### External Dependencies
```go
// Database drivers and ORM
"database/sql"                    // SQL database interface
"context"                         // Context handling
"time"                            // Time handling
"fmt"                             // String formatting
"strings"                         // String manipulation

// PostgreSQL driver
"github.com/lib/pq"               // PostgreSQL driver
"github.com/jackc/pgx/v5"         // PostgreSQL driver (alternative)
"github.com/jackc/pgx/v5/pgxpool" // Connection pooling

// Query builder and ORM
"github.com/Masterminds/squirrel" // SQL query builder
"github.com/jmoiron/sqlx"         // SQL extensions
"gorm.io/gorm"                    // ORM (if used)
"gorm.io/driver/postgres"         // GORM PostgreSQL driver

// Caching
"github.com/go-redis/redis/v8"    // Redis client
"github.com/go-redis/cache/v8"    // Redis caching

// Utilities
"github.com/google/uuid"          // UUID generation
"github.com/pkg/errors"           // Enhanced error handling
"github.com/golang-migrate/migrate/v4" // Database migrations
```

### Internal Dependencies
```go
"github.com/Srivathsav-max/lumen/backend/internal/database" // Database manager
"github.com/Srivathsav-max/lumen/backend/internal/logger"   // Logging services
"github.com/Srivathsav-max/lumen/backend/internal/errors"   // Error handling
"github.com/Srivathsav-max/lumen/backend/internal/config"   // Configuration
```

## Repository Structure

### Base Repository Interface
```go
// BaseRepository defines common repository operations
type BaseRepository[T any] interface {
    // CRUD operations
    Create(ctx context.Context, entity *T) error
    GetByID(ctx context.Context, id string) (*T, error)
    Update(ctx context.Context, entity *T) error
    Delete(ctx context.Context, id string) error
    
    // Batch operations
    CreateBatch(ctx context.Context, entities []*T) error
    GetByIDs(ctx context.Context, ids []string) ([]*T, error)
    UpdateBatch(ctx context.Context, entities []*T) error
    DeleteBatch(ctx context.Context, ids []string) error
    
    // Query operations
    List(ctx context.Context, filter *ListFilter) ([]*T, error)
    Count(ctx context.Context, filter *CountFilter) (int64, error)
    Exists(ctx context.Context, id string) (bool, error)
    
    // Transaction support
    WithTx(tx *sql.Tx) BaseRepository[T]
}

// ListFilter defines common filtering options
type ListFilter struct {
    Limit      int                    `json:"limit"`
    Offset     int                    `json:"offset"`
    OrderBy    string                 `json:"order_by"`
    OrderDir   string                 `json:"order_dir"`
    Search     *string                `json:"search,omitempty"`
    Filters    map[string]interface{} `json:"filters,omitempty"`
    DateRange  *DateRange             `json:"date_range,omitempty"`
}

type CountFilter struct {
    Search    *string                `json:"search,omitempty"`
    Filters   map[string]interface{} `json:"filters,omitempty"`
    DateRange *DateRange             `json:"date_range,omitempty"`
}

type DateRange struct {
    From *time.Time `json:"from,omitempty"`
    To   *time.Time `json:"to,omitempty"`
}
```

### Base Repository Implementation
```go
// baseRepository provides common repository functionality
type baseRepository[T any] struct {
    db        *database.Manager
    logger    logger.Logger
    cache     *cache.Cache
    tableName string
    tx        *sql.Tx
}

func newBaseRepository[T any](db *database.Manager, logger logger.Logger, cache *cache.Cache, tableName string) *baseRepository[T] {
    return &baseRepository[T]{
        db:        db,
        logger:    logger,
        cache:     cache,
        tableName: tableName,
    }
}

// Create inserts a new entity
func (r *baseRepository[T]) Create(ctx context.Context, entity *T) error {
    query, args, err := r.buildInsertQuery(entity)
    if err != nil {
        return errors.Wrap(err, "failed to build insert query")
    }
    
    var executor database.Executor
    if r.tx != nil {
        executor = r.tx
    } else {
        executor = r.db.GetDB()
    }
    
    start := time.Now()
    _, err = executor.ExecContext(ctx, query, args...)
    duration := time.Since(start)
    
    // Log query performance
    r.logger.LogQuery(ctx, query, args, duration)
    
    if err != nil {
        return r.handleDBError(err, "create")
    }
    
    // Invalidate related cache entries
    r.invalidateCache(ctx, "list")
    
    return nil
}

// GetByID retrieves an entity by ID
func (r *baseRepository[T]) GetByID(ctx context.Context, id string) (*T, error) {
    // Try cache first
    cacheKey := fmt.Sprintf("%s:id:%s", r.tableName, id)
    var entity T
    
    if r.cache != nil {
        err := r.cache.Get(ctx, cacheKey, &entity)
        if err == nil {
            return &entity, nil
        }
    }
    
    // Query database
    query, args := r.buildSelectByIDQuery(id)
    
    var executor database.Executor
    if r.tx != nil {
        executor = r.tx
    } else {
        executor = r.db.GetDB()
    }
    
    start := time.Now()
    row := executor.QueryRowContext(ctx, query, args...)
    duration := time.Since(start)
    
    r.logger.LogQuery(ctx, query, args, duration)
    
    err := r.scanEntity(row, &entity)
    if err != nil {
        if err == sql.ErrNoRows {
            return nil, errors.NewNotFoundError(r.tableName, id)
        }
        return nil, r.handleDBError(err, "get_by_id")
    }
    
    // Cache the result
    if r.cache != nil {
        r.cache.Set(ctx, cacheKey, &entity, time.Hour)
    }
    
    return &entity, nil
}

// Update modifies an existing entity
func (r *baseRepository[T]) Update(ctx context.Context, entity *T) error {
    query, args, err := r.buildUpdateQuery(entity)
    if err != nil {
        return errors.Wrap(err, "failed to build update query")
    }
    
    var executor database.Executor
    if r.tx != nil {
        executor = r.tx
    } else {
        executor = r.db.GetDB()
    }
    
    start := time.Now()
    result, err := executor.ExecContext(ctx, query, args...)
    duration := time.Since(start)
    
    r.logger.LogQuery(ctx, query, args, duration)
    
    if err != nil {
        return r.handleDBError(err, "update")
    }
    
    rowsAffected, err := result.RowsAffected()
    if err != nil {
        return errors.Wrap(err, "failed to get rows affected")
    }
    
    if rowsAffected == 0 {
        return errors.NewNotFoundError(r.tableName, "unknown")
    }
    
    // Invalidate cache
    r.invalidateCache(ctx, "all")
    
    return nil
}

// Delete removes an entity by ID
func (r *baseRepository[T]) Delete(ctx context.Context, id string) error {
    query := fmt.Sprintf("DELETE FROM %s WHERE id = $1", r.tableName)
    
    var executor database.Executor
    if r.tx != nil {
        executor = r.tx
    } else {
        executor = r.db.GetDB()
    }
    
    start := time.Now()
    result, err := executor.ExecContext(ctx, query, id)
    duration := time.Since(start)
    
    r.logger.LogQuery(ctx, query, []interface{}{id}, duration)
    
    if err != nil {
        return r.handleDBError(err, "delete")
    }
    
    rowsAffected, err := result.RowsAffected()
    if err != nil {
        return errors.Wrap(err, "failed to get rows affected")
    }
    
    if rowsAffected == 0 {
        return errors.NewNotFoundError(r.tableName, id)
    }
    
    // Invalidate cache
    r.invalidateCache(ctx, "all")
    
    return nil
}

// List retrieves entities with filtering and pagination
func (r *baseRepository[T]) List(ctx context.Context, filter *ListFilter) ([]*T, error) {
    // Try cache for simple queries
    cacheKey := r.buildCacheKey("list", filter)
    var entities []*T
    
    if r.cache != nil && r.isCacheable(filter) {
        err := r.cache.Get(ctx, cacheKey, &entities)
        if err == nil {
            return entities, nil
        }
    }
    
    // Build query
    query, args, err := r.buildListQuery(filter)
    if err != nil {
        return nil, errors.Wrap(err, "failed to build list query")
    }
    
    var executor database.Executor
    if r.tx != nil {
        executor = r.tx
    } else {
        executor = r.db.GetDB()
    }
    
    start := time.Now()
    rows, err := executor.QueryContext(ctx, query, args...)
    duration := time.Since(start)
    
    r.logger.LogQuery(ctx, query, args, duration)
    
    if err != nil {
        return nil, r.handleDBError(err, "list")
    }
    defer rows.Close()
    
    entities = make([]*T, 0)
    for rows.Next() {
        var entity T
        if err := r.scanEntity(rows, &entity); err != nil {
            return nil, errors.Wrap(err, "failed to scan entity")
        }
        entities = append(entities, &entity)
    }
    
    if err := rows.Err(); err != nil {
        return nil, errors.Wrap(err, "rows iteration error")
    }
    
    // Cache the result
    if r.cache != nil && r.isCacheable(filter) {
        r.cache.Set(ctx, cacheKey, entities, 30*time.Minute)
    }
    
    return entities, nil
}

// WithTx returns a repository instance that uses the provided transaction
func (r *baseRepository[T]) WithTx(tx *sql.Tx) BaseRepository[T] {
    return &baseRepository[T]{
        db:        r.db,
        logger:    r.logger,
        cache:     r.cache,
        tableName: r.tableName,
        tx:        tx,
    }
}
```

## Domain-Specific Repositories

### 1. User Repository

```go
// User represents the user entity
type User struct {
    ID           string    `json:"id" db:"id"`
    Email        string    `json:"email" db:"email"`
    PasswordHash string    `json:"-" db:"password_hash"`
    FirstName    string    `json:"first_name" db:"first_name"`
    LastName     string    `json:"last_name" db:"last_name"`
    IsActive     bool      `json:"is_active" db:"is_active"`
    IsVerified   bool      `json:"is_verified" db:"is_verified"`
    LastLoginAt  *time.Time `json:"last_login_at" db:"last_login_at"`
    CreatedAt    time.Time `json:"created_at" db:"created_at"`
    UpdatedAt    time.Time `json:"updated_at" db:"updated_at"`
}

// UserRepository defines user-specific operations
type UserRepository interface {
    BaseRepository[User]
    
    // User-specific methods
    GetByEmail(ctx context.Context, email string) (*User, error)
    GetByEmailWithPassword(ctx context.Context, email string) (*User, error)
    UpdatePassword(ctx context.Context, userID, passwordHash string) error
    UpdateLastLogin(ctx context.Context, userID string) error
    GetActiveUsers(ctx context.Context, limit int) ([]*User, error)
    SearchUsers(ctx context.Context, query string, limit int) ([]*User, error)
    GetUserStats(ctx context.Context) (*UserStats, error)
}

type UserStats struct {
    TotalUsers    int64 `json:"total_users"`
    ActiveUsers   int64 `json:"active_users"`
    VerifiedUsers int64 `json:"verified_users"`
    NewUsersToday int64 `json:"new_users_today"`
}

// userRepository implements UserRepository
type userRepository struct {
    *baseRepository[User]
}

func NewUserRepository(db *database.Manager, logger logger.Logger, cache *cache.Cache) UserRepository {
    return &userRepository{
        baseRepository: newBaseRepository[User](db, logger, cache, "users"),
    }
}

// GetByEmail retrieves user by email
func (r *userRepository) GetByEmail(ctx context.Context, email string) (*User, error) {
    cacheKey := fmt.Sprintf("user:email:%s", email)
    var user User
    
    if r.cache != nil {
        err := r.cache.Get(ctx, cacheKey, &user)
        if err == nil {
            return &user, nil
        }
    }
    
    query := `
        SELECT id, email, first_name, last_name, is_active, is_verified, 
               last_login_at, created_at, updated_at
        FROM users 
        WHERE email = $1 AND deleted_at IS NULL
    `
    
    var executor database.Executor
    if r.tx != nil {
        executor = r.tx
    } else {
        executor = r.db.GetDB()
    }
    
    start := time.Now()
    row := executor.QueryRowContext(ctx, query, email)
    duration := time.Since(start)
    
    r.logger.LogQuery(ctx, query, []interface{}{email}, duration)
    
    err := row.Scan(
        &user.ID, &user.Email, &user.FirstName, &user.LastName,
        &user.IsActive, &user.IsVerified, &user.LastLoginAt,
        &user.CreatedAt, &user.UpdatedAt,
    )
    
    if err != nil {
        if err == sql.ErrNoRows {
            return nil, errors.NewNotFoundError("user", email)
        }
        return nil, r.handleDBError(err, "get_by_email")
    }
    
    if r.cache != nil {
        r.cache.Set(ctx, cacheKey, &user, time.Hour)
    }
    
    return &user, nil
}

// GetByEmailWithPassword retrieves user with password hash (for authentication)
func (r *userRepository) GetByEmailWithPassword(ctx context.Context, email string) (*User, error) {
    query := `
        SELECT id, email, password_hash, first_name, last_name, is_active, 
               is_verified, last_login_at, created_at, updated_at
        FROM users 
        WHERE email = $1 AND deleted_at IS NULL
    `
    
    var executor database.Executor
    if r.tx != nil {
        executor = r.tx
    } else {
        executor = r.db.GetDB()
    }
    
    start := time.Now()
    row := executor.QueryRowContext(ctx, query, email)
    duration := time.Since(start)
    
    r.logger.LogQuery(ctx, query, []interface{}{email}, duration)
    
    var user User
    err := row.Scan(
        &user.ID, &user.Email, &user.PasswordHash, &user.FirstName,
        &user.LastName, &user.IsActive, &user.IsVerified,
        &user.LastLoginAt, &user.CreatedAt, &user.UpdatedAt,
    )
    
    if err != nil {
        if err == sql.ErrNoRows {
            return nil, errors.NewNotFoundError("user", email)
        }
        return nil, r.handleDBError(err, "get_by_email_with_password")
    }
    
    return &user, nil
}

// UpdatePassword updates user password hash
func (r *userRepository) UpdatePassword(ctx context.Context, userID, passwordHash string) error {
    query := `
        UPDATE users 
        SET password_hash = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND deleted_at IS NULL
    `
    
    var executor database.Executor
    if r.tx != nil {
        executor = r.tx
    } else {
        executor = r.db.GetDB()
    }
    
    start := time.Now()
    result, err := executor.ExecContext(ctx, query, userID, passwordHash)
    duration := time.Since(start)
    
    r.logger.LogQuery(ctx, query, []interface{}{userID, "[REDACTED]"}, duration)
    
    if err != nil {
        return r.handleDBError(err, "update_password")
    }
    
    rowsAffected, err := result.RowsAffected()
    if err != nil {
        return errors.Wrap(err, "failed to get rows affected")
    }
    
    if rowsAffected == 0 {
        return errors.NewNotFoundError("user", userID)
    }
    
    // Invalidate user cache
    r.invalidateUserCache(ctx, userID)
    
    return nil
}

// SearchUsers searches users by name or email
func (r *userRepository) SearchUsers(ctx context.Context, query string, limit int) ([]*User, error) {
    searchQuery := `
        SELECT id, email, first_name, last_name, is_active, is_verified,
               last_login_at, created_at, updated_at
        FROM users
        WHERE (first_name ILIKE $1 OR last_name ILIKE $1 OR email ILIKE $1)
          AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT $2
    `
    
    searchTerm := "%" + query + "%"
    
    var executor database.Executor
    if r.tx != nil {
        executor = r.tx
    } else {
        executor = r.db.GetDB()
    }
    
    start := time.Now()
    rows, err := executor.QueryContext(ctx, searchQuery, searchTerm, limit)
    duration := time.Since(start)
    
    r.logger.LogQuery(ctx, searchQuery, []interface{}{searchTerm, limit}, duration)
    
    if err != nil {
        return nil, r.handleDBError(err, "search_users")
    }
    defer rows.Close()
    
    var users []*User
    for rows.Next() {
        var user User
        err := rows.Scan(
            &user.ID, &user.Email, &user.FirstName, &user.LastName,
            &user.IsActive, &user.IsVerified, &user.LastLoginAt,
            &user.CreatedAt, &user.UpdatedAt,
        )
        if err != nil {
            return nil, errors.Wrap(err, "failed to scan user")
        }
        users = append(users, &user)
    }
    
    return users, nil
}

// GetUserStats retrieves user statistics
func (r *userRepository) GetUserStats(ctx context.Context) (*UserStats, error) {
    cacheKey := "user:stats"
    var stats UserStats
    
    if r.cache != nil {
        err := r.cache.Get(ctx, cacheKey, &stats)
        if err == nil {
            return &stats, nil
        }
    }
    
    query := `
        SELECT 
            COUNT(*) as total_users,
            COUNT(*) FILTER (WHERE is_active = true) as active_users,
            COUNT(*) FILTER (WHERE is_verified = true) as verified_users,
            COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as new_users_today
        FROM users
        WHERE deleted_at IS NULL
    `
    
    var executor database.Executor
    if r.tx != nil {
        executor = r.tx
    } else {
        executor = r.db.GetDB()
    }
    
    start := time.Now()
    row := executor.QueryRowContext(ctx, query)
    duration := time.Since(start)
    
    r.logger.LogQuery(ctx, query, nil, duration)
    
    err := row.Scan(&stats.TotalUsers, &stats.ActiveUsers, &stats.VerifiedUsers, &stats.NewUsersToday)
    if err != nil {
        return nil, r.handleDBError(err, "get_user_stats")
    }
    
    if r.cache != nil {
        r.cache.Set(ctx, cacheKey, &stats, 5*time.Minute)
    }
    
    return &stats, nil
}
```

### 2. Token Repository

```go
// Token represents authentication tokens
type Token struct {
    ID        string    `json:"id" db:"id"`
    UserID    string    `json:"user_id" db:"user_id"`
    TokenHash string    `json:"-" db:"token_hash"`
    Type      string    `json:"type" db:"type"`
    ExpiresAt time.Time `json:"expires_at" db:"expires_at"`
    IsRevoked bool      `json:"is_revoked" db:"is_revoked"`
    CreatedAt time.Time `json:"created_at" db:"created_at"`
    UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// TokenRepository defines token-specific operations
type TokenRepository interface {
    BaseRepository[Token]
    
    // Token-specific methods
    GetByTokenHash(ctx context.Context, tokenHash string) (*Token, error)
    GetActiveTokensByUserID(ctx context.Context, userID string) ([]*Token, error)
    RevokeToken(ctx context.Context, tokenID string) error
    RevokeAllUserTokens(ctx context.Context, userID string) error
    CleanupExpiredTokens(ctx context.Context) (int64, error)
    GetTokensByType(ctx context.Context, tokenType string, limit int) ([]*Token, error)
}

type tokenRepository struct {
    *baseRepository[Token]
}

func NewTokenRepository(db *database.Manager, logger logger.Logger, cache *cache.Cache) TokenRepository {
    return &tokenRepository{
        baseRepository: newBaseRepository[Token](db, logger, cache, "tokens"),
    }
}

// GetByTokenHash retrieves token by hash
func (r *tokenRepository) GetByTokenHash(ctx context.Context, tokenHash string) (*Token, error) {
    query := `
        SELECT id, user_id, token_hash, type, expires_at, is_revoked, created_at, updated_at
        FROM tokens
        WHERE token_hash = $1 AND is_revoked = false AND expires_at > CURRENT_TIMESTAMP
    `
    
    var executor database.Executor
    if r.tx != nil {
        executor = r.tx
    } else {
        executor = r.db.GetDB()
    }
    
    start := time.Now()
    row := executor.QueryRowContext(ctx, query, tokenHash)
    duration := time.Since(start)
    
    r.logger.LogQuery(ctx, query, []interface{}{"[REDACTED]"}, duration)
    
    var token Token
    err := row.Scan(
        &token.ID, &token.UserID, &token.TokenHash, &token.Type,
        &token.ExpiresAt, &token.IsRevoked, &token.CreatedAt, &token.UpdatedAt,
    )
    
    if err != nil {
        if err == sql.ErrNoRows {
            return nil, errors.NewNotFoundError("token", "[REDACTED]")
        }
        return nil, r.handleDBError(err, "get_by_token_hash")
    }
    
    return &token, nil
}

// RevokeToken marks a token as revoked
func (r *tokenRepository) RevokeToken(ctx context.Context, tokenID string) error {
    query := `
        UPDATE tokens 
        SET is_revoked = true, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
    `
    
    var executor database.Executor
    if r.tx != nil {
        executor = r.tx
    } else {
        executor = r.db.GetDB()
    }
    
    start := time.Now()
    result, err := executor.ExecContext(ctx, query, tokenID)
    duration := time.Since(start)
    
    r.logger.LogQuery(ctx, query, []interface{}{tokenID}, duration)
    
    if err != nil {
        return r.handleDBError(err, "revoke_token")
    }
    
    rowsAffected, err := result.RowsAffected()
    if err != nil {
        return errors.Wrap(err, "failed to get rows affected")
    }
    
    if rowsAffected == 0 {
        return errors.NewNotFoundError("token", tokenID)
    }
    
    return nil
}

// CleanupExpiredTokens removes expired tokens
func (r *tokenRepository) CleanupExpiredTokens(ctx context.Context) (int64, error) {
    query := `
        DELETE FROM tokens 
        WHERE expires_at < CURRENT_TIMESTAMP OR is_revoked = true
    `
    
    var executor database.Executor
    if r.tx != nil {
        executor = r.tx
    } else {
        executor = r.db.GetDB()
    }
    
    start := time.Now()
    result, err := executor.ExecContext(ctx, query)
    duration := time.Since(start)
    
    r.logger.LogQuery(ctx, query, nil, duration)
    
    if err != nil {
        return 0, r.handleDBError(err, "cleanup_expired_tokens")
    }
    
    rowsAffected, err := result.RowsAffected()
    if err != nil {
        return 0, errors.Wrap(err, "failed to get rows affected")
    }
    
    r.logger.InfoContext(ctx, "Cleaned up expired tokens", "count", rowsAffected)
    
    return rowsAffected, nil
}
```

## Query Builder Integration

### 1. Dynamic Query Building

```go
// QueryBuilder provides dynamic query construction
type QueryBuilder struct {
    builder squirrel.StatementBuilderType
}

func NewQueryBuilder() *QueryBuilder {
    return &QueryBuilder{
        builder: squirrel.StatementBuilder.PlaceholderFormat(squirrel.Dollar),
    }
}

// BuildSelectQuery builds a SELECT query with filters
func (qb *QueryBuilder) BuildSelectQuery(tableName string, filter *ListFilter) (string, []interface{}, error) {
    query := qb.builder.Select("*").From(tableName)
    
    // Add WHERE conditions
    if filter.Search != nil && *filter.Search != "" {
        searchTerm := "%" + *filter.Search + "%"
        query = query.Where("(name ILIKE ? OR description ILIKE ?)", searchTerm, searchTerm)
    }
    
    // Add custom filters
    for key, value := range filter.Filters {
        switch v := value.(type) {
        case string:
            query = query.Where(squirrel.Eq{key: v})
        case []string:
            query = query.Where(squirrel.Eq{key: v})
        case bool:
            query = query.Where(squirrel.Eq{key: v})
        case int, int64:
            query = query.Where(squirrel.Eq{key: v})
        }
    }
    
    // Add date range filter
    if filter.DateRange != nil {
        if filter.DateRange.From != nil {
            query = query.Where(squirrel.GtOrEq{"created_at": *filter.DateRange.From})
        }
        if filter.DateRange.To != nil {
            query = query.Where(squirrel.LtOrEq{"created_at": *filter.DateRange.To})
        }
    }
    
    // Add soft delete filter
    query = query.Where("deleted_at IS NULL")
    
    // Add ordering
    if filter.OrderBy != "" {
        orderDir := "ASC"
        if filter.OrderDir == "desc" {
            orderDir = "DESC"
        }
        query = query.OrderBy(fmt.Sprintf("%s %s", filter.OrderBy, orderDir))
    } else {
        query = query.OrderBy("created_at DESC")
    }
    
    // Add pagination
    if filter.Limit > 0 {
        query = query.Limit(uint64(filter.Limit))
    }
    if filter.Offset > 0 {
        query = query.Offset(uint64(filter.Offset))
    }
    
    return query.ToSql()
}

// BuildInsertQuery builds an INSERT query
func (qb *QueryBuilder) BuildInsertQuery(tableName string, entity interface{}) (string, []interface{}, error) {
    // Use reflection to extract field values
    values := extractEntityValues(entity)
    
    query := qb.builder.Insert(tableName)
    for column, value := range values {
        query = query.Columns(column).Values(value)
    }
    
    return query.ToSql()
}

// BuildUpdateQuery builds an UPDATE query
func (qb *QueryBuilder) BuildUpdateQuery(tableName string, entity interface{}, id string) (string, []interface{}, error) {
    values := extractEntityValues(entity)
    
    query := qb.builder.Update(tableName)
    for column, value := range values {
        if column != "id" && column != "created_at" {
            query = query.Set(column, value)
        }
    }
    
    query = query.Set("updated_at", "CURRENT_TIMESTAMP")
    query = query.Where(squirrel.Eq{"id": id})
    
    return query.ToSql()
}
```

### 2. Transaction Management

```go
// TransactionManager handles database transactions
type TransactionManager struct {
    db     *database.Manager
    logger logger.Logger
}

func NewTransactionManager(db *database.Manager, logger logger.Logger) *TransactionManager {
    return &TransactionManager{
        db:     db,
        logger: logger,
    }
}

// WithTransaction executes a function within a database transaction
func (tm *TransactionManager) WithTransaction(ctx context.Context, fn func(ctx context.Context, tx *sql.Tx) error) error {
    tx, err := tm.db.GetDB().BeginTx(ctx, nil)
    if err != nil {
        return errors.Wrap(err, "failed to begin transaction")
    }
    
    defer func() {
        if p := recover(); p != nil {
            tx.Rollback()
            panic(p)
        }
    }()
    
    if err := fn(ctx, tx); err != nil {
        if rbErr := tx.Rollback(); rbErr != nil {
            tm.logger.ErrorContext(ctx, "Failed to rollback transaction",
                "error", rbErr,
                "original_error", err,
            )
        }
        return err
    }
    
    if err := tx.Commit(); err != nil {
        return errors.Wrap(err, "failed to commit transaction")
    }
    
    return nil
}

// Example usage in service layer
func (s *UserService) CreateUserWithProfile(ctx context.Context, req *CreateUserRequest) (*User, error) {
    var user *User
    
    err := s.txManager.WithTransaction(ctx, func(ctx context.Context, tx *sql.Tx) error {
        // Create user
        userRepo := s.userRepo.WithTx(tx)
        createdUser, err := userRepo.Create(ctx, &User{
            Email:     req.Email,
            FirstName: req.FirstName,
            LastName:  req.LastName,
        })
        if err != nil {
            return err
        }
        
        // Create user profile
        profileRepo := s.profileRepo.WithTx(tx)
        _, err = profileRepo.Create(ctx, &UserProfile{
            UserID: createdUser.ID,
            Bio:    req.Bio,
        })
        if err != nil {
            return err
        }
        
        user = createdUser
        return nil
    })
    
    return user, err
}
```

## Caching Strategy

### 1. Cache Integration

```go
// CacheManager handles repository-level caching
type CacheManager struct {
    cache  *cache.Cache
    logger logger.Logger
}

func NewCacheManager(cache *cache.Cache, logger logger.Logger) *CacheManager {
    return &CacheManager{
        cache:  cache,
        logger: logger,
    }
}

// Get retrieves data from cache
func (cm *CacheManager) Get(ctx context.Context, key string, dest interface{}) error {
    start := time.Now()
    err := cm.cache.Get(ctx, key, dest)
    duration := time.Since(start)
    
    if err == nil {
        cm.logger.DebugContext(ctx, "Cache hit",
            "key", key,
            "duration_ms", duration.Milliseconds(),
        )
    } else {
        cm.logger.DebugContext(ctx, "Cache miss",
            "key", key,
            "error", err,
        )
    }
    
    return err
}

// Set stores data in cache
func (cm *CacheManager) Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
    start := time.Now()
    err := cm.cache.Set(ctx, key, value, ttl)
    duration := time.Since(start)
    
    if err != nil {
        cm.logger.WarnContext(ctx, "Cache set failed",
            "key", key,
            "error", err,
            "duration_ms", duration.Milliseconds(),
        )
    } else {
        cm.logger.DebugContext(ctx, "Cache set successful",
            "key", key,
            "ttl", ttl,
            "duration_ms", duration.Milliseconds(),
        )
    }
    
    return err
}

// Delete removes data from cache
func (cm *CacheManager) Delete(ctx context.Context, keys ...string) error {
    for _, key := range keys {
        if err := cm.cache.Delete(ctx, key); err != nil {
            cm.logger.WarnContext(ctx, "Cache delete failed",
                "key", key,
                "error", err,
            )
        }
    }
    return nil
}

// InvalidatePattern removes cache entries matching pattern
func (cm *CacheManager) InvalidatePattern(ctx context.Context, pattern string) error {
    // Implementation depends on cache backend
    // For Redis, use SCAN with pattern matching
    return cm.cache.DeletePattern(ctx, pattern)
}
```

### 2. Cache Invalidation

```go
// invalidateCache handles cache invalidation for repository operations
func (r *baseRepository[T]) invalidateCache(ctx context.Context, operation string) {
    if r.cache == nil {
        return
    }
    
    patterns := []string{
        fmt.Sprintf("%s:list:*", r.tableName),
        fmt.Sprintf("%s:count:*", r.tableName),
        fmt.Sprintf("%s:stats", r.tableName),
    }
    
    switch operation {
    case "create", "update", "delete":
        // Invalidate all list and count caches
        for _, pattern := range patterns {
            if err := r.cache.DeletePattern(ctx, pattern); err != nil {
                r.logger.WarnContext(ctx, "Failed to invalidate cache pattern",
                    "pattern", pattern,
                    "error", err,
                )
            }
        }
    case "list":
        // Only invalidate list caches
        pattern := fmt.Sprintf("%s:list:*", r.tableName)
        if err := r.cache.DeletePattern(ctx, pattern); err != nil {
            r.logger.WarnContext(ctx, "Failed to invalidate cache pattern",
                "pattern", pattern,
                "error", err,
            )
        }
    }
}

// invalidateUserCache invalidates user-specific cache entries
func (r *userRepository) invalidateUserCache(ctx context.Context, userID string) {
    if r.cache == nil {
        return
    }
    
    keys := []string{
        fmt.Sprintf("user:id:%s", userID),
        fmt.Sprintf("user:email:*"), // Pattern for email-based cache
    }
    
    for _, key := range keys {
        if strings.Contains(key, "*") {
            r.cache.DeletePattern(ctx, key)
        } else {
            r.cache.Delete(ctx, key)
        }
    }
}
```

## Adding New Repositories

### Step 1: Define Entity and Interface

```go
// Product entity
type Product struct {
    ID          string    `json:"id" db:"id"`
    Name        string    `json:"name" db:"name"`
    Description string    `json:"description" db:"description"`
    Price       float64   `json:"price" db:"price"`
    CategoryID  string    `json:"category_id" db:"category_id"`
    IsActive    bool      `json:"is_active" db:"is_active"`
    CreatedAt   time.Time `json:"created_at" db:"created_at"`
    UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
}

// ProductRepository interface
type ProductRepository interface {
    BaseRepository[Product]
    
    // Product-specific methods
    GetByCategory(ctx context.Context, categoryID string, limit int) ([]*Product, error)
    GetActiveProducts(ctx context.Context, filter *ListFilter) ([]*Product, error)
    UpdatePrice(ctx context.Context, productID string, price float64) error
    SearchProducts(ctx context.Context, query string, limit int) ([]*Product, error)
    GetProductStats(ctx context.Context) (*ProductStats, error)
}

type ProductStats struct {
    TotalProducts  int64   `json:"total_products"`
    ActiveProducts int64   `json:"active_products"`
    AveragePrice   float64 `json:"average_price"`
}
```

### Step 2: Implement Repository

```go
// productRepository implements ProductRepository
type productRepository struct {
    *baseRepository[Product]
}

func NewProductRepository(db *database.Manager, logger logger.Logger, cache *cache.Cache) ProductRepository {
    return &productRepository{
        baseRepository: newBaseRepository[Product](db, logger, cache, "products"),
    }
}

// GetByCategory retrieves products by category
func (r *productRepository) GetByCategory(ctx context.Context, categoryID string, limit int) ([]*Product, error) {
    cacheKey := fmt.Sprintf("product:category:%s:limit:%d", categoryID, limit)
    var products []*Product
    
    if r.cache != nil {
        err := r.cache.Get(ctx, cacheKey, &products)
        if err == nil {
            return products, nil
        }
    }
    
    query := `
        SELECT id, name, description, price, category_id, is_active, created_at, updated_at
        FROM products
        WHERE category_id = $1 AND is_active = true AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT $2
    `
    
    var executor database.Executor
    if r.tx != nil {
        executor = r.tx
    } else {
        executor = r.db.GetDB()
    }
    
    start := time.Now()
    rows, err := executor.QueryContext(ctx, query, categoryID, limit)
    duration := time.Since(start)
    
    r.logger.LogQuery(ctx, query, []interface{}{categoryID, limit}, duration)
    
    if err != nil {
        return nil, r.handleDBError(err, "get_by_category")
    }
    defer rows.Close()
    
    products = make([]*Product, 0)
    for rows.Next() {
        var product Product
        err := rows.Scan(
            &product.ID, &product.Name, &product.Description, &product.Price,
            &product.CategoryID, &product.IsActive, &product.CreatedAt, &product.UpdatedAt,
        )
        if err != nil {
            return nil, errors.Wrap(err, "failed to scan product")
        }
        products = append(products, &product)
    }
    
    if r.cache != nil {
        r.cache.Set(ctx, cacheKey, products, 30*time.Minute)
    }
    
    return products, nil
}
```

### Step 3: Register Repository

```go
// In container registration
func (c *Container) RegisterRepositories() error {
    // Register product repository
    c.Singleton(func() repository.ProductRepository {
        return repository.NewProductRepository(
            c.MustResolve("database").(*database.Manager),
            c.MustResolve("logger").(logger.Logger),
            c.MustResolve("cache").(*cache.Cache),
        )
    })
    
    return nil
}
```

## Development Workflow

### 1. Repository Development Pattern

```bash
# 1. Define database schema
vim migrations/001_create_products_table.up.sql

# 2. Define entity struct
vim internal/repository/entities.go

# 3. Define repository interface
vim internal/repository/interfaces.go

# 4. Implement repository
vim internal/repository/product_repository.go

# 5. Write tests
vim internal/repository/product_repository_test.go

# 6. Register in container
vim internal/container/repositories.go

# 7. Run tests
go test ./internal/repository/...
```

### 2. Testing Repositories

```go
// product_repository_test.go
func TestProductRepository_GetByCategory(t *testing.T) {
    // Setup test database
    db := setupTestDB(t)
    defer db.Close()
    
    logger := logger.NewNoop()
    cache := setupTestCache(t)
    
    repo := NewProductRepository(db, logger, cache)
    
    // Create test data
    categoryID := "cat-123"
    products := []*Product{
        {
            ID:         "prod-1",
            Name:       "Product 1",
            CategoryID: categoryID,
            IsActive:   true,
        },
        {
            ID:         "prod-2",
            Name:       "Product 2",
            CategoryID: categoryID,
            IsActive:   true,
        },
    }
    
    for _, product := range products {
        err := repo.Create(context.Background(), product)
        require.NoError(t, err)
    }
    
    // Test retrieval
    result, err := repo.GetByCategory(context.Background(), categoryID, 10)
    require.NoError(t, err)
    assert.Len(t, result, 2)
    
    // Test caching
    result2, err := repo.GetByCategory(context.Background(), categoryID, 10)
    require.NoError(t, err)
    assert.Equal(t, result, result2)
}

func setupTestDB(t *testing.T) *database.Manager {
    // Setup test database connection
    config := &database.Config{
        Host:     "localhost",
        Port:     5432,
        Database: "test_db",
        Username: "test_user",
        Password: "test_pass",
    }
    
    db, err := database.NewManager(config, logger.NewNoop())
    require.NoError(t, err)
    
    // Run migrations
    err = db.RunMigrations("file://../../migrations")
    require.NoError(t, err)
    
    return db
}
```

## Best Practices

### 1. Query Optimization

```go
// ✅ Good: Optimized query with proper indexing
func (r *userRepository) GetActiveUsersByRole(ctx context.Context, role string, limit int) ([]*User, error) {
    query := `
        SELECT u.id, u.email, u.first_name, u.last_name, u.created_at
        FROM users u
        INNER JOIN user_roles ur ON u.id = ur.user_id
        INNER JOIN roles r ON ur.role_id = r.id
        WHERE u.is_active = true 
          AND u.deleted_at IS NULL 
          AND r.name = $1
        ORDER BY u.last_login_at DESC NULLS LAST
        LIMIT $2
    `
    // This query assumes proper indexes on:
    // - users(is_active, deleted_at, last_login_at)
    // - user_roles(user_id, role_id)
    // - roles(name)
    
    // ... implementation
}

// ❌ Bad: Inefficient query without proper joins
func BadGetActiveUsersByRole(ctx context.Context, role string) ([]*User, error) {
    // First get all users
    users, _ := getAllUsers(ctx)
    
    // Then filter in application code
    var result []*User
    for _, user := range users {
        if user.IsActive && hasRole(user.ID, role) {
            result = append(result, user)
        }
    }
    return result, nil
}
```

### 2. Error Handling

```go
// ✅ Good: Comprehensive error handling
func (r *userRepository) CreateUser(ctx context.Context, user *User) error {
    query := `
        INSERT INTO users (id, email, password_hash, first_name, last_name, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `
    
    _, err := r.db.ExecContext(ctx, query, user.ID, user.Email, user.PasswordHash, user.FirstName, user.LastName)
    if err != nil {
        // Handle specific database errors
        if pqErr, ok := err.(*pq.Error); ok {
            switch pqErr.Code {
            case "23505": // unique_violation
                if strings.Contains(pqErr.Constraint, "email") {
                    return errors.NewConflictError("user", "email", "Email already exists")
                }
                return errors.NewConflictError("user", "unknown", "User already exists")
            case "23503": // foreign_key_violation
                return errors.NewInvalidInputError("foreign_key", "Referenced entity does not exist")
            case "23514": // check_violation
                return errors.NewValidationError(fmt.Sprintf("Check constraint violation: %s", pqErr.Constraint))
            }
        }
        
        return errors.Wrap(err, "failed to create user")
    }
    
    return nil
}

// ❌ Bad: Generic error handling
func BadCreateUser(ctx context.Context, user *User) error {
    _, err := db.Exec("INSERT INTO users ...", user.ID, user.Email)
    if err != nil {
        return err // No context about what went wrong
    }
    return nil
}
```

### 3. Transaction Usage

```go
// ✅ Good: Proper transaction management
func (s *UserService) CreateUserWithRoles(ctx context.Context, req *CreateUserRequest) (*User, error) {
    return s.txManager.WithTransaction(ctx, func(ctx context.Context, tx *sql.Tx) (*User, error) {
        // Create user
        user := &User{
            ID:        uuid.New().String(),
            Email:     req.Email,
            FirstName: req.FirstName,
            LastName:  req.LastName,
        }
        
        userRepo := s.userRepo.WithTx(tx)
        if err := userRepo.Create(ctx, user); err != nil {
            return nil, err
        }
        
        // Assign roles
        roleRepo := s.roleRepo.WithTx(tx)
        for _, roleName := range req.Roles {
            role, err := roleRepo.GetByName(ctx, roleName)
            if err != nil {
                return nil, err
            }
            
            userRole := &UserRole{
                UserID: user.ID,
                RoleID: role.ID,
            }
            
            if err := roleRepo.AssignUserRole(ctx, userRole); err != nil {
                return nil, err
            }
        }
        
        return user, nil
    })
}

// ❌ Bad: No transaction management
func BadCreateUserWithRoles(ctx context.Context, req *CreateUserRequest) (*User, error) {
    // Create user
    user, err := userRepo.Create(ctx, user)
    if err != nil {
        return nil, err
    }
    
    // Assign roles (if this fails, user is created but has no roles)
    for _, roleName := range req.Roles {
        role, _ := roleRepo.GetByName(ctx, roleName)
        roleRepo.AssignUserRole(ctx, &UserRole{UserID: user.ID, RoleID: role.ID})
    }
    
    return user, nil
}
```

The repository package provides a solid foundation for data access, ensuring consistency, performance, and maintainability across all database operations in the application.