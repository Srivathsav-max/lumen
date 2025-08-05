package handlers

import (
	"context"
	"net/http"
	"strconv"

	"github.com/Srivathsav-max/lumen/backend/internal/constants"
	"github.com/Srivathsav-max/lumen/backend/internal/errors"
	"github.com/Srivathsav-max/lumen/backend/internal/services"
	"github.com/gin-gonic/gin"
)

type WaitlistHandlers struct {
	waitlistService services.WaitlistService
}

func NewWaitlistHandlers(waitlistService services.WaitlistService) *WaitlistHandlers {
	return &WaitlistHandlers{
		waitlistService: waitlistService,
	}
}

func (h *WaitlistHandlers) JoinWaitlist(c *gin.Context) {
	var req services.WaitlistRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.Error(errors.NewValidationError("Invalid request format", err.Error()))
		return
	}

	ctx := context.Background()

	if err := h.waitlistService.AddToWaitlist(ctx, &req); err != nil {
		c.Error(err)
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Successfully added to waitlist",
	})
}

func (h *WaitlistHandlers) GetWaitlistPosition(c *gin.Context) {
	email := c.Query("email")
	if email == "" {
		c.Error(errors.NewValidationError("Email is required", ""))
		return
	}

	ctx := context.Background()

	position, err := h.waitlistService.GetWaitlistPosition(ctx, email)
	if err != nil {
		c.Error(err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Waitlist position retrieved successfully",
		"data":    position,
	})
}

func (h *WaitlistHandlers) GetWaitlistEntries(c *gin.Context) {
	if !h.isAdmin(c) {
		c.Error(errors.NewAuthorizationError("Admin access required"))
		return
	}

	req := &services.GetWaitlistRequest{
		Page:     1,
		PageSize: 20,
	}

	if pageStr := c.Query("page"); pageStr != "" {
		if page, err := strconv.Atoi(pageStr); err == nil && page > 0 {
			req.Page = page
		}
	}

	if pageSizeStr := c.Query("page_size"); pageSizeStr != "" {
		if pageSize, err := strconv.Atoi(pageSizeStr); err == nil && pageSize > 0 && pageSize <= 100 {
			req.PageSize = pageSize
		}
	}

	if status := c.Query("status"); status != "" {
		req.Status = status
	}

	if search := c.Query("search"); search != "" {
		req.Search = search
	}

	ctx := context.Background()

	entries, err := h.waitlistService.GetWaitlistEntries(ctx, req)
	if err != nil {
		c.Error(err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Waitlist entries retrieved successfully",
		"data":    entries,
	})
}

func (h *WaitlistHandlers) ApproveWaitlistEntry(c *gin.Context) {
	if !h.isAdmin(c) {
		c.Error(errors.NewAuthorizationError("Admin access required"))
		return
	}

	var req struct {
		Email string `json:"email" binding:"required,email"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.Error(errors.NewValidationError("Invalid request format", err.Error()))
		return
	}

	ctx := context.Background()

	if err := h.waitlistService.ApproveWaitlistEntry(ctx, req.Email); err != nil {
		c.Error(err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Waitlist entry approved successfully",
	})
}

func (h *WaitlistHandlers) RemoveFromWaitlist(c *gin.Context) {
	if !h.isAdmin(c) {
		c.Error(errors.NewAuthorizationError("Admin access required"))
		return
	}

	email := c.Param("email")
	if email == "" {
		c.Error(errors.NewValidationError("Email is required", ""))
		return
	}

	ctx := context.Background()

	if err := h.waitlistService.RemoveFromWaitlist(ctx, email); err != nil {
		c.Error(err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Entry removed from waitlist successfully",
	})
}

func (h *WaitlistHandlers) UpdateWaitlistStatus(c *gin.Context) {
	if !h.isAdmin(c) {
		c.Error(errors.NewAuthorizationError("Admin access required"))
		return
	}

	entryID := c.Param("id")
	if entryID == "" {
		c.Error(errors.NewValidationError("Entry ID is required", ""))
		return
	}

	var req struct {
		Status string `json:"status" binding:"required,oneof=pending approved rejected"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.Error(errors.NewValidationError("Invalid request format", err.Error()))
		return
	}

	c.Error(errors.NewInternalError("Feature not implemented"))
}

func (h *WaitlistHandlers) isAdmin(c *gin.Context) bool {
	if roles, exists := c.Get("userRoles"); exists {
		if roleSlice, ok := roles.([]string); ok {
			for _, role := range roleSlice {
				if role == constants.RoleAdmin {
					return true
				}
			}
		}
	}
	return false
}
