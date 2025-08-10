package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/Srivathsav-max/lumen/backend/internal/services"
)

type BrainstormerHandlers struct {
	svc services.BrainstormerService
}

func NewBrainstormerHandlers(svc services.BrainstormerService) *BrainstormerHandlers {
	return &BrainstormerHandlers{svc: svc}
}

// Streaming endpoints (SSE) for auto-updates without page reloads
func (h *BrainstormerHandlers) StreamFlashcards(c *gin.Context) {
	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.Flush()

	var req services.BrainstormerGenerateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.String(http.StatusBadRequest, "event: error\ndata: %s\n\n", fmt.Sprintf("invalid request: %v", err))
		return
	}
	if err := services.ValidateBrainstormerGenerateRequest(services.NewValidator(), &req); err != nil {
		c.String(http.StatusBadRequest, "event: error\ndata: %s\n\n", fmt.Sprintf("validation failed: %v", err))
		return
	}

	res, err := h.svc.GenerateFlashcards(c.Request.Context(), &req)
	if err != nil {
		c.String(http.StatusInternalServerError, "event: error\ndata: %s\n\n", fmt.Sprintf("generation failed: %v", err))
		return
	}
	// Send one-shot result; clients auto-update without reloads
	b, _ := json.Marshal(res)
	c.String(http.StatusOK, "event: data\ndata: %s\n\n", string(b))
}

func (h *BrainstormerHandlers) StreamMCQs(c *gin.Context) {
	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.Flush()

	var req services.BrainstormerGenerateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.String(http.StatusBadRequest, "event: error\ndata: %s\n\n", fmt.Sprintf("invalid request: %v", err))
		return
	}
	if err := services.ValidateBrainstormerGenerateRequest(services.NewValidator(), &req); err != nil {
		c.String(http.StatusBadRequest, "event: error\ndata: %s\n\n", fmt.Sprintf("validation failed: %v", err))
		return
	}

	res, err := h.svc.GenerateMCQs(c.Request.Context(), &req)
	if err != nil {
		c.String(http.StatusInternalServerError, "event: error\ndata: %s\n\n", fmt.Sprintf("generation failed: %v", err))
		return
	}
	b, _ := json.Marshal(res)
	c.String(http.StatusOK, "event: data\ndata: %s\n\n", string(b))
}

func (h *BrainstormerHandlers) StreamCloze(c *gin.Context) {
	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.Flush()

	var req services.BrainstormerGenerateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.String(http.StatusBadRequest, "event: error\ndata: %s\n\n", fmt.Sprintf("invalid request: %v", err))
		return
	}
	if err := services.ValidateBrainstormerGenerateRequest(services.NewValidator(), &req); err != nil {
		c.String(http.StatusBadRequest, "event: error\ndata: %s\n\n", fmt.Sprintf("validation failed: %v", err))
		return
	}

	res, err := h.svc.GenerateCloze(c.Request.Context(), &req)
	if err != nil {
		c.String(http.StatusInternalServerError, "event: error\ndata: %s\n\n", fmt.Sprintf("generation failed: %v", err))
		return
	}
	b, _ := json.Marshal(res)
	c.String(http.StatusOK, "event: data\ndata: %s\n\n", string(b))
}
func (h *BrainstormerHandlers) GenerateFlashcards(c *gin.Context) {
	// Idempotency support: allow clients to pass an optional idempotency key header
	// to safely retry POSTs without duplicating work in future versions.
	var req services.BrainstormerGenerateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request", "details": err.Error()})
		return
	}
	if err := services.ValidateBrainstormerGenerateRequest(services.NewValidator(), &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Validation failed", "details": err.Error()})
		return
	}
	res, err := h.svc.GenerateFlashcards(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("generation failed: %v", err)})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": res})
}

func (h *BrainstormerHandlers) GenerateMCQs(c *gin.Context) {
	// See comment in GenerateFlashcards for idempotency strategy.
	var req services.BrainstormerGenerateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request", "details": err.Error()})
		return
	}
	if err := services.ValidateBrainstormerGenerateRequest(services.NewValidator(), &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Validation failed", "details": err.Error()})
		return
	}
	res, err := h.svc.GenerateMCQs(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("generation failed: %v", err)})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": res})
}

func (h *BrainstormerHandlers) GenerateCloze(c *gin.Context) {
	// See comment in GenerateFlashcards for idempotency strategy.
	var req services.BrainstormerGenerateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request", "details": err.Error()})
		return
	}
	if err := services.ValidateBrainstormerGenerateRequest(services.NewValidator(), &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Validation failed", "details": err.Error()})
		return
	}
	res, err := h.svc.GenerateCloze(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("generation failed: %v", err)})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": res})
}
