package postgres

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log/slog"

	"github.com/Srivathsav-max/lumen/backend/internal/database"
	"github.com/Srivathsav-max/lumen/backend/internal/repository"
)

type KnowledgeDocumentRepository struct{ *repository.BaseRepository }
type KnowledgeChunkRepository struct{ *repository.BaseRepository }
type KnowledgeEmbeddingRepository struct{ *repository.BaseRepository }

func NewKnowledgeDocumentRepository(db database.Manager, logger *slog.Logger) *KnowledgeDocumentRepository {
	return &KnowledgeDocumentRepository{repository.NewBaseRepository(db, logger, "knowledge_documents")}
}
func NewKnowledgeChunkRepository(db database.Manager, logger *slog.Logger) *KnowledgeChunkRepository {
	return &KnowledgeChunkRepository{repository.NewBaseRepository(db, logger, "knowledge_chunks")}
}
func NewKnowledgeEmbeddingRepository(db database.Manager, logger *slog.Logger) *KnowledgeEmbeddingRepository {
	return &KnowledgeEmbeddingRepository{repository.NewBaseRepository(db, logger, "knowledge_embeddings")}
}

func (r *KnowledgeDocumentRepository) Create(ctx context.Context, d *repository.KnowledgeDocument) error {
	query := `
        INSERT INTO knowledge_documents (id, user_id, workspace_id, page_id, context, appwrite_bucket_id, appwrite_file_id, original_filename, mime_type, size_bytes, status, page_count, metadata, created_at, updated_at)
        VALUES (gen_random_uuid(), $1, $2, $3, COALESCE($4,'notes'), $5, $6, $7, $8, $9, COALESCE($10,'uploaded'), $11, COALESCE($12::jsonb,'{}'::jsonb), NOW(), NOW())
        RETURNING id, user_id, workspace_id, page_id, context, appwrite_bucket_id, appwrite_file_id, original_filename, mime_type, size_bytes, status, page_count, metadata, created_at, updated_at
    `
	var metaParam interface{}
	if len(d.Metadata) > 0 {
		metaParam = string(d.Metadata)
	} else {
		metaParam = nil
	}
	row := r.ExecuteQueryRow(ctx, query, d.UserID, d.WorkspaceID, d.PageID, d.Context, d.AppwriteBucketID, d.AppwriteFileID, d.OriginalFilename, d.MimeType, d.SizeBytes, d.Status, d.PageCount, metaParam)
	return row.Scan(&d.ID, &d.UserID, &d.WorkspaceID, &d.PageID, &d.Context, &d.AppwriteBucketID, &d.AppwriteFileID, &d.OriginalFilename, &d.MimeType, &d.SizeBytes, &d.Status, &d.PageCount, &d.Metadata, &d.CreatedAt, &d.UpdatedAt)
}

func (r *KnowledgeDocumentRepository) UpdateStatus(ctx context.Context, id string, status string, metadata json.RawMessage) error {
	query := `
        UPDATE knowledge_documents SET status = $2, metadata = COALESCE($3::jsonb, metadata), updated_at = NOW() WHERE id = $1
    `
	var metaParam interface{}
	if len(metadata) > 0 {
		metaParam = string(metadata)
	} else {
		metaParam = nil
	}
	_, err := r.ExecuteCommand(ctx, query, id, status, metaParam)
	if err != nil {
		return r.HandleSQLError(err, "update knowledge document status")
	}
	return nil
}

func (r *KnowledgeDocumentRepository) GetByID(ctx context.Context, id string) (*repository.KnowledgeDocument, error) {
	query := `
        SELECT id, user_id, workspace_id, page_id, context, appwrite_bucket_id, appwrite_file_id, original_filename, mime_type, size_bytes, status, page_count, metadata, created_at, updated_at
        FROM knowledge_documents WHERE id = $1
    `
	row := r.ExecuteQueryRow(ctx, query, id)
	d := &repository.KnowledgeDocument{}
	if err := row.Scan(&d.ID, &d.UserID, &d.WorkspaceID, &d.PageID, &d.Context, &d.AppwriteBucketID, &d.AppwriteFileID, &d.OriginalFilename, &d.MimeType, &d.SizeBytes, &d.Status, &d.PageCount, &d.Metadata, &d.CreatedAt, &d.UpdatedAt); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, r.HandleSQLError(err, "get knowledge document")
	}
	return d, nil
}

