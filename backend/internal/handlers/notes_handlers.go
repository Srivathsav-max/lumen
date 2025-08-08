package handlers

import (
	"net/http"
	"strconv"

	"log/slog"

	"github.com/gin-gonic/gin"

	"github.com/Srivathsav-max/lumen/backend/internal/errors"
	"github.com/Srivathsav-max/lumen/backend/internal/services"
)

type NotesHandlers struct {
	workspaceService services.WorkspaceService
	pageService      services.PageService
	logger           *slog.Logger
}

func NewNotesHandlers(
	workspaceService services.WorkspaceService,
	pageService services.PageService,
	logger *slog.Logger,
) *NotesHandlers {
	return &NotesHandlers{
		workspaceService: workspaceService,
		pageService:      pageService,
		logger:           logger,
	}
}

// Workspace Handlers

func (h *NotesHandlers) CreateWorkspace(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var req services.CreateWorkspaceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	workspace, err := h.workspaceService.CreateWorkspace(c.Request.Context(), userID.(int64), &req)
	if err != nil {
		h.handleServiceError(c, err)
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": workspace})
}

func (h *NotesHandlers) GetWorkspace(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	workspaceIDStr := c.Param("workspace_id")
	workspaceID, err := strconv.ParseInt(workspaceIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid workspace ID"})
		return
	}

	workspace, err := h.workspaceService.GetWorkspace(c.Request.Context(), userID.(int64), workspaceID)
	if err != nil {
		h.handleServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": workspace})
}

func (h *NotesHandlers) GetUserWorkspaces(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	workspaces, err := h.workspaceService.GetUserWorkspaces(c.Request.Context(), userID.(int64))
	if err != nil {
		h.handleServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": workspaces})
}

func (h *NotesHandlers) UpdateWorkspace(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	workspaceIDStr := c.Param("workspace_id")
	workspaceID, err := strconv.ParseInt(workspaceIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid workspace ID"})
		return
	}

	var req services.UpdateWorkspaceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	workspace, err := h.workspaceService.UpdateWorkspace(c.Request.Context(), userID.(int64), workspaceID, &req)
	if err != nil {
		h.handleServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": workspace})
}

func (h *NotesHandlers) DeleteWorkspace(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	workspaceIDStr := c.Param("workspace_id")
	workspaceID, err := strconv.ParseInt(workspaceIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid workspace ID"})
		return
	}

	err = h.workspaceService.DeleteWorkspace(c.Request.Context(), userID.(int64), workspaceID)
	if err != nil {
		h.handleServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Workspace deleted successfully"})
}

func (h *NotesHandlers) AddWorkspaceMember(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	workspaceIDStr := c.Param("workspace_id")
	workspaceID, err := strconv.ParseInt(workspaceIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid workspace ID"})
		return
	}

	var req services.AddWorkspaceMemberRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	member, err := h.workspaceService.AddMember(c.Request.Context(), userID.(int64), workspaceID, &req)
	if err != nil {
		h.handleServiceError(c, err)
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": member})
}

func (h *NotesHandlers) RemoveWorkspaceMember(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	workspaceIDStr := c.Param("workspace_id")
	workspaceID, err := strconv.ParseInt(workspaceIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid workspace ID"})
		return
	}

	memberUserIDStr := c.Param("user_id")
	memberUserID, err := strconv.ParseInt(memberUserIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	err = h.workspaceService.RemoveMember(c.Request.Context(), userID.(int64), workspaceID, memberUserID)
	if err != nil {
		h.handleServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Member removed successfully"})
}

func (h *NotesHandlers) GetWorkspaceMembers(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	workspaceIDStr := c.Param("workspace_id")
	workspaceID, err := strconv.ParseInt(workspaceIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid workspace ID"})
		return
	}

	members, err := h.workspaceService.GetMembers(c.Request.Context(), userID.(int64), workspaceID)
	if err != nil {
		h.handleServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": members})
}

func (h *NotesHandlers) UpdateMemberRole(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	workspaceIDStr := c.Param("workspace_id")
	workspaceID, err := strconv.ParseInt(workspaceIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid workspace ID"})
		return
	}

	memberUserIDStr := c.Param("user_id")
	memberUserID, err := strconv.ParseInt(memberUserIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var req struct {
		Role string `json:"role" validate:"required,oneof=member admin"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	err = h.workspaceService.UpdateMemberRole(c.Request.Context(), userID.(int64), workspaceID, memberUserID, req.Role)
	if err != nil {
		h.handleServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Member role updated successfully"})
}

// Page Handlers

func (h *NotesHandlers) CreatePage(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var req services.CreatePageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	page, err := h.pageService.CreatePage(c.Request.Context(), userID.(int64), &req)
	if err != nil {
		h.handleServiceError(c, err)
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": page})
}

func (h *NotesHandlers) GetPage(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	pageID := c.Param("page_id")
	includeBlocks := c.Query("include_blocks") == "true"

	var page *services.PageResponse
	var err error

	if includeBlocks {
		page, err = h.pageService.GetPageWithBlocks(c.Request.Context(), userID.(int64), pageID)
	} else {
		page, err = h.pageService.GetPage(c.Request.Context(), userID.(int64), pageID)
	}

	if err != nil {
		h.handleServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": page})
}

func (h *NotesHandlers) GetWorkspacePages(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	workspaceIDStr := c.Param("workspace_id")
	workspaceID, err := strconv.ParseInt(workspaceIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid workspace ID"})
		return
	}

	includeArchived := c.Query("include_archived") == "true"

	pages, err := h.pageService.GetWorkspacePages(c.Request.Context(), userID.(int64), workspaceID, includeArchived)
	if err != nil {
		h.handleServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": pages})
}

func (h *NotesHandlers) GetRootPages(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	workspaceIDStr := c.Param("workspace_id")
	workspaceID, err := strconv.ParseInt(workspaceIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid workspace ID"})
		return
	}

	includeArchived := c.Query("include_archived") == "true"

	pages, err := h.pageService.GetRootPages(c.Request.Context(), userID.(int64), workspaceID, includeArchived)
	if err != nil {
		h.handleServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": pages})
}

func (h *NotesHandlers) GetChildPages(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	parentPageID := c.Param("page_id")
	includeArchived := c.Query("include_archived") == "true"

	pages, err := h.pageService.GetChildPages(c.Request.Context(), userID.(int64), parentPageID, includeArchived)
	if err != nil {
		h.handleServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": pages})
}

func (h *NotesHandlers) UpdatePage(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	pageID := c.Param("page_id")

	var req services.UpdatePageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	page, err := h.pageService.UpdatePage(c.Request.Context(), userID.(int64), pageID, &req)
	if err != nil {
		h.handleServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": page})
}

func (h *NotesHandlers) SavePageContent(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	pageID := c.Param("page_id")

	var req services.SavePageContentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	page, err := h.pageService.SavePageContent(c.Request.Context(), userID.(int64), pageID, &req)
	if err != nil {
		h.handleServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": page})
}

func (h *NotesHandlers) DeletePage(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	pageID := c.Param("page_id")

	err := h.pageService.DeletePage(c.Request.Context(), userID.(int64), pageID)
	if err != nil {
		h.handleServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Page deleted successfully"})
}

func (h *NotesHandlers) ArchivePage(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	pageID := c.Param("page_id")

	err := h.pageService.ArchivePage(c.Request.Context(), userID.(int64), pageID)
	if err != nil {
		h.handleServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Page archived successfully"})
}

func (h *NotesHandlers) RestorePage(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	pageID := c.Param("page_id")

	err := h.pageService.RestorePage(c.Request.Context(), userID.(int64), pageID)
	if err != nil {
		h.handleServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Page restored successfully"})
}

func (h *NotesHandlers) SearchPages(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var req services.SearchPagesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	result, err := h.pageService.SearchPages(c.Request.Context(), userID.(int64), &req)
	if err != nil {
		h.handleServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": result})
}

func (h *NotesHandlers) GetRecentPages(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	limitStr := c.DefaultQuery("limit", "20")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 || limit > 100 {
		limit = 20
	}

	pages, err := h.pageService.GetRecentPages(c.Request.Context(), userID.(int64), limit)
	if err != nil {
		h.handleServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": pages})
}

func (h *NotesHandlers) GetPageVersions(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	pageID := c.Param("page_id")

	limitStr := c.DefaultQuery("limit", "20")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 || limit > 100 {
		limit = 20
	}

	offsetStr := c.DefaultQuery("offset", "0")
	offset, err := strconv.Atoi(offsetStr)
	if err != nil || offset < 0 {
		offset = 0
	}

	versions, err := h.pageService.GetPageVersions(c.Request.Context(), userID.(int64), pageID, limit, offset)
	if err != nil {
		h.handleServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": versions})
}

func (h *NotesHandlers) GetPageVersion(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	pageID := c.Param("page_id")
	versionNumberStr := c.Param("version_number")

	versionNumber, err := strconv.Atoi(versionNumberStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid version number"})
		return
	}

	version, err := h.pageService.GetPageVersion(c.Request.Context(), userID.(int64), pageID, versionNumber)
	if err != nil {
		h.handleServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": version})
}

func (h *NotesHandlers) GrantPagePermission(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	pageID := c.Param("page_id")

	var req services.GrantPagePermissionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	permission, err := h.pageService.GrantPermission(c.Request.Context(), userID.(int64), pageID, &req)
	if err != nil {
		h.handleServiceError(c, err)
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": permission})
}

func (h *NotesHandlers) RevokePagePermission(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	pageID := c.Param("page_id")
	targetUserIDStr := c.Param("user_id")

	targetUserID, err := strconv.ParseInt(targetUserIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	err = h.pageService.RevokePermission(c.Request.Context(), userID.(int64), pageID, targetUserID)
	if err != nil {
		h.handleServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Permission revoked successfully"})
}

func (h *NotesHandlers) GetPagePermissions(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	pageID := c.Param("page_id")

	permissions, err := h.pageService.GetPagePermissions(c.Request.Context(), userID.(int64), pageID)
	if err != nil {
		h.handleServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": permissions})
}

// Helper method to handle service errors
func (h *NotesHandlers) handleServiceError(c *gin.Context, err error) {
	if appErr, ok := errors.AsAppError(err); ok {
		switch appErr.Code {
		case errors.ValidationError:
			if validationErr, ok := appErr.Details.(*services.ValidationErrorResponse); ok {
				c.JSON(appErr.StatusCode, gin.H{"error": validationErr.Message, "validation_errors": validationErr.Errors})
			} else {
				c.JSON(appErr.StatusCode, gin.H{"error": appErr.Message})
			}
		case errors.NotFoundError:
			c.JSON(appErr.StatusCode, gin.H{"error": appErr.Message})
		case errors.AuthenticationError:
			c.JSON(appErr.StatusCode, gin.H{"error": appErr.Message})
		case errors.AuthorizationError:
			c.JSON(appErr.StatusCode, gin.H{"error": appErr.Message})
		case errors.ConflictError:
			c.JSON(appErr.StatusCode, gin.H{"error": appErr.Message})
		default:
			h.logger.Error("Internal server error", "error", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		}
	} else {
		h.logger.Error("Unexpected error", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
	}
}
