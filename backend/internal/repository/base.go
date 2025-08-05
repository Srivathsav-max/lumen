package repository

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"strings"

	"github.com/Srivathsav-max/lumen/backend/internal/database"
	"github.com/Srivathsav-max/lumen/backend/internal/errors"
)

// BaseRepository provides common repository functionality
type BaseRepository struct {
	db     database.Manager
	logger *slog.Logger
	table  string
}

// NewBaseRepository creates a new base repository
func NewBaseRepository(db database.Manager, logger *slog.Logger, table string) *BaseRepository {
	return &BaseRepository{
		db:     db,
		logger: logger,
		table:  table,
	}
}

// GetDB returns the database manager
func (r *BaseRepository) GetDB() database.Manager {
	return r.db
}

// GetLogger returns the logger
func (r *BaseRepository) GetLogger() *slog.Logger {
	return r.logger
}

// GetTable returns the table name
func (r *BaseRepository) GetTable() string {
	return r.table
}

// ExecuteQuery executes a query and returns the result
func (r *BaseRepository) ExecuteQuery(ctx context.Context, query string, args ...interface{}) (*sql.Rows, error) {
	r.logger.Debug("Executing query",
		"query", query,
		"args", args,
		"table", r.table,
	)

	rows, err := r.db.GetDB().QueryContext(ctx, query, args...)
	if err != nil {
		r.logger.Error("Query execution failed",
			"query", query,
			"error", err,
			"table", r.table,
		)
		return nil, errors.NewDatabaseError("Query execution failed", err)
	}

	return rows, nil
}

// ExecuteQueryRow executes a query that returns a single row
func (r *BaseRepository) ExecuteQueryRow(ctx context.Context, query string, args ...interface{}) *sql.Row {
	r.logger.Debug("Executing query row",
		"query", query,
		"args", args,
		"table", r.table,
	)

	return r.db.GetDB().QueryRowContext(ctx, query, args...)
}

// ExecuteExec executes a query that doesn't return rows
func (r *BaseRepository) ExecuteExec(ctx context.Context, query string, args ...interface{}) (sql.Result, error) {
	r.logger.Debug("Executing exec",
		"query", query,
		"args", args,
		"table", r.table,
	)

	result, err := r.db.GetDB().ExecContext(ctx, query, args...)
	if err != nil {
		r.logger.Error("Exec execution failed",
			"query", query,
			"error", err,
			"table", r.table,
		)
		return nil, errors.NewDatabaseError("Exec execution failed", err)
	}

	return result, nil
}

// ExecuteInTransaction executes a function within a transaction
func (r *BaseRepository) ExecuteInTransaction(ctx context.Context, fn func(*sql.Tx) error) error {
	return r.db.WithTransaction(ctx, fn)
}

// BuildSelectQuery builds a SELECT query with optional WHERE conditions
func (r *BaseRepository) BuildSelectQuery(columns []string, whereConditions map[string]interface{}, orderBy string, limit, offset int) (string, []interface{}) {
	query := fmt.Sprintf("SELECT %s FROM %s", strings.Join(columns, ", "), r.table)
	args := make([]interface{}, 0)
	argIndex := 1

	// Add WHERE conditions
	if len(whereConditions) > 0 {
		whereClauses := make([]string, 0, len(whereConditions))
		for column, value := range whereConditions {
			whereClauses = append(whereClauses, fmt.Sprintf("%s = $%d", column, argIndex))
			args = append(args, value)
			argIndex++
		}
		query += " WHERE " + strings.Join(whereClauses, " AND ")
	}

	// Add ORDER BY
	if orderBy != "" {
		query += " ORDER BY " + orderBy
	}

	// Add LIMIT and OFFSET
	if limit > 0 {
		query += fmt.Sprintf(" LIMIT $%d", argIndex)
		args = append(args, limit)
		argIndex++
	}

	if offset > 0 {
		query += fmt.Sprintf(" OFFSET $%d", argIndex)
		args = append(args, offset)
	}

	return query, args
}

// BuildInsertQuery builds an INSERT query
func (r *BaseRepository) BuildInsertQuery(columns []string, returning string) (string, int) {
	placeholders := make([]string, len(columns))
	for i := range placeholders {
		placeholders[i] = fmt.Sprintf("$%d", i+1)
	}

	query := fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s)",
		r.table,
		strings.Join(columns, ", "),
		strings.Join(placeholders, ", "),
	)

	if returning != "" {
		query += " RETURNING " + returning
	}

	return query, len(columns)
}

// BuildUpdateQuery builds an UPDATE query
func (r *BaseRepository) BuildUpdateQuery(columns []string, whereColumn string, returning string) (string, int) {
	setClauses := make([]string, len(columns))
	for i, column := range columns {
		setClauses[i] = fmt.Sprintf("%s = $%d", column, i+1)
	}

	query := fmt.Sprintf("UPDATE %s SET %s WHERE %s = $%d",
		r.table,
		strings.Join(setClauses, ", "),
		whereColumn,
		len(columns)+1,
	)

	if returning != "" {
		query += " RETURNING " + returning
	}

	return query, len(columns) + 1
}

// BuildDeleteQuery builds a DELETE query
func (r *BaseRepository) BuildDeleteQuery(whereColumn string) string {
	return fmt.Sprintf("DELETE FROM %s WHERE %s = $1", r.table, whereColumn)
}

// HandleSQLError converts SQL errors to appropriate application errors
func (r *BaseRepository) HandleSQLError(err error, operation string) error {
	if err == nil {
		return nil
	}

	if err == sql.ErrNoRows {
		return errors.NewNotFoundError(r.table)
	}

	// Check for common PostgreSQL errors
	errStr := err.Error()
	switch {
	case strings.Contains(errStr, "duplicate key"):
		return errors.NewConflictError("Resource already exists", errStr)
	case strings.Contains(errStr, "foreign key"):
		return errors.NewValidationError("Foreign key constraint violation", errStr)
	case strings.Contains(errStr, "check constraint"):
		return errors.NewValidationError("Check constraint violation", errStr)
	case strings.Contains(errStr, "not null"):
		return errors.NewValidationError("Required field is missing", errStr)
	default:
		r.logger.Error("Database operation failed",
			"operation", operation,
			"table", r.table,
			"error", err,
		)
		return errors.NewDatabaseError(fmt.Sprintf("%s operation failed", operation), err)
	}
}