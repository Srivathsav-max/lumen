package handlers

import (
	"context"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/Srivathsav-max/lumen/backend/internal/errors"
	"github.com/Srivathsav-max/lumen/backend/internal/services"
)

// UserHandlers handles user-related HTTP requests
type UserHandlers struct {
	userService services.UserService
	roleService services.RoleService
}

// NewUserHandlers creates a new UserHandlers instance
func NewUserHandlers(userService services.UserService, roleService services.RoleService) *UserHandlers {
	return &UserHandlers{
		userService: userService,
		roleService: roleService,
	}
}

// GetProfile handles retrieving the current user's profile
func (h *UserHandlers) GetProfile(c *gin.Context) {
	// Get user ID from context (set by auth middleware)
	userID, exists := c.Get("userID")
	if !exists {
		c.Error(errors.NewAuthenticationError("User not authenticated"))
		return
	}

	ctx := context.Background()

	// Get user profile through UserService
	user, err := h.userService.GetProfile(ctx, userID.(int64))
	if err != nil {
		c.Error(err)
		return
	}

	// Get user roles through RoleService
	roles, err := h.roleService.GetUserRoles(ctx, userID.(int64))
	if err != nil {
		c.Error(err)
		return
	}

	// Prepare response with user and roles
	response := gin.H{
		"user":  user,
		"roles": roles,
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Profile retrieved successfully",
		"data":    response,
	})
}

// UpdateProfile handles updating the current user's profile
func (h *UserHandlers) UpdateProfile(c *gin.Context) {
	// Get user ID from context (set by auth middleware)
	userID, exists := c.Get("userID")
	if !exists {
		c.Error(errors.NewAuthenticationError("User not authenticated"))
		return
	}

	var req services.UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.Error(errors.NewValidationError("Invalid request format", err.Error()))
		return
	}

	ctx := context.Background()

	// Update profile through UserService
	if err := h.userService.UpdateProfile(ctx, userID.(int64), &req); err != nil {
		c.Error(err)
		return
	}

	// Get updated profile to return
	updatedUser, err := h.userService.GetProfile(ctx, userID.(int64))
	if err != nil {
		c.Error(err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Profile updated successfully",
		"data":    updatedUser,
	})
}

// GetUserByID handles retrieving a user by ID (admin or public info)
func (h *UserHandlers) GetUserByID(c *gin.Context) {
	// Get user ID from URL parameter
	idParam := c.Param("id")
	userID, err := strconv.ParseInt(idParam, 10, 64)
	if err != nil {
		c.Error(errors.NewValidationError("Invalid user ID", "User ID must be a valid number"))
		return
	}

	ctx := context.Background()

	// Get user by ID through UserService
	user, err := h.userService.GetByID(ctx, userID)
	if err != nil {
		c.Error(err)
		return
	}

	// For security, only return public information unless user is admin
	// Check if current user is admin (this would be set by auth middleware)
	isAdmin := false
	if roles, exists := c.Get("userRoles"); exists {
		if roleSlice, ok := roles.([]string); ok {
			for _, role := range roleSlice {
				if role == "admin" {
					isAdmin = true
					break
				}
			}
		}
	}

	var response interface{}
	if isAdmin {
		// Admin can see full profile
		response = user
	} else {
		// Non-admin users see limited public information
		response = gin.H{
			"id":         user.ID,
			"username":   user.Username,
			"first_name": user.FirstName,
			"last_name":  user.LastName,
			"created_at": user.CreatedAt,
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "User retrieved successfully",
		"data":    response,
	})
}

// VerifyEmail handles email verification
func (h *UserHandlers) VerifyEmail(c *gin.Context) {
	// Get user ID from context (set by auth middleware)
	userID, exists := c.Get("userID")
	if !exists {
		c.Error(errors.NewAuthenticationError("User not authenticated"))
		return
	}

	ctx := context.Background()

	// Verify email through UserService
	if err := h.userService.VerifyEmail(ctx, userID.(int64)); err != nil {
		c.Error(err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Email verified successfully",
	})
}

// CheckEmailVerification handles checking email verification status
func (h *UserHandlers) CheckEmailVerification(c *gin.Context) {
	// Get user ID from context (set by auth middleware)
	userID, exists := c.Get("userID")
	if !exists {
		c.Error(errors.NewAuthenticationError("User not authenticated"))
		return
	}

	ctx := context.Background()

	// Check email verification status through UserService
	isVerified, err := h.userService.IsEmailVerified(ctx, userID.(int64))
	if err != nil {
		c.Error(err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Email verification status retrieved",
		"data": gin.H{
			"email_verified": isVerified,
		},
	})
}

// GetUsersByRole handles retrieving users by role (admin only)
func (h *UserHandlers) GetUsersByRole(c *gin.Context) {
	// Check if current user is admin
	if !h.isAdmin(c) {
		c.Error(errors.NewAuthorizationError("Admin access required"))
		return
	}

	roleName := c.Param("role")
	if roleName == "" {
		c.Error(errors.NewValidationError("Role name is required", ""))
		return
	}

	// This would require a new method in UserService or RoleService
	// For now, return not implemented
	c.Error(errors.NewInternalError("Feature not implemented"))
}

// Helper methods

// isAdmin checks if the current user has admin role
func (h *UserHandlers) isAdmin(c *gin.Context) bool {
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

// getCurrentUserID extracts the current user ID from context
func (h *UserHandlers) getCurrentUserID(c *gin.Context) (int64, error) {
	userID, exists := c.Get("userID")
	if !exists {
		return 0, errors.NewAuthenticationError("User not authenticated")
	}

	if id, ok := userID.(int64); ok {
		return id, nil
	}

	return 0, errors.NewInternalError("Invalid user ID in context")
}