func (r *KnowledgeDocumentRepository) ListByWorkspace(ctx context.Context, workspaceID int64, limit, offset int) ([]*repository.KnowledgeDocument, error) {
	query := `
        SELECT id, user_id, workspace_id, page_id, context, appwrite_bucket_id, appwrite_file_id, original_filename, mime_type, size_bytes, status, page_count, metadata, created_at, updated_at
        FROM knowledge_documents WHERE workspace_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3
    `
	rows, err := r.ExecuteQuery(ctx, query, workspaceID, limit, offset)
	if err != nil {
		return nil, r.HandleSQLError(err, "list knowledge documents")
	}
	defer rows.Close()
	var items []*repository.KnowledgeDocument
	for rows.Next() {
		d := &repository.KnowledgeDocument{}
		if err := rows.Scan(&d.ID, &d.UserID, &d.WorkspaceID, &d.PageID, &d.Context, &d.AppwriteBucketID, &d.AppwriteFileID, &d.OriginalFilename, &d.MimeType, &d.SizeBytes, &d.Status, &d.PageCount, &d.Metadata, &d.CreatedAt, &d.UpdatedAt); err != nil {
			return nil, r.HandleSQLError(err, "scan knowledge document")
		}
		items = append(items, d)
	}
	return items, nil
}

// ListByWorkspaceAndPage lists documents for a workspace and optionally filters by page.
func (r *KnowledgeDocumentRepository) ListByWorkspaceAndPage(ctx context.Context, workspaceID int64, pageID *string, limit, offset int) ([]*repository.KnowledgeDocument, error) {
	if pageID == nil || *pageID == "" {
		return r.ListByWorkspace(ctx, workspaceID, limit, offset)
	}
	rows, err := r.ExecuteQuery(ctx, `
        SELECT id, user_id, workspace_id, page_id, context, appwrite_bucket_id, appwrite_file_id, original_filename, mime_type, size_bytes, status, page_count, metadata, created_at, updated_at
        FROM knowledge_documents WHERE workspace_id = $1 AND page_id = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4
    `, workspaceID, *pageID, limit, offset)
	if err != nil {
		return nil, r.HandleSQLError(err, "list knowledge documents by page")
	}
	defer rows.Close()
	var items []*repository.KnowledgeDocument
	for rows.Next() {
		d := &repository.KnowledgeDocument{}
		if err := rows.Scan(&d.ID, &d.UserID, &d.WorkspaceID, &d.PageID, &d.Context, &d.AppwriteBucketID, &d.AppwriteFileID, &d.OriginalFilename, &d.MimeType, &d.SizeBytes, &d.Status, &d.PageCount, &d.Metadata, &d.CreatedAt, &d.UpdatedAt); err != nil {
			return nil, r.HandleSQLError(err, "scan knowledge document by page")
		}
		items = append(items, d)
	}
	return items, nil
}

func (r *KnowledgeDocumentRepository) ListByWorkspaceAndContext(ctx context.Context, workspaceID int64, context string, limit, offset int) ([]*repository.KnowledgeDocument, error) {
	rows, err := r.ExecuteQuery(ctx, `
        SELECT id, user_id, workspace_id, page_id, context, appwrite_bucket_id, appwrite_file_id, original_filename, mime_type, size_bytes, status, page_count, metadata, created_at, updated_at
        FROM knowledge_documents WHERE workspace_id = $1 AND context = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4
    `, workspaceID, context, limit, offset)
	if err != nil {
		return nil, r.HandleSQLError(err, "list knowledge documents by context")
	}
	defer rows.Close()
	var items []*repository.KnowledgeDocument
	for rows.Next() {
		d := &repository.KnowledgeDocument{}
		if err := rows.Scan(&d.ID, &d.UserID, &d.WorkspaceID, &d.PageID, &d.Context, &d.AppwriteBucketID, &d.AppwriteFileID, &d.OriginalFilename, &d.MimeType, &d.SizeBytes, &d.Status, &d.PageCount, &d.Metadata, &d.CreatedAt, &d.UpdatedAt); err != nil {
			return nil, r.HandleSQLError(err, "scan knowledge document by context")
		}
		items = append(items, d)
	}
	return items, nil
}

func (r *KnowledgeDocumentRepository) Delete(ctx context.Context, id string) error {
	_, err := r.ExecuteCommand(ctx, `DELETE FROM knowledge_documents WHERE id = $1`, id)
	if err != nil {
		return r.HandleSQLError(err, "delete knowledge document")
	}
	return nil
}

