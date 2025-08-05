package handlers

import (
	"context"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/Srivathsav-max/lumen/backend/internal/errors"
	"github.com/Srivathsav-max/lumen/backend/internal/services"
)

// WaitlistHandlers handles waitlist-related HTTP requests
type WaitlistHandlers struct {
	waitlistService services.WaitlistService
}

// NewWaitlistHandlers creates a new WaitlistHandlers instance
func NewWaitlistHandlers(waitlistService services.WaitlistService) *WaitlistHandlers {
	return &WaitlistHandlers{
		waitlistService: waitlistService,
	}
}

// JoinWaitlist handles waitlist signup requests
func (h *WaitlistHandlers) JoinWaitlist(c *gin.Context) {
	var req services.WaitlistRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.Error(errors.NewValidationError("Invalid request format", err.Error()))
		return
	}

	ctx := context.Background()

	// Add to waitlist through WaitlistService
	if err := h.waitlistService.AddToWaitlist(ctx, &req); err != nil {
		c.Error(err)
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Successfully added to waitlist",
	})
}

// GetWaitlistPosition handles retrieving waitlist position
func (h *WaitlistHandlers) GetWaitlistPosition(c *gin.Context) {
	email := c.Query("email")
	if email == "" {
		c.Error(errors.NewValidationError("Email is required", ""))
		return
	}

	ctx := context.Background()

	// Get waitlist position through WaitlistService
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

// GetWaitlistEntries handles retrieving waitlist entries (admin only)
func (h *WaitlistHandlers) GetWaitlistEntries(c *gin.Context) {
	// Check if current user is admin
	if !h.isAdmin(c) {
		c.Error(errors.NewAuthorizationError("Admin access required"))
		return
	}

	// Parse query parameters
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

	// Get waitlist entries through WaitlistService
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

// ApproveWaitlistEntry handles approving a waitlist entry (admin only)
func (h *WaitlistHandlers) ApproveWaitlistEntry(c *gin.Context) {
	// Check if current user is admin
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

	// Approve waitlist entry through WaitlistService
	if err := h.waitlistService.ApproveWaitlistEntry(ctx, req.Email); err != nil {
		c.Error(err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Waitlist entry approved successfully",
	})
}

// RemoveFromWaitlist handles removing an entry from waitlist (admin only)
func (h *WaitlistHandlers) RemoveFromWaitlist(c *gin.Context) {
	// Check if current user is admin
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

	// Remove from waitlist through WaitlistService
	if err := h.waitlistService.RemoveFromWaitlist(ctx, email); err != nil {
		c.Error(err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Entry removed from waitlist successfully",
	})
}

// UpdateWaitlistStatus handles updating waitlist entry status (admin only)
func (h *WaitlistHandlers) UpdateWaitlistStatus(c *gin.Context) {
	// Check if current user is admin
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

	// This would require a new method in WaitlistService
	// For now, return not implemented
	c.Error(errors.NewInternalError("Feature not implemented"))
}

// Helper methods

// isAdmin checks if the current user has admin role
func (h *WaitlistHandlers) isAdmin(c *gin.Context) bool {
	if roles, exists := c.Get("userRoles"); exists {
		if roleSlice, ok := roles.([]string); ok {
			for _, role := range roleSlice {
				if role == "admin" {
					return true
				}
			}
		}
	}
	return false
}