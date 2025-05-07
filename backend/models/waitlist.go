package models

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/Srivathsav-max/lumen/backend/db"
)

// WaitlistEntry represents a user in the waitlist
type WaitlistEntry struct {
	ID        int64     `json:"id"`
	Email     string    `json:"email"`
	Name      string    `json:"name,omitempty"`
	Status    string    `json:"status"`
	Notes     string    `json:"notes,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// WaitlistRepository defines the interface for waitlist data operations
type WaitlistRepository interface {
	GetAll() ([]*WaitlistEntry, error)
	GetByID(id int64) (*WaitlistEntry, error)
	GetByEmail(email string) (*WaitlistEntry, error)
	Create(entry *WaitlistEntry) error
	Update(entry *WaitlistEntry) error
	Delete(id int64) error
}

// PostgresWaitlistRepository implements WaitlistRepository interface using PostgreSQL
type PostgresWaitlistRepository struct {
	db *db.DB
}

// NewWaitlistRepository creates a new PostgresWaitlistRepository
func NewWaitlistRepository(db *db.DB) WaitlistRepository {
	return &PostgresWaitlistRepository{db: db}
}

// GetAll retrieves all waitlist entries
func (r *PostgresWaitlistRepository) GetAll() ([]*WaitlistEntry, error) {
	query := `
		SELECT id, email, name, status, notes, created_at, updated_at 
		FROM waitlist 
		ORDER BY created_at DESC
	`
	
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("error getting all waitlist entries: %w", err)
	}
	defer rows.Close()
	
	var entries []*WaitlistEntry
	for rows.Next() {
		var entry WaitlistEntry
		var name, notes sql.NullString
		
		err := rows.Scan(
			&entry.ID,
			&entry.Email,
			&name,
			&entry.Status,
			&notes,
			&entry.CreatedAt,
			&entry.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("error scanning waitlist entry: %w", err)
		}
		
		if name.Valid {
			entry.Name = name.String
		}
		
		if notes.Valid {
			entry.Notes = notes.String
		}
		
		entries = append(entries, &entry)
	}
	
	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating waitlist entries: %w", err)
	}
	
	return entries, nil
}

// GetByID retrieves a waitlist entry by its ID
func (r *PostgresWaitlistRepository) GetByID(id int64) (*WaitlistEntry, error) {
	query := `
		SELECT id, email, name, status, notes, created_at, updated_at 
		FROM waitlist 
		WHERE id = $1
	`
	
	var entry WaitlistEntry
	var name, notes sql.NullString
	
	err := r.db.QueryRow(query, id).Scan(
		&entry.ID,
		&entry.Email,
		&name,
		&entry.Status,
		&notes,
		&entry.CreatedAt,
		&entry.UpdatedAt,
	)
	
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("error getting waitlist entry by ID: %w", err)
	}
	
	if name.Valid {
		entry.Name = name.String
	}
	
	if notes.Valid {
		entry.Notes = notes.String
	}
	
	return &entry, nil
}

// GetByEmail retrieves a waitlist entry by email
func (r *PostgresWaitlistRepository) GetByEmail(email string) (*WaitlistEntry, error) {
	query := `
		SELECT id, email, name, status, notes, created_at, updated_at 
		FROM waitlist 
		WHERE email = $1
	`
	
	var entry WaitlistEntry
	var name, notes sql.NullString
	
	err := r.db.QueryRow(query, email).Scan(
		&entry.ID,
		&entry.Email,
		&name,
		&entry.Status,
		&notes,
		&entry.CreatedAt,
		&entry.UpdatedAt,
	)
	
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("error getting waitlist entry by email: %w", err)
	}
	
	if name.Valid {
		entry.Name = name.String
	}
	
	if notes.Valid {
		entry.Notes = notes.String
	}
	
	return &entry, nil
}

// Create creates a new waitlist entry
func (r *PostgresWaitlistRepository) Create(entry *WaitlistEntry) error {
	query := `
		INSERT INTO waitlist (email, name, status, notes, created_at, updated_at) 
		VALUES ($1, $2, $3, $4, $5, $5) 
		RETURNING id, created_at, updated_at
	`
	
	now := time.Now()
	
	// Use SQL null values for optional fields
	var nameParam, notesParam interface{}
	if entry.Name != "" {
		nameParam = entry.Name
	} else {
		nameParam = nil
	}
	
	if entry.Notes != "" {
		notesParam = entry.Notes
	} else {
		notesParam = nil
	}
	
	// Default status to 'pending' if not provided
	status := entry.Status
	if status == "" {
		status = "pending"
	}
	
	err := r.db.QueryRow(
		query, 
		entry.Email,
		nameParam,
		status,
		notesParam,
		now,
	).Scan(
		&entry.ID,
		&entry.CreatedAt,
		&entry.UpdatedAt,
	)
	
	if err != nil {
		return fmt.Errorf("error creating waitlist entry: %w", err)
	}
	
	return nil
}

// Update updates an existing waitlist entry
func (r *PostgresWaitlistRepository) Update(entry *WaitlistEntry) error {
	query := `
		UPDATE waitlist 
		SET email = $1, name = $2, status = $3, notes = $4, updated_at = $5 
		WHERE id = $6
	`
	
	now := time.Now()
	
	// Use SQL null values for optional fields
	var nameParam, notesParam interface{}
	if entry.Name != "" {
		nameParam = entry.Name
	} else {
		nameParam = nil
	}
	
	if entry.Notes != "" {
		notesParam = entry.Notes
	} else {
		notesParam = nil
	}
	
	result, err := r.db.Exec(
		query, 
		entry.Email,
		nameParam,
		entry.Status,
		notesParam,
		now,
		entry.ID,
	)
	
	if err != nil {
		return fmt.Errorf("error updating waitlist entry: %w", err)
	}
	
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("error getting rows affected: %w", err)
	}
	
	if rowsAffected == 0 {
		return fmt.Errorf("waitlist entry with ID %d not found", entry.ID)
	}
	
	entry.UpdatedAt = now
	return nil
}

// Delete deletes a waitlist entry by its ID
func (r *PostgresWaitlistRepository) Delete(id int64) error {
	query := `DELETE FROM waitlist WHERE id = $1`
	
	result, err := r.db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("error deleting waitlist entry: %w", err)
	}
	
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("error getting rows affected: %w", err)
	}
	
	if rowsAffected == 0 {
		return fmt.Errorf("waitlist entry with ID %d not found", id)
	}
	
	return nil
}