func (r *KnowledgeChunkRepository) CreateBulk(ctx context.Context, chunks []*repository.KnowledgeChunk) error {
	if len(chunks) == 0 {
		return nil
	}
	tx, err := r.GetDB().BeginTx(ctx)
	if err != nil {
		return r.HandleSQLError(err, "begin tx chunks bulk")
	}
	stmt, err := tx.PrepareContext(ctx, `
        INSERT INTO knowledge_chunks (id, document_id, chunk_index, text, page_number, start_char, end_char, token_count, created_at)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW())
    `)
	if err != nil {
		_ = tx.Rollback()
		return r.HandleSQLError(err, "prepare chunk insert")
	}
	defer stmt.Close()
	for _, c := range chunks {
		if _, err := stmt.ExecContext(ctx, c.DocumentID, c.ChunkIndex, c.Text, c.PageNumber, c.StartChar, c.EndChar, c.TokenCount); err != nil {
			_ = tx.Rollback()
			return r.HandleSQLError(err, "insert chunk")
		}
	}
	if err := tx.Commit(); err != nil {
		return r.HandleSQLError(err, "commit chunk bulk")
	}
	return nil
}

func (r *KnowledgeChunkRepository) ListByDocument(ctx context.Context, documentID string) ([]*repository.KnowledgeChunk, error) {
	rows, err := r.ExecuteQuery(ctx, `
        SELECT id, document_id, chunk_index, text, page_number, start_char, end_char, token_count, created_at
        FROM knowledge_chunks WHERE document_id = $1 ORDER BY chunk_index ASC
    `, documentID)
	if err != nil {
		return nil, r.HandleSQLError(err, "list chunks")
	}
	defer rows.Close()
	var items []*repository.KnowledgeChunk
	for rows.Next() {
		c := &repository.KnowledgeChunk{}
		if err := rows.Scan(&c.ID, &c.DocumentID, &c.ChunkIndex, &c.Text, &c.PageNumber, &c.StartChar, &c.EndChar, &c.TokenCount, &c.CreatedAt); err != nil {
			return nil, r.HandleSQLError(err, "scan chunk")
		}
		items = append(items, c)
	}
	return items, nil
}

func (r *KnowledgeChunkRepository) DeleteByDocument(ctx context.Context, documentID string) error {
	_, err := r.ExecuteCommand(ctx, `DELETE FROM knowledge_chunks WHERE document_id = $1`, documentID)
	if err != nil {
		return r.HandleSQLError(err, "delete chunks by document")
	}
	return nil
}

func (r *KnowledgeEmbeddingRepository) UpsertForChunk(ctx context.Context, chunkID string, embedding []float32) error {
	// We pass embedding as []float32 but need to format to SQL vector literal
	// Example: '[0.1,0.2,0.3]'
	if len(embedding) == 0 {
		return fmt.Errorf("empty embedding")
	}
	// Convert to []any for parameterization won't work for vector; use string literal
	// Construct as Postgres array text
	emb := "["
	for i, v := range embedding {
		if i > 0 {
			emb += ","
		}
		emb += fmt.Sprintf("%f", v)
	}
	emb += "]"
	// Upsert
	_, err := r.ExecuteCommand(ctx, `
        INSERT INTO knowledge_embeddings (chunk_id, embedding) VALUES ($1, $2::vector)
        ON CONFLICT (chunk_id) DO UPDATE SET embedding = EXCLUDED.embedding
    `, chunkID, emb)
	if err != nil {
		return r.HandleSQLError(err, "upsert embedding")
	}
	return nil
}

func (r *KnowledgeEmbeddingRepository) SimilarChunks(ctx context.Context, workspaceID int64, queryEmbedding []float32, limit int) ([]*repository.KnowledgeChunk, error) {
	if limit <= 0 {
		limit = 8
	}
	emb := "["
	for i, v := range queryEmbedding {
		if i > 0 {
			emb += ","
		}
		emb += fmt.Sprintf("%f", v)
	}
	emb += "]"

	query := `
        SELECT c.id, c.document_id, c.chunk_index, c.text, c.page_number, c.start_char, c.end_char, c.token_count, c.created_at
        FROM knowledge_chunks c
        JOIN knowledge_documents d ON d.id = c.document_id
        JOIN knowledge_embeddings e ON e.chunk_id = c.id
        WHERE d.workspace_id = $1
        ORDER BY e.embedding <=> $2::vector ASC
        LIMIT $3
    `
	rows, err := r.ExecuteQuery(ctx, query, workspaceID, emb, limit)
	if err != nil {
		return nil, r.HandleSQLError(err, "similar chunks query")
	}
	defer rows.Close()
	var items []*repository.KnowledgeChunk
	for rows.Next() {
		c := &repository.KnowledgeChunk{}
		if err := rows.Scan(&c.ID, &c.DocumentID, &c.ChunkIndex, &c.Text, &c.PageNumber, &c.StartChar, &c.EndChar, &c.TokenCount, &c.CreatedAt); err != nil {
			return nil, r.HandleSQLError(err, "scan similar chunk")
		}
		items = append(items, c)
	}
	return items, nil
}
