package postgres

import (
	"context"
	"database/sql"
	"log/slog"
	"time"

	"github.com/google/uuid"

	"github.com/Srivathsav-max/lumen/backend/internal/database"
	"github.com/Srivathsav-max/lumen/backend/internal/repository"
)

type CommentRepository struct {
	*repository.BaseRepository
}

func NewCommentRepository(db database.Manager, logger *slog.Logger) repository.CommentRepository {
	return &CommentRepository{
		BaseRepository: repository.NewBaseRepository(db, logger, "comments"),
	}
}

func (r *CommentRepository) Create(ctx context.Context, comment *repository.Comment) error {
	if comment.ID == "" {
		comment.ID = uuid.New().String()
	}

	query := `
		INSERT INTO comments (id, page_id, block_id, parent_comment_id, author_id, content,
							 is_resolved, resolved_by, resolved_at, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`

	now := time.Now().UTC()
	comment.CreatedAt = now
	comment.UpdatedAt = now

	_, err := r.ExecuteCommand(ctx, query,
		comment.ID,
		comment.PageID,
		comment.BlockID,
		comment.ParentCommentID,
		comment.AuthorID,
		comment.Content,
		comment.IsResolved,
		comment.ResolvedBy,
		comment.ResolvedAt,
		comment.CreatedAt,
		comment.UpdatedAt,
	)

	if err != nil {
		return r.HandleSQLError(err, "create comment")
	}

	r.GetLogger().Info("Comment created successfully",
		"comment_id", comment.ID,
		"page_id", comment.PageID,
		"author_id", comment.AuthorID,
		"block_id", comment.BlockID)

	return nil
}

func (r *CommentRepository) GetByID(ctx context.Context, id string) (*repository.Comment, error) {
	query := `
		SELECT id, page_id, block_id, parent_comment_id, author_id, content,
			   is_resolved, resolved_by, resolved_at, created_at, updated_at
		FROM comments 
		WHERE id = $1`

	comment := &repository.Comment{}
	row := r.ExecuteQueryRow(ctx, query, id)

	err := row.Scan(
		&comment.ID,
		&comment.PageID,
		&comment.BlockID,
		&comment.ParentCommentID,
		&comment.AuthorID,
		&comment.Content,
		&comment.IsResolved,
		&comment.ResolvedBy,
		&comment.ResolvedAt,
		&comment.CreatedAt,
		&comment.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, r.HandleSQLError(err, "get comment by id")
	}

	return comment, nil
}

func (r *CommentRepository) GetByPageID(ctx context.Context, pageID string) ([]*repository.Comment, error) {
	query := `
		SELECT id, page_id, block_id, parent_comment_id, author_id, content,
			   is_resolved, resolved_by, resolved_at, created_at, updated_at
		FROM comments 
		WHERE page_id = $1
		ORDER BY created_at ASC`

	rows, err := r.ExecuteQuery(ctx, query, pageID)
	if err != nil {
		return nil, r.HandleSQLError(err, "get comments by page id")
	}
	defer rows.Close()

	var comments []*repository.Comment
	for rows.Next() {
		comment := &repository.Comment{}
		err := rows.Scan(
			&comment.ID,
			&comment.PageID,
			&comment.BlockID,
			&comment.ParentCommentID,
			&comment.AuthorID,
			&comment.Content,
			&comment.IsResolved,
			&comment.ResolvedBy,
			&comment.ResolvedAt,
			&comment.CreatedAt,
			&comment.UpdatedAt,
		)
		if err != nil {
			return nil, r.HandleSQLError(err, "scan comment")
		}
		comments = append(comments, comment)
	}

	return comments, nil
}

func (r *CommentRepository) GetByBlockID(ctx context.Context, blockID string) ([]*repository.Comment, error) {
	query := `
		SELECT id, page_id, block_id, parent_comment_id, author_id, content,
			   is_resolved, resolved_by, resolved_at, created_at, updated_at
		FROM comments 
		WHERE block_id = $1
		ORDER BY created_at ASC`

	rows, err := r.ExecuteQuery(ctx, query, blockID)
	if err != nil {
		return nil, r.HandleSQLError(err, "get comments by block id")
	}
	defer rows.Close()

	var comments []*repository.Comment
	for rows.Next() {
		comment := &repository.Comment{}
		err := rows.Scan(
			&comment.ID,
			&comment.PageID,
			&comment.BlockID,
			&comment.ParentCommentID,
			&comment.AuthorID,
			&comment.Content,
			&comment.IsResolved,
			&comment.ResolvedBy,
			&comment.ResolvedAt,
			&comment.CreatedAt,
			&comment.UpdatedAt,
		)
		if err != nil {
			return nil, r.HandleSQLError(err, "scan comment")
		}
		comments = append(comments, comment)
	}

	return comments, nil
}

