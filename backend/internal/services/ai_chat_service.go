package services

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"github.com/Srivathsav-max/lumen/backend/internal/repository"
)

type AIChatService interface {
	SaveExchange(ctx context.Context, userID int64, chatType string, pageID *string, userContent string, assistantContent string) (string, error)
	GetHistory(ctx context.Context, userID int64, chatType string, pageID *string, limit, offset int) ([]repository.AIMessage, error)
}

type aiChatService struct {
	convRepo repository.AIConversationRepository
	msgRepo  repository.AIMessageRepository
	logger   *slog.Logger
}

func NewAIChatService(convRepo repository.AIConversationRepository, msgRepo repository.AIMessageRepository, logger *slog.Logger) AIChatService {
	return &aiChatService{convRepo: convRepo, msgRepo: msgRepo, logger: logger}
}

func (s *aiChatService) SaveExchange(ctx context.Context, userID int64, chatType string, pageID *string, userContent string, assistantContent string) (string, error) {
	// Derive title from the prompt
	var title *string
	if userContent != "" {
		t := userContent
		if len(t) > 60 {
			t = t[:60] + "…"
		}
		title = &t
	}
	// Upsert conversation with page id and title
	conv, err := s.convRepo.UpsertConversation(ctx, userID, chatType, pageID, title)
	if err != nil {
		return "", err
	}

	// Save user message
	if userContent != "" {
		um := &repository.AIMessage{ConversationID: conv.ID, Role: "user", Content: userContent, Metadata: json.RawMessage("{}"), CreatedAt: time.Now().UTC()}
		if err := s.msgRepo.CreateMessage(ctx, um); err != nil {
			return "", err
		}
	}
	// Save assistant message
	if assistantContent != "" {
		am := &repository.AIMessage{ConversationID: conv.ID, Role: "assistant", Content: assistantContent, Metadata: json.RawMessage("{}"), CreatedAt: time.Now().UTC()}
		if err := s.msgRepo.CreateMessage(ctx, am); err != nil {
			return "", err
		}
	}
	return conv.ID, nil
}

func (s *aiChatService) GetHistory(ctx context.Context, userID int64, chatType string, pageID *string, limit, offset int) ([]repository.AIMessage, error) {
	if limit <= 0 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}
	conv, err := s.convRepo.GetConversation(ctx, userID, chatType, pageID)
	if err != nil {
		return nil, err
	}
	if conv == nil {
		return []repository.AIMessage{}, nil
	}
	msgs, err := s.msgRepo.ListMessages(ctx, conv.ID, limit, offset)
	if err != nil {
		return nil, err
	}
	out := make([]repository.AIMessage, len(msgs))
	for i, m := range msgs {
		out[i] = *m
	}
	return out, nil
}
