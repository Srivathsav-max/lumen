package handlers

import (
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/Srivathsav-max/lumen/backend/internal/services"
)

type KnowledgeHandlers struct {
	ingest services.KnowledgeIngestService
	rag    services.RAGService
	logger *slog.Logger
}

func NewKnowledgeHandlers(ingest services.KnowledgeIngestService, rag services.RAGService, logger *slog.Logger) *KnowledgeHandlers {
	return &KnowledgeHandlers{ingest: ingest, rag: rag, logger: logger}
}

func (h *KnowledgeHandlers) BeginIngestion(c *gin.Context) {
	var req services.BeginIngestionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request", "details": err.Error()})
		return
	}
	var userID int64
	if uid, ok := c.Get("userID"); ok {
		if v, ok2 := uid.(int64); ok2 {
			userID = v
		}
	}
	resp, err := h.ingest.BeginIngestion(c.Request.Context(), userID, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": resp})
}

func (h *KnowledgeHandlers) Parse(c *gin.Context) {
	id := c.Param("document_id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "document_id required"})
		return
	}
	if err := h.ingest.ParseAndChunk(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *KnowledgeHandlers) Embed(c *gin.Context) {
	id := c.Param("document_id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "document_id required"})
		return
	}
	if err := h.ingest.EmbedChunks(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *KnowledgeHandlers) Ask(c *gin.Context) {
	h.logger.Info("RAG Ask request started")
	var req services.RAGAskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Invalid RAG request", "error", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request", "details": err.Error()})
		return
	}
	h.logger.Info("RAG Ask processing", "workspace_id", req.WorkspaceID, "query", req.Query)
	ans, err := h.rag.Ask(c.Request.Context(), &req)
	if err != nil {
		h.logger.Error("RAG Ask failed", "error", err, "workspace_id", req.WorkspaceID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	h.logger.Info("RAG Ask successful", "answer_length", len(ans.Answer), "sources_count", len(ans.Sources))
	c.JSON(http.StatusOK, gin.H{"data": ans})
}

func (h *KnowledgeHandlers) ListDocuments(c *gin.Context) {
	h.logger.Info("ListDocuments request started")
	workspaceIDStr := c.Query("workspace_id")
	if workspaceIDStr == "" {
		h.logger.Error("Missing workspace_id in ListDocuments request")
		c.JSON(http.StatusBadRequest, gin.H{"error": "workspace_id required"})
		return
	}
	var workspaceID int64
	if _, err := fmt.Sscanf(workspaceIDStr, "%d", &workspaceID); err != nil {
		h.logger.Error("Invalid workspace_id in ListDocuments", "workspace_id", workspaceIDStr, "error", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid workspace_id"})
		return
	}
	limit := 50
	offset := 0
	if l := c.Query("limit"); l != "" {
		fmt.Sscanf(l, "%d", &limit)
	}
	if o := c.Query("offset"); o != "" {
		fmt.Sscanf(o, "%d", &offset)
	}
	
	h.logger.Info("ListDocuments processing", "workspace_id", workspaceID, "limit", limit, "offset", offset)
	
	items, err := h.ingest.ListDocuments(c.Request.Context(), workspaceID, limit, offset)
	if err != nil {
		h.logger.Error("ListDocuments failed", "error", err, "workspace_id", workspaceID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	h.logger.Info("ListDocuments successful", "workspace_id", workspaceID, "count", len(items))
	c.JSON(http.StatusOK, gin.H{"data": items})
}

func (h *KnowledgeHandlers) DeleteDocument(c *gin.Context) {
	id := c.Param("document_id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "document_id required"})
		return
	}
	if err := h.ingest.DeleteDocument(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// UploadAndIndex handles multipart upload and triggers parse+embedding
func (h *KnowledgeHandlers) UploadAndIndex(c *gin.Context) {
	h.logger.Info("Starting file upload and index", "method", "UploadAndIndex")
	
	workspaceIDStr := c.PostForm("workspace_id")
	if workspaceIDStr == "" {
		h.logger.Error("Missing workspace_id in request")
		c.JSON(http.StatusBadRequest, gin.H{"error": "workspace_id required"})
		return
	}
	workspaceID, err := strconv.ParseInt(workspaceIDStr, 10, 64)
	if err != nil {
		h.logger.Error("Invalid workspace_id", "workspace_id", workspaceIDStr, "error", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid workspace_id"})
		return
	}

	h.logger.Info("Processing file upload", "workspace_id", workspaceID)

	// Validate that workspace exists and user has access
	if workspaceID == 0 {
		h.logger.Error("Invalid workspace ID", "workspace_id", workspaceID)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Valid workspace_id is required (cannot be 0)"})
		return
	}

	fh, err := c.FormFile("file")
	if err != nil {
		h.logger.Error("Failed to get form file", "error", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "file is required"})
		return
	}
	f, err := fh.Open()
	if err != nil {
		h.logger.Error("Failed to open file", "filename", fh.Filename, "error", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "cannot open file"})
		return
	}
	defer f.Close()
	content, err := io.ReadAll(f)
	if err != nil {
		h.logger.Error("Failed to read file content", "filename", fh.Filename, "error", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "cannot read file"})
		return
	}
	mime := fh.Header.Get("Content-Type")
	if mime == "" {
		mime = "application/octet-stream"
	}
	filename := fh.Filename

	h.logger.Info("File details", "filename", filename, "mime", mime, "size", len(content))

	var userID int64
	if uid, ok := c.Get("userID"); ok {
		if v, ok2 := uid.(int64); ok2 {
			userID = v
		}
	}

	h.logger.Info("Calling ingest service", "userID", userID, "workspaceID", workspaceID, "filename", filename)

	doc, err := h.ingest.UploadAndIndex(c.Request.Context(), userID, workspaceID, filename, mime, content)
	if err != nil {
		h.logger.Error("Upload and index failed", "error", err, "userID", userID, "workspaceID", workspaceID, "filename", filename)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	h.logger.Info("Upload and index successful", "document_id", doc.ID, "status", doc.Status)
	c.JSON(http.StatusOK, gin.H{"data": doc})
}
