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

type AIConversationRepository struct{ *repository.BaseRepository }
type AIMessageRepository struct{ *repository.BaseRepository }

func NewAIConversationRepository(db database.Manager, logger *slog.Logger) *AIConversationRepository {
	return &AIConversationRepository{repository.NewBaseRepository(db, logger, "ai_conversations")}
}
func NewAIMessageRepository(db database.Manager, logger *slog.Logger) *AIMessageRepository {
	return &AIMessageRepository{repository.NewBaseRepository(db, logger, "ai_messages")}
}

func (r *AIConversationRepository) UpsertConversation(ctx context.Context, userID int64, chatType string, pageID *string, title *string) (*repository.AIConversation, error) {
	query := `
        INSERT INTO ai_conversations (id, user_id, type, page_id, title, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $6)
        ON CONFLICT (user_id, type, page_id)
        DO UPDATE SET title = COALESCE($5, ai_conversations.title), updated_at = $6
        RETURNING id, user_id, type, page_id, title, created_at, updated_at`

	id := uuid.New().String()
	now := time.Now().UTC()
	var pid interface{}
	if pageID != nil && *pageID != "" {
		pid = *pageID
	} else {
		pid = nil
	}
	var t interface{}
	if title != nil && *title != "" {
		t = *title
	} else {
		t = nil
	}
	row := r.ExecuteQueryRow(ctx, query, id, userID, chatType, pid, t, now)

	conv := &repository.AIConversation{}
	var nullablePageID sql.NullString
	var nullableTitle sql.NullString
	if err := row.Scan(&conv.ID, &conv.UserID, &conv.Type, &nullablePageID, &nullableTitle, &conv.CreatedAt, &conv.UpdatedAt); err != nil {
		return nil, r.HandleSQLError(err, "upsert ai conversation")
	}
	if nullablePageID.Valid {
		v := nullablePageID.String
		conv.PageID = &v
	}
	if nullableTitle.Valid {
		v := nullableTitle.String
		conv.Title = &v
	}
	return conv, nil
}

func (r *AIConversationRepository) GetConversation(ctx context.Context, userID int64, chatType string, pageID *string) (*repository.AIConversation, error) {
	query := `SELECT id, user_id, type, page_id, title, created_at, updated_at FROM ai_conversations WHERE user_id = $1 AND type = $2 AND page_id IS NOT DISTINCT FROM $3::uuid`
	row := r.ExecuteQueryRow(ctx, query, userID, chatType, pageID)
	conv := &repository.AIConversation{}
	var nullablePageID sql.NullString
	var nullableTitle sql.NullString
	if err := row.Scan(&conv.ID, &conv.UserID, &conv.Type, &nullablePageID, &nullableTitle, &conv.CreatedAt, &conv.UpdatedAt); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, r.HandleSQLError(err, "get ai conversation")
	}
	if nullablePageID.Valid {
		v := nullablePageID.String
		conv.PageID = &v
	}
	if nullableTitle.Valid {
		v := nullableTitle.String
		conv.Title = &v
	}
	return conv, nil
}

func (r *AIMessageRepository) CreateMessage(ctx context.Context, msg *repository.AIMessage) error {
	if msg.ID == "" {
		msg.ID = uuid.New().String()
	}
	if msg.Metadata == nil {
		msg.Metadata = []byte("{}")
	}
	query := `INSERT INTO ai_messages (id, conversation_id, role, content, metadata, created_at) VALUES ($1,$2,$3,$4,$5,$6)`
	msg.CreatedAt = time.Now().UTC()
	_, err := r.ExecuteCommand(ctx, query, msg.ID, msg.ConversationID, msg.Role, msg.Content, msg.Metadata, msg.CreatedAt)
	if err != nil {
		return r.HandleSQLError(err, "create ai message")
	}
	return nil
}

func (r *AIMessageRepository) ListMessages(ctx context.Context, conversationID string, limit, offset int) ([]*repository.AIMessage, error) {
	query := `SELECT id, conversation_id, role, content, metadata, created_at FROM ai_messages WHERE conversation_id = $1 ORDER BY created_at ASC LIMIT $2 OFFSET $3`
	rows, err := r.ExecuteQuery(ctx, query, conversationID, limit, offset)
	if err != nil {
		return nil, r.HandleSQLError(err, "list ai messages")
	}
	defer rows.Close()
	var out []*repository.AIMessage
	for rows.Next() {
		m := &repository.AIMessage{}
		if err := rows.Scan(&m.ID, &m.ConversationID, &m.Role, &m.Content, &m.Metadata, &m.CreatedAt); err != nil {
			return nil, r.HandleSQLError(err, "scan ai message")
		}
		out = append(out, m)
	}
	return out, nil
}
