package postgres

import (
	"context"
	"database/sql"
	"log/slog"
	"strings"
	"time"

	"github.com/Srivathsav-max/lumen/backend/internal/database"
	"github.com/Srivathsav-max/lumen/backend/internal/repository"
)

type WaitlistRepository struct {
	*repository.BaseRepository
}

func NewWaitlistRepository(db database.Manager, logger *slog.Logger) repository.WaitlistRepository {
	return &WaitlistRepository{
		BaseRepository: repository.NewBaseRepository(db, logger, "waitlist"),
	}
}

func (r *WaitlistRepository) Create(ctx context.Context, waitlist *repository.WaitlistEntry) error {
	query := `
		INSERT INTO waitlist (email, name, notes, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id`

	now := time.Now().UTC()
	waitlist.CreatedAt = now
	waitlist.UpdatedAt = now

	name := ""
	if waitlist.FirstName != "" || waitlist.LastName != "" {
		name = waitlist.FirstName + " " + waitlist.LastName
	}

	row := r.ExecuteQueryRow(ctx, query,
		waitlist.Email,
		name,
		waitlist.Reason,
		waitlist.Status,
		waitlist.CreatedAt,
		waitlist.UpdatedAt,
	)

	if err := row.Scan(&waitlist.ID); err != nil {
		return r.HandleSQLError(err, "create waitlist entry")
	}

	r.GetLogger().Info("Waitlist entry created successfully",
		"waitlist_id", waitlist.ID,
		"email", waitlist.Email,
		"status", waitlist.Status,
	)

	return nil
}

func (r *WaitlistRepository) GetByID(ctx context.Context, id int64) (*repository.WaitlistEntry, error) {
	query := `
		SELECT id, email, name, notes, status, created_at, updated_at
		FROM waitlist
		WHERE id = $1`

	waitlist := &repository.WaitlistEntry{}
	row := r.ExecuteQueryRow(ctx, query, id)

	var name sql.NullString
	var notes sql.NullString
	err := row.Scan(
		&waitlist.ID,
		&waitlist.Email,
		&name,
		&notes,
		&waitlist.Status,
		&waitlist.CreatedAt,
		&waitlist.UpdatedAt,
	)

	if err != nil {
		return nil, r.HandleSQLError(err, "get waitlist entry by ID")
	}

	if notes.Valid {
		waitlist.Reason = notes.String
	}

	if name.Valid && name.String != "" {
		parts := strings.Fields(name.String)
		if len(parts) > 0 {
			waitlist.FirstName = parts[0]
			if len(parts) > 1 {
				waitlist.LastName = strings.Join(parts[1:], " ")
			}
		}
	}

	return waitlist, nil
}

func (r *WaitlistRepository) GetByEmail(ctx context.Context, email string) (*repository.WaitlistEntry, error) {
	query := `
		SELECT id, email, name, notes, status, created_at, updated_at
		FROM waitlist
		WHERE email = $1`

	waitlist := &repository.WaitlistEntry{}
	row := r.ExecuteQueryRow(ctx, query, email)

	var name sql.NullString
	var notes sql.NullString
	err := row.Scan(
		&waitlist.ID,
		&waitlist.Email,
		&name,
		&notes,
		&waitlist.Status,
		&waitlist.CreatedAt,
		&waitlist.UpdatedAt,
	)

	if err != nil {
		return nil, r.HandleSQLError(err, "get waitlist entry by email")
	}

	if notes.Valid {
		waitlist.Reason = notes.String
	}

	if name.Valid && name.String != "" {
		parts := strings.Fields(name.String)
		if len(parts) > 0 {
			waitlist.FirstName = parts[0]
			if len(parts) > 1 {
				waitlist.LastName = strings.Join(parts[1:], " ")
			}
		}
	}

	return waitlist, nil
}

func (r *WaitlistRepository) Update(ctx context.Context, waitlist *repository.WaitlistEntry) error {
	query := `
		UPDATE waitlist
		SET email = $1, name = $2, notes = $3, status = $4, updated_at = $5
		WHERE id = $6`

	waitlist.UpdatedAt = time.Now().UTC()

	name := ""
	if waitlist.FirstName != "" || waitlist.LastName != "" {
		name = waitlist.FirstName + " " + waitlist.LastName
	}

	result, err := r.ExecuteExec(ctx, query,
		waitlist.Email,
		name,
		waitlist.Reason,
		waitlist.Status,
		waitlist.UpdatedAt,
		waitlist.ID,
	)

	if err != nil {
		return r.HandleSQLError(err, "update waitlist entry")
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return r.HandleSQLError(err, "get rows affected")
	}

	if rowsAffected == 0 {
		return r.HandleSQLError(sql.ErrNoRows, "update waitlist entry")
	}

	r.GetLogger().Info("Waitlist entry updated successfully",
		"waitlist_id", waitlist.ID,
		"email", waitlist.Email,
		"status", waitlist.Status,
	)

	return nil
}

func (r *WaitlistRepository) Delete(ctx context.Context, id int64) error {
	query := `DELETE FROM waitlist WHERE id = $1`

	result, err := r.ExecuteExec(ctx, query, id)
	if err != nil {
		return r.HandleSQLError(err, "delete waitlist entry")
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return r.HandleSQLError(err, "get rows affected")
	}

	if rowsAffected == 0 {
		return r.HandleSQLError(sql.ErrNoRows, "delete waitlist entry")
	}

	r.GetLogger().Info("Waitlist entry deleted successfully", "waitlist_id", id)
	return nil
}

