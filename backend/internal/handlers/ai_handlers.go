package handlers

import (
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"

	"encoding/json"

	"github.com/Srivathsav-max/lumen/backend/internal/services"
)

type AIHandlers struct {
	ai     services.AIService
	logger *slog.Logger
	chat   services.AIChatService
	rag    services.RAGService
}

func NewAIHandlers(ai services.AIService, logger *slog.Logger) *AIHandlers {
	return &AIHandlers{ai: ai, logger: logger}
}

func (h *AIHandlers) GenerateNoteContent(c *gin.Context) {
	var spec services.AISpec
	if err := c.ShouldBindJSON(&spec); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	if userID, ok := c.Get("userID"); ok {
		if id, ok2 := userID.(int64); ok2 {
			spec.UserID = id
		}
	}

	resp, err := h.ai.GenerateContent(c.Request.Context(), &spec)
	if err != nil {
		h.logger.Error("AI generation failed", "error", err)
		c.JSON(http.StatusBadGateway, gin.H{"error": "AI generation failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": resp})
}

// Save chat exchange and list history (MVP endpoints)
type saveExchangeRequest struct {
	Type              string           `json:"type" binding:"required"`
	PageID            *string          `json:"page_id"`
	User              string           `json:"user"`
	Assistant         string           `json:"assistant"`
	UserMetadata      *json.RawMessage `json:"user_metadata,omitempty"`
	AssistantMetadata *json.RawMessage `json:"assistant_metadata,omitempty"`
}

func (h *AIHandlers) SaveExchange(c *gin.Context) {
	var req saveExchangeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}
	userIDVal, _ := c.Get("userID")
	userID, _ := userIDVal.(int64)
	if h.chat == nil {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "Chat service not available"})
		return
	}
	var userMeta, assistantMeta json.RawMessage
	if req.UserMetadata != nil {
		userMeta = *req.UserMetadata
	}
	if req.AssistantMetadata != nil {
		assistantMeta = *req.AssistantMetadata
	}
	convID, err := h.chat.SaveExchange(c.Request.Context(), userID, req.Type, req.PageID, req.User, req.Assistant, userMeta, assistantMeta)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save exchange"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true, "conversation_id": convID})
}

func (h *AIHandlers) GetHistory(c *gin.Context) {
	chatType := c.Query("type")
	if chatType == "" {
		chatType = "notes"
	}
	var pageID *string
	if p := c.Query("page_id"); p != "" {
		pageID = &p
	}
	userIDVal, _ := c.Get("userID")
	userID, _ := userIDVal.(int64)
	if h.chat == nil {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "Chat service not available"})
		return
	}
	msgs, err := h.chat.GetHistory(c.Request.Context(), userID, chatType, pageID, 100, 0)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load history"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": msgs})
}

// RAG ask passthrough for quick access under /ai
func (h *AIHandlers) AskRAG(c *gin.Context) {
	var req services.RAGAskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request", "details": err.Error()})
		return
	}
	if h.rag == nil {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "RAG service not available"})
		return
	}
	ans, err := h.rag.Ask(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": ans})
}
