package handlers

import (
	"context"
	"crypto/rand"
	"math/big"
	"net/http"
	"strconv"

	"github.com/Srivathsav-max/lumen/backend/internal/constants"
	"github.com/Srivathsav-max/lumen/backend/internal/errors"
	"github.com/Srivathsav-max/lumen/backend/internal/services"
	"github.com/gin-gonic/gin"
)

type UserHandlers struct {
	userService services.UserService
	roleService services.RoleService
	authService services.AuthService
}

func NewUserHandlers(userService services.UserService, roleService services.RoleService, authService services.AuthService) *UserHandlers {
	return &UserHandlers{
		userService: userService,
		roleService: roleService,
		authService: authService,
	}
}

func (h *UserHandlers) GetProfile(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.Error(errors.NewAuthenticationError("User not authenticated"))
		return
	}

	ctx := context.Background()

	user, err := h.userService.GetProfile(ctx, userID.(int64))
	if err != nil {
		c.Error(err)
		return
	}

	roles, err := h.roleService.GetUserRoles(ctx, userID.(int64))
	if err != nil {
		c.Error(err)
		return
	}

	response := gin.H{
		"user":  user,
		"roles": roles,
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Profile retrieved successfully",
		"data":    response,
	})
}

func (h *UserHandlers) UpdateProfile(c *gin.Context) {
	userID, exists := c.Get("user_id")
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

	if err := h.userService.UpdateProfile(ctx, userID.(int64), &req); err != nil {
		c.Error(err)
		return
	}

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

func (h *UserHandlers) GetUserByID(c *gin.Context) {
	idParam := c.Param("id")
	userID, err := strconv.ParseInt(idParam, 10, 64)
	if err != nil {
		c.Error(errors.NewValidationError("Invalid user ID", "User ID must be a valid number"))
		return
	}

	ctx := context.Background()

	user, err := h.userService.GetByID(ctx, userID)
	if err != nil {
		c.Error(err)
		return
	}

	isAdmin := false
	if roles, exists := c.Get("user_roles"); exists {
		if roleSlice, ok := roles.([]string); ok {
			for _, role := range roleSlice {
				if role == constants.RoleAdmin {
					isAdmin = true
					break
				}
			}
		}
	}

	var response interface{}
	if isAdmin {
		response = user
	} else {
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

func (h *UserHandlers) VerifyEmail(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.Error(errors.NewAuthenticationError("User not authenticated"))
		return
	}

	ctx := context.Background()

	if err := h.userService.VerifyEmail(ctx, userID.(int64)); err != nil {
		c.Error(err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Email verified successfully",
	})
}

func (h *UserHandlers) CheckEmailVerification(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.Error(errors.NewAuthenticationError("User not authenticated"))
		return
	}

	ctx := context.Background()

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

func (h *UserHandlers) GetUsersByRole(c *gin.Context) {
	if !h.isAdmin(c) {
		c.Error(errors.NewAuthorizationError("Admin access required"))
		return
	}

	roleName := c.Param("role")
	if roleName == "" {
		c.Error(errors.NewValidationError("Role name is required", ""))
		return
	}

	c.Error(errors.NewInternalError("Feature not implemented"))
}

func (h *UserHandlers) isAdmin(c *gin.Context) bool {
	if roles, exists := c.Get("user_roles"); exists {
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

func (h *UserHandlers) getCurrentUserID(c *gin.Context) (int64, error) {
	userID, exists := c.Get("user_id")
	if !exists {
		return 0, errors.NewAuthenticationError("User not authenticated")
	}

	if id, ok := userID.(int64); ok {
		return id, nil
	}

	return 0, errors.NewInternalError("Invalid user ID in context")
}

func (h *UserHandlers) RequestPasswordChangeOTP(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.Error(errors.NewAuthenticationError("User not authenticated"))
		return
	}

	ctx := context.Background()

	user, err := h.userService.GetByID(ctx, userID.(int64))
	if err != nil {
		c.Error(err)
		return
	}

	if user == nil {
		c.Error(errors.NewNotFoundError("User not found"))
		return
	}

	otp, err := generateOTP(6)
	if err != nil {
		c.Error(errors.NewInternalError("Failed to generate OTP"))
		return
	}

	c.SetCookie("password_change_otp", otp, 600, "/", "", false, true)

	c.JSON(http.StatusOK, gin.H{
		"message": "OTP has been sent to your email",
	})
}

func (h *UserHandlers) ChangePassword(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.Error(errors.NewAuthenticationError("User not authenticated"))
		return
	}

	var req struct {
		CurrentPassword string `json:"current_password" binding:"required"`
		NewPassword     string `json:"new_password" binding:"required,min=8"`
		OTP             string `json:"otp" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.Error(errors.NewValidationError("Invalid request format", err.Error()))
		return
	}

	cookieOTP, err := c.Cookie("password_change_otp")
	if err != nil {
		c.Error(errors.NewValidationError("Invalid or expired OTP", "Please request a new OTP"))
		return
	}

	if cookieOTP != req.OTP {
		c.Error(errors.NewValidationError("Invalid OTP", "Please try again"))
		return
	}

	c.SetCookie("password_change_otp", "", -1, "/", "", false, true)

	ctx := context.Background()

	changePasswordReq := services.ChangePasswordRequest{
		CurrentPassword: req.CurrentPassword,
		NewPassword:     req.NewPassword,
		ConfirmPassword: req.NewPassword,
	}

	if err := h.authService.ChangePassword(ctx, userID.(int64), &changePasswordReq); err != nil {
		c.Error(err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Password changed successfully",
	})
}

func generateOTP(length int) (string, error) {
	digits := "0123456789"
	otp := make([]byte, length)
	for i := range otp {
		num, err := rand.Int(rand.Reader, big.NewInt(int64(len(digits))))
		if err != nil {
			return "", err
		}
		otp[i] = digits[num.Int64()]
	}
	return string(otp), nil
}