func (r *CommentRepository) GetReplies(ctx context.Context, parentCommentID string) ([]*repository.Comment, error) {
	query := `
		SELECT id, page_id, block_id, parent_comment_id, author_id, content,
			   is_resolved, resolved_by, resolved_at, created_at, updated_at
		FROM comments 
		WHERE parent_comment_id = $1
		ORDER BY created_at ASC`

	rows, err := r.ExecuteQuery(ctx, query, parentCommentID)
	if err != nil {
		return nil, r.HandleSQLError(err, "get comment replies")
	}
	defer rows.Close()

	var comments []*repository.Comment
	for rows.Next() {
		comment := &repository.Comment{}
		err := rows.Scan(
			&comment.ID,
			&comment.PageID,
			&comment.BlockID,
			&comment.ParentCommentID,
			&comment.AuthorID,
			&comment.Content,
			&comment.IsResolved,
			&comment.ResolvedBy,
			&comment.ResolvedAt,
			&comment.CreatedAt,
			&comment.UpdatedAt,
		)
		if err != nil {
			return nil, r.HandleSQLError(err, "scan comment")
		}
		comments = append(comments, comment)
	}

	return comments, nil
}

func (r *CommentRepository) Update(ctx context.Context, comment *repository.Comment) error {
	query := `
		UPDATE comments 
		SET content = $1, updated_at = $2
		WHERE id = $3`

	comment.UpdatedAt = time.Now().UTC()

	_, err := r.ExecuteCommand(ctx, query,
		comment.Content,
		comment.UpdatedAt,
		comment.ID,
	)

	if err != nil {
		return r.HandleSQLError(err, "update comment")
	}

	r.GetLogger().Info("Comment updated successfully", "comment_id", comment.ID)
	return nil
}

func (r *CommentRepository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM comments WHERE id = $1`

	_, err := r.ExecuteCommand(ctx, query, id)
	if err != nil {
		return r.HandleSQLError(err, "delete comment")
	}

	r.GetLogger().Info("Comment deleted successfully", "comment_id", id)
	return nil
}

func (r *CommentRepository) Resolve(ctx context.Context, id string, resolvedBy int64) error {
	query := `
		UPDATE comments 
		SET is_resolved = TRUE, resolved_by = $1, resolved_at = $2, updated_at = $2
		WHERE id = $3`

	now := time.Now().UTC()

	_, err := r.ExecuteCommand(ctx, query, resolvedBy, now, id)
	if err != nil {
		return r.HandleSQLError(err, "resolve comment")
	}

	r.GetLogger().Info("Comment resolved successfully",
		"comment_id", id,
		"resolved_by", resolvedBy)

	return nil
}

func (r *CommentRepository) Unresolve(ctx context.Context, id string) error {
	query := `
		UPDATE comments 
		SET is_resolved = FALSE, resolved_by = NULL, resolved_at = NULL, updated_at = $1
		WHERE id = $2`

	now := time.Now().UTC()

	_, err := r.ExecuteCommand(ctx, query, now, id)
	if err != nil {
		return r.HandleSQLError(err, "unresolve comment")
	}

	r.GetLogger().Info("Comment unresolved successfully", "comment_id", id)
	return nil
}

func (r *CommentRepository) GetUnresolved(ctx context.Context, pageID string) ([]*repository.Comment, error) {
	query := `
		SELECT id, page_id, block_id, parent_comment_id, author_id, content,
			   is_resolved, resolved_by, resolved_at, created_at, updated_at
		FROM comments 
		WHERE page_id = $1 AND is_resolved = FALSE
		ORDER BY created_at ASC`

	rows, err := r.ExecuteQuery(ctx, query, pageID)
	if err != nil {
		return nil, r.HandleSQLError(err, "get unresolved comments")
	}
	defer rows.Close()

	var comments []*repository.Comment
	for rows.Next() {
		comment := &repository.Comment{}
		err := rows.Scan(
			&comment.ID,
			&comment.PageID,
			&comment.BlockID,
			&comment.ParentCommentID,
			&comment.AuthorID,
			&comment.Content,
			&comment.IsResolved,
			&comment.ResolvedBy,
			&comment.ResolvedAt,
			&comment.CreatedAt,
			&comment.UpdatedAt,
		)
		if err != nil {
			return nil, r.HandleSQLError(err, "scan comment")
		}
		comments = append(comments, comment)
	}

	return comments, nil
}