func (r *WaitlistRepository) List(ctx context.Context, limit, offset int) ([]*repository.WaitlistEntry, error) {
	query := `
		SELECT id, email, name, notes, status, created_at, updated_at
		FROM waitlist
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2`

	rows, err := r.ExecuteQuery(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var waitlists []*repository.WaitlistEntry
	for rows.Next() {
		waitlist := &repository.WaitlistEntry{}
		var name sql.NullString
		var notes sql.NullString
		err := rows.Scan(
			&waitlist.ID,
			&waitlist.Email,
			&name,
			&notes,
			&waitlist.Status,
			&waitlist.CreatedAt,
			&waitlist.UpdatedAt,
		)
		if err != nil {
			return nil, r.HandleSQLError(err, "scan waitlist entry")
		}

		if notes.Valid {
			waitlist.Reason = notes.String
		}

		if name.Valid && name.String != "" {
			parts := strings.Fields(name.String)
			if len(parts) > 0 {
				waitlist.FirstName = parts[0]
				if len(parts) > 1 {
					waitlist.LastName = strings.Join(parts[1:], " ")
				}
			}
		}

		waitlists = append(waitlists, waitlist)
	}

	if err := rows.Err(); err != nil {
		return nil, r.HandleSQLError(err, "iterate waitlist entries")
	}

	return waitlists, nil
}

func (r *WaitlistRepository) Count(ctx context.Context) (int64, error) {
	query := `SELECT COUNT(*) FROM waitlist`

	var count int64
	row := r.ExecuteQueryRow(ctx, query)

	if err := row.Scan(&count); err != nil {
		return 0, r.HandleSQLError(err, "count waitlist entries")
	}

	return count, nil
}

func (r *WaitlistRepository) ExistsByEmail(ctx context.Context, email string) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM waitlist WHERE email = $1)`

	var exists bool
	row := r.ExecuteQueryRow(ctx, query, email)

	if err := row.Scan(&exists); err != nil {
		return false, r.HandleSQLError(err, "check waitlist entry exists by email")
	}

	return exists, nil
}

func (r *WaitlistRepository) DeleteByEmail(ctx context.Context, email string) error {
	query := `DELETE FROM waitlist WHERE email = $1`

	result, err := r.ExecuteExec(ctx, query, email)
	if err != nil {
		return r.HandleSQLError(err, "delete waitlist entry by email")
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return r.HandleSQLError(err, "get rows affected")
	}

	if rowsAffected == 0 {
		return r.HandleSQLError(sql.ErrNoRows, "delete waitlist entry by email")
	}

	r.GetLogger().Info("Waitlist entry deleted successfully", "email", email)
	return nil
}

func (r *WaitlistRepository) GetPaginated(ctx context.Context, limit, offset int, status, search string) ([]*repository.WaitlistEntry, error) {
	query := `
		SELECT id, email, name, notes, status, created_at, updated_at
		FROM waitlist
		WHERE ($3 = '' OR status = $3)
		AND ($4 = '' OR email ILIKE '%' || $4 || '%' OR name ILIKE '%' || $4 || '%' OR notes ILIKE '%' || $4 || '%')
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2`

	rows, err := r.ExecuteQuery(ctx, query, limit, offset, status, search)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var waitlists []*repository.WaitlistEntry
	for rows.Next() {
		waitlist := &repository.WaitlistEntry{}
		var name sql.NullString
		var notes sql.NullString
		err := rows.Scan(
			&waitlist.ID,
			&waitlist.Email,
			&name,
			&notes,
			&waitlist.Status,
			&waitlist.CreatedAt,
			&waitlist.UpdatedAt,
		)
		if err != nil {
			return nil, r.HandleSQLError(err, "scan waitlist entry")
		}

		if notes.Valid {
			waitlist.Reason = notes.String
		}

		if name.Valid && name.String != "" {
			parts := strings.Fields(name.String)
			if len(parts) > 0 {
				waitlist.FirstName = parts[0]
				if len(parts) > 1 {
					waitlist.LastName = strings.Join(parts[1:], " ")
				}
			}
		}

		waitlists = append(waitlists, waitlist)
	}

	if err := rows.Err(); err != nil {
		return nil, r.HandleSQLError(err, "iterate waitlist entries")
	}

	return waitlists, nil
}

func (r *WaitlistRepository) GetTotalCount(ctx context.Context, status, search string) (int64, error) {
	query := `
		SELECT COUNT(*)
		FROM waitlist
		WHERE ($1 = '' OR status = $1)
		AND ($2 = '' OR email ILIKE '%' || $2 || '%' OR name ILIKE '%' || $2 || '%' OR notes ILIKE '%' || $2 || '%')`

	var count int64
	row := r.ExecuteQueryRow(ctx, query, status, search)

	if err := row.Scan(&count); err != nil {
		return 0, r.HandleSQLError(err, "count waitlist entries")
	}

	return count, nil
}

func (r *WaitlistRepository) GetPositionByEmail(ctx context.Context, email string) (int, error) {
	query := `
		SELECT COUNT(*) + 1
		FROM waitlist w1
		WHERE w1.status = 'pending'
		AND w1.created_at < (
			SELECT w2.created_at
			FROM waitlist w2
			WHERE w2.email = $1
		)`

	var position int
	row := r.ExecuteQueryRow(ctx, query, email)

	if err := row.Scan(&position); err != nil {
		return 0, r.HandleSQLError(err, "get waitlist position")
	}

	return position, nil
}
